import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { UserProfile, Goal, Subject } from "@/types/models";
import { useSyncStorage } from "@/hooks/useSyncStorage";
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

  // States
  const [profile, setProfile] = useSyncStorage<UserProfile | null>("@sinapse:userProfile", null);
  const [goal, setGoal] = useSyncStorage<Goal | null>("@sinapse:currentGoal", null);
  const [subjects, setSubjects] = useSyncStorage<Subject[]>("@sinapse:subjects", []);

  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectColor, setNewSubjectColor] = useState(DEFAULT_COLORS[0]);

  // Handlers
  const handleSaveProfile = () => {
    if (profile) {
      toast.success("Perfil atualizado com sucesso!");
    }
  };

  const handleSaveGoal = () => {
    if (goal) {
      toast.success("Objetivo atualizado com sucesso!");
    }
  };

  const handleAddSubject = () => {
    if (!newSubjectName.trim()) return;

    const newSubject: Subject = {
      id: crypto.randomUUID(),
      name: newSubjectName.trim(),
      color: newSubjectColor,
    };

    const updated = [...subjects, newSubject];
    setSubjects(updated);
    setNewSubjectName("");
    toast.success("Matéria adicionada!");
  };

  const handleDeleteSubject = (id: string) => {
    const updated = subjects.filter((s) => s.id !== id);
    setSubjects(updated);
    toast.info("Matéria removida.");
  };

  const handleResetData = () => {
    if (
      window.confirm(
        "ATENÇÃO: Você tem certeza que deseja APAGAR TODO O HISTÓRICO? Essa ação não pode ser desfeita.",
      )
    ) {
      localStorage.clear();
      toast.success("Todos os dados foram resetados.");
      navigate({ to: "/onboarding" });
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
                    value={profile?.availableHoursPerDay || ""}
                    onChange={(e) =>
                      setProfile((prev) =>
                        prev ? { ...prev, availableHoursPerDay: Number(e.target.value) } : null,
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
                    value={goal?.title || ""}
                    onChange={(e) =>
                      setGoal((prev) => (prev ? { ...prev, title: e.target.value } : null))
                    }
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Alvo (Opcional)</Label>
                  <Input
                    type="date"
                    value={
                      goal?.targetDate ? new Date(goal.targetDate).toISOString().split("T")[0] : ""
                    }
                    onChange={(e) =>
                      setGoal((prev) =>
                        prev ? { ...prev, targetDate: new Date(e.target.value) } : null,
                      )
                    }
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
              {/* Add New */}
              <div className="flex items-end gap-3 p-4 bg-background/50 rounded-lg border border-border">
                <div className="flex-1 space-y-2">
                  <Label>Nova Matéria</Label>
                  <Input
                    placeholder="Ex: Direito Constitucional"
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2 w-16">
                  <Label>Cor</Label>
                  <div className="relative">
                    <Input
                      type="color"
                      value={newSubjectColor}
                      onChange={(e) => setNewSubjectColor(e.target.value)}
                      className="p-1 h-10 w-full cursor-pointer bg-background"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleAddSubject}
                  disabled={!newSubjectName.trim()}
                  variant="secondary"
                  className="px-3"
                >
                  <Plus size={18} />
                </Button>
              </div>

              {/* List */}
              <div className="space-y-2">
                {subjects.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between p-3 rounded-md bg-background border border-border/50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: sub.color }}
                      />
                      <span className="font-medium">{sub.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteSubject(sub.id)}
                      className="text-muted-foreground hover:text-red-400"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ))}
                {subjects.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Nenhuma matéria cadastrada.
                  </p>
                )}
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
