import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/cadastro")({
  component: CadastroRoute,
});

function CadastroRoute() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-display font-bold tracking-tight">Criar Conta</h1>
          <p className="text-muted-foreground mt-2">Comece a estudar com inteligência.</p>
        </div>

        <form className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome completo</Label>
            <Input id="name" type="text" placeholder="Seu nome" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" placeholder="estudante@email.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" />
          </div>
          <Button type="button" className="w-full" asChild>
            <Link to="/onboarding">Criar minha conta</Link>
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Já tem uma conta?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Faça login
          </Link>
        </p>
      </div>
    </div>
  );
}
