import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus, Trash2, Edit2, Check, X, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReviewModel } from "@/types/models";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/app/materias")({
  component: MateriasRoute,
});

const DEFAULT_COLORS = ["#a8ff00", "#3b82f6", "#f97316", "#8b5cf6", "#22c55e", "#ec4899", "#eab308", "#06b6d4"];

function MateriasRoute() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isSubjectDialogOpen, setIsSubjectDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any>(null); // null means adding new
  const [subjectForm, setSubjectForm] = useState<{ name: string; color: string; difficulty: string; review_model: ReviewModel }>({ name: "", color: DEFAULT_COLORS[0], difficulty: "Médio", review_model: "classic" });

  const [newTopicName, setNewTopicName] = useState<Record<string, string>>({}); // subject_id -> topic name
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editingTopicName, setEditingTopicName] = useState("");

  const { data: currentGoal } = useQuery({
    queryKey: ["currentGoal", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("goals").select("id").eq("user_id", user?.id).eq("is_active", true).single();
      if (error && error.code !== "PGRST116") throw error;
      return data || null;
    },
    enabled: !!user?.id
  });

  const { data: subjects = [], isLoading: loadingSubjects } = useQuery({
    queryKey: ["subjects", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("*").eq("user_id", user?.id).order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: topics = [], isLoading: loadingTopics } = useQuery({
    queryKey: ["topics", user?.id],
    queryFn: async () => {
      if (!subjects.length) return [];
      const { data, error } = await supabase.from("topics").select("*").in("subject_id", subjects.map(s => s.id)).order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && subjects.length > 0,
  });

  // MUTATIONS (Subjects)
  const saveSubjectMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (payload.id) {
        const { error } = await supabase.from("subjects").update({ name: payload.name, color: payload.color, difficulty: payload.difficulty, review_model: payload.review_model }).eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("subjects").insert([{
          user_id: user?.id,
          goal_id: currentGoal?.id || null,
          name: payload.name,
          color: payload.color,
          difficulty: payload.difficulty,
          review_model: payload.review_model
        }]);
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      if (!variables.id && subjects.length === 0) {
        trackEvent("first_subject_created");
      }
      queryClient.invalidateQueries({ queryKey: ["subjects", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboardData", user?.id] });
      setIsSubjectDialogOpen(false);
      toast.success(editingSubject ? "Matéria atualizada!" : "Matéria criada!");
    },
    onError: (err: any) => toast.error("Erro: " + err.message)
  });

  const deleteSubjectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subjects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["topics", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboardData", user?.id] });
      toast.info("Matéria removida.");
    }
  });

  // MUTATIONS (Topics)
  const addTopicMutation = useMutation({
    mutationFn: async ({ subjectId, name }: { subjectId: string, name: string }) => {
      const { error } = await supabase.from("topics").insert([{ subject_id: subjectId, name }]);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["topics", user?.id] });
      setNewTopicName(prev => ({ ...prev, [variables.subjectId]: "" }));
      toast.success("Tópico adicionado!");
    },
    onError: (err: any) => toast.error("Erro ao adicionar tópico: " + err.message)
  });

  const updateTopicMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string, name: string }) => {
      const { error } = await supabase.from("topics").update({ name }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topics", user?.id] });
      setEditingTopicId(null);
      toast.success("Tópico atualizado!");
    },
    onError: (err: any) => toast.error("Erro ao atualizar tópico: " + err.message)
  });

  const deleteTopicMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("topics").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topics", user?.id] });
      toast.info("Tópico removido.");
    }
  });

  // Handlers
  const handleOpenSubjectDialog = (sub?: any) => {
    if (sub) {
      setEditingSubject(sub);
      setSubjectForm({ name: sub.name, color: sub.color, difficulty: sub.difficulty || "Médio", review_model: sub.review_model || "classic" });
    } else {
      setEditingSubject(null);
      setSubjectForm({ name: "", color: DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)], difficulty: "Médio", review_model: "classic" });
    }
    setIsSubjectDialogOpen(true);
  };

  const handleSaveSubject = () => {
    if (!subjectForm.name.trim()) return toast.error("Preencha o nome da matéria.");
    saveSubjectMutation.mutate({ id: editingSubject?.id, ...subjectForm });
  };

  const handleAddTopic = (subjectId: string) => {
    const name = newTopicName[subjectId];
    if (!name || !name.trim()) return;
    addTopicMutation.mutate({ subjectId, name: name.trim() });
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full h-full pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">Central do Edital</h1>
          <p className="text-muted-foreground text-sm">Gerencie suas disciplinas e os assuntos que você precisa dominar.</p>
        </div>
        <Button onClick={() => handleOpenSubjectDialog()} className="flex items-center gap-2">
          <Plus size={18} /> Adicionar Matéria
        </Button>
      </div>

      {loadingSubjects ? (
        <div className="flex justify-center p-12 text-muted-foreground animate-pulse">Carregando edital...</div>
      ) : subjects.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-surface/30 p-12 text-center mt-8">
          <div className="rounded-full bg-surface-elevated p-4 mb-4">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Seu edital está vazio</h2>
          <p className="text-muted-foreground max-w-sm mb-6 text-sm">
            Adicione as matérias e os assuntos que você precisa estudar para alcançar sua meta.
          </p>
          <Button onClick={() => handleOpenSubjectDialog()}>Adicionar Primeira Matéria</Button>
        </div>
      ) : (
        <Accordion type="multiple" className="w-full space-y-4 mt-4">
          {subjects.map(sub => {
            const subTopics = topics.filter((t: any) => t.subject_id === sub.id);
            return (
              <AccordionItem key={sub.id} value={sub.id} className="border bg-surface-elevated rounded-lg px-2 overflow-hidden shadow-sm">
                <div className="flex items-center w-full">
                  <AccordionTrigger className="hover:no-underline flex-1 py-4 px-2 [&>svg]:ml-2">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: sub.color }} />
                      <span className="font-bold text-base md:text-lg">{sub.name}</span>
                      <span className="text-xs px-2 py-1 bg-background rounded-full text-muted-foreground font-medium hidden sm:inline-block">
                        {subTopics.length} tópicos
                      </span>
                      {sub.review_model && (
                        <span className="text-xs px-2 py-1 border border-primary/30 text-primary rounded-full font-medium hidden sm:inline-block ml-auto mr-4">
                          {sub.review_model === "none" ? "Sem Revisão" : 
                           sub.review_model === "short_term" ? "Curto Prazo" :
                           sub.review_model === "bimonthly" ? "Bimestral" :
                           sub.review_model === "semiannual" ? "Semestral" : "Clássico"}
                        </span>
                      )}
                    </div>
                  </AccordionTrigger>
                  
                  <div className="pr-4 pl-2 flex items-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                          <MoreVertical size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenSubjectDialog(sub)}>
                          <Edit2 size={14} className="mr-2" /> Editar Matéria
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-500 focus:bg-red-500/10 focus:text-red-500" onClick={() => {
                          if (confirm("Tem certeza? Isso apagará todos os tópicos e histórico atrelado a esta matéria.")) {
                            deleteSubjectMutation.mutate(sub.id);
                          }
                        }}>
                          <Trash2 size={14} className="mr-2" /> Remover Matéria
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                
                <AccordionContent className="px-4 pb-6 pt-2">
                  <div className="space-y-2 mb-4 pl-4 border-l-2 border-border/50 ml-2">
                    {subTopics.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2 italic">Nenhum tópico cadastrado.</p>
                    ) : (
                      subTopics.map((topic: any) => (
                        <div key={topic.id} className="group flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-background/50 transition-colors">
                          {editingTopicId === topic.id ? (
                            <div className="flex items-center gap-2 flex-1 mr-4">
                              <Input 
                                autoFocus
                                value={editingTopicName} 
                                onChange={e => setEditingTopicName(e.target.value)}
                                className="h-8 bg-background"
                                onKeyDown={e => {
                                  if (e.key === 'Enter') updateTopicMutation.mutate({ id: topic.id, name: editingTopicName });
                                  if (e.key === 'Escape') setEditingTopicId(null);
                                }}
                              />
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500" onClick={() => updateTopicMutation.mutate({ id: topic.id, name: editingTopicName })}>
                                <Check size={16} />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => setEditingTopicId(null)}>
                                <X size={16} />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <span className="text-sm font-medium text-foreground">{topic.name}</span>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => { setEditingTopicId(topic.id); setEditingTopicName(topic.name); }}>
                                  <Edit2 size={12} />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-red-400" onClick={() => {
                                  if (confirm("Remover este tópico?")) deleteTopicMutation.mutate(topic.id);
                                }}>
                                  <Trash2 size={12} />
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 pl-4 ml-2">
                    <Input 
                      placeholder="Adicionar novo tópico..."
                      value={newTopicName[sub.id] || ""}
                      onChange={e => setNewTopicName(prev => ({ ...prev, [sub.id]: e.target.value }))}
                      className="h-9 bg-background/50 border-dashed text-sm"
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleAddTopic(sub.id);
                      }}
                    />
                    <Button 
                      size="sm" 
                      variant="secondary"
                      disabled={!(newTopicName[sub.id]?.trim()) || addTopicMutation.isPending}
                      onClick={() => handleAddTopic(sub.id)}
                    >
                      Salvar
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      )}

      {/* DIALOG DE MATÉRIA */}
      <Dialog open={isSubjectDialogOpen} onOpenChange={setIsSubjectDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-surface border-border">
          <DialogHeader>
            <DialogTitle className="text-xl">{editingSubject ? "Editar Matéria" : "Nova Matéria"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome da Matéria</Label>
              <Input
                id="name"
                value={subjectForm.name}
                onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                placeholder="Ex: Direito Administrativo"
                className="bg-background"
              />
            </div>
            <div className="grid gap-2">
              <Label>Dificuldade</Label>
              <Select
                value={subjectForm.difficulty}
                onValueChange={(val) => setSubjectForm({ ...subjectForm, difficulty: val })}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Selecione a dificuldade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Muito Fácil">Muito Fácil</SelectItem>
                  <SelectItem value="Fácil">Fácil</SelectItem>
                  <SelectItem value="Médio">Médio</SelectItem>
                  <SelectItem value="Difícil">Difícil</SelectItem>
                  <SelectItem value="Muito Difícil">Muito Difícil</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Modelo de Revisão Automática</Label>
              <Select
                value={subjectForm.review_model}
                onValueChange={(val) => setSubjectForm({ ...subjectForm, review_model: val as ReviewModel })}
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
              <p className="text-xs text-muted-foreground">
                As revisões serão geradas automaticamente sempre que você concluir o estudo de um tópico desta matéria.
              </p>
            </div>
            <div className="grid gap-2">
              <Label>Cor de Identificação</Label>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_COLORS.map(color => (
                  <div 
                    key={color}
                    onClick={() => setSubjectForm({ ...subjectForm, color })}
                    className={`w-8 h-8 rounded-full cursor-pointer flex items-center justify-center transition-transform hover:scale-110 ${subjectForm.color === color ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
                    style={{ backgroundColor: color }}
                  >
                    {subjectForm.color === color && <Check size={14} className="text-black/80" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="ghost" onClick={() => setIsSubjectDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveSubject} disabled={saveSubjectMutation.isPending}>
              {saveSubjectMutation.isPending ? "Salvando..." : "Salvar Matéria"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
