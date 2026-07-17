import { createFileRoute } from "@tanstack/react-router";
import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/revisoes")({
  component: RevisoesRoute,
});

function RevisoesRoute() {
  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full h-full">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">Revisões Inteligentes</h1>
        <p className="text-muted-foreground">O sistema de repetição espaçada gerenciado pela IA.</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-surface/30 p-12 text-center">
        <div className="rounded-full bg-surface-elevated p-4 mb-4">
          <RefreshCcw className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Tudo em dia!</h2>
        <p className="text-muted-foreground max-w-sm mb-6">
          Não há cartões ou tópicos pendentes para revisão no momento. Bom trabalho!
        </p>
        <Button variant="secondary">Ver Histórico</Button>
      </div>
    </div>
  );
}
