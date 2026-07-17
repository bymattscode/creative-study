import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UserProfile, Goal, Subject, StudySession, ReviewItem } from "@/types/models";
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
  BookOpen
} from "lucide-react";

export const Route = createFileRoute("/app/")({
  component: DashboardRoute,
});

function DashboardRoute() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [history, setHistory] = useState<StudySession[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [insight, setInsight] = useState<string>("");

  useEffect(() => {
    try {
      const p = localStorage.getItem("@sinapse:userProfile");
      const g = localStorage.getItem("@sinapse:currentGoal");
      const s = localStorage.getItem("@sinapse:subjects");
      const h = localStorage.getItem("@sinapse:studyHistory");
      const r = localStorage.getItem("@sinapse:reviewItems");
      
      let pObj, gObj, sObj, hObj, rObj;
      
      if (p) { pObj = JSON.parse(p); setProfile(pObj); }
      if (g) { gObj = JSON.parse(g); setGoal(gObj); }
      if (s) { sObj = JSON.parse(s); setSubjects(sObj); }
      if (h) { hObj = JSON.parse(h); setHistory(hObj); }
      if (r) { rObj = JSON.parse(r); setReviews(rObj); }
      
      // Gerando Insight
      setInsight(generateDailyInsight(hObj || [], rObj || [], sObj || []));
      
    } catch (e) {
      console.error(e);
    }
  }, []);

  const getFirstName = (fullName: string) => fullName.split(" ")[0] || "Estudante";

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const getDaysRemaining = (targetDate?: Date) => {
    if (!targetDate) return null;
    const diff = new Date(targetDate).getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)));
  };

  const daysRemaining = goal?.targetDate ? getDaysRemaining(goal.targetDate) : null;

  // Calculando Horas Líquidas Totais
  const totalMinutes = history.reduce((acc, sess) => acc + (sess.durationMinutes || 0), 0);
  const netHours = Math.floor(totalMinutes / 60);
  const netMins = totalMinutes % 60;
  
  // Calculando Meta Semanal Simples (Ex: Meta de 20h = 1200min)
  const weeklyGoalMins = 20 * 60; 
  const progressPercent = Math.min(100, (totalMinutes / weeklyGoalMins) * 100);

  // Calculando Ofensiva (Dias únicos no histórico)
  const uniqueDates = new Set(history.map(s => new Date(s.createdAt).toDateString()));
  const offensiveDays = uniqueDates.size;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto pb-12">
      
      {/* IA Insight Card (Copiloto) */}
      {profile?.subscriptionTier === 'pro' && insight && (
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
      {profile?.subscriptionTier !== 'pro' && (
        <Card className="bg-surface-elevated border-border mb-6 group cursor-pointer hover:border-primary/50 transition-colors" onClick={() => window.location.href = '/app/upgrade'}>
          <CardContent className="p-4 flex items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 shrink-0 rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                <Sparkles size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-muted-foreground group-hover:text-foreground transition-colors mb-0.5">Copiloto Inteligente</p>
                <p className="text-sm text-muted-foreground/60">Análise diária de comportamento bloqueada no plano gratuito.</p>
              </div>
            </div>
            <Link to="/app/upgrade">
              <Button variant="outline" size="sm" className="hidden sm:flex text-primary border-primary/30">
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
            {getGreeting()}, <span className="text-primary">{profile ? getFirstName(profile.name) : "Mestre"}!</span>
          </h1>
        </div>
        
        {/* Constância Rápida Header */}
        <div className="flex items-center gap-3 bg-surface-elevated px-5 py-2.5 rounded-2xl border border-border shadow-sm">
          <div className="flex -space-x-1">
            {/* Mock de Constância Visual */}
            {["S", "T", "Q", "Q", "S"].map((d, i) => (
              <div key={i} className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border-2 border-background ${i < Math.min(offensiveDays, 5) ? 'bg-primary text-primary-foreground' : 'bg-surface text-muted-foreground'}`}>
                {d}
              </div>
            ))}
          </div>
          <div className="flex flex-col ml-2">
            <span className="text-sm font-bold flex items-center gap-1"><Flame size={14} className={offensiveDays > 0 ? "text-orange-500" : "text-muted-foreground"} /> {offensiveDays} dias</span>
            <span className="text-[10px] uppercase text-muted-foreground tracking-widest">Ofensiva</span>
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
              Sua retenção em Exatas está caindo. <br className="hidden md:block"/>
              Vamos fazer um bloco de 25 min agora?
            </h2>
            <p className="text-muted-foreground">
              A IA analisou que você pulou as duas últimas revisões de Matemática. 
              Resolver 5 questões agora vai recuperar sua curva de esquecimento.
            </p>
          </div>
          
          <Button size="lg" className="w-full md:w-auto shrink-0 shadow-glow text-base h-14 px-8" asChild>
            <Link to="/app/estudo">
              <Play className="mr-2 h-5 w-5 fill-current" /> Iniciar Foco Agora
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* 3. Grid Principal de Ações */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Button variant="outline" className="h-24 flex-col gap-2 bg-surface hover:bg-surface-elevated hover:border-primary/50 transition-all border-border" asChild>
          <Link to="/app/estudo">
            <Play size={24} className="text-primary" />
            <span>Estudar</span>
          </Link>
        </Button>
        
        <Button variant="outline" className="h-24 flex-col gap-2 bg-surface hover:bg-surface-elevated hover:border-secondary transition-all border-border" asChild>
          <Link to="/app/revisoes">
            <Repeat size={24} className="text-secondary" />
            <span>Revisar</span>
          </Link>
        </Button>

        <Button variant="outline" className="h-24 flex-col gap-2 bg-surface hover:bg-surface-elevated transition-all border-border" asChild>
          <Link to="/app/plano">
            <CalendarDays size={24} className="text-muted-foreground" />
            <span>Meu Plano</span>
          </Link>
        </Button>

        <Button variant="outline" className="h-24 flex-col gap-2 bg-surface hover:bg-surface-elevated transition-all border-border" asChild>
          <Link to="/app/desempenho">
            <BarChart3 size={24} className="text-muted-foreground" />
            <span>Desempenho</span>
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Coluna Esquerda: Meta e Métricas */}
        <div className="space-y-6 md:col-span-1">
          {/* Card: Objetivo */}
          <Card className="bg-[#21193a] border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest flex items-center justify-between">
                <span>Alvo Principal</span>
                <Target size={16} className="text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display leading-tight mb-4">
                {goal ? goal.title : "Sem meta definida"}
              </div>
              
              {daysRemaining !== null && (
                <div className="bg-background rounded-lg p-3 flex items-center justify-between border border-border">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground uppercase">Contagem Regressiva</span>
                    <span className="font-bold text-lg">{daysRemaining} dias</span>
                  </div>
                  <Clock className="text-muted-foreground" size={24} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card: Horas Líquidas */}
          <Card className="bg-surface-elevated border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Horas Líquidas Totais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-4xl font-display font-bold">
                  {netHours}<span className="text-xl text-muted-foreground">h</span> {netMins}<span className="text-xl text-muted-foreground">m</span>
                </span>
              </div>
              <Progress value={progressPercent} className="h-2 mb-2" />
              <p className="text-xs text-muted-foreground">{progressPercent.toFixed(0)}% da meta de 20h semanais</p>
            </CardContent>
          </Card>
        </div>

        {/* Coluna Meio: O que fazer hoje */}
        <div className="space-y-6 md:col-span-1">
          <Card className="bg-surface-elevated border-border shadow-sm h-full">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="flex items-center justify-between font-display text-lg">
                Missões de Hoje
                <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full font-bold">3 pendentes</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              
              {/* Item de Estudo */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-background border border-border hover:border-primary/50 transition-colors group cursor-pointer">
                <div className="mt-1 h-5 w-5 rounded-full border-2 border-muted-foreground group-hover:border-primary flex-shrink-0"></div>
                <div className="flex flex-col flex-1">
                  <span className="font-bold text-sm">Direito Constitucional</span>
                  <span className="text-xs text-muted-foreground">Teoria: Direitos Fundamentais</span>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] uppercase font-bold bg-surface px-2 py-0.5 rounded text-muted-foreground">60 min</span>
                  </div>
                </div>
              </div>

              {/* Item de Revisão */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-[#2a0863]/20 border border-secondary/30 hover:border-secondary transition-colors group cursor-pointer">
                <div className="mt-1 h-5 w-5 rounded-full border-2 border-secondary group-hover:border-secondary flex-shrink-0 flex items-center justify-center">
                  <CheckCircle2 size={12} className="text-secondary opacity-0 group-hover:opacity-100" />
                </div>
                <div className="flex flex-col flex-1">
                  <span className="font-bold text-sm text-secondary-foreground">Revisão: 24 Flashcards</span>
                  <span className="text-xs text-muted-foreground">Matemática, Português</span>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] uppercase font-bold bg-secondary/20 px-2 py-0.5 rounded text-secondary-foreground">~15 min</span>
                  </div>
                </div>
              </div>
              
              <Button variant="ghost" className="w-full text-muted-foreground hover:text-foreground text-sm" asChild>
                <Link to="/app/plano">Ver cronograma completo <ArrowRight size={14} className="ml-1" /></Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Coluna Direita: Progresso por Matéria */}
        <div className="space-y-6 md:col-span-1">
          <Card className="bg-surface-elevated border-border shadow-sm h-full">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="font-display text-lg">Progresso no Edital</CardTitle>
              <CardDescription>Baseado nas disciplinas cadastradas</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-5">
              
              {subjects.length > 0 ? (
                subjects.slice(0, 4).map(sub => (
                  <div key={sub.id} className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium truncate pr-2">{sub.name}</span>
                      <span className="text-muted-foreground font-bold">
                        {Math.floor(Math.random() * 40) + 10}%
                      </span>
                    </div>
                    <Progress 
                      value={Math.floor(Math.random() * 40) + 10} 
                      className="h-1.5" 
                      indicatorColor={sub.color || "bg-primary"}
                    />
                  </div>
                ))
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
