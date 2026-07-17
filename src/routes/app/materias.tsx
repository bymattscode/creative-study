import { createFileRoute } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/materias")({
  component: MateriasRoute,
});

function MateriasRoute() {
  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full h-full">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">Matérias e Assuntos</h1>
        <p className="text-muted-foreground">Gerencie o conteúdo que você precisa dominar.</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-surface/30 p-12 text-center">
        <div className="rounded-full bg-surface-elevated p-4 mb-4">
          <BookOpen className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Nenhuma matéria cadastrada</h2>
        <p className="text-muted-foreground max-w-sm mb-6">
          Adicione as disciplinas e tópicos que cairão na sua prova para acompanhar o progresso.
        </p>
        <Button>Adicionar Matéria</Button>
      </div>
    </div>
  );
}
