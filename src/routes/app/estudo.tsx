import { createFileRoute } from "@tanstack/react-router";
import { Timer } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/estudo")({
  component: EstudoRoute,
});

function EstudoRoute() {
  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full h-full">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">Sessão de Estudo</h1>
        <p className="text-muted-foreground">Foco profundo utilizando a técnica Pomodoro.</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-surface/30 p-12 text-center">
        <div className="rounded-full bg-surface-elevated p-4 mb-4">
          <Timer className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Pronto para focar?</h2>
        <p className="text-muted-foreground max-w-sm mb-6">
          Inicie um temporizador para começar a contabilizar seu tempo de estudo de forma estruturada.
        </p>
        <Button size="lg" className="text-lg px-8">Iniciar Sessão</Button>
      </div>
    </div>
  );
}
