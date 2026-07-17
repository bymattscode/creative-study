import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UserProfile, Goal } from "@/types/models";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BrainCircuit, Target, Clock, Zap, ArrowRight, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/")({
  component: DashboardRoute,
});

function DashboardRoute() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);

  useEffect(() => {
    try {
      const p = localStorage.getItem("@sinapse:userProfile");
      const g = localStorage.getItem("@sinapse:currentGoal");
      if (p) setProfile(JSON.parse(p));
      if (g) setGoal(JSON.parse(g));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const getFirstName = (fullName: string) => fullName.split(" ")[0] || "Estudante";

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Saudação */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
            {profile ? `Olá, ${getFirstName(profile.name)}!` : "Bem-vindo de volta!"}
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">
            Pronto para mais um dia produtivo?
          </p>
        </div>
        <div className="flex items-center gap-2 bg-surface px-4 py-2 rounded-full border border-border shadow-sm">
          <Flame size={20} className="text-orange-500" />
          <span className="font-bold">Ofensiva: 3 dias</span>
        </div>
      </div>

      {/* Cards de Métricas Rápidas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-surface-elevated border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Meta Atual</CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display">
              {goal ? goal.title : "Sem meta definida"}
            </div>
            {goal?.targetDate && (
              <p className="text-xs text-muted-foreground mt-1">
                Data: {new Date(goal.targetDate).toLocaleDateString('pt-BR')}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-surface-elevated border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Horas na Semana</CardTitle>
            <Clock className="h-4 w-4 text-secondary-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display">12h 30m</div>
            <p className="text-xs text-muted-foreground mt-1">
              +2h em relação à semana passada
            </p>
          </CardContent>
        </Card>

        <Card className="bg-surface-elevated border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Foco Médio</CardTitle>
            <Zap className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display">85%</div>
            <p className="text-xs text-muted-foreground mt-1">Nível de concentração alto</p>
          </CardContent>
        </Card>
      </div>

      {/* Insight da IA e Atalho */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-primary/5 border-primary/20 shadow-glow relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <BrainCircuit size={100} />
          </div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <BrainCircuit size={20} /> Sinapse IA
            </CardTitle>
            <CardDescription className="text-foreground/80 text-base mt-2">
              Notei que você tem evitado revisões de Exatas. 
              Que tal fazermos uma sessão curta de 25 min agora para quebrar o gelo?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="mt-2 w-full md:w-auto" asChild>
              <Link to="/app/estudo">
                Começar Sessão Recomendada <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-surface-elevated border-border">
          <CardHeader>
            <CardTitle>Planejamento de Hoje</CardTitle>
            <CardDescription>O que você tem para hoje</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex flex-col">
                <span className="font-bold">Direito Constitucional</span>
                <span className="text-sm text-muted-foreground">Tópico: Direitos Fundamentais</span>
              </div>
              <span className="font-medium bg-surface px-2 py-1 rounded text-sm text-muted-foreground">60 min</span>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex flex-col">
                <span className="font-bold">Língua Portuguesa</span>
                <span className="text-sm text-muted-foreground">Tópico: Crase</span>
              </div>
              <span className="font-medium bg-surface px-2 py-1 rounded text-sm text-muted-foreground">30 min</span>
            </div>
            
            <Button variant="outline" className="w-full mt-2" asChild>
              <Link to="/app/plano">Ver Planejamento Completo</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
