import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { UserProfile, Goal, Subject, StudySession, ReviewItem } from "@/types/models";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth";
import { generateDailyInsight } from "@/lib/ai-insights";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  BrainCircuit,
  Target,
  Clock,
  Play,
  CalendarDays,
  BarChart3,
  Repeat,
  Flame,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

export const Route = createFileRoute("/app/")({
  component: DashboardRoute,
});

function DashboardRoute() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    trackEvent("dashboard_viewed");
  }, []);

  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("user_profiles").select("*").eq("user_id", user.id).single();
      return data ? {
        id: data.id,
        userId: data.user_id,
        name: data.name,
        studentType: data.student_type,
        subscriptionTier: data.subscription_tier,
      } as UserProfile : null;
    },
    enabled: !!user,
  });

  const { data: goal } = useQuery({
    queryKey: ["goal", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("goals").select("*").eq("user_id", user.id).eq("is_active", true).single();
      return data ? {
        id: data.id,
        title: data.title,
        targetDate: data.target_date ? new Date(data.target_date) : undefined,
      } as Goal : null;
    },
    enabled: !!user,
  });

  const { data: nextExam } = useQuery({
    queryKey: ["nextExam", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", false)
        .gte("target_date", new Date().toISOString().split('T')[0])
        .order("target_date", { ascending: true })
        .limit(1)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data || null;
    },
    enabled: !!user,
  });

  const { data: prefs } = useQuery({
    queryKey: ["prefs", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("onboarding_preferences").select("*").eq("user_id", user.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("subjects").select("*").eq("user_id", user.id);
      return (data || []).map(s => ({
        id: s.id,
        name: s.name,
        color: s.color,
      } as Subject));
    },
    enabled: !!user,
  });

  const { data: history = [] } = useQuery({
    queryKey: ["history", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("study_sessions").select("*").eq("user_id", user.id);
      return (data || []).map(s => ({
        id: s.id,
        subjectId: s.subject_id,
        durationMinutes: s.duration_minutes,
        createdAt: new Date(s.created_at),
      } as StudySession));
    },
    enabled: !!user,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["reviews", user?.id],
    queryFn: async () => {
      if (!user) return [];
      // Tabela review_items pode não existir ainda, usando catch para evitar quebrar
      const { data, error } = await supabase.from("review_items").select("*").eq("user_id", user.id);
      if (error) return [];
      return data as ReviewItem[];
    },
    enabled: !!user,
  });

  const { data: weeklyPlan } = useQuery({
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

  const { data: todayMissions = [] } = useQuery({
    queryKey: ["todayMissions", weeklyPlan?.id],
    queryFn: async () => {
      if (!weeklyPlan) return [];
      
      const today = new Date();
      // Start and end of today
      const startOfDay = new Date(today.setHours(0,0,0,0)).toISOString();
      const endOfDay = new Date(today.setHours(23,59,59,999)).toISOString();

      const { data, error } = await supabase
        .from("plan_items")
        .select("*")
        .eq("weekly_plan_id", weeklyPlan.id)
        .gte("scheduled_for", startOfDay)
        .lte("scheduled_for", endOfDay)
        .order("scheduled_for", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!weeklyPlan,
  });

  const toggleMissionMutation = useMutation({
    mutationFn: async (mission: any) => {
      const newStatus = !mission.completed;
      
      // Update plan_item
      await supabase.from("plan_items").update({ completed: newStatus }).eq("id", mission.id);

      if (newStatus) {
        // Create a study session
        await supabase.from("study_sessions").insert({
          user_id: user?.id,
          subject_id: mission.subject_id,
          duration_minutes: mission.duration_minutes,
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + mission.duration_minutes * 60000).toISOString(),
          focus_score: 100,
        });
      } else {
        // Delete a matching study session for today
        const today = new Date();
        const startOfDay = new Date(today.setHours(0,0,0,0)).toISOString();
        const endOfDay = new Date(today.setHours(23,59,59,999)).toISOString();
        
        const { data } = await supabase.from("study_sessions")
          .select("id")
          .eq("user_id", user?.id)
          .eq("subject_id", mission.subject_id)
          .eq("duration_minutes", mission.duration_minutes)
          .gte("created_at", startOfDay)
          .lte("created_at", endOfDay)
          .limit(1);
          
        if (data && data.length > 0) {
          await supabase.from("study_sessions").delete().eq("id", data[0].id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todayMissions"] });
      queryClient.invalidateQueries({ queryKey: ["history"] }); // refresh dashboard hours
    }
  });

  const updateExamDateMutation = useMutation({
    mutationFn: async ({ id, newDate }: { id: string; newDate: string }) => {
      const { error } = await supabase.from("goals").update({ target_date: newDate }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nextExam"] });
      queryClient.invalidateQueries({ queryKey: ["upcomingExams"] });
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      toast.success("Data da prova atualizada!");
    }
  });

  const updateGoalDateMutation = useMutation({
    mutationFn: async ({ id, newDate }: { id: string; newDate: string }) => {
      const { error } = await supabase.from("goals").update({ target_date: newDate }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goal"] });
      toast.success("Data atualizada com sucesso!");
    }
  });

  const insight = useMemo(
    () => generateDailyInsight(history, reviews, subjects),
    [history, reviews, subjects],
  );

  const getFirstName = (fullName: string) => fullName.split(" ")[0] || "Estudante";

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 6) return "Boa madrugada";
    if (hour >= 6 && hour < 12) return "Bom dia";
    if (hour >= 12 && hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const getDaysRemaining = (targetDate?: Date | string) => {
    if (!targetDate) return null;
    const diff = new Date(targetDate).getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)));
  };

  const daysRemaining = goal?.targetDate ? getDaysRemaining(goal.targetDate) : null;
  const nextExamDaysRemaining = nextExam?.target_date ? getDaysRemaining(nextExam.target_date) : null;

  // Calculando Horas Líquidas Totais
  const totalMinutes = history.reduce((acc, sess) => acc + (sess.durationMinutes || 0), 0);
  const netHours = Math.floor(totalMinutes / 60);
  const netMins = totalMinutes % 60;

  // Calculando Meta Semanal Simples
  const weeklyGoalMins = (prefs?.hours_per_day || 3) * 7 * 60;
  const progressPercent = Math.min(100, (totalMinutes / weeklyGoalMins) * 100);

  // Calculando Ofensiva (Dias únicos no histórico)
  const uniqueDates = new Set(history.map((s) => new Date(s.createdAt).toDateString()));
  const offensiveDays = uniqueDates.size;

  // Calculando Constância (últimos 5 dias)
  const last5Days = Array.from({ length: 5 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (4 - i));
    return d;
  });

  const getDayLetter = (date: Date) => {
    return date.toLocaleDateString("pt-BR", { weekday: "short" }).charAt(0).toUpperCase();
  };

  const hasStudiedOnDate = (date: Date) => {
    const dateStr = date.toDateString();
    return history.some((s) => new Date(s.createdAt).toDateString() === dateStr);
  };

  const getSubjectProgress = (subjectId: string) => {
    const subjectMinutes = history
      .filter((s) => s.subjectId === subjectId)
      .reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
    // Assume 10 horas (600 minutos) para fechar o edital de uma matéria para o MVP
    return Math.min(100, Math.floor((subjectMinutes / 600) * 100));
  };

  if (loadingProfile && !profile) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground animate-pulse">
          <BrainCircuit size={40} className="text-primary/50" />
          <p className="text-sm font-medium">Sincronizando Sinapses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto pb-12">
      {/* IA Insight Card (Copiloto) */}
      {profile?.subscriptionTier === "pro" && insight && (
        <Card className="bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/20 shadow-glow mb-6">
          <CardContent className="p-4 flex items-start sm:items-center gap-4">
            <div className="h-10 w-10 shrink-0 rounded-full bg-primary/20 flex items-center justify-center text-primary animate-pulse">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground mb-0.5">Copiloto de Estudos</p>
              <p className="text-sm text-muted-foreground">{insight}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Paywall Soft - IA Insight Card (Copiloto) */}
      {profile?.subscriptionTier !== "pro" && (
        <Card
          className="bg-surface-elevated border-border mb-6 group cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => (window.location.href = "/app/upgrade")}
        >
          <CardContent className="p-4 flex items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 shrink-0 rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                <Sparkles size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-muted-foreground group-hover:text-foreground transition-colors mb-0.5">
                  Copiloto Inteligente
                </p>
                <p className="text-sm text-muted-foreground/60">
                  Análise diária de comportamento bloqueada no plano gratuito.
                </p>
              </div>
            </div>
            <Link to="/app/upgrade">
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:flex text-primary border-primary/30"
              >
                Desbloquear IA
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Saudação e Objetivo */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <p className="text-muted-foreground font-medium flex items-center gap-2 uppercase tracking-widest text-xs mb-1">
            <Sparkles size={14} className="text-primary" /> Seu Centro de Comando
          </p>
          <h1 className="text-3xl md:text-5xl font-display font-bold text-foreground">
            {getGreeting()},{" "}
            <span className="text-primary">{profile ? getFirstName(profile.name) : "Mestre"}!</span>
          </h1>
        </div>

        {/* Constância Rápida Header */}
        <div className="flex items-center gap-3 bg-surface-elevated px-5 py-2.5 rounded-2xl border border-border shadow-sm">
          <div className="flex -space-x-1">
            {/* Constância Visual Real */}
            {last5Days.map((date, i) => {
              const studied = hasStudiedOnDate(date);
              return (
                <div
                  key={i}
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border-2 border-background ${studied ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground"}`}
                >
                  {getDayLetter(date)}
                </div>
              );
            })}
          </div>
          <div className="flex flex-col ml-2">
            <span className="text-sm font-bold flex items-center gap-1">
              <Flame
                size={14}
                className={offensiveDays > 0 ? "text-orange-500" : "text-muted-foreground"}
              />{" "}
              {offensiveDays} dias
            </span>
            <span className="text-[10px] uppercase text-muted-foreground tracking-widest">
              Ofensiva
            </span>
          </div>
        </div>
      </div>

      {/* 2. Insight IA (A Próxima Melhor Ação) */}
      <Card className="bg-[#17122b] border-primary/30 shadow-[0_0_30px_rgba(168,255,0,0.05)] overflow-hidden relative group">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-primary/10 to-transparent pointer-events-none"></div>
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 relative z-10 w-full md:w-2/3">
            <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-xs mb-2">
              <BrainCircuit size={16} /> Insight da Inteligência Artificial
            </div>
            <h2 className="text-xl md:text-2xl font-bold leading-tight">
              {history.length === 0 
                ? "Sua jornada rumo à aprovação começa aqui!"
                : "A Próxima Melhor Ação para o seu plano."}
            </h2>
            <p className="text-muted-foreground">
              {history.length === 0 
                ? "A inteligência do Sinapse precisa de dados para te guiar. Que tal fazer sua primeira sessão de 25 minutos na sua matéria mais importante?"
                : insight || "Tudo sob controle. Siga seu planejamento."}
            </p>
          </div>

          <Button
            size="lg"
            className="w-full md:w-auto shrink-0 shadow-glow text-base h-14 px-8"
            asChild
          >
            <Link to="/app/estudo">
              <Play className="mr-2 h-5 w-5 fill-current" /> Iniciar Foco Agora
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* 3. Grid Principal de Ações */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Button
          variant="outline"
          className="h-24 flex-col gap-2 bg-surface hover:bg-surface-elevated hover:border-primary/50 transition-all border-border"
          asChild
        >
          <Link to="/app/estudo">
            <Play size={24} className="text-primary" />
            <span>Estudar</span>
          </Link>
        </Button>

        <Button
          variant="outline"
          className="h-24 flex-col gap-2 bg-surface hover:bg-surface-elevated hover:border-primary/50 transition-all border-border"
          asChild
        >
          <Link to="/app/revisoes">
            <Repeat size={24} className="text-primary" />
            <span>Revisar</span>
          </Link>
        </Button>

        <Button
          variant="outline"
          className="h-24 flex-col gap-2 bg-surface hover:bg-surface-elevated hover:border-primary/50 transition-all border-border"
          asChild
        >
          <Link to="/app/plano">
            <CalendarDays size={24} className="text-primary" />
            <span>Meu Plano</span>
          </Link>
        </Button>

        <Button
          variant="outline"
          className="h-24 flex-col gap-2 bg-surface hover:bg-surface-elevated hover:border-primary/50 transition-all border-border"
          asChild
        >
          <Link to="/app/desempenho">
            <BarChart3 size={24} className="text-primary" />
            <span>Desempenho</span>
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Coluna Esquerda: Meta e Métricas */}
        <div className="space-y-6 md:col-span-1">
          {/* Card: Objetivo Principal (Apenas Univ) */}
          {profile?.studentType === "universidade" && (
            <Card className="bg-[#21193a] border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest flex items-center justify-between">
                  <span>Final do Semestre</span>
                  <Target size={16} className="text-primary" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-display leading-tight mb-4">
                  {goal ? goal.title : "Semestre não definido"}
                </div>

                {daysRemaining !== null && goal && (
                  <div className="bg-background rounded-lg p-3 flex items-center justify-between border border-border relative group overflow-hidden">
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground uppercase">Contagem Regressiva</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">{daysRemaining} dias</span>
                        <div className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] bg-muted px-1.5 py-0.5 rounded cursor-pointer">
                          Editar
                        </div>
                      </div>
                    </div>
                    <Clock className="text-muted-foreground" size={24} />
                    <input 
                      type="date" 
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      onChange={(e) => {
                        if(e.target.value) {
                           updateGoalDateMutation.mutate({ id: goal.id, newDate: e.target.value });
                        }
                      }} 
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Card: Próxima Prova */}
            <Card className="bg-[#2a0863] border-border shadow-sm ring-1 ring-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest flex items-center justify-between text-primary">
                <span>Próxima Prova</span>
                <CalendarDays size={16} className="text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold font-display leading-tight mb-4 text-white">
                {nextExam ? (
                  (() => {
                    let parsed = { name: nextExam.title };
                    try { parsed = JSON.parse(nextExam.title); } catch(e) {}
                    return parsed.name;
                  })()
                ) : (
                  "Nenhuma prova agendada"
                )}
              </div>

              {nextExamDaysRemaining !== null && nextExam && (
                <div className="bg-background rounded-lg p-3 flex items-center justify-between border border-border relative group overflow-hidden">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground uppercase">Faltam apenas</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg text-primary">{nextExamDaysRemaining} dias</span>
                      <div className="text-primary/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] bg-primary/10 px-1.5 py-0.5 rounded cursor-pointer">
                        Editar
                      </div>
                    </div>
                  </div>
                  <Target className="text-primary" size={24} />
                  <input 
                    type="date" 
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    onChange={(e) => {
                      if(e.target.value) {
                         updateExamDateMutation.mutate({ id: nextExam.id, newDate: e.target.value });
                      }
                    }} 
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card: Horas Líquidas */}
          <Card className="bg-surface-elevated border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
                Horas Líquidas Totais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-4xl font-display font-bold">
                  {netHours}
                  <span className="text-xl text-muted-foreground">h</span> {netMins}
                  <span className="text-xl text-muted-foreground">m</span>
                </span>
              </div>
              <Progress value={progressPercent} className="h-2 mb-2" />
              <p className="text-xs text-muted-foreground">
                {progressPercent.toFixed(0)}% da meta de 20h semanais
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Coluna Meio: O que fazer hoje */}
        <div className="space-y-6 md:col-span-1">
          <Card className="bg-surface-elevated border-border shadow-sm h-full">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="flex items-center justify-between font-display text-lg">
                Matérias de Hoje
                <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full font-bold">
                  {todayMissions.filter(m => !m.completed).length} pendentes
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {todayMissions.length === 0 && reviews.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                  <p className="text-sm">Nenhuma missão para hoje ainda.</p>
                  <p className="text-xs mt-1">Gere seu cronograma ou comece estudando livremente!</p>
                  <Button variant="link" className="text-primary mt-2 h-auto p-0 text-xs" asChild>
                    <Link to="/app/plano">Ir para Plano Semanal</Link>
                  </Button>
                </div>
              ) : (
                <>
                  {todayMissions.slice(0, 3).map((mission: any) => {
                    let decodedTitle = { type: "teoria", topicName: mission.title };
                    try {
                      decodedTitle = JSON.parse(mission.title);
                    } catch (e) {
                      // fallback for legacy
                    }
                    const subject = subjects.find(s => s.id === mission.subject_id);
                    
                    return (
                      <div 
                        key={mission.id} 
                        onClick={() => toggleMissionMutation.mutate(mission)}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-colors group cursor-pointer ${mission.completed ? "bg-surface opacity-60 border-transparent" : "bg-background border-border hover:border-primary/50"}`}
                      >
                        <div className={`mt-1 h-5 w-5 flex-shrink-0 flex items-center justify-center rounded-full border-2 transition-colors ${mission.completed ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground group-hover:border-primary"}`}>
                          {mission.completed && <CheckCircle2 size={12} />}
                        </div>
                        <div className="flex flex-col flex-1">
                          <span className={`font-bold text-sm ${mission.completed ? "line-through text-muted-foreground" : ""}`}>{subject?.name || "Estudo"}</span>
                          <span className="text-xs text-muted-foreground line-clamp-1">
                            {decodedTitle.topicName}
                          </span>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px] uppercase font-bold bg-surface px-2 py-0.5 rounded text-muted-foreground">
                              {mission.duration_minutes} min
                            </span>
                            <span className="text-[10px] uppercase font-bold text-primary border border-primary/30 px-2 py-0.5 rounded">
                              {decodedTitle.type}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Exemplo Dinâmico de Revisões (Se houver) */}
                  {reviews.length > 0 && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-[#2a0863]/20 border border-secondary/30 hover:border-secondary transition-colors group cursor-pointer">
                      <div className="mt-1 h-5 w-5 rounded-full border-2 border-secondary group-hover:border-secondary flex-shrink-0 flex items-center justify-center">
                        <CheckCircle2
                          size={12}
                          className="text-secondary opacity-0 group-hover:opacity-100"
                        />
                      </div>
                      <div className="flex flex-col flex-1">
                        <span className="font-bold text-sm text-secondary-foreground">
                          Revisões Pendentes
                        </span>
                        <span className="text-xs text-muted-foreground">{reviews.length} cards acumulados</span>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] uppercase font-bold bg-secondary/20 px-2 py-0.5 rounded text-secondary-foreground">
                            Alta Prioridade
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              <Button
                variant="ghost"
                className="w-full text-muted-foreground hover:text-foreground text-sm"
                asChild
              >
                <Link to="/app/plano">
                  Ver cronograma completo <ArrowRight size={14} className="ml-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Coluna Direita: Progresso por Matéria */}
        <div className="space-y-6 md:col-span-1">
          <Card className="bg-surface-elevated border-border shadow-sm h-full">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="font-display text-lg">
                {profile?.studentType === "universidade" ? "Progresso no Semestre" :
                 profile?.studentType === "vestibular" ? "Progresso no Vestibular" :
                 profile?.studentType === "outro" ? "Progresso Geral" :
                 "Progresso no Edital"}
              </CardTitle>
              <CardDescription>Baseado nas disciplinas cadastradas</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {subjects.length > 0 ? (
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-5">
                    {subjects.map((sub) => {
                      const progressVal = getSubjectProgress(sub.id);
                      return (
                      <div key={sub.id} className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-medium truncate pr-2">{sub.name}</span>
                          <span className="text-muted-foreground font-bold">
                            {progressVal}%
                          </span>
                        </div>
                        <Progress
                          value={progressVal}
                          className="h-1.5"
                          indicatorColor={sub.color || "bg-primary"}
                        />
                      </div>
                    )})}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <BookOpen className="h-10 w-10 text-muted-foreground/20 mb-3" />
                  <p className="text-sm font-bold text-foreground">Sua lista está vazia</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                    Cadastre suas matérias nas configurações para começar.
                  </p>
                  <Button variant="link" className="text-primary text-xs mt-2" asChild>
                    <Link to="/app/configuracoes">Ir para Configurações</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
