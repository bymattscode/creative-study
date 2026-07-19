import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";

export const Route = createFileRoute("/cadastro")({
  component: CadastroRoute,
});

function CadastroRoute() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      const hasOnboarding = localStorage.getItem("@sinapse:onboardingCompleted");
      navigate({ to: hasOnboarding ? "/app" : "/onboarding", replace: true });
    }
  }, [user, isLoading, navigate]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        }
      }
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else {
      trackEvent("signup_completed");
      
      if (!data.session) {
        toast.success("Conta criada! Por favor, verifique seu e-mail para confirmar a conta.");
        setLoading(false);
        navigate({ to: "/login" });
      } else {
        toast.success("Conta criada com sucesso!");
        // O user mudará e o useEffect redirecionará automaticamente
      }
    }
  };

  if (isLoading) return <div className="min-h-screen bg-background"></div>;
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-display font-bold tracking-tight">Criar Conta</h1>
          <p className="text-muted-foreground mt-2">Comece a estudar com inteligência.</p>
        </div>

        <form className="space-y-4" onSubmit={handleSignup}>
          <div className="space-y-2">
            <Label htmlFor="name">Nome completo</Label>
            <Input 
              id="name" 
              type="text" 
              placeholder="Seu nome" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="estudante@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input 
              id="password" 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Criando..." : "Criar minha conta"}
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
