import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { UserProfile } from "@/types/models";
import { useSyncStorage } from "@/hooks/useSyncStorage";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Sparkles, Zap, BrainCircuit, Target } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/app/upgrade")({
  component: UpgradeRoute,
});

function UpgradeRoute() {
  const navigate = useNavigate();
  const [profile, setProfile] = useSyncStorage<UserProfile | null>("@sinapse:userProfile", null);

  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async (planType: "mensal" | "anual") => {
    // Verificamos se o usuário está logado no Supabase para poder gerar o pagamento
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      toast.error("Você precisa estar logado (online) para assinar.");
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { plan: planType },
      });

      if (error) throw error;

      if (data?.init_point) {
        window.location.href = data.init_point;
      } else {
        toast.error("Link de pagamento não retornado.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao conectar com o provedor de pagamento.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 max-w-5xl mx-auto py-12 px-4">
      <div className="text-center mb-16">
        <div className="inline-flex items-center justify-center p-3 bg-primary/10 text-primary rounded-full mb-6">
          <Sparkles size={32} />
        </div>
        <h1 className="text-4xl md:text-6xl font-display font-bold text-foreground mb-4">
          Eleve seus estudos ao{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-green-500">
            nível Pro
          </span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Destrave o Copiloto de IA, Gráficos Avançados e Planejamento Adaptativo para alcançar sua
          aprovação mais rápido.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {/* Plano Free */}
        <div className="rounded-2xl border border-border bg-surface-elevated p-8 flex flex-col">
          <h2 className="text-2xl font-bold mb-2">Básico</h2>
          <p className="text-muted-foreground mb-6">Para quem está começando a se organizar.</p>
          <div className="text-4xl font-display font-bold mb-8">Grátis</div>

          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex items-center gap-3 text-muted-foreground">
              <CheckCircle2 size={20} className="text-muted-foreground/50" /> 1 Objetivo Ativo
            </li>
            <li className="flex items-center gap-3 text-muted-foreground">
              <CheckCircle2 size={20} className="text-muted-foreground/50" /> Cronômetro Pomodoro
            </li>
            <li className="flex items-center gap-3 text-muted-foreground">
              <CheckCircle2 size={20} className="text-muted-foreground/50" /> Revisões Manuais
            </li>
            <li className="flex items-center gap-3 text-muted-foreground">
              <CheckCircle2 size={20} className="text-muted-foreground/50" /> Painel de Desempenho
              (Visão Geral)
            </li>
          </ul>

          <Button variant="outline" className="w-full" disabled>
            Seu Plano Atual
          </Button>
        </div>

        {/* Plano Pro Mensal */}
        <div className="rounded-2xl border border-primary/20 bg-surface-elevated p-8 flex flex-col relative transition-all hover:border-primary/50">
          <h2 className="text-2xl font-bold mb-2 text-primary">Pro Mensal</h2>
          <p className="text-muted-foreground mb-6">Flexibilidade para o seu estudo.</p>
          <div className="flex items-baseline gap-2 mb-8">
            <span className="text-4xl font-display font-bold">R$ 29,90</span>
            <span className="text-muted-foreground">/mês</span>
          </div>

          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex items-center gap-3">
              <Zap size={20} className="text-primary" /> Copiloto de IA (Insights Diários)
            </li>
            <li className="flex items-center gap-3">
              <BrainCircuit size={20} className="text-primary" /> Analytics Profundo (Gráficos)
            </li>
            <li className="flex items-center gap-3">
              <Target size={20} className="text-primary" /> Planejamento Adaptativo
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle2 size={20} className="text-primary" /> Objetivos Ilimitados
            </li>
          </ul>

          <Button
            onClick={() => handleUpgrade("mensal")}
            disabled={isLoading}
            variant="outline"
            className="w-full font-bold text-lg h-12 border-primary/50 text-foreground hover:bg-primary/10 transition-all"
          >
            {isLoading ? "Gerando..." : "Assinar Mensal"}
          </Button>
        </div>

        {/* Plano Pro Anual */}
        <div className="rounded-2xl border border-primary/50 bg-gradient-to-b from-primary/10 to-transparent p-8 flex flex-col relative shadow-glow">
          <div className="absolute top-0 right-8 transform -translate-y-1/2">
            <span className="bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full">
              Recomendado
            </span>
          </div>

          <h2 className="text-2xl font-bold mb-2 text-primary">Pro Anual</h2>
          <p className="text-muted-foreground mb-6">O arsenal completo para a sua aprovação.</p>
          <div className="flex items-baseline gap-2 mb-8">
            <span className="text-4xl font-display font-bold">R$ 97</span>
            <span className="text-muted-foreground">/ano</span>
          </div>

          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex items-center gap-3">
              <Zap size={20} className="text-primary" /> Copiloto de IA (Insights Diários)
            </li>
            <li className="flex items-center gap-3">
              <BrainCircuit size={20} className="text-primary" /> Analytics Profundo (Gráficos)
            </li>
            <li className="flex items-center gap-3">
              <Target size={20} className="text-primary" /> Planejamento Adaptativo
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle2 size={20} className="text-primary" /> Objetivos Ilimitados
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle2 size={20} className="text-primary" /> Personalização Total
            </li>
          </ul>

          <Button
            onClick={() => handleUpgrade("anual")}
            disabled={isLoading}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-lg h-12 shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:scale-[1.02] transition-all"
          >
            {isLoading ? "Gerando..." : "Assinar Anual"}
          </Button>
        </div>
      </div>
    </div>
  );
}
