import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";
import { Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/cadastro")({
  component: CadastroRoute,
});

function CadastroRoute() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const calculatePasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score += 25;
    if (pass.match(/[A-Z]/)) score += 25;
    if (pass.match(/[0-9]/)) score += 25;
    if (pass.match(/[^A-Za-z0-9]/)) score += 25;
    return score;
  };

  const strength = calculatePasswordStrength(password);
  
  const getStrengthColor = () => {
    if (strength <= 25) return "bg-red-500";
    if (strength <= 50) return "bg-orange-500";
    if (strength <= 75) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getStrengthText = () => {
    if (strength === 0) return "";
    if (strength <= 25) return "Muito fraca";
    if (strength <= 50) return "Fraca";
    if (strength <= 75) return "Média";
    return "Forte";
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/app`
        }
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message || "Erro ao conectar com Google.");
    }
  };

  useEffect(() => {
    if (!isLoading && user) {
      navigate({ to: "/app", replace: true });
    }
  }, [user, isLoading, navigate]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            phone: phone,
          }
        }
      });

      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }

      trackEvent("signup_completed");
      
      if (!data.session) {
        toast.success("Conta criada! Por favor, verifique seu e-mail para confirmar a conta.");
        setLoading(false);
        navigate({ to: "/login" });
      } else {
        toast.success("Conta criada com sucesso!");
        // O user mudará e o useEffect redirecionará automaticamente
      }
    } catch (err: any) {
      toast.error(err.message || "Erro de conexão ao tentar criar conta. Verifique sua internet ou as chaves do Supabase.");
      setLoading(false);
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
            <Label htmlFor="phone">Telefone / WhatsApp</Label>
            <Input 
              id="phone" 
              type="tel" 
              placeholder="(11) 99999-9999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Input 
                id="password" 
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            
            {password.length > 0 && (
              <div className="space-y-1.5 mt-2">
                <Progress value={strength} className="h-1.5" indicatorColor={getStrengthColor()} />
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>{getStrengthText()}</span>
                  <span>Mínimo: 8 letras, 1 maiúscula, 1 número e 1 símbolo.</span>
                </div>
              </div>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={loading || strength < 100}>
            {loading ? "Criando..." : "Criar minha conta"}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border"></span>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Ou</span>
          </div>
        </div>

        <Button 
          variant="outline" 
          type="button" 
          className="w-full flex items-center gap-2 mb-6" 
          onClick={handleGoogleLogin}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
            <path d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86002 8.87028 4.75 12.0003 4.75Z" fill="#EA4335" />
            <path d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z" fill="#4285F4" />
            <path d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z" fill="#FBBC05" />
            <path d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21537 17.135 5.26538 14.29L1.27539 17.385C3.25539 21.31 7.3104 24.0001 12.0004 24.0001Z" fill="#34A853" />
          </svg>
          Entrar com Google
        </Button>

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
