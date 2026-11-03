import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import {
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Plus,
  X,
  Loader2,
} from "lucide-react";
import { saveOnboardingData, OnboardingData } from "@/lib/onboarding-store";
import { useAuth } from "@/contexts/auth";
import { useSyncStorage } from "@/hooks/useSyncStorage";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingWizard,
});

function OnboardingWizard() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [step, setStep] = useSyncStorage<number>("@sinapse:onboardingStep", 1);
  const totalSteps = 5;
  const progress = ((step - 1) / (totalSteps - 1)) * 100;

  useEffect(() => {
    if (!isLoading && !user) {
      navigate({ to: "/login", replace: true });
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    trackEvent("onboarding_started");
  }, []);

  // Form State persistido para não perder onde parou ao atualizar a página
  const [data, setData] = useSyncStorage<OnboardingData>("@sinapse:onboardingDraft", {
    name: "",
    studentType: "",
    goalName: "",
    goalDate: "",
    minutesPerDay: 240,
    studyDays: [],
    dailyStudyHours: {},
    preferredTime: [],
    subjects: [{ name: "", difficulty: "Médio" }],
  });

  const nextStep = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  // Auto-finish effect on step 5
  useEffect(() => {
    if (step === 5 && user) {
      // Execute the async save operation
      const performSave = async () => {
        try {
          const success = await saveOnboardingData(user.id, data);
          if (success) {
            trackEvent("onboarding_completed");
            navigate({ to: "/app", replace: true });
          } else {
            toast.error("Ocorreu um erro ao salvar seu perfil. Tente novamente.");
            setStep(4); // Volta para a tela anterior
          }
        } catch (error) {
          toast.error("Falha de conexão.");
          setStep(4);
        }
      };
      
      // Dá um tempo simbólico de carregamento da "IA"
      const timer = setTimeout(performSave, 2500);
      return () => clearTimeout(timer);
    }
  }, [step, data, navigate, user]);

  if (isLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center bg-background">Carregando...</div>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header com Progress */}
      <header className="w-full max-w-3xl mx-auto p-4 md:p-6 mt-4">
        {step < 5 && (
          <div className="space-y-4">
            <Progress value={progress} className="h-2" />
            <div className="flex items-center justify-between text-sm text-muted-foreground font-medium">
              <span>
                Passo {step} de {totalSteps - 1}
              </span>
              {step > 1 && (
                <button
                  onClick={prevStep}
                  className="flex items-center hover:text-primary transition-colors"
                >
                  <ChevronLeft size={16} className="mr-1" /> Voltar
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-xl">
          {/* STEP 1: Básico */}
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center space-y-2">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground mb-4 shadow-glow">
                  <BrainCircuit size={24} />
                </div>
                <h1 className="text-3xl md:text-4xl font-display font-bold">
                  Como podemos te chamar?
                </h1>
                <p className="text-muted-foreground">
                  O primeiro passo para personalizarmos seu plano.
                </p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Seu Nome</Label>
                  <Input
                    id="name"
                    placeholder="Ex: João Silva"
                    value={data.name}
                    onChange={(e) => setData({ ...data, name: e.target.value })}
                    className="h-12 text-lg"
                  />
                </div>

                <div className="space-y-3">
                  <Label>Qual o seu foco atual?</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {["ENEM / Vestibular", "Concurso Público", "Universidade", "Estudo Livre"].map(
                      (type) => (
                        <Card
                          key={type}
                          className={`p-4 cursor-pointer transition-all border-2 ${data.studentType === type ? "border-primary bg-primary/10" : "border-transparent hover:border-border"}`}
                          onClick={() => setData({ ...data, studentType: type })}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{type}</span>
                            {data.studentType === type && (
                              <CheckCircle2 size={18} className="text-primary" />
                            )}
                          </div>
                        </Card>
                      ),
                    )}
                  </div>
                </div>

                <Button
                  className="w-full h-12 text-lg"
                  onClick={nextStep}
                  disabled={!data.name || !data.studentType}
                >
                  Continuar <ChevronRight size={20} className="ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: Objetivo */}
          {step === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center space-y-2">
                <h1 className="text-3xl md:text-4xl font-display font-bold">
                  Qual é a sua grande meta?
                </h1>
                <p className="text-muted-foreground">
                  Defina o nome da prova ou objetivo principal.
                </p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="goalName">Nome do Objetivo</Label>
                  <Input
                    id="goalName"
                    placeholder="Ex: ENEM 2026, Concurso Banco do Brasil..."
                    value={data.goalName}
                    onChange={(e) => setData({ ...data, goalName: e.target.value })}
                    className="h-12 text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="goalDate">Data da Prova (Opcional)</Label>
                  <Input
                    id="goalDate"
                    type="date"
                    value={data.goalDate || ""}
                    onChange={(e) => setData({ ...data, goalDate: e.target.value })}
                    className="h-12 text-lg block w-full"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    A IA usará isso para montar sua grade regressiva.
                  </p>
                </div>

                <Button
                  className="w-full h-12 text-lg"
                  onClick={nextStep}
                  disabled={!data.goalName}
                >
                  Continuar <ChevronRight size={20} className="ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Disponibilidade */}
          {step === 3 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center space-y-2">
                <h1 className="text-3xl md:text-4xl font-display font-bold">Sua Rotina</h1>
                <p className="text-muted-foreground">Quanto tempo você tem disponível?</p>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <Label>Dias da Semana</Label>
                  <div className="flex justify-between gap-2">
                    {[
                      { id: 0, label: "D" },
                      { id: 1, label: "S" },
                      { id: 2, label: "T" },
                      { id: 3, label: "Q" },
                      { id: 4, label: "Q" },
                      { id: 5, label: "S" },
                      { id: 6, label: "S" },
                    ].map((day) => {
                      const isSelected = data.studyDays.includes(day.id);
                      return (
                        <button
                          key={day.id}
                          onClick={() => {
                            const newDays = isSelected
                              ? data.studyDays.filter((d) => d !== day.id)
                              : [...data.studyDays, day.id].sort();
                            const nextHours = { ...(data.dailyStudyHours || {}) };
                            if (!isSelected && nextHours[day.id.toString()] === undefined) {
                              nextHours[day.id.toString()] = 120;
                            }
                            setData({ ...data, studyDays: newDays, dailyStudyHours: nextHours });
                          }}
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all border-2 ${
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-muted-foreground border-border hover:border-primary/50"
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {data.studyDays.length > 0 && (
                  <div className="space-y-6 mt-6">
                    <Label>Tempo de Estudo por Dia</Label>
                    <div className="space-y-4">
                      {data.studyDays.map(dayId => {
                        const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
                        const currentMinutes = data.dailyStudyHours?.[dayId.toString()] || 120;
                        return (
                          <div key={dayId} className="space-y-3 bg-surface/30 p-4 rounded-lg border border-border/50">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-foreground">{dayNames[dayId]}</span>
                              <span className="text-xl font-bold text-primary">
                                {Math.floor(currentMinutes / 60) > 0 ? `${Math.floor(currentMinutes / 60)}h ` : ""}
                                {currentMinutes % 60 > 0 ? `${currentMinutes % 60}m` : ""}
                              </span>
                            </div>
                            <Slider
                              defaultValue={[currentMinutes]}
                              max={720}
                              min={15}
                              step={15}
                              onValueChange={(val) => setData({
                                ...data,
                                dailyStudyHours: {
                                  ...data.dailyStudyHours,
                                  [dayId.toString()]: val[0]
                                }
                              })}
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <Label>Turnos Preferidos</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Selecione todos os turnos em que você costuma estudar.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {["manhã", "tarde", "noite", "madrugada"].map((turno) => {
                      const isSelected = data.preferredTime.includes(turno);
                      return (
                        <Card
                          key={turno}
                          className={`p-4 cursor-pointer transition-all border-2 text-center capitalize ${isSelected ? "border-primary bg-primary/10 text-primary font-bold" : "border-transparent hover:border-border text-muted-foreground"}`}
                          onClick={() => {
                            const newTimes = isSelected 
                              ? data.preferredTime.filter(t => t !== turno)
                              : [...data.preferredTime, turno];
                            setData({ ...data, preferredTime: newTimes });
                          }}
                        >
                          {turno}
                        </Card>
                      )
                    })}
                  </div>
                </div>

                <Button
                  className="w-full h-12 text-lg mt-4"
                  onClick={nextStep}
                  disabled={data.preferredTime.length === 0 || data.studyDays.length === 0}
                >
                  Continuar <ChevronRight size={20} className="ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: Matérias */}
          {step === 4 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center space-y-2">
                <h1 className="text-3xl md:text-4xl font-display font-bold">Matérias Principais</h1>
                <p className="text-muted-foreground">
                  Adicione os conteúdos que você precisa dominar.
                </p>
              </div>

              <div className="space-y-4">
                {data.subjects.map((sub, idx) => (
                  <Card
                    key={idx}
                    className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center relative border-border/50 bg-surface-elevated/50"
                  >
                    {data.subjects.length > 1 && (
                      <button
                        onClick={() => {
                          const newSubs = [...data.subjects];
                          newSubs.splice(idx, 1);
                          setData({ ...data, subjects: newSubs });
                        }}
                        className="absolute -right-2 -top-2 bg-destructive text-destructive-foreground rounded-full p-1"
                      >
                        <X size={14} />
                      </button>
                    )}
                    <div className="flex-1 w-full">
                      <Input
                        placeholder="Nome da matéria (ex: Matemática)"
                        value={sub.name}
                        onChange={(e) => {
                          const newSubs = [...data.subjects];
                          newSubs[idx].name = e.target.value;
                          setData({ ...data, subjects: newSubs });
                        }}
                        className="border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary bg-transparent"
                      />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                      {["Muito Fácil", "Fácil", "Médio", "Difícil", "Muito Difícil"].map((level) => (
                        <button
                          key={level}
                          onClick={() => {
                            const newSubs = [...data.subjects];
                            newSubs[idx].difficulty = level as any;
                            setData({ ...data, subjects: newSubs });
                          }}
                          className={`text-xs px-2 py-1.5 rounded-full border transition-colors flex-1 md:flex-none text-center leading-none ${sub.difficulty === level ? "bg-primary/20 border-primary text-primary" : "border-border/50 text-muted-foreground hover:bg-surface"}`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </Card>
                ))}

                <Button
                  variant="outline"
                  className="w-full border-dashed py-6 text-muted-foreground hover:text-foreground"
                  onClick={() =>
                    setData({
                      ...data,
                      subjects: [...data.subjects, { name: "", difficulty: "Médio" }],
                    })
                  }
                >
                  <Plus size={16} className="mr-2" /> Adicionar Matéria
                </Button>

                <Button
                  className="w-full h-12 text-lg mt-6"
                  onClick={nextStep}
                  disabled={data.subjects.some((s) => !s.name.trim())}
                >
                  Concluir Perfil <CheckCircle2 size={20} className="ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 5: Finalizando */}
          {step === 5 && (
            <div className="flex flex-col items-center justify-center space-y-6 py-12 animate-in zoom-in duration-500">
              <div className="relative">
                <div className="absolute inset-0 rounded-full blur-xl bg-primary/20 animate-pulse"></div>
                <div className="relative h-24 w-24 rounded-full bg-surface-elevated flex items-center justify-center border-2 border-primary shadow-glow">
                  <BrainCircuit size={40} className="text-primary animate-pulse" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-display font-bold">Preparando seu ambiente...</h1>
                <p className="text-muted-foreground">
                  A Inteligência Artificial está montando seu planejamento inicial.
                </p>
              </div>
              <Loader2 className="animate-spin text-primary mt-8" size={32} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
