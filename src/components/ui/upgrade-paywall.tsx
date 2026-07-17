import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { Button } from "./button";

interface UpgradePaywallProps {
  children: React.ReactNode;
  isPro: boolean;
  title?: string;
  description?: string;
}

export function UpgradePaywall({ 
  children, 
  isPro,
  title = "Recurso Premium",
  description = "Faça o upgrade para o plano Pro para desbloquear essa ferramenta poderosa."
}: UpgradePaywallProps) {
  
  if (isPro) {
    return <>{children}</>;
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-border group">
      {/* O conteúdo original, borrado e com opacidade baixa */}
      <div className="opacity-30 blur-[6px] pointer-events-none select-none grayscale transition-all duration-700 group-hover:blur-[8px]">
        {children}
      </div>
      
      {/* Overlay Escuro para Legibilidade */}
      <div className="absolute inset-0 bg-background/50 pointer-events-none"></div>

      {/* Call to Action */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 animate-in fade-in zoom-in duration-500">
        <div className="h-12 w-12 rounded-full bg-primary/20 text-primary flex items-center justify-center mb-4">
          <Lock size={24} />
        </div>
        <h3 className="text-xl font-display font-bold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-sm mb-6">
          {description}
        </p>
        <Link to="/app/upgrade">
          <Button className="bg-gradient-to-r from-primary to-green-500 text-primary-foreground font-bold hover:shadow-glow transition-all hover:scale-105">
            Desbloquear Agora
          </Button>
        </Link>
      </div>
    </div>
  );
}
