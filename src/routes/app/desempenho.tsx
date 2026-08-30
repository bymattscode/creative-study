import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UpgradePaywall } from "@/components/ui/upgrade-paywall";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  Clock,
  Flame,
  Target,
  BrainCircuit,
  BarChart3,
  CalendarDays,
  Repeat,
  TrendingDown,
  Minus,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/app/desempenho")({
  component: DesempenhoRoute,
});

const ACTIVITY_LABELS: Record<string, string> = {
  teoria: "Teoria",
  questoes: "Questões",
  revisao: "Revisão",
  leitura: "Leitura",
  redacao: "Redação",
};

const ACTIVITY_COLORS: Record<string, string> = {
  teoria: "#3b82f6", // blue
  questoes: "#f97316", // orange
  revisao: "#8b5cf6", // purple
  leitura: "#22c55e", // green
  redacao: "#ec4899", // pink
};

const decodeNotes = (raw?: string | null) => {
  if (!raw) return { type: "teoria", topicName: "Sem Tópico" };
  try {
    const p = JSON.parse(raw);
    return {
      type: p.type || "teoria",
      topicName: p.topicName || "Sem Tópico",
    };
  } catch {
    return { type: "teoria", topicName: raw };
  }
};

function DesempenhoRoute() {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("user_profiles").select("*").eq("user_id", user?.id).single();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("subjects").select("*").eq("user_id", user?.id);
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: history = [], isLoading: loadingHistory } = useQuery({
    queryKey: ["studyHistory", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("study_sessions").select("*").eq("user_id", user?.id);
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: reviewLogs = [], isLoading: loadingReviews } = useQuery({
    queryKey: ["reviewLogs", user?.id],
    queryFn: async () => {
      // Usando array vazio se a tabela review_logs não existir perfeitamente ou der erro
      const { data, error } = await supabase.from("review_logs").select("*").eq("user_id", user?.id);
      if (error) return [];
      return data || [];
    },
    enabled: !!user?.id,
  });

  // 1. Cálculos Gerais
  const totalMinutes = history.reduce((acc, sess) => acc + (sess.duration_minutes || 0), 0);
  const netHours = Math.floor(totalMinutes / 60);
  const netMins = totalMinutes % 60;

  // Ofensiva = Dias únicos de Sessões + Dias únicos de Logs de Revisão
  const sessionDates = history.map((s) => new Date(s.created_at).toDateString());
  const reviewDates = reviewLogs.map((r) => new Date(r.reviewed_at).toDateString());
  const uniqueDates = new Set([...sessionDates, ...reviewDates]);
  const offensiveDays = uniqueDates.size;

  const totalSessions = history.length;
  const totalReviews = reviewLogs.length;

  // 2. Gráfico de Últimos 7 Dias
  const getLast7DaysData = () => {
    const data = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toDateString();

      const daySessions = history.filter((s) => new Date(s.created_at).toDateString() === dateStr);
      const dayMinutes = daySessions.reduce((acc, s) => acc + s.duration_minutes, 0);

      data.push({
        name: d.toLocaleDateString("pt-BR", { weekday: "short" }),
        minutos: dayMinutes,
      });
    }
    return data;
  };
  const weekData = getLast7DaysData();

  // 3. Distribuição por Matéria
  const getSubjectDistribution = () => {
    const distribution: Record<string, number> = {};
    history.forEach((s) => {
      const name = subjects.find((sub) => sub.id === s.subject_id)?.name || "Outros";
      distribution[name] = (distribution[name] || 0) + s.duration_minutes;
    });

    return Object.entries(distribution)
      .map(([name, value]) => ({
        name,
        value,
        color: subjects.find((sub) => sub.name === name)?.color || "#6b7280",
      }))
      .sort((a, b) => b.value - a.value); // sort by highest
  };
  const subjectData = getSubjectDistribution();

  // 4. Distribuição por Tipo de Sessão
  const getTypeDistribution = () => {
    const distribution: Record<string, number> = {};
    history.forEach((s) => {
      const decoded = decodeNotes(s.notes);
      const type = decoded.type || "teoria";
      distribution[type] = (distribution[type] || 0) + s.duration_minutes;
    });

    return Object.entries(distribution)
      .map(([type, value]) => ({
        type,
        label: ACTIVITY_LABELS[type] || type,
        value,
        color: ACTIVITY_COLORS[type] || "#a8ff00",
      }))
      .sort((a, b) => b.value - a.value);
  };
  const typeData = getTypeDistribution();
  const topType = typeData.length > 0 ? typeData[0].label : "-";

  // 5. Novo Card: Seu Foco Principal
  const getMainFocusData = () => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const startOfThisWeek = new Date(today);
    startOfThisWeek.setDate(today.getDate() - 6);
    startOfThisWeek.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);
    const endOfLastWeek = new Date(startOfThisWeek);
    endOfLastWeek.setMilliseconds(endOfLastWeek.getMilliseconds() - 1);

    const thisWeekSessions = history.filter(s => {
      const d = new Date(s.created_at);
      return d >= startOfThisWeek && d <= today;
    });

    const lastWeekSessions = history.filter(s => {
      const d = new Date(s.created_at);
      return d >= startOfLastWeek && d <= endOfLastWeek;
    });

    const thisWeekSubjectDist: Record<string, number> = {};
    thisWeekSessions.forEach(s => {
      thisWeekSubjectDist[s.subject_id] = (thisWeekSubjectDist[s.subject_id] || 0) + s.duration_minutes;
    });

    const mainSubjectId = Object.keys(thisWeekSubjectDist).sort((a, b) => thisWeekSubjectDist[b] - thisWeekSubjectDist[a])[0];

    if (!mainSubjectId) return null;

    const mainSubject = subjects.find(sub => sub.id === mainSubjectId);
    if (!mainSubject) return null;

    const thisWeekMinutes = thisWeekSubjectDist[mainSubjectId];
    const totalThisWeekMinutes = thisWeekSessions.reduce((acc, s) => acc + s.duration_minutes, 0);
    const percentOfTotal = Math.round((thisWeekMinutes / totalThisWeekMinutes) * 100);

    const lastWeekMinutes = lastWeekSessions.filter(s => s.subject_id === mainSubjectId).reduce((acc, s) => acc + s.duration_minutes, 0);
    
    let variation = 0;
    if (lastWeekMinutes > 0) {
      variation = Math.round(((thisWeekMinutes - lastWeekMinutes) / lastWeekMinutes) * 100);
    } else if (thisWeekMinutes > 0) {
      variation = 100;
    }

    const breakdown: Record<string, number> = { teoria: 0, questoes: 0, revisao: 0 };
    thisWeekSessions.filter(s => s.subject_id === mainSubjectId).forEach(s => {
      const type = decodeNotes(s.notes).type || "teoria";
      breakdown[type] = (breakdown[type] || 0) + s.duration_minutes;
    });

    const mainBreakdownType = Object.keys(breakdown).sort((a, b) => breakdown[b] - breakdown[a])[0];
    
    let insight = "";
    if (mainBreakdownType === "questoes") {
      insight = "Perfil ativo com excelente foco na resolução de exercícios.";
    } else if (mainBreakdownType === "revisao") {
      insight = "Ótimo trabalho consolidando o conhecimento já adquirido.";
    } else {
      if ((breakdown.questoes || 0) > 0) {
        insight = "Embasamento teórico forte. Considere aumentar a carga de questões na próxima semana.";
      } else {
        insight = "Foco puramente teórico. É hora de validar seus conhecimentos com mais prática.";
      }
    }

    return {
      subjectName: mainSubject.name,
      color: mainSubject.color || "#a8ff00",
      minutes: thisWeekMinutes,
      percentOfTotal,
      variation,
      lastWeekMinutes,
      breakdown,
      insight
    };
  };
  const mainFocus = getMainFocusData();

  // Loading state
  if (loadingHistory || loadingReviews) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] animate-pulse">
        <BarChart3 size={48} className="text-primary/50 mb-4" />
        <p className="text-muted-foreground">Calculando suas métricas...</p>
      </div>
    );
  }

  // Render vazio se não houver histórico
  if (history.length === 0 && reviewLogs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] animate-in fade-in duration-500 max-w-4xl mx-auto text-center">
        <BarChart3 size={64} className="text-muted-foreground opacity-20 mb-6" />
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">
          Seu Radar está Vazio
        </h1>
        <p className="text-muted-foreground max-w-md">
          Os gráficos ganharão vida assim que você concluir sua primeira sessão no Estúdio de Foco ou fizer uma Revisão.
          Volte aqui depois de estudar!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto pb-24 lg:pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground text-sm">
          Leitura do seu progresso e ritmo de aprendizado baseada em dados reais.
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-surface-elevated border-border shadow-sm">
          <CardContent className="p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary shrink-0">
              <Clock size={20} className="md:w-6 md:h-6" />
            </div>
            <div>
              <p className="text-[10px] md:text-sm font-medium text-muted-foreground uppercase tracking-widest truncate">
                Horas Líquidas
              </p>
              <h2 className="text-xl md:text-2xl font-bold font-display">
                {netHours}h {netMins > 0 ? `${netMins}m` : ""}
              </h2>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface-elevated border-border shadow-sm">
          <CardContent className="p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-500 shrink-0">
              <Flame size={20} className="md:w-6 md:h-6" />
            </div>
            <div>
              <p className="text-[10px] md:text-sm font-medium text-muted-foreground uppercase tracking-widest truncate">
                Ofensiva
              </p>
              <h2 className="text-xl md:text-2xl font-bold font-display">{offensiveDays} dias</h2>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface-elevated border-border shadow-sm">
          <CardContent className="p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-500 shrink-0">
              <Target size={20} className="md:w-6 md:h-6" />
            </div>
            <div>
              <p className="text-[10px] md:text-sm font-medium text-muted-foreground uppercase tracking-widest truncate">
                Sessões
              </p>
              <h2 className="text-xl md:text-2xl font-bold font-display">{totalSessions} <span className="hidden md:inline text-sm text-muted-foreground font-normal lowercase tracking-normal">concluídas</span></h2>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface-elevated border-border shadow-sm">
          <CardContent className="p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-secondary/20 flex items-center justify-center text-secondary shrink-0">
              <Repeat size={20} className="md:w-6 md:h-6" />
            </div>
            <div>
              <p className="text-[10px] md:text-sm font-medium text-muted-foreground uppercase tracking-widest truncate">
                Revisões
              </p>
              <h2 className="text-xl md:text-2xl font-bold font-display">{totalReviews} <span className="hidden md:inline text-sm text-muted-foreground font-normal lowercase tracking-normal">resolvidas</span></h2>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Seu Foco Principal */}
        <div className="col-span-1">
          <Card className="bg-gradient-to-br from-surface-elevated to-[#17122b] border-border shadow-md h-full relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: mainFocus?.color || "#a8ff00" }} />
            <CardHeader className="pb-2 relative z-10">
              <CardTitle className="flex items-center gap-2 font-display text-sm tracking-wide uppercase text-muted-foreground">
                <Sparkles size={16} className="text-primary" /> Seu Foco Principal
              </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10 flex flex-col justify-between h-[calc(100%-60px)]">
              {mainFocus ? (
                <>
                  <div>
                    <h2 className="text-3xl font-bold font-display text-foreground leading-tight" style={{ color: mainFocus.color }}>
                      {mainFocus.subjectName}
                    </h2>
                    
                    <div className="flex items-end gap-3 mt-4">
                      <span className="text-4xl font-light tracking-tighter">
                        {Math.floor(mainFocus.minutes / 60)}h {mainFocus.minutes % 60 > 0 ? `${mainFocus.minutes % 60}m` : ''}
                      </span>
                      <div className="mb-1 flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground bg-background px-2 py-0.5 rounded-full border border-border">
                          {mainFocus.percentOfTotal}% da semana
                        </span>
                        
                        {mainFocus.variation > 0 ? (
                          <span className="text-emerald-400 flex items-center gap-0.5">
                            <TrendingUp size={14} /> +{mainFocus.variation}%
                          </span>
                        ) : mainFocus.variation < 0 ? (
                          <span className="text-red-400 flex items-center gap-0.5">
                            <TrendingDown size={14} /> {mainFocus.variation}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground flex items-center gap-0.5">
                            <Minus size={14} /> Estável
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-2 px-1">
                        <span>Teoria: {Math.round((mainFocus.breakdown.teoria || 0) / mainFocus.minutes * 100)}%</span>
                        <span>Questões: {Math.round((mainFocus.breakdown.questoes || 0) / mainFocus.minutes * 100)}%</span>
                        <span>Revisão: {Math.round((mainFocus.breakdown.revisao || 0) / mainFocus.minutes * 100)}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full overflow-hidden flex bg-background">
                        <div style={{ width: `${(mainFocus.breakdown.teoria || 0) / mainFocus.minutes * 100}%`, backgroundColor: ACTIVITY_COLORS.teoria }} />
                        <div style={{ width: `${(mainFocus.breakdown.questoes || 0) / mainFocus.minutes * 100}%`, backgroundColor: ACTIVITY_COLORS.questoes }} />
                        <div style={{ width: `${(mainFocus.breakdown.revisao || 0) / mainFocus.minutes * 100}%`, backgroundColor: ACTIVITY_COLORS.revisao }} />
                      </div>
                    </div>

                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm text-foreground/90 italic">
                      "{mainFocus.insight}"
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-60 py-8">
                  <BrainCircuit size={40} className="text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">O copiloto precisa de mais sessões de estudo recentes para extrair um insight refinado.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Gráfico 7 Dias */}
        <div className="col-span-1">
          <UpgradePaywall
          isPro={true} // TESTE: profile?.subscription_tier === "pro"
            title="Gráficos Detalhados"
            description="Desbloqueie o gráfico de esforço semanal e entenda seus picos de energia com o Creative Study Pro."
          >
            <Card className="bg-surface-elevated border-border shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-display text-lg">
                  <CalendarDays size={18} className="text-primary" /> Esforço (Últimos 7 Dias)
                </CardTitle>
                <CardDescription>Minutos líquidos diários investidos na semana</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72 w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weekData}>
                      <XAxis
                        dataKey="name"
                        stroke="#6b7280"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#6b7280"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => `${val}m`}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
                        contentStyle={{
                          backgroundColor: "#21193a",
                          borderColor: "#3a2a67",
                          borderRadius: "8px",
                          color: "#f5f7ff",
                        }}
                        itemStyle={{ color: "#a8ff00" }}
                      />
                      <Bar dataKey="minutos" fill="#a8ff00" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </UpgradePaywall>
        </div>

        {/* Distribuição por Matéria */}
        <UpgradePaywall
          isPro={true} // TESTE: profile?.subscription_tier === "pro"
          title="Distribuição de Matérias"
          description="Veja exatamente onde você está gastando seu tempo e corrija desvios no plano Pro."
        >
          <Card className="bg-surface-elevated border-border shadow-sm h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <BrainCircuit size={18} className="text-primary" /> Foco por Matéria
              </CardTitle>
              <CardDescription>Onde você tem gasto mais energia (Sessões)</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              {subjectData.length > 0 ? (
                <>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={subjectData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          stroke="none"
                        >
                          {subjectData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#21193a",
                            borderColor: "#3a2a67",
                            borderRadius: "8px",
                            color: "#f5f7ff",
                          }}
                          formatter={(value) => [`${value} min`, "Tempo"]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-4 justify-center">
                    {subjectData.map((s, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-xs text-muted-foreground"
                      >
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: s.color }}
                        />
                        <span>
                          {s.name} ({Math.round((s.value / totalMinutes) * 100)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="py-12 text-sm text-muted-foreground text-center">
                  Nenhum dado vinculável a matérias.
                </div>
              )}
            </CardContent>
          </Card>
        </UpgradePaywall>

        {/* Perfil de Estudante (Tipos de Atividade) */}
        <UpgradePaywall
          isPro={true} // TESTE: profile?.subscription_tier === "pro"
          title="Perfil do Estudante"
          description="Descubra se você é um estudante passivo ou ativo assinando o Creative Study Pro."
        >
          <Card className="bg-surface-elevated border-border shadow-sm h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <TrendingUp size={18} className="text-primary" /> Perfil de Estudante
              </CardTitle>
              <CardDescription>O que você mais faz durante as Sessões?</CardDescription>
            </CardHeader>
            <CardContent>
              {typeData.length > 0 ? (
                <>
                  <div className="mb-6 mt-2">
                    <h3 className="text-sm font-bold text-foreground mb-1">Tendência Dominante</h3>
                    <p className="text-xs text-muted-foreground">
                      Seu perfil atual é de absorção baseada em <strong>{topType}</strong>.
                      {typeData[0]?.type === "teoria" &&
                        " Cuidado com a passividade, tente resolver mais questões!"}
                      {typeData[0]?.type === "questoes" && " Excelente perfil ativo!"}
                    </p>
                  </div>

                  <div className="space-y-4">
                    {typeData.map((t, i) => {
                      const percent = Math.round((t.value / totalMinutes) * 100);
                      return (
                        <div key={i}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-bold flex items-center gap-1">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: t.color }}
                              ></div>
                              {t.label}
                            </span>
                            <span className="text-muted-foreground">
                              {percent}% ({t.value}m)
                            </span>
                          </div>
                          <div className="w-full bg-background rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${percent}%`, backgroundColor: t.color }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="py-12 text-sm text-muted-foreground text-center">
                  Nenhuma sessão registrada para traçar o perfil.
                </div>
              )}
            </CardContent>
          </Card>
        </UpgradePaywall>
      </div>
    </div>
  );
}
