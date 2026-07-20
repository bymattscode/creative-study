import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase";
import { ReviewModel } from "@/types/models";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";
import {
  BrainCircuit,
  CalendarDays,
  AlertCircle,
  CheckCircle2,
  Clock,
  Gauge,
  Plus,
  History,
  Trash2,
  Pencil,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/app/revisoes")({
  component: RevisoesRoute,
});

type DbReviewItem = {
  id: string;
  subject_id: string;
  topic_name: string;
  next_review_date: string;
  last_review_date: string | null;
  interval_days: number;
  confidence_level: number;
  priority: "Alta" | "Média" | "Baixa";
};

function RevisoesRoute() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newReviewSubject, setNewReviewSubject] = useState("");
  const [newReviewTopic, setNewReviewTopic] = useState("");

  const [editingReviewItem, setEditingReviewItem] = useState<DbReviewItem | null>(null);
  const [editTopicName, setEditTopicName] = useState("");

  // Queries
  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("subjects").select("*").eq("user_id", user?.id);
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["reviewItems", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("review_items")
        .select("*")
        .eq("user_id", user?.id)
        .order("next_review_date", { ascending: true });
      if (error) throw error;
      return data as DbReviewItem[];
    },
    enabled: !!user?.id,
  });

  const { data: preferences } = useQuery({
    queryKey: ["preferences", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("onboarding_preferences")
        .select("global_review_model")
        .eq("user_id", user?.id)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const updateReviewModelMutation = useMutation({
    mutationFn: async (model: ReviewModel) => {
      const { error } = await supabase
        .from("onboarding_preferences")
        .update({ global_review_model: model })
        .eq("user_id", user?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preferences"] });
      toast.success("Modelo de revisão atualizado!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const getSubjectColor = (subjectId: string) => {
    return subjects.find((s) => s.id === subjectId)?.color || "#a8ff00";
  };

  const getSubjectName = (subjectId: string) => {
    return subjects.find((s) => s.id === subjectId)?.name || "Múltiplas";
  };

  // Filter Logic
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isLate = (dateStr: string) => {
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    return d < today;
  };

  const isToday = (dateStr: string) => {
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  };

  const isFuture = (dateStr: string) => {
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    return d > today;
  };

  const { data: upcomingExams = [] } = useQuery({
    queryKey: ["upcomingExams", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", user?.id)
        .eq("is_active", false)
        .gte("target_date", new Date().toISOString().split('T')[0]);
      return data || [];
    },
    enabled: !!user?.id,
  });

  const highPrioritySubjectIds = upcomingExams.reduce((acc: string[], exam: any) => {
    let parsed = { subjectId: "none" };
    try { parsed = JSON.parse(exam.title); } catch(e) {}
    if (parsed.subjectId && parsed.subjectId !== "none") {
      const diff = new Date(exam.target_date).getTime() - new Date().getTime();
      const daysLeft = Math.ceil(diff / (1000 * 3600 * 24));
      if (daysLeft <= 7 && daysLeft >= 0) {
        acc.push(parsed.subjectId);
      }
    }
    return acc;
  }, []);

  const isHighPriority = (subjectId: string) => highPrioritySubjectIds.includes(subjectId);

  const prioritySort = (a: DbReviewItem, b: DbReviewItem) => {
    const aPriority = isHighPriority(a.subject_id) ? 1 : 0;
    const bPriority = isHighPriority(b.subject_id) ? 1 : 0;
    if (aPriority !== bPriority) return bPriority - aPriority;
    return new Date(a.next_review_date).getTime() - new Date(b.next_review_date).getTime();
  };

  const lateReviews = reviews.filter((r) => isLate(r.next_review_date)).sort(prioritySort);
  const todayReviews = reviews.filter((r) => isToday(r.next_review_date)).sort(prioritySort);
  const futureReviews = reviews.filter((r) => isFuture(r.next_review_date)).sort(prioritySort);

  // Mutations
  const addReviewMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !newReviewSubject || !newReviewTopic) {
        throw new Error("Preencha todos os campos.");
      }

      const { error } = await supabase.from("review_items").insert([
        {
          user_id: user.id,
          subject_id: newReviewSubject,
          topic_name: newReviewTopic,
          next_review_date: new Date().toISOString(),
          interval_days: 1,
          confidence_level: 50,
          priority: "Média",
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviewItems"] });
      setIsAddModalOpen(false);
      setNewReviewSubject("");
      setNewReviewTopic("");
      toast.success("Revisão adicionada com sucesso!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteReviewMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("review_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviewItems"] });
      toast.success("Revisão apagada com sucesso!");
    },
    onError: (err: any) => toast.error(`Erro ao apagar: ${err.message}`),
  });

  const editReviewMutation = useMutation({
    mutationFn: async ({ id, topic_name }: { id: string; topic_name: string }) => {
      const { error } = await supabase
        .from("review_items")
        .update({ topic_name })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviewItems"] });
      toast.success("Revisão atualizada com sucesso!");
      setEditingReviewItem(null);
    },
    onError: (err: any) => toast.error(`Erro ao atualizar: ${err.message}`),
  });

  const handleReviewMutation = useMutation({
    mutationFn: async ({
      item,
      perception,
    }: {
      item: DbReviewItem;
      perception: "Difícil" | "Médio" | "Fácil";
    }) => {
      const model = preferences?.global_review_model || "classic";
      let seq = [1, 7, 30, 90];
      if (model === "short_term") seq = [1, 3, 7, 15, 30];
      else if (model === "bimonthly") seq = [1, 15, 60];
      else if (model === "semiannual") seq = [1, 30, 90, 180];

      let nextInterval = item.interval_days || 1;
      let newConfidence = item.confidence_level || 50;

      // Encontrar o indice atual aproximado na sequência
      let currentIdx = seq.findIndex(val => val >= nextInterval);
      if (currentIdx === -1) currentIdx = seq.length - 1;

      switch (perception) {
        case "Difícil":
          nextInterval = 1; // Volta pro começo
          newConfidence = Math.max(0, newConfidence - 20);
          break;
        case "Médio":
          // Avança 1 nível na sequência
          currentIdx = Math.min(seq.length - 1, currentIdx + 1);
          nextInterval = seq[currentIdx];
          newConfidence = Math.min(100, newConfidence + 10);
          break;
        case "Fácil":
          // Avança 2 níveis se achar fácil
          currentIdx = Math.min(seq.length - 1, currentIdx + 2);
          nextInterval = seq[currentIdx];
          newConfidence = Math.min(100, newConfidence + 25);
          break;
      }

      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + nextInterval);

      let newPriority: "Alta" | "Média" | "Baixa" = "Baixa";
      if (newConfidence < 40) newPriority = "Alta";
      else if (newConfidence < 70) newPriority = "Média";

      // 1. Atualizar o Item
      const { error: updateError } = await supabase
        .from("review_items")
        .update({
          interval_days: nextInterval,
          confidence_level: newConfidence,
          priority: newPriority,
          last_review_date: new Date().toISOString(),
          next_review_date: nextDate.toISOString(),
        })
        .eq("id", item.id);

      if (updateError) throw updateError;

      // 2. Gravar o Log
      const { error: logError } = await supabase.from("review_logs").insert([
        {
          review_item_id: item.id,
          user_id: user?.id,
          perception: perception,
        },
      ]);

      if (logError) throw logError;

      return { nextInterval };
    },
    onSuccess: (data, vars) => {
      // Check if it's the very first review by looking at the current reviews state
      const hasAnyPriorReview = reviews.some((r) => r.last_review_date !== null);
      if (!hasAnyPriorReview && !vars.item.last_review_date) {
        trackEvent("first_review_completed");
      }

      queryClient.invalidateQueries({ queryKey: ["reviewItems"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
      setExpandedCard(null);
      toast.success(`Revisão registrada! Próxima em ${data.nextInterval} dia(s)`);
    },
    onError: (err: any) => toast.error(`Erro ao salvar revisão: ${err.message}`),
  });

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "Alta":
        return (
          <Badge variant="destructive" className="bg-red-500/20 text-red-500 hover:bg-red-500/30">
            Alta
          </Badge>
        );
      case "Média":
        return (
          <Badge
            variant="secondary"
            className="bg-orange-500/20 text-orange-500 hover:bg-orange-500/30"
          >
            Média
          </Badge>
        );
      case "Baixa":
        return (
          <Badge variant="outline" className="border-border text-muted-foreground">
            Baixa
          </Badge>
        );
      default:
        return null;
    }
  };

  const ReviewCard = ({ item }: { item: DbReviewItem }) => {
    const isExpanded = expandedCard === item.id;

    return (
      <Card className={`bg-surface border-border overflow-hidden mb-3 transition-all duration-300 hover:border-primary/50 hover:shadow-glow group ${isHighPriority(item.subject_id) ? 'ring-1 ring-primary' : ''}`}>
        <div className="h-1 w-full" style={{ backgroundColor: getSubjectColor(item.subject_id) }} />
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {getSubjectName(item.subject_id)}
              </span>
              {isHighPriority(item.subject_id) && (
                <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">Prova Próxima</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity md:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditTopicName(item.topic_name);
                  setEditingReviewItem(item);
                }}
              >
                <Pencil size={14} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity md:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("Tem certeza que deseja apagar esta revisão?")) {
                    deleteReviewMutation.mutate(item.id);
                  }
                }}
              >
                <Trash2 size={14} />
              </Button>
              {getPriorityBadge(item.priority)}
            </div>
          </div>

          <h3 className="text-lg font-bold mb-2">{item.topic_name}</h3>

          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
            <div className="flex items-center gap-1" title="Confiança">
              <Gauge
                size={14}
                className={
                  item.confidence_level > 70
                    ? "text-green-500"
                    : item.confidence_level < 40
                      ? "text-red-500"
                      : "text-orange-500"
                }
              />
              {Math.floor(item.confidence_level)}%
            </div>
            {item.last_review_date && (
              <div className="flex items-center gap-1" title="Última Revisão">
                <History size={14} />
                {new Date(item.last_review_date).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                })}
              </div>
            )}
            <div className="flex items-center gap-1" title="Próxima Revisão">
              <Clock size={14} className="text-primary" />
              {new Date(item.next_review_date).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
              })}
            </div>
          </div>

          {isExpanded ? (
            <div className="animate-in slide-in-from-top-2 fade-in duration-200 bg-background/50 rounded-lg p-3 mt-2 border border-border">
              <p className="text-xs text-center text-muted-foreground mb-3 font-medium">
                Como foi lembrar disso?
              </p>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/20"
                  onClick={() => handleReviewMutation.mutate({ item, perception: "Difícil" })}
                  disabled={handleReviewMutation.isPending}
                >
                  Difícil
                </Button>
                <Button
                  variant="outline"
                  className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 border-orange-500/20"
                  onClick={() => handleReviewMutation.mutate({ item, perception: "Médio" })}
                  disabled={handleReviewMutation.isPending}
                >
                  Médio
                </Button>
                <Button
                  variant="outline"
                  className="bg-green-500/10 hover:bg-green-500/20 text-green-500 border-green-500/20"
                  onClick={() => handleReviewMutation.mutate({ item, perception: "Fácil" })}
                  disabled={handleReviewMutation.isPending}
                >
                  Fácil
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="default"
              className="w-full text-primary-foreground font-bold"
              onClick={() => setExpandedCard(item.id)}
            >
              Revisar Agora
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Revisões Inteligentes</h1>
          <p className="text-muted-foreground text-sm">
            O motor que consolida sua memória a longo prazo.
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="shadow-glow font-bold">
          <Plus size={16} className="mr-2" /> Nova Revisão
        </Button>
      </div>

      <Card className="bg-surface/50 border-border shadow-sm">
        <CardContent className="p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <BrainCircuit className="text-primary" size={18} />
              Modelo de Revisão Automática
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              As revisões serão geradas automaticamente de acordo com o modelo selecionado.
            </p>
          </div>
          <div className="w-full sm:w-[280px]">
            <Select
              value={preferences?.global_review_model || "classic"}
              onValueChange={(val) => updateReviewModelMutation.mutate(val as ReviewModel)}
              disabled={!preferences || updateReviewModelMutation.isPending}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Selecione o modelo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Esquecimento Natural (Sem revisão)</SelectItem>
                <SelectItem value="short_term">Curto Prazo (Dia 1, 3, 7, 15, 30)</SelectItem>
                <SelectItem value="classic">Clássico (Dia 1, 7, 30, 90)</SelectItem>
                <SelectItem value="bimonthly">Bimestral (Dia 1, 15, 60)</SelectItem>
                <SelectItem value="semiannual">Semestral (Dia 1, 30, 90, 180)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="hoje" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-surface border border-border p-1">
          <TabsTrigger
            value="atrasadas"
            className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-500"
          >
            <AlertCircle size={14} className="mr-2" /> Atrasadas ({lateReviews.length})
          </TabsTrigger>
          <TabsTrigger
            value="hoje"
            className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
          >
            <CheckCircle2 size={14} className="mr-2" /> Hoje ({todayReviews.length})
          </TabsTrigger>
          <TabsTrigger value="proximas">
            <CalendarDays size={14} className="mr-2" /> Próximas ({futureReviews.length})
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="atrasadas">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground animate-pulse">
                Carregando revisões...
              </div>
            ) : lateReviews.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <BrainCircuit size={48} className="mx-auto mb-4 opacity-20" />
                <p>Nenhuma revisão atrasada! Excelente.</p>
              </div>
            ) : (
              lateReviews.map((r) => <ReviewCard key={r.id} item={r} />)
            )}
          </TabsContent>

          <TabsContent value="hoje">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground animate-pulse">
                Carregando revisões...
              </div>
            ) : todayReviews.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle2 size={48} className="mx-auto mb-4 opacity-20" />
                <p>Tudo limpo por hoje. Descanse ou avance na teoria.</p>
              </div>
            ) : (
              todayReviews.map((r) => <ReviewCard key={r.id} item={r} />)
            )}
          </TabsContent>

          <TabsContent value="proximas">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground animate-pulse">
                Carregando revisões...
              </div>
            ) : futureReviews.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CalendarDays size={48} className="mx-auto mb-4 opacity-20" />
                <p>O futuro está vazio. Continue estudando!</p>
              </div>
            ) : (
              futureReviews.map((r) => <ReviewCard key={r.id} item={r} />)
            )}
          </TabsContent>
        </div>
      </Tabs>

      {/* Add Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Agendar Revisão Manual</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="subject">Matéria</Label>
              <Select value={newReviewSubject} onValueChange={setNewReviewSubject}>
                <SelectTrigger id="subject">
                  <SelectValue placeholder="Selecione a matéria" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                  {subjects.length === 0 && (
                    <SelectItem value="none" disabled>
                      Cadastre matérias no edital primeiro
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="topic">Tópico</Label>
              <Input
                id="topic"
                placeholder="Ex: Revolução Francesa"
                value={newReviewTopic}
                onChange={(e) => setNewReviewTopic(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => addReviewMutation.mutate()}
              disabled={addReviewMutation.isPending || !newReviewSubject || !newReviewTopic}
            >
              {addReviewMutation.isPending ? "Agendando..." : "Agendar para Hoje"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Revisão */}
      <Dialog open={!!editingReviewItem} onOpenChange={(open) => !open && setEditingReviewItem(null)}>
        <DialogContent className="bg-surface border-border">
          <DialogHeader>
            <DialogTitle>Editar Revisão</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Tópico / Assunto</Label>
              <Input
                value={editTopicName}
                onChange={(e) => setEditTopicName(e.target.value)}
                placeholder="Ex: Revolução Francesa"
                className="bg-background border-border"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingReviewItem(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (editingReviewItem) {
                  editReviewMutation.mutate({
                    id: editingReviewItem.id,
                    topic_name: editTopicName,
                  });
                }
              }}
              disabled={editReviewMutation.isPending || !editTopicName.trim()}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
