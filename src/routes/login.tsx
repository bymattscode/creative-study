import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  component: LoginRoute,
});

function LoginRoute() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-display font-bold tracking-tight">Entrar</h1>
          <p className="text-muted-foreground mt-2">Acesse sua conta para continuar.</p>
        </div>

        <form className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" placeholder="estudante@email.com" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Senha</Label>
              <Link to="/" className="text-sm font-medium text-primary hover:underline">
                Esqueceu a senha?
              </Link>
            </div>
            <Input id="password" type="password" />
          </div>
          <Button type="button" className="w-full" asChild>
            <Link to="/app">Entrar no Sistema</Link>
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Ainda não tem conta?{" "}
          <Link to="/cadastro" className="font-medium text-primary hover:underline">
            Cadastre-se grátis
          </Link>
        </p>
      </div>
    </div>
  );
}
