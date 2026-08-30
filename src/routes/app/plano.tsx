import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { Subject } from "@/types/models";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BrainCircuit,
  CheckCircle2,
  Clock,
  CalendarDays,
  BookOpen,
  Trash2,
  Edit2,
  MoveRight,
  Plus,
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
import { trackEvent } from "@/lib/analytics";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

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
  scheduledFor: string;
};

type PlanDay = {
  dayName: string;
  date: Date;
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

// Utilitários de Data e Serialização
const getStartOfWeek = (d: Date) => {
  const date = new Date(d);
  const day = date.getDay(); // 0 é domingo
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

const getEndOfWeek = (start: Date) => {
  const date = new Date(start);
  date.setDate(date.getDate() + 6);
  date.setHours(23, 59, 59, 999);
  return date;
};

const getWeekDates = (start: Date) => {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
};

const encodeTitle = (type: ActivityType, topicName: string, isDelayed: boolean = false) =>
  JSON.stringify({ type, topicName, isDelayed });

const decodeTitle = (raw: string) => {
  try {
    const parsed = JSON.parse(raw);
    return {
      type: (parsed.type || "teoria") as ActivityType,
      topicName: (parsed.topicName || "") as string,
      isDelayed: !!parsed.isDelayed,
    };
  } catch (e) {
    return { type: "teoria" as ActivityType, topicName: raw, isDelayed: false };
  }
};

function PlanoSemanalRoute() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [editingTask, setEditingTask] = useState<{ dayIdx: number; task: PlanTask } | null>(null);
  const [addingTaskDay, setAddingTaskDay] = useState<{ dayIdx: number; task: Omit<PlanTask, "id"> } | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Queries
  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("subjects")
        .select("*")
        .eq("user_id", user?.id);
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: preferences } = useQuery({
    queryKey: ["preferences", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("onboarding_preferences")
        .select("*")
        .eq("user_id", user?.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: weeklyPlan, isLoading: loadingPlan } = useQuery({
    queryKey: ["weeklyPlan", user?.id],
    queryFn: async () => {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
      const { data, error } = await supabase
        .from("weekly_plans")
        .select("*")
        .eq("user_id", user?.id)
        .lte("start_date", today)
        .gte("end_date", today)
        .single();
      if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows returned
      return data || null;
    },
    enabled: !!user?.id,
  });

  const { data: planItems = [], isLoading: loadingItems } = useQuery({
    queryKey: ["planItems", weeklyPlan?.id],
    queryFn: async () => {
      if (!weeklyPlan) return [];
      const { data, error } = await supabase
        .from("plan_items")
        .select("*")
        .eq("weekly_plan_id", weeklyPlan.id)
        .order("scheduled_for", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!weeklyPlan,
  });

  // Mapeamento dos itens para a Interface
  const plan: PlanDay[] = useMemo(() => {
    const start = getStartOfWeek(new Date());
    const dates = getWeekDates(start);

    return WEEK_DAYS.map((dayName, idx) => {
      const dayDate = dates[idx];
      const itemsForDay = planItems.filter((item) => {
        const itemDate = new Date(item.scheduled_for);
        return (
          itemDate.getDate() === dayDate.getDate() &&
          itemDate.getMonth() === dayDate.getMonth()
        );
      });

      const items: PlanTask[] = itemsForDay.map((item) => {
        const decoded = decodeTitle(item.title);
        const subject = subjects.find((s) => s.id === item.subject_id);

        let status: TaskStatus = item.completed ? "concluido" : "pendente";
        if (decoded.isDelayed && !item.completed) status = "atrasado";

        return {
          id: item.id,
          subjectId: item.subject_id || "",
          subjectName: subject?.name || "Sem Matéria",
          topicName: decoded.topicName,
          durationMinutes: item.duration_minutes,
          type: decoded.type,
          status: status,
          scheduledFor: item.scheduled_for,
        };
      });

      return { dayName, date: dayDate, items };
    });
  }, [planItems, subjects]);

  // Mutations
  const generatePlanMutation = useMutation({
    mutationFn: async () => {
      if (subjects.length === 0) {
        throw new Error("Você precisa cadastrar matérias na Central do Edital primeiro!");
      }

      const start = getStartOfWeek(new Date());
      const end = getEndOfWeek(start);
      const dates = getWeekDates(start);

      let targetPlanId = weeklyPlan?.id;

      if (!targetPlanId) {
        const { data: newPlan, error: planError } = await supabase
          .from("weekly_plans")
          .insert([
            {
              user_id: user?.id,
              start_date: `${start.getFullYear()}-${String(start.getMonth()+1).padStart(2,'0')}-${String(start.getDate()).padStart(2,'0')}`,
              end_date: `${end.getFullYear()}-${String(end.getMonth()+1).padStart(2,'0')}-${String(end.getDate()).padStart(2,'0')}`,
            },
          ])
          .select()
          .single();

        if (planError) throw planError;
        targetPlanId = newPlan.id;
      } else {
        // Clear existing items to regenerate
        await supabase.from("plan_items").delete().eq("weekly_plan_id", targetPlanId);
      }

      const newItems: any[] = [];
      
      const weightedSubjects: typeof subjects = [];
      const subjectWeights = subjects.map(sub => {
        let weight = 3; // Default Médio
        if (sub.difficulty === "Muito Fácil") weight = 1;
        if (sub.difficulty === "Fácil") weight = 2;
        if (sub.difficulty === "Médio") weight = 3;
        if (sub.difficulty === "Difícil") weight = 4;
        if (sub.difficulty === "Muito Difícil") weight = 5;
        return { sub, weight };
      });

      const maxWeight = Math.max(...subjectWeights.map(sw => sw.weight), 0);
      for (let i = 0; i < maxWeight; i++) {
        subjectWeights.forEach(sw => {
          if (sw.weight > i) {
            weightedSubjects.push(sw.sub);
          }
        });
      }
      
      let subjectIdx = 0;

      WEEK_DAYS.forEach((day, dIdx) => {
        const globalDayId = dIdx === 6 ? 0 : dIdx + 1; // WEEK_DAYS começa na Segunda (0) e vai até Domingo (6). Global começa no Domingo (0).
        let minutes = 0;
        // fallback to old hours_per_day if daily_study_hours is empty
        if (preferences?.daily_study_hours && preferences.daily_study_hours[globalDayId.toString()]) {
          minutes = preferences.daily_study_hours[globalDayId.toString()];
        } else {
          let fallbackHours = preferences?.minutes_per_day ? Math.floor(preferences.minutes_per_day / 60) : (preferences?.hours_per_day || 4);
          if (day === "Domingo") fallbackHours = Math.max(1, Math.floor(fallbackHours / 2));
          minutes = fallbackHours * 60;
        }
        
        // check if day was explicitly excluded
        if (preferences?.study_days && !preferences.study_days.includes(globalDayId)) {
          minutes = 0;
        }
        
        if (minutes === 0) return;

        let remainingMinutes = minutes;
        let startHour = 8; // Default start time
        let startMinute = 0;
        let i = 0;

        while (remainingMinutes > 0) {
          let blockDuration = Math.min(60, remainingMinutes);

          const sub = weightedSubjects[subjectIdx % weightedSubjects.length];
          subjectIdx++;

          const type: ActivityType =
            i % 4 === 0 ? "revisao" : i % 2 === 0 ? "questoes" : "teoria";
          const topicName = `${ACTIVITY_LABELS[type]} - Módulo ${Math.floor(i / 2) + 1}`;

          const dateForTask = new Date(dates[dIdx]);
          dateForTask.setHours(startHour, startMinute, 0, 0);

          newItems.push({
            weekly_plan_id: targetPlanId,
            subject_id: sub.id,
            title: encodeTitle(type, topicName, false),
            scheduled_for: dateForTask.toISOString(),
            duration_minutes: blockDuration,
            completed: false,
          });

          remainingMinutes -= blockDuration;
          startMinute += blockDuration;
          if (startMinute >= 60) {
            startHour += Math.floor(startMinute / 60);
            startMinute = startMinute % 60;
          }
          i++;
        }
      });

      const { error: itemsError } = await supabase.from("plan_items").insert(newItems);
      if (itemsError) throw itemsError;
    },
    onSuccess: () => {
      if (!weeklyPlan) {
        trackEvent("first_plan_generated");
      }
      queryClient.invalidateQueries({ queryKey: ["weeklyPlan"] });
      queryClient.invalidateQueries({ queryKey: ["planItems"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
      toast.success("Cronograma otimizado com sucesso!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (task: PlanTask) => {
      const isCompleted = task.status === "concluido";
      const { error } = await supabase
        .from("plan_items")
        .update({ completed: !isCompleted })
        .eq("id", task.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planItems"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
    },
  });

  const markDelayedMutation = useMutation({
    mutationFn: async (task: PlanTask) => {
      const newTitle = encodeTitle(task.type, task.topicName, true);
      const { error } = await supabase
        .from("plan_items")
        .update({ title: newTitle, completed: false })
        .eq("id", task.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planItems"] });
      toast.info("Bloco marcado como atrasado.");
    },
  });

  const moveTaskMutation = useMutation({
    mutationFn: async ({ task, toDayIdx }: { task: PlanTask; toDayIdx: number }) => {
      const targetDate = new Date(plan[toDayIdx].date);
      const originalTime = new Date(task.scheduledFor);
      targetDate.setHours(originalTime.getHours(), originalTime.getMinutes(), 0, 0);

      const { error } = await supabase
        .from("plan_items")
        .update({ scheduled_for: targetDate.toISOString() })
        .eq("id", task.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["planItems"] });
      toast.success(`Bloco movido para ${plan[vars.toDayIdx].dayName}`);
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("plan_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planItems"] });
      toast.info("Bloco removido do plano.");
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (task: Omit<PlanTask, "id">) => {
      if (!weeklyPlan?.id) throw new Error("Nenhum plano ativo");
      const newTitle = encodeTitle(task.type, task.topicName, task.status === "atrasado");
      const { error } = await supabase
        .from("plan_items")
        .insert({
          weekly_plan_id: weeklyPlan.id,
          subject_id: task.subjectId,
          title: newTitle,
          duration_minutes: task.durationMinutes,
          scheduled_for: task.scheduledFor,
          completed: task.status === "concluido",
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planItems"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
      setAddingTaskDay(null);
      toast.success("Bloco adicionado!");
    },
  });

  const saveTaskMutation = useMutation({
    mutationFn: async (task: PlanTask) => {
      const newTitle = encodeTitle(task.type, task.topicName, task.status === "atrasado");
      const { error } = await supabase
        .from("plan_items")
        .update({
          subject_id: task.subjectId,
          title: newTitle,
          duration_minutes: task.durationMinutes,
          scheduled_for: task.scheduledFor,
        })
        .eq("id", task.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planItems"] });
      setEditingTask(null);
      toast.success("Bloco atualizado!");
    },
  });

  // Handlers
  const handleEditSave = () => {
    if (!editingTask) return;
    saveTaskMutation.mutate(editingTask.task);
  };

  const distribution = useMemo(() => {
    const stats: Record<string, {name: string, color: string, duration: number}> = {};
    let totalMinutes = 0;
    planItems.forEach(item => {
      const sub = subjects.find(s => s.id === item.subject_id);
      const name = sub?.name || "Sem Matéria";
      const color = sub?.color || "#888888";
      if (!stats[name]) {
        stats[name] = { name, color, duration: 0 };
      }
      const duration = item.duration_minutes || 0;
      stats[name].duration += duration;
      totalMinutes += duration;
    });
    return {
      totalMinutes,
      data: Object.values(stats).sort((a,b) => b.duration - a.duration)
    };
  }, [planItems, subjects]);

  const hasEmptyPlan = planItems.length === 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto pb-24 lg:pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Seu Cronograma</h1>
          <p className="text-muted-foreground mt-1 text-sm">Organize sua semana com precisão.</p>
        </div>
        <Button
          onClick={() => generatePlanMutation.mutate()}
          disabled={generatePlanMutation.isPending || loadingPlan}
          className="w-full md:w-auto shadow-glow font-bold"
        >
          {generatePlanMutation.isPending ? (
            <span className="flex items-center">
              <BrainCircuit className="mr-2 h-4 w-4 animate-pulse" /> Processando...
            </span>
          ) : (
            <span className="flex items-center">
              <BrainCircuit className="mr-2 h-4 w-4" />{" "}
              {hasEmptyPlan ? "Gerar Cronograma IA" : "Regerar Cronograma"}
            </span>
          )}
        </Button>
      </div>

      {loadingPlan || loadingItems ? (
        <div className="flex justify-center p-12 text-muted-foreground animate-pulse">
          Carregando cronograma...
        </div>
      ) : hasEmptyPlan ? (
        <Card className="bg-surface/30 border-dashed border-border/50 py-16 shadow-none">
          <CardContent className="flex flex-col items-center text-center space-y-4">
            <CalendarDays size={56} className="text-muted-foreground/20" />
            <div>
              <p className="font-display font-bold text-xl text-foreground">
                Sua semana está em branco
              </p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                Clique no botão acima para deixar a Inteligência Artificial estruturar seus blocos
                de estudo baseados nas suas metas.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="flex-1 w-full min-w-0">
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
                    <span className="text-muted-foreground bg-background px-2 py-1 rounded">
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
                          onClick={() => toggleStatusMutation.mutate(task)}
                          disabled={toggleStatusMutation.isPending}
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
                              className={`font-semibold ${
                                task.status === "concluido" ? "line-through text-muted-foreground" : ""
                              }`}
                            >
                              {task.subjectName}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] h-5 uppercase px-1.5 ${
                                ACTIVITY_COLORS[task.type]
                              }`}
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
                          {new Date(task.scheduledFor).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ({task.durationMinutes} min)
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
                            <DropdownMenuItem onClick={() => toggleStatusMutation.mutate(task)}>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              {task.status === "concluido"
                                ? "Desmarcar Concluído"
                                : "Marcar Concluído"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => markDelayedMutation.mutate(task)}>
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
                                      onClick={() => moveTaskMutation.mutate({ task, toDayIdx: dIdx })}
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
                              onClick={() => {
                                if (confirm("Remover este bloco?")) {
                                  deleteTaskMutation.mutate(task.id);
                                }
                              }}
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
                <div className="pt-2">
                  <Button
                    variant="outline"
                    className="w-full border-dashed text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      const date = new Date(day.date);
                      date.setHours(8, 0, 0, 0); // default to 8am
                      
                      setAddingTaskDay({
                        dayIdx: idx,
                        task: {
                          subjectId: subjects.length > 0 ? subjects[0].id : "",
                          subjectName: subjects.length > 0 ? subjects[0].name : "",
                          topicName: "Novo Bloco",
                          durationMinutes: 60,
                          type: "teoria",
                          status: "pendente",
                          scheduledFor: date.toISOString(),
                        }
                      });
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Matéria
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
            </Accordion>
          </div>
          
          <div className="w-full lg:w-80 shrink-0 lg:sticky lg:top-6">
            <Card className="bg-surface-elevated border-border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-center font-display">Distribuição</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[220px] w-full relative">
                  {isMounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={distribution.data}
                          dataKey="duration"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={95}
                          stroke="none"
                        >
                          {distribution.data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold font-display">
                      {Math.floor(distribution.totalMinutes / 60)}h {distribution.totalMinutes % 60 > 0 ? `${distribution.totalMinutes % 60}m` : ''}
                    </span>
                    <span className="text-xs text-muted-foreground mt-1">na semana</span>
                  </div>
                </div>
                
                <div className="mt-6 space-y-3">
                  {distribution.data.map(item => (
                    <div key={item.name} className="flex items-center text-sm">
                      <div className="w-3 h-3 rounded-full mr-2 shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="flex-1 truncate text-muted-foreground pr-2">{item.name}</span>
                      <span className="font-bold shrink-0">
                        {Math.floor(item.duration / 60)}h {item.duration % 60 > 0 ? `${item.duration % 60}m` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={!!addingTaskDay} onOpenChange={(open) => !open && setAddingTaskDay(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Adicionar Bloco de Estudo</DialogTitle>
          </DialogHeader>
          {addingTaskDay && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="add-subject">Matéria</Label>
                <ShadSelect
                  value={addingTaskDay.task.subjectId}
                  onValueChange={(val) => {
                    const sub = subjects.find((s) => s.id === val);
                    setAddingTaskDay({
                      ...addingTaskDay,
                      task: {
                        ...addingTaskDay.task,
                        subjectId: val,
                        subjectName: sub ? sub.name : addingTaskDay.task.subjectName,
                      },
                    });
                  }}
                >
                  <SelectTrigger id="add-subject">
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
                <Label htmlFor="add-type">Atividade</Label>
                <ShadSelect
                  value={addingTaskDay.task.type}
                  onValueChange={(val: ActivityType) =>
                    setAddingTaskDay({ ...addingTaskDay, task: { ...addingTaskDay.task, type: val } })
                  }
                >
                  <SelectTrigger id="add-type">
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
                <Label htmlFor="add-topic">Tópico / Foco</Label>
                <Input
                  id="add-topic"
                  value={addingTaskDay.task.topicName}
                  onChange={(e) =>
                    setAddingTaskDay({
                      ...addingTaskDay,
                      task: { ...addingTaskDay.task, topicName: e.target.value },
                    })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="add-startTime">Horário de Início</Label>
                <Input
                  id="add-startTime"
                  type="time"
                  value={new Date(addingTaskDay.task.scheduledFor).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}
                  onChange={(e) => {
                    const [h, m] = e.target.value.split(':');
                    if (h && m) {
                      const d = new Date(addingTaskDay.task.scheduledFor);
                      d.setHours(parseInt(h), parseInt(m), 0, 0);
                      setAddingTaskDay({
                        ...addingTaskDay,
                        task: { ...addingTaskDay.task, scheduledFor: d.toISOString() },
                      });
                    }
                  }}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="add-duration">Duração (minutos)</Label>
                <Input
                  id="add-duration"
                  type="number"
                  value={addingTaskDay.task.durationMinutes}
                  onChange={(e) =>
                    setAddingTaskDay({
                      ...addingTaskDay,
                      task: { ...addingTaskDay.task, durationMinutes: parseInt(e.target.value) || 0 },
                    })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddingTaskDay(null)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => addingTaskDay && createTaskMutation.mutate(addingTaskDay.task)} 
              disabled={createTaskMutation.isPending || !addingTaskDay?.task.subjectId}
            >
              {createTaskMutation.isPending ? "Adicionando..." : "Adicionar Bloco"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                <Label htmlFor="startTime">Horário de Início</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={new Date(editingTask.task.scheduledFor).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}
                  onChange={(e) => {
                    const [h, m] = e.target.value.split(':');
                    if (h && m) {
                      const d = new Date(editingTask.task.scheduledFor);
                      d.setHours(parseInt(h), parseInt(m), 0, 0);
                      setEditingTask({
                        ...editingTask,
                        task: { ...editingTask.task, scheduledFor: d.toISOString() },
                      });
                    }
                  }}
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
            <Button onClick={handleEditSave} disabled={saveTaskMutation.isPending}>
              {saveTaskMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
