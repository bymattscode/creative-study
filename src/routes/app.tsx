import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { useAuth } from "@/contexts/auth";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return; // Aguarda carregar a sessão

    if (!user) {
      // Se não tiver logado, joga pro login
      navigate({ to: "/login", replace: true });
      return;
    }

    // Força o onboarding caso não tenha sido completado ainda
    const hasOnboarding = localStorage.getItem("@sinapse:onboardingCompleted");
    if (!hasOnboarding) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [navigate, user, isLoading]);

  if (isLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center bg-background">Carregando...</div>;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <AppSidebar />
        <main className="flex flex-1 flex-col overflow-hidden">
          {/* Header Mobile / Topbar */}
          <header className="flex h-16 items-center gap-4 border-b border-border/50 bg-surface-elevated/80 px-6 backdrop-blur-md lg:hidden z-10 shadow-sm">
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
