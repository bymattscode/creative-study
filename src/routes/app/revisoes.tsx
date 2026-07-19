import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase";
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

  const lateReviews = reviews.filter((r) => isLate(r.next_review_date));
  const todayReviews = reviews.filter((r) => isToday(r.next_review_date));
  const futureReviews = reviews.filter((r) => isFuture(r.next_review_date));

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

  const handleReviewMutation = useMutation({
    mutationFn: async ({
      item,
      perception,
    }: {
      item: DbReviewItem;
      perception: "Difícil" | "Médio" | "Fácil";
    }) => {
      let nextInterval = item.interval_days || 1;
      let newConfidence = item.confidence_level || 50;

      switch (perception) {
        case "Difícil":
          nextInterval = 1; // Try again tomorrow
          newConfidence = Math.max(0, newConfidence - 20);
          break;
        case "Médio":
          nextInterval = Math.ceil(nextInterval * 1.5);
          newConfidence = Math.min(100, newConfidence + 10);
          break;
        case "Fácil":
          nextInterval = Math.ceil(nextInterval * 2.5);
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
      <Card className="bg-surface-elevated border-border shadow-sm mb-3 overflow-hidden transition-all duration-300 hover:border-primary/50 hover:shadow-glow group">
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getSubjectColor(item.subject_id) }}
              />
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {getSubjectName(item.subject_id)}
              </span>
            </div>
            {getPriorityBadge(item.priority)}
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
    </div>
  );
}
