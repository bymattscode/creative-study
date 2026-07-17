import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  BrainCircuit,
  Calendar,
  BookOpen,
  RefreshCcw,
  Timer,
  LineChart,
  Settings,
  LogOut,
} from "lucide-react";
import { UserProfile } from "@/types/models";
import { Badge } from "@/components/ui/badge";
import { useSyncStorage } from "@/hooks/useSyncStorage";

// Itens do menu principal
const mainNavItems = [
  { title: "Início", url: "/app", icon: BrainCircuit, exact: true },
  { title: "Plano Semanal", url: "/app/plano", icon: Calendar },
  { title: "Matérias", url: "/app/materias", icon: BookOpen },
  { title: "Revisões", url: "/app/revisoes", icon: RefreshCcw },
  { title: "Estudo", url: "/app/estudo", icon: Timer },
  { title: "Desempenho", url: "/app/desempenho", icon: LineChart },
];

export function AppSidebar() {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const [profile] = useSyncStorage<UserProfile | null>("@sinapse:userProfile", null);

  return (
    <Sidebar variant="inset">
      <SidebarHeader className="border-b border-border/50 py-4 px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-glow">
            <BrainCircuit size={18} />
          </div>
          <span className="font-display text-xl font-bold tracking-tight text-foreground">
            Sinapse
          </span>
          {profile?.subscriptionTier === "pro" && (
            <Badge
              variant="outline"
              className="ml-1 border-primary/50 text-primary bg-primary/10 text-[10px] px-1.5 py-0"
            >
              PRO
            </Badge>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground">Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => {
                // Checa se está ativo (tratamento simples para exact vs startsWith)
                const isActive = item.exact ? pathname === item.url : pathname.startsWith(item.url);

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.startsWith("/app/configuracoes")}>
                  <Link to="/app/configuracoes">
                    <Settings />
                    <span>Configurações</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="text-destructive hover:text-destructive">
                  <Link to="/">
                    <LogOut />
                    <span>Sair</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
