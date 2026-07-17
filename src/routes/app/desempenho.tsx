import { createFileRoute } from "@tanstack/react-router";
import { LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/desempenho")({
  component: DesempenhoRoute,
});

function DesempenhoRoute() {
  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full h-full">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">Desempenho e Analytics</h1>
        <p className="text-muted-foreground">Visualize seus resultados e projeções da IA.</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-surface/30 p-12 text-center">
        <div className="rounded-full bg-surface-elevated p-4 mb-4">
          <LineChart className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Sem dados suficientes</h2>
        <p className="text-muted-foreground max-w-sm mb-6">
          Comece a registrar sessões de estudo e revisões para que a IA possa analisar suas métricas de evolução.
        </p>
        <Button variant="outline">Entender as Métricas</Button>
      </div>
    </div>
  );
}
