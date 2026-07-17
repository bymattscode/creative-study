import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-primary font-serif">Sinapse</h1>
        <p className="mt-4 text-lg text-muted-foreground">Sistema operacional de estudos com IA.</p>
        <p className="mt-2 text-sm font-medium">Ambiente limpo pronto para desenvolvimento.</p>
      </div>
    </div>
  );
}
