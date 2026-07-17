import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BrainCircuit, Play, Calendar, Target } from "lucide-react";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

function Dashboard() {
  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto w-full">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Olá, Estudante</h1>
          <p className="text-muted-foreground">Aqui está o seu resumo de hoje.</p>
        </div>
        <Button className="gap-2">
          <Play size={16} /> Iniciar Sessão de Estudo
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Horas Estudadas (Hoje)</CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2h 45m</div>
            <p className="text-xs text-muted-foreground mt-1">+15% em relação a ontem</p>
          </CardContent>
        </Card>
        <Card className="glow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Foco Diário</CardTitle>
            <BrainCircuit className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">85%</div>
            <p className="text-xs text-muted-foreground mt-1">Ótimo nível de concentração</p>
          </CardContent>
        </Card>
        <Card className="glow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Revisões Pendentes</CardTitle>
            <Calendar className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground mt-1">3 matérias atrasadas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Plano Semanal</CardTitle>
            <CardDescription>O que você tem programado para hoje.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-surface-elevated p-4 mb-4">
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Nenhum plano para hoje</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">
              Comece organizando sua semana adicionando matérias ou metas diárias.
            </p>
            <Button variant="secondary">Criar Planejamento</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
