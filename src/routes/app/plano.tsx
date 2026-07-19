import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Subject, UserProfile } from "@/types/models";
import { useSyncStorage } from "@/hooks/useSyncStorage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  BrainCircuit,
  CheckCircle2,
  Clock,
  CalendarDays,
  BookOpen,
  MoreVertical,
  Trash2,
  Edit2,
  MoveRight,
  Play,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
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
  Select as ShadSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/app/plano")({
  component: PlanoSemanalRoute,
});

type ActivityType = "teoria" | "questoes" | "revisao" | "leitura" | "redacao";
type TaskStatus = "pendente" | "concluido" | "atrasado";

type PlanTask = {
  id: string;
  subjectId: string;
  subjectName: string;
  topicName: string;
  durationMinutes: number;
  type: ActivityType;
  status: TaskStatus;
};

type PlanDay = {
  dayName: string;
  items: PlanTask[];
};

const WEEK_DAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  teoria: "Teoria",
  questoes: "Questões",
  revisao: "Revisão",
  leitura: "Leitura",
  redacao: "Redação",
};

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  teoria: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  questoes: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  revisao: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  leitura: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  redacao: "bg-pink-500/10 text-pink-500 border-pink-500/20",
};

function PlanoSemanalRoute() {
  const [subjects] = useSyncStorage<Subject[]>("@sinapse:subjects", []);
  const [profile] = useSyncStorage<UserProfile | null>("@sinapse:userProfile", null);
  const [plan, setPlan] = useSyncStorage<PlanDay[]>(
    "@sinapse:weeklyPlan",
    WEEK_DAYS.map((day) => ({ dayName: day, items: [] })),
  );

  const [isGenerating, setIsGenerating] = useState(false);

  // Edit State
  const [editingTask, setEditingTask] = useState<{ dayIdx: number; task: PlanTask } | null>(null);

  useEffect(() => {
    // Upgrade legacy items to new schema if necessary
    if (plan && plan.length > 0) {
      const needsUpgrade = plan.some((d) => d.items.some((i) => !i.type || i.status === undefined));
      if (needsUpgrade) {
        const upgraded = plan.map((d) => ({
          ...d,
          items: d.items.map((i) => ({
            ...i,
            type: i.type || "teoria",
            status: i.status || ((i as any).completed ? "concluido" : "pendente"),
          })),
        }));
        setPlan(upgraded);
      }
    }
  }, [plan, setPlan]);

  const savePlan = (newPlan: PlanDay[]) => {
    setPlan(newPlan);
  };

  const generateAIPlan = () => {
    if (subjects.length === 0) {
      toast.error("Você precisa cadastrar matérias no seu perfil primeiro!");
      return;
    }

    setIsGenerating(true);

    setTimeout(() => {
      const types: ActivityType[] = ["teoria", "questoes", "revisao", "leitura"];

      const newPlan = WEEK_DAYS.map((day) => {
        const items: PlanTask[] = [];
        let hours = profile?.preferences?.hoursPerDay || 4;
        // Dia mais leve no domingo
        if (day === "Domingo") hours = Math.floor(hours / 2);
        
        for (let i = 0; i < hours; i++) {
          // Distribuição cíclica das matérias para garantir cobertura
          const subIndex = (WEEK_DAYS.indexOf(day) * hours + i) % subjects.length;
          const sub = subjects[subIndex];
          
          // Padrão intercalado de tipos de estudo
          const type: ActivityType = i % 4 === 0 ? "revisao" : (i % 2 === 0 ? "questoes" : "teoria");

          items.push({
            id: Math.random().toString(36).substring(7),
            subjectId: sub.id,
            subjectName: sub.name,
            topicName: `${ACTIVITY_LABELS[type]} - Módulo ${Math.floor(i / 2) + 1}`,
            durationMinutes: 60,
            type: type,
            status: "pendente",
          });
        }
        return { dayName: day, items };
      });

      savePlan(newPlan);
      setIsGenerating(false);
      toast.success("Plano otimizado gerado com sucesso!");
    }, 1500);
  };

  const toggleStatus = (dayIndex: number, taskId: string) => {
    const newPlan = [...plan];
    const task = newPlan[dayIndex].items.find((t) => t.id === taskId);
    if (task) {
      task.status = task.status === "concluido" ? "pendente" : "concluido";
      savePlan(newPlan);
    }
  };

  const setTaskStatus = (dayIndex: number, taskId: string, status: TaskStatus) => {
    const newPlan = [...plan];
    const task = newPlan[dayIndex].items.find((t) => t.id === taskId);
    if (task) {
      task.status = status;
      savePlan(newPlan);
      if (status === "atrasado") toast("Bloco marcado como atrasado.");
    }
  };

  const moveTask = (fromDayIdx: number, toDayIdx: number, taskId: string) => {
    if (fromDayIdx === toDayIdx) return;

    const newPlan = [...plan];
    const taskIndex = newPlan[fromDayIdx].items.findIndex((t) => t.id === taskId);
    if (taskIndex > -1) {
      const [task] = newPlan[fromDayIdx].items.splice(taskIndex, 1);
      newPlan[toDayIdx].items.push(task);
      savePlan(newPlan);
      toast.success(`Bloco movido para ${newPlan[toDayIdx].dayName}`);
    }
  };

  const deleteTask = (dayIndex: number, taskId: string) => {
    const newPlan = [...plan];
    newPlan[dayIndex].items = newPlan[dayIndex].items.filter((t) => t.id !== taskId);
    savePlan(newPlan);
    toast("Bloco removido do plano.");
  };

  const handleEditSave = () => {
    if (!editingTask) return;
    const newPlan = [...plan];
    const taskIndex = newPlan[editingTask.dayIdx].items.findIndex(
      (t) => t.id === editingTask.task.id,
    );
    if (taskIndex > -1) {
      newPlan[editingTask.dayIdx].items[taskIndex] = editingTask.task;
      savePlan(newPlan);
      setEditingTask(null);
      toast.success("Bloco atualizado!");
    }
  };

  const hasEmptyPlan = plan.every((day) => day.items.length === 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto pb-24 lg:pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Seu Cronograma</h1>
          <p className="text-muted-foreground mt-1 text-lg">Organize sua semana com precisão.</p>
        </div>
        <Button
          onClick={generateAIPlan}
          disabled={isGenerating}
          className="w-full md:w-auto shadow-glow font-bold"
        >
          {isGenerating ? (
            <span className="flex items-center">
              <BrainCircuit className="mr-2 h-4 w-4 animate-pulse" /> Processando...
            </span>
          ) : (
            <span className="flex items-center">
              <BrainCircuit className="mr-2 h-4 w-4" /> Gerar Cronograma IA
            </span>
          )}
        </Button>
      </div>

      {hasEmptyPlan && !isGenerating ? (
        <Card className="bg-surface/30 border-dashed border-border/50 py-16 shadow-none">
          <CardContent className="flex flex-col items-center text-center space-y-4">
            <CalendarDays size={56} className="text-muted-foreground/20" />
            <div>
              <p className="font-display font-bold text-xl text-foreground">
                Sua semana está em branco
              </p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                Clique no botão acima para deixar a Inteligência Artificial estruturar seus blocos
                de estudo.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Accordion
          type="multiple"
          defaultValue={["Segunda", "Terça", "Quarta", "Quinta", "Sexta"]}
          className="w-full space-y-4"
        >
          {plan.map((day, idx) => (
            <AccordionItem
              key={day.dayName}
              value={day.dayName}
              className="border bg-surface-elevated rounded-xl px-4 overflow-hidden shadow-sm"
            >
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center justify-between w-full pr-4">
                  <h3 className="font-bold text-lg">{day.dayName}</h3>
                  <div className="flex items-center gap-2 text-sm font-normal">
                    <span className="text-muted-foreground bg-surface px-2 py-1 rounded">
                      {day.items.filter((i) => i.status === "concluido").length}/{day.items.length}{" "}
                      Concluídos
                    </span>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4 space-y-3">
                {day.items.length === 0 ? (
                  <p className="text-muted-foreground text-sm italic px-2">
                    Nenhum bloco agendado.
                  </p>
                ) : (
                  day.items.map((task) => (
                    <div
                      key={task.id}
                      className={`relative flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border transition-all ${
                        task.status === "concluido"
                          ? "bg-surface opacity-60 border-transparent"
                          : task.status === "atrasado"
                            ? "bg-red-500/5 border-red-500/30 shadow-sm"
                            : "bg-background border-border shadow-sm hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-3">
                        <button
                          onClick={() => toggleStatus(idx, task.id)}
                          className={`mt-1 sm:mt-0 flex-shrink-0 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                            task.status === "concluido"
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-muted-foreground hover:border-primary"
                          }`}
                        >
                          {task.status === "concluido" && <CheckCircle2 size={16} />}
                        </button>

                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`font-semibold ${task.status === "concluido" ? "line-through text-muted-foreground" : ""}`}
                            >
                              {task.subjectName}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] h-5 uppercase px-1.5 ${ACTIVITY_COLORS[task.type]}`}
                            >
                              {ACTIVITY_LABELS[task.type]}
                            </Badge>
                            {task.status === "atrasado" && (
                              <Badge
                                variant="destructive"
                                className="text-[10px] h-5 uppercase px-1.5"
                              >
                                Atrasado
                              </Badge>
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <BookOpen size={12} /> {task.topicName}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 sm:mt-0 ml-9 sm:ml-0 flex items-center gap-2">
                        <div className="flex items-center gap-1 text-xs font-medium bg-surface px-2 py-1 rounded text-muted-foreground">
                          <Clock size={12} />
                          {task.durationMinutes} min
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                              <MoreVertical size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => toggleStatus(idx, task.id)}>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              {task.status === "concluido"
                                ? "Desmarcar Concluído"
                                : "Marcar Concluído"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setTaskStatus(idx, task.id, "atrasado")}
                            >
                              <Clock className="mr-2 h-4 w-4" /> Marcar como Atrasado
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />

                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>
                                <MoveRight className="mr-2 h-4 w-4" /> Mover para...
                              </DropdownMenuSubTrigger>
                              <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                  {WEEK_DAYS.map((d, dIdx) => (
                                    <DropdownMenuItem
                                      key={d}
                                      onClick={() => moveTask(idx, dIdx, task.id)}
                                      disabled={idx === dIdx}
                                    >
                                      {d}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuSubContent>
                              </DropdownMenuPortal>
                            </DropdownMenuSub>

                            <DropdownMenuItem onClick={() => setEditingTask({ dayIdx: idx, task })}>
                              <Edit2 className="mr-2 h-4 w-4" /> Editar Bloco
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => deleteTask(idx, task.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Bloco de Estudo</DialogTitle>
          </DialogHeader>
          {editingTask && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="subject">Matéria</Label>
                <ShadSelect
                  value={editingTask.task.subjectId}
                  onValueChange={(val) => {
                    const sub = subjects.find((s) => s.id === val);
                    setEditingTask({
                      ...editingTask,
                      task: {
                        ...editingTask.task,
                        subjectId: val,
                        subjectName: sub ? sub.name : editingTask.task.subjectName,
                      },
                    });
                  }}
                >
                  <SelectTrigger id="subject">
                    <SelectValue placeholder="Selecione a matéria" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </ShadSelect>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="type">Atividade</Label>
                <ShadSelect
                  value={editingTask.task.type}
                  onValueChange={(val: ActivityType) =>
                    setEditingTask({ ...editingTask, task: { ...editingTask.task, type: val } })
                  }
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Tipo de estudo" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACTIVITY_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </ShadSelect>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="topic">Tópico / Foco</Label>
                <Input
                  id="topic"
                  value={editingTask.task.topicName}
                  onChange={(e) =>
                    setEditingTask({
                      ...editingTask,
                      task: { ...editingTask.task, topicName: e.target.value },
                    })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="duration">Duração (minutos)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={editingTask.task.durationMinutes}
                  onChange={(e) =>
                    setEditingTask({
                      ...editingTask,
                      task: { ...editingTask.task, durationMinutes: parseInt(e.target.value) || 0 },
                    })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTask(null)}>
              Cancelar
            </Button>
            <Button onClick={handleEditSave}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
