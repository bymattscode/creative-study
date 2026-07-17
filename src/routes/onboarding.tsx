import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { BrainCircuit } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingRoute,
});

function OnboardingRoute() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <div className="w-full max-w-lg text-center space-y-8">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-glow">
            <BrainCircuit size={32} />
          </div>
        </div>
        
        <div>
          <h1 className="text-4xl font-display font-bold tracking-tight">Bem-vindo ao Sinapse</h1>
          <p className="text-lg text-muted-foreground mt-4">
            Nossa IA vai personalizar sua jornada de estudos. Para começarmos, precisamos saber um pouco mais sobre os seus objetivos.
          </p>
        </div>

        <div className="grid gap-4 pt-4">
          <Button variant="outline" className="h-auto py-4 justify-start text-left" asChild>
            <Link to="/app">
              <span className="font-medium">Estudando para Vestibular / ENEM</span>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto py-4 justify-start text-left" asChild>
            <Link to="/app">
              <span className="font-medium">Estudando para Concurso Público</span>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto py-4 justify-start text-left" asChild>
            <Link to="/app">
              <span className="font-medium">Estudando para Faculdade</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
