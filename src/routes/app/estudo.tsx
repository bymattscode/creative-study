import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ActivityType,
  ACTIVITY_LABELS,
  getActivePlanBlockForStudy,
  setActivePlanBlockForStudy,
  fetchActiveWeeklyPlan,
  fetchActivePlanItems,
  setCachedPlanItems,
  decodeTitle,
  encodeTitle,
} from "@/lib/plan-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, FastForward, History, Square, CalendarCheck, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { trackEvent } from "@/lib/analytics";

export const Route = createFileRoute("/app/estudo")({
  component: EstudoRoute,
});

type TimerMode = "Foco" | "Pausa Curta" | "Pausa Longa" | "Livre";

interface PersistedTimerState {
  selectedSubject: string;
  selectedType: ActivityType;
  topic: string;
  mode: TimerMode;
  timeLeft: number;
  elapsedTime: number;
  isActive: boolean;
  sessionCount: number;
  activePlanItemId: string | null;
  lastTickAt: number | null;
}

const TIMER_STORAGE_KEY = "@sinapse:estudo:timerState";

// Utilities to serialize custom data into the "notes" column
const encodeNotes = (type: ActivityType, topicName: string, planItemId?: string | null) =>
  JSON.stringify({ type, topicName, ...(planItemId ? { planItemId } : {}) });

const decodeNotes = (raw?: string | null) => {
  if (!raw) return { type: "teoria" as ActivityType, topicName: "Sem Tópico" };
  try {
    const p = JSON.parse(raw);
    return {
      type: (p.type || "teoria") as ActivityType,
      topicName: (p.topicName || "Sem Tópico") as string,
    };
  } catch {
    return { type: "teoria" as ActivityType, topicName: raw };
  }
};

const getDuration = (m: TimerMode) => {
  switch (m) {
    case "Foco":
      return 25 * 60;
    case "Pausa Curta":
      return 5 * 60;
    case "Pausa Longa":
      return 15 * 60;
    case "Livre":
      return 0;
  }
};

const loadInitialTimerState = (): PersistedTimerState => {
  const defaultState: PersistedTimerState = {
    selectedSubject: "",
    selectedType: "teoria",
    topic: "",
    mode: "Foco",
    timeLeft: 25 * 60,
    elapsedTime: 0,
    isActive: false,
    sessionCount: 0,
    activePlanItemId: null,
    lastTickAt: null,
  };

  if (typeof window === "undefined") return defaultState;

  try {
    // 1. Verifica se o usuário clicou em "Estudar Agora" / "Focar" lá no Cronograma
    const activeBlock = getActivePlanBlockForStudy();
    const rawSaved = window.localStorage.getItem(TIMER_STORAGE_KEY);
    const saved: PersistedTimerState | null = rawSaved ? JSON.parse(rawSaved) : null;

    if (activeBlock) {
      // Limpa o gatilho único mas mantém no estado persistido do timer
      setActivePlanBlockForStudy(null);
      return {
        ...(saved || defaultState),
        selectedSubject: activeBlock.subjectId,
        selectedType: activeBlock.type,
        topic: activeBlock.topicName,
        activePlanItemId: activeBlock.planItemId,
        mode: "Foco",
        timeLeft: 25 * 60,
        elapsedTime: 0,
        isActive: false,
        lastTickAt: null,
      };
    }

    if (!saved) return defaultState;

    // Se o timer estava rodando quando o usuário trocou de aba/página, desconta o tempo decorrido
    if (saved.isActive && saved.lastTickAt) {
      const diffSeconds = Math.max(0, Math.floor((Date.now() - saved.lastTickAt) / 1000));
      if (saved.mode === "Livre") {
        return {
          ...saved,
          elapsedTime: saved.elapsedTime + diffSeconds,
          lastTickAt: Date.now(),
        };
      } else {
        const nextTimeLeft = Math.max(0, saved.timeLeft - diffSeconds);
        return {
          ...saved,
          timeLeft: nextTimeLeft,
          isActive: nextTimeLeft > 0,
          lastTickAt: nextTimeLeft > 0 ? Date.now() : null,
        };
      }
    }

    return saved;
  } catch {
    return defaultState;
  }
};

function EstudoRoute() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const initial = loadInitialTimerState();

  // Form State
  const [selectedSubject, setSelectedSubject] = useState<string>(initial.selectedSubject);
  const [selectedType, setSelectedType] = useState<ActivityType>(initial.selectedType);
  const [topic, setTopic] = useState(initial.topic);
  const [activePlanItemId, setActivePlanItemId] = useState<string | null>(initial.activePlanItemId);

  // Timer State
  const [mode, setMode] = useState<TimerMode>(initial.mode);
  const [timeLeft, setTimeLeft] = useState(initial.timeLeft);
  const [elapsedTime, setElapsedTime] = useState(initial.elapsedTime);
  const [isActive, setIsActive] = useState(initial.isActive);
  const [sessionCount, setSessionCount] = useState(initial.sessionCount);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Salva continuamente onde o usuário parou no Estúdio de Foco
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stateToPersist: PersistedTimerState = {
      selectedSubject,
      selectedType,
      topic,
      mode,
      timeLeft,
      elapsedTime,
      isActive,
      sessionCount,
      activePlanItemId,
      lastTickAt: isActive ? Date.now() : null,
    };
    try {
      window.localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(stateToPersist));
    } catch {
      // ignore storage errors
    }
  }, [
    selectedSubject,
    selectedType,
    topic,
    mode,
    timeLeft,
    elapsedTime,
    isActive,
    sessionCount,
    activePlanItemId,
  ]);

  // Queries
  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("subjects").select("*").eq("user_id", user?.id);
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: recentHistory = [] } = useQuery({
    queryKey: ["recentStudySessions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_sessions")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const switchMode = (m: TimerMode) => {
    setMode(m);
    setTimeLeft(getDuration(m));
    setElapsedTime(0);
    setIsActive(false);
  };

  const toggleTimer = () => {
    if (!selectedSubject && (mode === "Foco" || mode === "Livre")) {
      toast.error("Por favor, selecione uma matéria primeiro.");
      return;
    }
    if (!isActive && recentHistory.length === 0) {
      trackEvent("first_study_session_started");
    }
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(getDuration(mode));
    setElapsedTime(0);
  };

  // Mutation para salvar sessão e atualizar o bloco correspondente no Cronograma
  const saveSessionMutation = useMutation({
    mutationFn: async ({
      subjectId,
      durationSeconds,
      type,
      topicName,
      planItemId,
    }: {
      subjectId: string;
      durationSeconds: number;
      type: ActivityType;
      topicName: string;
      planItemId?: string | null;
    }) => {
      if (!user?.id) throw new Error("Não autenticado");

      const durationMinutes = Math.floor(durationSeconds / 60);
      if (durationMinutes < 1) return null;

      const encodedNotes = encodeNotes(type, topicName, planItemId);
      const startTime = new Date(Date.now() - durationSeconds * 1000).toISOString();
      const endTime = new Date().toISOString();

      const { data, error } = await supabase
        .from("study_sessions")
        .insert([
          {
            user_id: user.id,
            subject_id: subjectId,
            start_time: startTime,
            end_time: endTime,
            duration_minutes: durationMinutes,
            focus_score: 100,
            notes: encodedNotes,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Sincroniza conclusão com o Cronograma (plan_items)
      try {
        const activePlan = await fetchActiveWeeklyPlan(user.id);
        if (activePlan?.id) {
          const items = await fetchActivePlanItems(user.id, activePlan.id);
          let targetItem = planItemId
            ? items.find((i: any) => i.id === planItemId)
            : items.find((i: any) => !i.completed && i.subject_id === subjectId);

          if (targetItem && !targetItem.completed) {
            const decoded = decodeTitle(targetItem.title);
            const updatedTitle = encodeTitle(
              decoded.type,
              decoded.topicName,
              false,
              decoded.dayIdx,
            );
            await supabase
              .from("plan_items")
              .update({ completed: true, title: updatedTitle })
              .eq("id", targetItem.id);

            const updatedItems = items.map((i: any) =>
              i.id === targetItem.id ? { ...i, completed: true, title: updatedTitle } : i,
            );
            setCachedPlanItems(user.id, updatedItems);
          }
        }
      } catch (syncErr) {
        console.warn("Falha ao sincronizar sessão com o cronograma:", syncErr);
      }

      // Obter configuração global de revisão
      const { data: prefData } = await supabase
        .from("onboarding_preferences")
        .select("global_review_model")
        .eq("user_id", user.id)
        .maybeSingle();

      const reviewModel = prefData?.global_review_model || "classic";

      if ((type === "teoria" || type === "questoes") && reviewModel !== "none") {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        await supabase.from("review_items").insert([
          {
            user_id: user.id,
            subject_id: subjectId,
            topic_name: topicName,
            next_review_date: tomorrow.toISOString(),
            interval_days: 1,
            confidence_level: 50,
            priority: "Média",
          },
        ]);
      }

      return data;
    },
    onSuccess: (data, vars) => {
      if (!data) return;

      if (recentHistory.length === 0) {
        trackEvent("first_study_session_completed");
      }

      if (vars.planItemId) {
        setActivePlanItemId(null);
      }

      queryClient.invalidateQueries({ queryKey: ["recentStudySessions"] });
      queryClient.invalidateQueries({ queryKey: ["history"] });
      queryClient.invalidateQueries({ queryKey: ["studyHistory"] });
      queryClient.invalidateQueries({ queryKey: ["planItems"] });
      queryClient.invalidateQueries({ queryKey: ["weekPlanItems"] });
      queryClient.invalidateQueries({ queryKey: ["todayMissions"] });

      if (vars.type === "teoria" || vars.type === "questoes") {
        toast.success(
          `Sessão salva no histórico e cronograma! Revisão de "${vars.topicName}" agendada para amanhã.`,
        );
      } else {
        toast.success(`Sessão concluída e progresso salvo no cronograma!`);
      }
    },
    onError: (err: any) => toast.error(`Erro ao salvar: ${err.message}`),
  });

  const completeSession = (forceSaveLivre = false) => {
    setIsActive(false);
    const finalTopic = topic || "Sem tópico";

    if (mode === "Foco") {
      setSessionCount((prev) => prev + 1);
      toast.success("Sessão de foco concluída! Ótimo trabalho.");

      saveSessionMutation.mutate({
        subjectId: selectedSubject,
        durationSeconds: 25 * 60,
        type: selectedType,
        topicName: finalTopic,
        planItemId: activePlanItemId,
      });

      if ((sessionCount + 1) % 4 === 0) {
        switchMode("Pausa Longa");
      } else {
        switchMode("Pausa Curta");
      }
    } else if (mode === "Livre" || forceSaveLivre) {
      if (elapsedTime >= 60) {
        saveSessionMutation.mutate({
          subjectId: selectedSubject,
          durationSeconds: elapsedTime,
          type: selectedType,
          topicName: finalTopic,
          planItemId: activePlanItemId,
        });
      } else {
        toast("Sessão muito curta para registrar (menos de 1 min).");
      }
      resetTimer();
    } else {
      toast("Pausa finalizada. Hora de voltar ao foco!");
      switchMode("Foco");
    }
  };

  // Skip button handler (Useful for testing Pomodoros quickly)
  const skipTimer = () => {
    if (mode === "Livre") {
      setElapsedTime((prev) => prev + 3600);
      setIsActive(false);
      toast("1 hora adicionada via atalho de teste. Clique em Parar para salvar.");
    } else {
      completeSession();
    }
  };

  // Timer Tick
  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        if (mode === "Livre") {
          setElapsedTime((prev) => prev + 1);
        } else {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              completeSession();
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, mode]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const progress =
    mode === "Livre"
      ? 100
      : ((getDuration(mode) - timeLeft) / getDuration(mode)) * 100;

  const activeSubjectName = subjects.find((s) => s.id === selectedSubject)?.name;

  return (
    <div className="flex flex-col items-center min-h-[80vh] animate-in fade-in duration-500 space-y-8 pb-12">
      {/* Header & Controls */}
      <div className="text-center w-full max-w-sm mt-4">
        <h1 className="text-3xl font-display font-bold mb-6">Estúdio de Foco</h1>

        {activePlanItemId && (
          <div className="flex items-center justify-between gap-2 bg-primary/10 border border-primary/30 text-primary px-3 py-2 rounded-xl mb-4 text-xs font-medium text-left">
            <div className="flex items-center gap-2 truncate">
              <CalendarCheck size={15} className="shrink-0" />
              <span className="truncate">
                Vinculado ao Cronograma: <strong>{activeSubjectName || "Matéria"}</strong> ({topic})
              </span>
            </div>
            <button
              onClick={() => setActivePlanItemId(null)}
              className="text-muted-foreground hover:text-foreground shrink-0"
              title="Desvincular bloco"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Modos */}
        <div className="flex items-center justify-center gap-1 bg-surface p-1.5 rounded-full border border-border mb-6">
          {(["Foco", "Pausa Curta", "Pausa Longa", "Livre"] as TimerMode[]).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              disabled={isActive}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                mode === m
                  ? m === "Foco"
                    ? "bg-primary text-primary-foreground"
                    : m === "Livre"
                      ? "bg-purple-500 text-white"
                      : "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:text-foreground disabled:opacity-50"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Inputs da Sessão */}
        {(mode === "Foco" || mode === "Livre") && (
          <div className="space-y-3 mb-4 text-left">
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={selectedSubject}
                onValueChange={setSelectedSubject}
                disabled={isActive}
              >
                <SelectTrigger className="w-full bg-surface-elevated border-border text-sm">
                  <SelectValue placeholder="Matéria" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                  {subjects.length === 0 && (
                    <SelectItem value="none" disabled>
                      Nenhuma matéria
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>

              <Select
                value={selectedType}
                onValueChange={(v: ActivityType) => setSelectedType(v)}
                disabled={isActive}
              >
                <SelectTrigger className="w-full bg-surface-elevated border-border text-sm">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ACTIVITY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Input
              placeholder="Qual o tópico (opcional)?"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={isActive}
              className="bg-surface-elevated border-border text-sm"
            />
          </div>
        )}
      </div>

      {/* Timer Circular */}
      <Card className="w-full max-w-sm aspect-square flex flex-col items-center justify-center relative bg-surface-elevated border-border shadow-glow rounded-full">
        {/* Círculo de Progresso Falso */}
        <div className="absolute inset-4 rounded-full border-4 border-muted/20 pointer-events-none"></div>

        {/* Ring ativo */}
        <svg
          className="absolute inset-4 transform -rotate-90 pointer-events-none"
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r="48"
            stroke="currentColor"
            strokeWidth="4"
            fill="transparent"
            className={`
              ${
                mode === "Foco"
                  ? "text-primary"
                  : mode === "Livre"
                    ? "text-purple-500"
                    : "text-secondary"
              } 
              transition-all duration-1000 ease-linear
            `}
            strokeDasharray="301.59"
            strokeDashoffset={mode === "Livre" ? 0 : 301.59 - (301.59 * progress) / 100}
            strokeLinecap="round"
          />
        </svg>

        <CardContent className="flex flex-col items-center justify-center p-0 z-10">
          <span className="text-7xl font-display font-bold tracking-tighter tabular-nums drop-shadow-md">
            {mode === "Livre" ? formatTime(elapsedTime) : formatTime(timeLeft)}
          </span>
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest mt-2 flex items-center gap-1">
            {mode === "Livre" && isActive && (
              <span className="h-2 w-2 rounded-full bg-purple-500 animate-pulse"></span>
            )}
            {mode}
          </span>
        </CardContent>
      </Card>

      {/* Controles do Player */}
      <div className="flex flex-col items-center gap-6 w-full max-w-sm">
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={resetTimer}
            disabled={mode === "Foco" && isActive}
          >
            <RotateCcw size={20} />
          </Button>

          <Button
            size="icon"
            className={`h-16 w-16 rounded-full shadow-glow transition-all duration-300 hover:scale-110 hover:shadow-[0_0_40px_rgba(168,255,0,0.4)]
              ${
                mode === "Foco"
                  ? "bg-primary text-primary-foreground hover:bg-primary"
                  : mode === "Livre"
                    ? "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/50"
                    : "bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-none"
              }`}
            onClick={toggleTimer}
            disabled={saveSessionMutation.isPending}
          >
            {isActive ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
          </Button>

          {mode === "Livre" ? (
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full border-red-500/50 text-red-500 hover:bg-red-500/10"
              onClick={() => completeSession(true)}
              title="Parar e Salvar"
              disabled={(elapsedTime < 60 && !isActive) || saveSessionMutation.isPending}
            >
              <Square size={20} />
            </Button>
          ) : (
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full"
              onClick={skipTimer}
              title="Pular timer (Testes)"
              disabled={saveSessionMutation.isPending}
            >
              <FastForward size={20} />
            </Button>
          )}
        </div>

        {/* Resumo & Atalho Skip */}
        {mode === "Livre" && (
          <Button
            variant="link"
            size="sm"
            onClick={skipTimer}
            className="text-muted-foreground text-xs h-6"
            disabled={saveSessionMutation.isPending}
          >
            + 1h (Debug)
          </Button>
        )}
      </div>

      {/* Histórico Recente */}
      {recentHistory.length > 0 && (
        <div className="w-full max-w-sm mt-8 space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground font-bold uppercase tracking-widest border-b border-border pb-2">
            <History size={14} /> Últimas Sessões
          </div>
          <div className="space-y-2">
            {recentHistory.map((sess: any) => {
              const sub = subjects.find((s) => s.id === sess.subject_id);
              const notes = decodeNotes(sess.notes);

              return (
                <div
                  key={sess.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-surface border border-border text-sm"
                >
                  <div className="flex flex-col">
                    <span className="font-bold">{sub ? sub.name : "Desconhecida"}</span>
                    <span className="text-xs text-muted-foreground truncate w-40">
                      {notes.topicName}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-bold text-foreground">
                      {sess.duration_minutes} min
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[9px] uppercase px-1 h-4 bg-background"
                    >
                      {ACTIVITY_LABELS[notes.type] || notes.type}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
