import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";

export const Route = createFileRoute("/app/configuracoes")({
  component: ConfiguracoesRoute,
});

function ConfiguracoesRoute() {
  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full h-full">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Ajuste suas preferências e dados do perfil.</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-surface/30 p-12 text-center">
        <div className="rounded-full bg-surface-elevated p-4 mb-4">
          <Settings className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Preferências</h2>
        <p className="text-muted-foreground max-w-sm mb-6">
          Em breve você poderá customizar alertas, ciclos Pomodoro e métodos de revisão aqui.
        </p>
      </div>
    </div>
  );
}
