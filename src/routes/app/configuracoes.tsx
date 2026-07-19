import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { UserProfile, Goal } from "@/types/models";
import { useSyncStorage } from "@/hooks/useSyncStorage";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Target,
  Settings,
  LogOut,
  Trash2,
  Plus,
  Save,
  Bell,
  Moon,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/configuracoes")({
  component: ConfiguracoesRoute,
});

const DEFAULT_COLORS = [
  "#a8ff00",
  "#3b82f6",
  "#f97316",
  "#8b5cf6",
  "#22c55e",
  "#ec4899",
  "#eab308",
  "#06b6d4",
];

function ConfiguracoesRoute() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();

  // Profile and Prefs still using SyncStorage (for now, or can be migrated later)
  const [profile, setProfile] = useSyncStorage<UserProfile | null>("@sinapse:userProfile", null);

  // Goal data fetching
  const { data: goal } = useQuery({
    queryKey: ["currentGoal", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", user?.id)
        .eq("is_active", true)
        .single();
      if (error && error.code !== "PGRST116") throw error; // PGRST116 is not found
      return data;
    },
    enabled: !!user?.id,
  });

  const [localGoal, setLocalGoal] = useState({ title: "", targetDate: "" });

  useEffect(() => {
    if (goal) {
      setLocalGoal({
        title: goal.title || "",
        targetDate: goal.target_date ? new Date(goal.target_date).toISOString().split("T")[0] : "",
      });
    }
  }, [goal]);

  const updateGoalMutation = useMutation({
    mutationFn: async () => {
      if (!goal) return;
      const { error } = await supabase
        .from("goals")
        .update({
          title: localGoal.title,
          target_date: localGoal.targetDate || null,
        })
        .eq("id", goal.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Objetivo atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["currentGoal", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboardData", user?.id] }); // refresh dashboard
    },
    onError: (err) => {
      toast.error("Erro ao atualizar objetivo: " + err.message);
    }
  });

  // Handlers
  const handleSaveProfile = () => {
    if (profile) {
      toast.success("Perfil atualizado com sucesso!");
    }
  };

  const handleSaveGoal = () => {
    if (!localGoal.title.trim()) {
      toast.error("O nome do objetivo é obrigatório.");
      return;
    }
    updateGoalMutation.mutate();
  };

  const handleResetData = async () => {
    if (
      window.confirm(
        "ATENÇÃO: Você tem certeza que deseja APAGAR TODO O HISTÓRICO? Essa ação não pode ser desfeita.",
      )
    ) {
      localStorage.clear();
      await signOut();
      toast.success("Todos os dados foram resetados.");
      navigate({ to: "/login" });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground text-sm">
          Gerencie seu perfil, metas e preferências do sistema.
        </p>
      </div>

      <Tabs defaultValue="perfil" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6 bg-surface-elevated/50 p-1">
          <TabsTrigger value="perfil" className="flex items-center gap-2">
            <User size={16} /> Perfil
          </TabsTrigger>
          <TabsTrigger value="objetivo" className="flex items-center gap-2">
            <Target size={16} /> Objetivo
          </TabsTrigger>
          <TabsTrigger value="sistema" className="flex items-center gap-2">
            <Settings size={16} /> Sistema
          </TabsTrigger>
        </TabsList>

        {/* ABA 1: PERFIL */}
        <TabsContent value="perfil" className="space-y-4">
          <Card className="bg-surface-elevated border-border">
            <CardHeader>
              <CardTitle>Dados Pessoais</CardTitle>
              <CardDescription>Como a inteligência do app vê você.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome Completo</Label>
                  <Input
                    value={profile?.name || ""}
                    onChange={(e) =>
                      setProfile((prev) => (prev ? { ...prev, name: e.target.value } : null))
                    }
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Estudante</Label>
                  <Select
                    value={profile?.studentType || ""}
                    onValueChange={(v) =>
                      setProfile((prev) => (prev ? { ...prev, studentType: v as any } : null))
                    }
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="concurso">Concurseiro</SelectItem>
                      <SelectItem value="vestibular">Vestibulando</SelectItem>
                      <SelectItem value="universidade">Universitário</SelectItem>
                      <SelectItem value="outro">Outro / Livre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Disponibilidade (Horas/Dia)</Label>
                  <Input
                    type="number"
                    value={(profile as any)?.preferences?.hoursPerDay || ""}
                    onChange={(e) =>
                      setProfile((prev) =>
                        prev
                          ? {
                              ...prev,
                              preferences: {
                                ...(prev as any).preferences,
                                hoursPerDay: Number(e.target.value),
                              },
                            }
                          : null,
                      )
                    }
                    className="bg-background"
                  />
                </div>
              </div>
              <div className="pt-4 flex justify-end">
                <Button onClick={handleSaveProfile} className="flex items-center gap-2">
                  <Save size={16} /> Salvar Perfil
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 2: OBJETIVO E MATÉRIAS */}
        <TabsContent value="objetivo" className="space-y-6">
          <Card className="bg-surface-elevated border-border">
            <CardHeader>
              <CardTitle>Meta Atual</CardTitle>
              <CardDescription>Seu alvo principal no momento.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome da Prova/Objetivo</Label>
                  <Input
                    value={localGoal.title}
                    onChange={(e) => setLocalGoal({ ...localGoal, title: e.target.value })}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Alvo (Opcional)</Label>
                  <Input
                    type="date"
                    value={localGoal.targetDate}
                    onChange={(e) => setLocalGoal({ ...localGoal, targetDate: e.target.value })}
                    className="bg-background"
                  />
                </div>
              </div>
              <div className="pt-4 flex justify-end">
                <Button onClick={handleSaveGoal} className="flex items-center gap-2">
                  <Save size={16} /> Salvar Objetivo
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface-elevated border-border">
            <CardHeader>
              <CardTitle>Matérias</CardTitle>
              <CardDescription>Gerencie as disciplinas do seu escopo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center justify-center p-8 bg-background/50 rounded-lg border border-border border-dashed text-center">
                <Target className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <h3 className="text-lg font-medium">Sua Central do Edital</h3>
                <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">
                  O gerenciamento de matérias e assuntos (tópicos) foi movido para uma tela dedicada, onde você tem controle total sobre o seu edital.
                </p>
                <Button asChild>
                  <Link to="/app/materias">Acessar Matérias e Assuntos</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 3: SISTEMA */}
        <TabsContent value="sistema" className="space-y-6">
          <Card className="bg-surface-elevated border-border">
            <CardHeader>
              <CardTitle>Preferências</CardTitle>
              <CardDescription>Ajustes locais da plataforma.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-md text-primary">
                    <Moon size={20} />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">Modo Escuro (Padrão)</h3>
                    <p className="text-xs text-muted-foreground">
                      O Sinapse foi otimizado para o modo noturno.
                    </p>
                  </div>
                </div>
                <Button variant="outline" disabled className="text-xs">
                  Tema Fixo
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-md text-purple-500">
                    <Bell size={20} />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">Notificações Push</h3>
                    <p className="text-xs text-muted-foreground">Lembretes de revisão e estudo.</p>
                  </div>
                </div>
                <Button variant="outline" className="text-xs">
                  Habilitar
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500/10 rounded-md text-orange-500">
                    <Clock size={20} />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">Duração Pomodoro</h3>
                    <p className="text-xs text-muted-foreground">
                      O padrão global das suas sessões de foco (Em breve).
                    </p>
                  </div>
                </div>
                <Select disabled>
                  <SelectTrigger className="w-[120px] bg-background text-xs">
                    <SelectValue placeholder="25 min" />
                  </SelectTrigger>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-900/50 bg-red-950/10">
            <CardHeader>
              <CardTitle className="text-red-500">Zona de Perigo</CardTitle>
              <CardDescription className="text-red-400/70">
                Ações destrutivas e irreversíveis.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground max-w-sm">
                  Apagar todos os dados apagará suas matérias, revisões, histórico de estudo e te
                  devolverá para o onboarding.
                </p>
                <Button
                  variant="destructive"
                  onClick={handleResetData}
                  className="flex items-center gap-2"
                >
                  <LogOut size={16} /> Apagar Tudo
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
