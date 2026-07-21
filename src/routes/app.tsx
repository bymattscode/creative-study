import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);

  useEffect(() => {
    if (isLoading) return; // Aguarda carregar a sessão

    if (!user) {
      // Se não tiver logado, joga pro login
      navigate({ to: "/login", replace: true });
      return;
    }

    // Força o onboarding caso não tenha sido completado ainda
    const checkOnboarding = async () => {
      const hasOnboardingLocally = localStorage.getItem("@sinapse:onboardingCompleted");
      
      if (hasOnboardingLocally) {
        setIsCheckingOnboarding(false);
        return;
      }
      
      // Se não tem no localStorage, vamos checar no banco de dados (pode ser login em novo dispositivo)
      try {
        const { data } = await supabase
          .from("onboarding_preferences")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle(); 
          
        if (data) {
           // Tem onboarding no banco! Vamos salvar no localStorage
           localStorage.setItem("@sinapse:onboardingCompleted", "true");
           setIsCheckingOnboarding(false);
        } else {
           // Não tem mesmo, vai pro onboarding
           navigate({ to: "/onboarding", replace: true });
        }
      } catch (err) {
        console.error("Erro ao checar onboarding:", err);
        navigate({ to: "/onboarding", replace: true });
      }
    };
    
    checkOnboarding();
  }, [navigate, user, isLoading]);

  if (isLoading || !user || isCheckingOnboarding) {
    return <div className="min-h-screen flex items-center justify-center bg-background">Carregando...</div>;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <AppSidebar />
        <main className="flex flex-1 flex-col overflow-hidden">
          {/* Header Mobile / Topbar */}
          <header className="flex h-16 items-center gap-4 border-b border-border/50 bg-surface-elevated/80 px-6 backdrop-blur-md md:hidden z-10 shadow-sm">
            <SidebarTrigger className="-ml-2" />
            <span className="font-display text-xl font-bold text-foreground">Sinapse</span>
          </header>

          {/* Conteúdo Principal (Rotas filhas) */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-24 lg:pb-8">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
