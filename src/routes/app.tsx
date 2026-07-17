import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
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
