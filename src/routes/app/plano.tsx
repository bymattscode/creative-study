import { createFileRoute } from "@tanstack/react-router";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/plano")({
  component: PlanoRoute,
});

function PlanoRoute() {
  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full h-full">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">Plano Semanal</h1>
        <p className="text-muted-foreground">Organize sua rotina de estudos para a semana.</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-surface/30 p-12 text-center">
        <div className="rounded-full bg-surface-elevated p-4 mb-4">
          <Calendar className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Seu calendário está vazio</h2>
        <p className="text-muted-foreground max-w-sm mb-6">
          Distribua as matérias que você precisa estudar ao longo dos dias da semana.
        </p>
        <Button>Configurar Semana</Button>
      </div>
    </div>
  );
}
