import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSyncStorage } from "@/hooks/useSyncStorage";
import {
  ActivityType,
  TaskStatus,
  WEEK_DAYS,
  ACTIVITY_LABELS,
  ACTIVITY_COLORS,
  getStartOfWeek,
  getEndOfWeek,
  getWeekDates,
  formatDateOnly,
  encodeTitle,
  decodeTitle,
  getItemDayIdx,
  getTodayDayIdx,
  fetchActiveWeeklyPlan,
  fetchActivePlanItems,
  getCachedWeeklyPlan,
  getCachedPlanItems,
  setCachedPlanItems,
  setCachedWeeklyPlan,
  setActivePlanBlockForStudy,
  togglePlanItemCompletionInDb,
} from "@/lib/plan-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
  Plus,
  Play,
  Sparkles,
  RotateCcw,
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

type PlanTask = {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  topicName: string;
  durationMinutes: number;
  type: ActivityType;
  status: TaskStatus;
  scheduledFor: string;
  dayIdx: number;
  rawTitle: string;
};

type PlanDay = {
  dayName: string;
  date: Date;
  items: PlanTask[];
};

function PlanoSemanalRoute() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [editingTask, setEditingTask] = useState<{ dayIdx: number; task: PlanTask } | null>(null);
  const [addingTaskDay, setAddingTaskDay] = useState<{
    dayIdx: number;
    task: Omit<PlanTask, "id" | "subjectColor" | "rawTitle">;
  } | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Persiste quais dias do acordeão estão abertos e o checkpoint de onde o usuário parou
  const [openDays, setOpenDays] = useSyncStorage<string[]>(
    `@sinapse:plano:openDays:${user?.id || "anon"}`,
    ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"],
  );
  const [checkpointTaskId, setCheckpointTaskId] = useSyncStorage<string | null>(
    `@sinapse:plano:checkpoint:${user?.id || "anon"}`,
    null,
  );

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
        .eq("user_id", user?.id)
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: topics = [] } = useQuery({
    queryKey: ["topics", user?.id],
    queryFn: async () => {
      if (!subjects.length) return [];
      const { data } = await supabase
        .from("topics")
        .select("*")
        .in(
          "subject_id",
          subjects.map((s) => s.id),
        )
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!user?.id && subjects.length > 0,
  });

  const { data: studyHistory = [] } = useQuery({
    queryKey: ["history", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("study_sessions")
        .select("id, subject_id, duration_minutes, notes")
        .eq("user_id", user?.id);
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: preferences } = useQuery({
    queryKey: ["preferences", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("onboarding_preferences")
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: weeklyPlan, isLoading: loadingPlan } = useQuery({
    queryKey: ["weeklyPlan", user?.id],
    queryFn: () => fetchActiveWeeklyPlan(user!.id),
    initialData: () => getCachedWeeklyPlan(user?.id) || undefined,
    enabled: !!user?.id,
  });

  const { data: planItems = [], isLoading: loadingItems } = useQuery({
    queryKey: ["planItems", weeklyPlan?.id],
    queryFn: () => fetchActivePlanItems(user!.id, weeklyPlan!.id),
    initialData: () => {
      const cached = getCachedPlanItems(user?.id);
      if (weeklyPlan?.id && cached.length > 0 && cached[0]?.weekly_plan_id === weeklyPlan.id) {
        return cached;
      }
      return undefined;
    },
    enabled: !!weeklyPlan?.id && !!user?.id,
  });

  // Mapeamento dos itens para a Interface (preservando o dia da semana mesmo ao virar a semana)
  const plan: PlanDay[] = useMemo(() => {
    const start = getStartOfWeek(new Date());
    const dates = getWeekDates(start);

    return WEEK_DAYS.map((dayName, idx) => {
      const dayDate = dates[idx];
      const itemsForDay = planItems
        .filter((item) => getItemDayIdx(item) === idx)
        .sort((a, b) => {
          const da = new Date(a.scheduled_for);
          const db = new Date(b.scheduled_for);
          return da.getHours() * 60 + da.getMinutes() - (db.getHours() * 60 + db.getMinutes());
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
          subjectColor: subject?.color || "#a8ff00",
          topicName: decoded.topicName,
          durationMinutes: item.duration_minutes,
          type: decoded.type,
          status,
          scheduledFor: item.scheduled_for,
          dayIdx: idx,
          rawTitle: item.title,
        };
      });

      return { dayName, date: dayDate, items };
    });
  }, [planItems, subjects]);

  // Lista linear de todas as tarefas da semana e identificação de "Onde você parou"
  const allTasksFlat = useMemo(() => {
    return plan.flatMap((d) => d.items);
  }, [plan]);

  const completedTasksCount = useMemo(
    () => allTasksFlat.filter((t) => t.status === "concluido").length,
    [allTasksFlat],
  );

  const progressPercentage = useMemo(() => {
    if (allTasksFlat.length === 0) return 0;
    return Math.round((completedTasksCount / allTasksFlat.length) * 100);
  }, [allTasksFlat.length, completedTasksCount]);

  const todayIdx = useMemo(() => getTodayDayIdx(), []);
  const todayTasks = useMemo(() => plan[todayIdx]?.items || [], [plan, todayIdx]);
  const todayPendingTasks = useMemo(
    () => todayTasks.filter((t) => t.status !== "concluido"),
    [todayTasks],
  );
  const todayCompletedCount = useMemo(
    () => todayTasks.filter((t) => t.status === "concluido").length,
    [todayTasks],
  );

  // Determina o bloco prioritário de hoje (ou próximo pendente da semana caso hoje esteja concluído/vazio)
  const resumeTask: PlanTask | null = useMemo(() => {
    if (allTasksFlat.length === 0) return null;

    // 1. Se há um checkpoint salvo para hoje que ainda está pendente, prioriza ele
    if (checkpointTaskId) {
      const savedToday = todayPendingTasks.find((t) => t.id === checkpointTaskId);
      if (savedToday) return savedToday;
    }

    // 2. Prioriza o primeiro bloco pendente de HOJE
    if (todayPendingTasks.length > 0) {
      return todayPendingTasks[0];
    }

    // 3. Se hoje não tem pendências, verifica se há um checkpoint salvo em outro dia
    if (checkpointTaskId) {
      const saved = allTasksFlat.find(
        (t) => t.id === checkpointTaskId && t.status !== "concluido",
      );
      if (saved) return saved;
    }

    // 4. Caso contrário, retorna o próximo pendente da semana
    return allTasksFlat.find((t) => t.status !== "concluido") || null;
  }, [allTasksFlat, todayPendingTasks, checkpointTaskId]);

  const invalidateAllPlanQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["weeklyPlan"] });
    queryClient.invalidateQueries({ queryKey: ["planItems"] });
    queryClient.invalidateQueries({ queryKey: ["weekPlanItems"] });
    queryClient.invalidateQueries({ queryKey: ["todayMissions"] });
    queryClient.invalidateQueries({ queryKey: ["history"] });
    queryClient.invalidateQueries({ queryKey: ["studyHistory"] });
    queryClient.invalidateQueries({ queryKey: ["recentStudySessions"] });
  };

  // Inicia o estudo no Estúdio de Foco a partir de um bloco do cronograma
  const handleStartStudyFromBlock = (task: PlanTask) => {
    setCheckpointTaskId(task.id);
    setActivePlanBlockForStudy({
      planItemId: task.id,
      subjectId: task.subjectId,
      subjectName: task.subjectName,
      type: task.type,
      topicName: task.topicName,
      durationMinutes: task.durationMinutes,
    });
    navigate({ to: "/app/estudo" });
  };

  // Mutations
  const generatePlanMutation = useMutation({
    mutationFn: async (options?: { preserveCompleted?: boolean; advanceCycle?: boolean }) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      if (subjects.length === 0) {
        throw new Error("Você precisa cadastrar matérias na Central de Matérias primeiro!");
      }

      const preserveCompleted = options?.preserveCompleted ?? true;
      const advanceCycle = options?.advanceCycle ?? false;

      const start = getStartOfWeek(new Date());
      const end = getEndOfWeek(start);
      const dates = getWeekDates(start);

      let targetPlanId = weeklyPlan?.id;

      if (!targetPlanId) {
        const { data: newPlan, error: planError } = await supabase
          .from("weekly_plans")
          .insert([
            {
              user_id: user.id,
              start_date: formatDateOnly(start),
              end_date: formatDateOnly(end),
            },
          ])
          .select()
          .single();

        if (planError) throw planError;
        targetPlanId = newPlan.id;
        setCachedWeeklyPlan(user.id, newPlan);
      } else {
        await supabase
          .from("weekly_plans")
          .update({
            start_date: formatDateOnly(start),
            end_date: formatDateOnly(end),
          })
          .eq("id", targetPlanId);
      }

      // Itens já concluídos no plano atual
      const existingCompletedItems = planItems.filter((item) => item.completed);

      if (targetPlanId) {
        if (preserveCompleted && !advanceCycle && existingCompletedItems.length > 0) {
          // Remove apenas os itens não concluídos para preservar o progresso atual da semana
          await supabase
            .from("plan_items")
            .delete()
            .eq("weekly_plan_id", targetPlanId)
            .eq("completed", false);
        } else {
          // Limpa para gerar a nova semana (mas mantendo a contagem de módulos estudados!)
          await supabase.from("plan_items").delete().eq("weekly_plan_id", targetPlanId);
        }
      }

      const weightedSubjects: typeof subjects = [];
      const subjectWeights = subjects.map((sub) => {
        let weight = 3; // Default Médio
        if (sub.difficulty === "Muito Fácil") weight = 1;
        if (sub.difficulty === "Fácil") weight = 2;
        if (sub.difficulty === "Médio") weight = 3;
        if (sub.difficulty === "Difícil") weight = 4;
        if (sub.difficulty === "Muito Difícil") weight = 5;
        return { sub, weight };
      });

      const maxWeight = Math.max(...subjectWeights.map((sw) => sw.weight), 0);
      for (let i = 0; i < maxWeight; i++) {
        subjectWeights.forEach((sw) => {
          if (sw.weight > i) {
            weightedSubjects.push(sw.sub);
          }
        });
      }

      // Contabiliza quantos blocos cada matéria já teve concluídos (histórico + plano)
      // para continuar a numeração de módulos/tópicos exatamente de onde o usuário parou!
      const subjectStepCounter: Record<string, number> = {};
      subjects.forEach((s) => {
        const completedInHistory = studyHistory.filter((h) => h.subject_id === s.id).length;
        const completedInPlan = existingCompletedItems.filter((i) => i.subject_id === s.id).length;
        subjectStepCounter[s.id] = Math.max(completedInHistory, completedInPlan);
      });

      const newItems: any[] = [];
      let subjectIdx = 0;

      WEEK_DAYS.forEach((day, dIdx) => {
        const globalDayId = dIdx === 6 ? 0 : dIdx + 1;
        let minutes = 0;

        if (
          preferences?.daily_study_hours &&
          preferences.daily_study_hours[globalDayId.toString()] !== undefined
        ) {
          minutes = preferences.daily_study_hours[globalDayId.toString()];
        } else {
          let fallbackHours = preferences?.minutes_per_day
            ? Math.floor(preferences.minutes_per_day / 60)
            : preferences?.hours_per_day || 4;
          if (day === "Domingo") fallbackHours = Math.max(1, Math.floor(fallbackHours / 2));
          minutes = fallbackHours * 60;
        }

        if (preferences?.study_days && !preferences.study_days.includes(globalDayId)) {
          minutes = 0;
        }

        // Desconta os minutos dos blocos já concluídos neste dia se estivermos preservando concluídos
        const completedForThisDay =
          preserveCompleted && !advanceCycle
            ? existingCompletedItems.filter((item) => getItemDayIdx(item) === dIdx)
            : [];
        const completedMinutesToday = completedForThisDay.reduce(
          (acc, item) => acc + (item.duration_minutes || 0),
          0,
        );

        let remainingMinutes = Math.max(0, minutes - completedMinutesToday);
        if (remainingMinutes === 0) return;

        let startHour = 8;
        let startMinute = 0;

        if (completedForThisDay.length > 0) {
          const lastCompleted = completedForThisDay[completedForThisDay.length - 1];
          const lastDate = new Date(lastCompleted.scheduled_for);
          const endTotalMins =
            lastDate.getHours() * 60 +
            lastDate.getMinutes() +
            (lastCompleted.duration_minutes || 60);
          startHour = Math.min(22, Math.floor(endTotalMins / 60));
          startMinute = endTotalMins % 60;
        }

        while (remainingMinutes > 0) {
          const blockDuration = Math.min(60, remainingMinutes);

          const sub = weightedSubjects[subjectIdx % weightedSubjects.length];
          subjectIdx++;

          const stepNum = subjectStepCounter[sub.id] || 0;
          subjectStepCounter[sub.id] = stepNum + 1;

          const type: ActivityType =
            stepNum % 4 === 3 ? "revisao" : stepNum % 2 === 1 ? "questoes" : "teoria";

          // Se o usuário cadastrou tópicos na Central de Matérias para esta disciplina, usa-os!
          const subTopics = topics.filter((t: any) => t.subject_id === sub.id);
          const moduleNumber = Math.floor(stepNum / 2) + 1;
          const customTopic =
            subTopics.length > 0 ? subTopics[(moduleNumber - 1) % subTopics.length]?.name : null;

          const topicName = customTopic
            ? `${customTopic} (${ACTIVITY_LABELS[type]})`
            : `${ACTIVITY_LABELS[type]} - Módulo ${moduleNumber}`;

          const dateForTask = new Date(dates[dIdx]);
          dateForTask.setHours(startHour, startMinute, 0, 0);

          newItems.push({
            weekly_plan_id: targetPlanId,
            subject_id: sub.id,
            title: encodeTitle(type, topicName, false, dIdx),
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
        }
      });

      if (newItems.length > 0) {
        const { error: itemsError } = await supabase.from("plan_items").insert(newItems);
        if (itemsError) throw itemsError;
      }
    },
    onSuccess: (_, vars) => {
      if (!weeklyPlan) {
        trackEvent("first_plan_generated");
      }
      if (vars?.advanceCycle) {
        setCheckpointTaskId(null);
      }
      invalidateAllPlanQueries();
      toast.success(
        vars?.advanceCycle
          ? "Nova semana gerada continuando dos módulos onde você parou!"
          : "Cronograma atualizado mantendo seu progresso salvo!",
      );
    },
    onError: (err: any) => toast.error(err.message || "Erro ao gerar cronograma."),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (task: PlanTask) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const isCompleted = task.status === "concluido";
      return togglePlanItemCompletionInDb({
        userId: user.id,
        itemId: task.id,
        subjectId: task.subjectId || null,
        durationMinutes: task.durationMinutes,
        currentCompleted: isCompleted,
        rawTitle: task.rawTitle,
      });
    },
    onMutate: async (task: PlanTask) => {
      await queryClient.cancelQueries({ queryKey: ["planItems", weeklyPlan?.id] });
      const previousItems =
        queryClient.getQueryData<any[]>(["planItems", weeklyPlan?.id]) || planItems;

      const isCompleted = task.status === "concluido";
      const newStatus = !isCompleted;
      const updatedTitle = encodeTitle(
        task.type,
        task.topicName,
        newStatus ? false : task.status === "atrasado",
        task.dayIdx,
      );

      const optimisticItems = previousItems.map((item) =>
        item.id === task.id
          ? { ...item, completed: newStatus, title: updatedTitle }
          : item,
      );

      queryClient.setQueryData(["planItems", weeklyPlan?.id], optimisticItems);
      setCachedPlanItems(user?.id, optimisticItems);

      // Atualiza o checkpoint de onde o usuário parou para o próximo bloco pendente
      if (newStatus) {
        const currentIdx = allTasksFlat.findIndex((t) => t.id === task.id);
        const nextPending =
          allTasksFlat
            .slice(currentIdx + 1)
            .find((t) => t.id !== task.id && t.status !== "concluido") ||
          allTasksFlat.find((t) => t.id !== task.id && t.status !== "concluido");
        setCheckpointTaskId(nextPending ? nextPending.id : null);
      } else {
        setCheckpointTaskId(task.id);
      }

      return { previousItems };
    },
    onError: (err: any, _task, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(["planItems", weeklyPlan?.id], context.previousItems);
        setCachedPlanItems(user?.id, context.previousItems);
      }
      toast.error("Erro ao salvar progresso: " + (err.message || "Tente novamente."));
    },
    onSuccess: (res) => {
      invalidateAllPlanQueries();
      if (res.newStatus) {
        toast.success("Progresso salvo! Bloco marcado como concluído.");
      }
    },
  });

  const markDelayedMutation = useMutation({
    mutationFn: async (task: PlanTask) => {
      const newTitle = encodeTitle(task.type, task.topicName, true, task.dayIdx);
      const { error } = await supabase
        .from("plan_items")
        .update({ title: newTitle, completed: false })
        .eq("id", task.id);
      if (error) throw error;
      return newTitle;
    },
    onMutate: async (task: PlanTask) => {
      await queryClient.cancelQueries({ queryKey: ["planItems", weeklyPlan?.id] });
      const previousItems =
        queryClient.getQueryData<any[]>(["planItems", weeklyPlan?.id]) || planItems;
      const newTitle = encodeTitle(task.type, task.topicName, true, task.dayIdx);
      const optimistic = previousItems.map((item) =>
        item.id === task.id ? { ...item, title: newTitle, completed: false } : item,
      );
      queryClient.setQueryData(["planItems", weeklyPlan?.id], optimistic);
      setCachedPlanItems(user?.id, optimistic);
      setCheckpointTaskId(task.id);
      return { previousItems };
    },
    onError: (err: any, _task, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(["planItems", weeklyPlan?.id], context.previousItems);
        setCachedPlanItems(user?.id, context.previousItems);
      }
      toast.error("Erro ao atualizar bloco: " + err.message);
    },
    onSuccess: () => {
      invalidateAllPlanQueries();
      toast.info("Bloco marcado como atrasado e salvo como ponto de retomada.");
    },
  });

  const moveTaskMutation = useMutation({
    mutationFn: async ({ task, toDayIdx }: { task: PlanTask; toDayIdx: number }) => {
      const targetDate = new Date(plan[toDayIdx].date);
      const originalTime = new Date(task.scheduledFor);
      targetDate.setHours(originalTime.getHours(), originalTime.getMinutes(), 0, 0);
      const newTitle = encodeTitle(
        task.type,
        task.topicName,
        task.status === "atrasado",
        toDayIdx,
      );

      const { error } = await supabase
        .from("plan_items")
        .update({
          scheduled_for: targetDate.toISOString(),
          title: newTitle,
        })
        .eq("id", task.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      invalidateAllPlanQueries();
      const targetDayName = plan[vars.toDayIdx].dayName;
      if (!openDays.includes(targetDayName)) {
        setOpenDays([...openDays, targetDayName]);
      }
      toast.success(`Bloco movido para ${targetDayName}`);
    },
    onError: (err: any) => toast.error("Erro ao mover bloco: " + err.message),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("plan_items").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["planItems", weeklyPlan?.id] });
      const previousItems =
        queryClient.getQueryData<any[]>(["planItems", weeklyPlan?.id]) || planItems;
      const optimistic = previousItems.filter((item) => item.id !== id);
      queryClient.setQueryData(["planItems", weeklyPlan?.id], optimistic);
      setCachedPlanItems(user?.id, optimistic);
      return { previousItems };
    },
    onError: (err: any, _id, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(["planItems", weeklyPlan?.id], context.previousItems);
        setCachedPlanItems(user?.id, context.previousItems);
      }
      toast.error("Erro ao remover bloco: " + err.message);
    },
    onSuccess: () => {
      invalidateAllPlanQueries();
      toast.info("Bloco removido do plano.");
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (task: Omit<PlanTask, "id" | "subjectColor" | "rawTitle">) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      let targetPlanId = weeklyPlan?.id;
      if (!targetPlanId) {
        const start = getStartOfWeek(new Date());
        const end = getEndOfWeek(start);
        const { data: newPlan, error: planError } = await supabase
          .from("weekly_plans")
          .insert([
            {
              user_id: user.id,
              start_date: formatDateOnly(start),
              end_date: formatDateOnly(end),
            },
          ])
          .select()
          .single();
        if (planError) throw planError;
        targetPlanId = newPlan.id;
        setCachedWeeklyPlan(user.id, newPlan);
      }

      const newTitle = encodeTitle(
        task.type,
        task.topicName,
        task.status === "atrasado",
        task.dayIdx,
      );
      const { error } = await supabase.from("plan_items").insert({
        weekly_plan_id: targetPlanId,
        subject_id: task.subjectId || null,
        title: newTitle,
        duration_minutes: task.durationMinutes,
        scheduled_for: task.scheduledFor,
        completed: task.status === "concluido",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAllPlanQueries();
      setAddingTaskDay(null);
      toast.success("Bloco adicionado e salvo no cronograma!");
    },
    onError: (err: any) => toast.error("Erro ao adicionar bloco: " + err.message),
  });

  const saveTaskMutation = useMutation({
    mutationFn: async (task: PlanTask) => {
      const newTitle = encodeTitle(
        task.type,
        task.topicName,
        task.status === "atrasado",
        task.dayIdx,
      );
      const { error } = await supabase
        .from("plan_items")
        .update({
          subject_id: task.subjectId || null,
          title: newTitle,
          duration_minutes: task.durationMinutes,
          scheduled_for: task.scheduledFor,
        })
        .eq("id", task.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAllPlanQueries();
      setEditingTask(null);
      toast.success("Bloco atualizado com sucesso!");
    },
    onError: (err: any) => toast.error("Erro ao atualizar bloco: " + err.message),
  });

  // Handlers
  const handleEditSave = () => {
    if (!editingTask) return;
    saveTaskMutation.mutate(editingTask.task);
  };

  const distribution = useMemo(() => {
    const stats: Record<string, { name: string; color: string; duration: number }> = {};
    let totalMinutes = 0;
    planItems.forEach((item) => {
      const sub = subjects.find((s) => s.id === item.subject_id);
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
      data: Object.values(stats).sort((a, b) => b.duration - a.duration),
    };
  }, [planItems, subjects]);

  const hasEmptyPlan = planItems.length === 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto pb-24 lg:pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Seu Cronograma</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Organize sua semana com precisão. Seu progresso fica salvo automaticamente.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {!hasEmptyPlan && (
            <Button
              variant="outline"
              onClick={() => generatePlanMutation.mutate({ preserveCompleted: false, advanceCycle: true })}
              disabled={generatePlanMutation.isPending || loadingPlan}
              className="flex-1 md:flex-none border-primary/30 text-primary hover:bg-primary/10"
              title="Inicia uma nova semana mantendo o avanço dos módulos estudados"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Avançar Semana
            </Button>
          )}
          <Button
            onClick={() => generatePlanMutation.mutate({ preserveCompleted: true, advanceCycle: false })}
            disabled={generatePlanMutation.isPending || loadingPlan}
            className="flex-1 md:flex-none shadow-glow font-bold"
          >
            {generatePlanMutation.isPending ? (
              <span className="flex items-center">
                <BrainCircuit className="mr-2 h-4 w-4 animate-pulse" /> Processando...
              </span>
            ) : (
              <span className="flex items-center">
                <BrainCircuit className="mr-2 h-4 w-4" />{" "}
                {hasEmptyPlan ? "Gerar Cronograma IA" : "Otimizar Pendentes"}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Card: O que tenho que estudar hoje */}
      {!hasEmptyPlan && (
        <Card className="bg-surface-elevated border-primary/40 shadow-[0_0_25px_rgba(168,255,0,0.06)] overflow-hidden">
          <CardContent className="p-4 md:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
                <Sparkles size={14} />
                {resumeTask ? "O que tenho que estudar hoje" : "Meta Semanal Concluída"}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
                {todayTasks.length > 0 && (
                  <span className="text-primary font-semibold">
                    Hoje ({WEEK_DAYS[todayIdx]}): {todayCompletedCount}/{todayTasks.length}
                  </span>
                )}
                <span>
                  Semana: {completedTasksCount} de {allTasksFlat.length} blocos concluídos (
                  {progressPercentage}%)
                </span>
              </div>
            </div>

            <Progress value={progressPercentage} className="h-2" />

            {todayPendingTasks.length > 0 ? (
              <div className="space-y-2.5 pt-1">
                {todayPendingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-background/60 p-4 rounded-xl border border-border"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-3 h-10 rounded-full shrink-0 mt-0.5"
                        style={{ backgroundColor: task.subjectColor }}
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className="bg-primary/20 text-primary hover:bg-primary/30 border-none text-[10px] uppercase font-bold">
                            {WEEK_DAYS[task.dayIdx]}
                          </Badge>
                          <span className="font-bold text-base text-foreground">
                            {task.subjectName}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] h-5 uppercase px-1.5 ${ACTIVITY_COLORS[task.type]
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
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <BookOpen size={13} className="text-primary" />
                          <span>{task.topicName}</span>
                          <span>•</span>
                          <Clock size={13} />
                          <span>
                            {new Date(task.scheduledFor).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            ({task.durationMinutes} min)
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleStatusMutation.mutate(task)}
                        className="flex-1 md:flex-none border-border hover:border-primary/50"
                      >
                        <CheckCircle2 className="mr-1.5 h-4 w-4 text-primary" />
                        Concluir Bloco
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleStartStudyFromBlock(task)}
                        className="flex-1 md:flex-none shadow-glow font-bold"
                      >
                        <Play className="mr-1.5 h-4 w-4 fill-current" />
                        Estudar Agora
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : resumeTask ? (
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pt-1 bg-background/60 p-4 rounded-xl border border-border">
                <div className="flex items-start gap-3">
                  <div
                    className="w-3 h-10 rounded-full shrink-0 mt-0.5"
                    style={{ backgroundColor: resumeTask.subjectColor }}
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-primary/20 text-primary hover:bg-primary/30 border-none text-[10px] uppercase font-bold">
                        {WEEK_DAYS[resumeTask.dayIdx]}
                      </Badge>
                      <span className="font-bold text-base text-foreground">
                        {resumeTask.subjectName}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] h-5 uppercase px-1.5 ${ACTIVITY_COLORS[resumeTask.type]
                          }`}
                      >
                        {ACTIVITY_LABELS[resumeTask.type]}
                      </Badge>
                      {resumeTask.status === "atrasado" && (
                        <Badge variant="destructive" className="text-[10px] h-5 uppercase px-1.5">
                          Atrasado
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <BookOpen size={13} className="text-primary" />
                      <span>{resumeTask.topicName}</span>
                      <span>•</span>
                      <Clock size={13} />
                      <span>
                        {new Date(resumeTask.scheduledFor).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        ({resumeTask.durationMinutes} min)
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleStatusMutation.mutate(resumeTask)}
                    className="flex-1 md:flex-none border-border hover:border-primary/50"
                  >
                    <CheckCircle2 className="mr-1.5 h-4 w-4 text-primary" />
                    Concluir Bloco
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleStartStudyFromBlock(resumeTask)}
                    className="flex-1 md:flex-none shadow-glow font-bold"
                  >
                    <Play className="mr-1.5 h-4 w-4 fill-current" />
                    Estudar Agora
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-background/60 p-4 rounded-xl border border-primary/30">
                <div>
                  <p className="font-bold text-foreground">
                    Parabéns! Você concluiu todos os blocos desta semana!
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Clique ao lado para iniciar a próxima semana continuando exatamente dos próximos
                    módulos.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() =>
                    generatePlanMutation.mutate({ preserveCompleted: false, advanceCycle: true })
                  }
                  className="shadow-glow font-bold shrink-0"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Iniciar Próxima Semana
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
                Clique em "Gerar Cronograma IA" acima para estruturar seus blocos de estudo ou
                adicione um bloco manualmente.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                const start = getStartOfWeek(new Date());
                start.setHours(8, 0, 0, 0);
                setAddingTaskDay({
                  dayIdx: 0,
                  task: {
                    subjectId: subjects.length > 0 ? subjects[0].id : "",
                    subjectName: subjects.length > 0 ? subjects[0].name : "",
                    topicName: "Módulo 1",
                    durationMinutes: 60,
                    type: "teoria",
                    status: "pendente",
                    scheduledFor: start.toISOString(),
                    dayIdx: 0,
                  },
                });
              }}
            >
              <Plus size={16} className="mr-2" /> Adicionar Bloco Manualmente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="flex-1 w-full min-w-0">
            <Accordion
              type="multiple"
              value={openDays}
              onValueChange={setOpenDays}
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
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg">{day.dayName}</h3>
                        {(idx === todayIdx ||
                          (todayPendingTasks.length === 0 && resumeTask?.dayIdx === idx)) && (
                          <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] uppercase">
                            O que tenho que estudar hoje
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm font-normal">
                        <span className="text-muted-foreground bg-background px-2 py-1 rounded">
                          {day.items.filter((i) => i.status === "concluido").length}/
                          {day.items.length} Concluídos
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            const date = new Date(day.date);
                            date.setHours(8, 0, 0, 0);

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
                                dayIdx: idx,
                              },
                            });
                          }}
                        >
                          <Plus size={16} />
                        </Button>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-4 space-y-3">
                    {day.items.length === 0 ? (
                      <p className="text-muted-foreground text-sm italic px-2">
                        Nenhum bloco agendado.
                      </p>
                    ) : (
                      day.items.map((task) => {
                        const isTodayPending = idx === todayIdx && task.status !== "concluido";
                        const isResumePoint = isTodayPending || resumeTask?.id === task.id;
                        return (
                          <div
                            key={task.id}
                            className={`relative flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border transition-all ${task.status === "concluido"
                                ? "bg-surface opacity-60 border-transparent"
                                : task.status === "atrasado"
                                  ? "bg-red-500/5 border-red-500/30 shadow-sm"
                                  : isResumePoint
                                    ? "bg-background border-primary/60 ring-1 ring-primary/30 shadow-sm"
                                    : "bg-background border-border shadow-sm hover:border-primary/50"
                              }`}
                          >
                            <div className="flex items-start sm:items-center gap-3">
                              <button
                                onClick={() => toggleStatusMutation.mutate(task)}
                                className={`mt-1 sm:mt-0 flex-shrink-0 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors cursor-pointer ${task.status === "concluido"
                                    ? "bg-primary border-primary text-primary-foreground"
                                    : "border-muted-foreground hover:border-primary"
                                  }`}
                                title={
                                  task.status === "concluido"
                                    ? "Desmarcar concluído"
                                    : "Marcar como concluído"
                                }
                              >
                                {task.status === "concluido" && <CheckCircle2 size={16} />}
                              </button>

                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className={`font-semibold ${task.status === "concluido"
                                        ? "line-through text-muted-foreground"
                                        : ""
                                      }`}
                                  >
                                    {task.subjectName}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] h-5 uppercase px-1.5 ${ACTIVITY_COLORS[task.type]
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
                                  {isResumePoint && (
                                    <Badge className="bg-primary/20 text-primary border-none text-[10px] h-5 uppercase px-1.5">
                                      O que tenho que estudar hoje
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-sm text-muted-foreground flex items-center gap-1">
                                  <BookOpen size={12} /> {task.topicName}
                                </span>
                              </div>
                            </div>

                            <div className="mt-3 sm:mt-0 ml-9 sm:ml-0 flex items-center gap-2">
                              {task.status !== "concluido" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleStartStudyFromBlock(task)}
                                  className="h-7 px-2 text-xs text-primary hover:bg-primary/10"
                                  title="Abrir no Estúdio de Foco"
                                >
                                  <Play size={12} className="mr-1 fill-current" /> Focar
                                </Button>
                              )}

                              <div className="flex items-center gap-1 text-xs font-medium bg-surface px-2 py-1 rounded text-muted-foreground">
                                <Clock size={12} />
                                {new Date(task.scheduledFor).toLocaleTimeString("pt-BR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}{" "}
                                ({task.durationMinutes} min)
                              </div>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-full"
                                  >
                                    <MoreVertical size={16} />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52">
                                  <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => toggleStatusMutation.mutate(task)}
                                  >
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    {task.status === "concluido"
                                      ? "Desmarcar Concluído"
                                      : "Marcar Concluído"}
                                  </DropdownMenuItem>
                                  {task.status !== "concluido" && (
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setCheckpointTaskId(task.id);
                                        toast.success(
                                          "Destacado em 'O que tenho que estudar hoje'!",
                                        );
                                      }}
                                    >
                                      <Sparkles className="mr-2 h-4 w-4 text-primary" /> Destacar
                                      para estudar hoje
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    onClick={() => markDelayedMutation.mutate(task)}
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
                                            onClick={() =>
                                              moveTaskMutation.mutate({ task, toDayIdx: dIdx })
                                            }
                                            disabled={idx === dIdx}
                                          >
                                            {d}
                                          </DropdownMenuItem>
                                        ))}
                                      </DropdownMenuSubContent>
                                    </DropdownMenuPortal>
                                  </DropdownMenuSub>

                                  <DropdownMenuItem
                                    onClick={() => setEditingTask({ dayIdx: idx, task })}
                                  >
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
                        );
                      })
                    )}
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
                      {Math.floor(distribution.totalMinutes / 60)}h{" "}
                      {distribution.totalMinutes % 60 > 0
                        ? `${distribution.totalMinutes % 60}m`
                        : ""}
                    </span>
                    <span className="text-xs text-muted-foreground mt-1">na semana</span>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {distribution.data.map((item) => (
                    <div key={item.name} className="flex items-center text-sm">
                      <div
                        className="w-3 h-3 rounded-full mr-2 shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="flex-1 truncate text-muted-foreground pr-2">
                        {item.name}
                      </span>
                      <span className="font-bold shrink-0">
                        {Math.floor(item.duration / 60)}h{" "}
                        {item.duration % 60 > 0 ? `${item.duration % 60}m` : ""}
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
                    setAddingTaskDay({
                      ...addingTaskDay,
                      task: { ...addingTaskDay.task, type: val },
                    })
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
                  value={new Date(addingTaskDay.task.scheduledFor).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  onChange={(e) => {
                    const [h, m] = e.target.value.split(":");
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
                      task: {
                        ...addingTaskDay.task,
                        durationMinutes: parseInt(e.target.value) || 0,
                      },
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
                    setEditingTask({
                      ...editingTask,
                      task: { ...editingTask.task, type: val },
                    })
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
                  value={new Date(editingTask.task.scheduledFor).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  onChange={(e) => {
                    const [h, m] = e.target.value.split(":");
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
                      task: {
                        ...editingTask.task,
                        durationMinutes: parseInt(e.target.value) || 0,
                      },
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
