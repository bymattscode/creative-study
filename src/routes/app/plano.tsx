import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Subject, UserProfile } from "@/types/models";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BrainCircuit, CheckCircle2, Clock, CalendarDays, BookOpen } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner"; // Assuming sonner is in use for toasts, or we'll just ignore if it breaks

export const Route = createFileRoute("/app/plano")({
  component: PlanoSemanalRoute,
});

type PlanDay = {
  dayName: string;
  items: Array<{
    id: string;
    subjectId: string;
    subjectName: string;
    topicName: string;
    durationMinutes: number;
    completed: boolean;
  }>;
};

const WEEK_DAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

function PlanoSemanalRoute() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [plan, setPlan] = useState<PlanDay[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    try {
      const subs = localStorage.getItem("@sinapse:subjects");
      const p = localStorage.getItem("@sinapse:userProfile");
      if (subs) setSubjects(JSON.parse(subs));
      if (p) setProfile(JSON.parse(p));
      
      const savedPlan = localStorage.getItem("@sinapse:weeklyPlan");
      if (savedPlan) {
        setPlan(JSON.parse(savedPlan));
      } else {
        // Inicializa array vazio para os dias
        setPlan(WEEK_DAYS.map(day => ({ dayName: day, items: [] })));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const generateAIPlan = () => {
    if (subjects.length === 0) {
      toast.error("Você precisa cadastrar matérias no seu perfil primeiro!");
      return;
    }

    setIsGenerating(true);

    setTimeout(() => {
      // Distribui as matérias aleatoriamente baseado no número de horas diárias (simulado)
      // Se não tiver hoursPerDay, assumimos 4h. Se for 4h = 4 blocos de 60min por dia (ou 8 de 30min)
      // Faremos blocos de 60 minutos.
      const blocksPerDay = 4; // Mock
      
      const newPlan = WEEK_DAYS.map(day => {
        const items = [];
        // Distribui até 3 matérias diferentes por dia
        for (let i = 0; i < (day === "Domingo" ? 1 : 3); i++) {
          const randomSub = subjects[Math.floor(Math.random() * subjects.length)];
          items.push({
            id: Math.random().toString(36).substring(7),
            subjectId: randomSub.id,
            subjectName: randomSub.name,
            topicName: `Revisão de ${randomSub.name}`,
            durationMinutes: 60,
            completed: false
          });
        }
        return { dayName: day, items };
      });

      setPlan(newPlan);
      localStorage.setItem("@sinapse:weeklyPlan", JSON.stringify(newPlan));
      setIsGenerating(false);
      toast.success("Plano gerado com sucesso!");
    }, 2000);
  };

  const toggleTask = (dayIndex: number, taskId: string) => {
    const newPlan = [...plan];
    const task = newPlan[dayIndex].items.find(t => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
      setPlan(newPlan);
      localStorage.setItem("@sinapse:weeklyPlan", JSON.stringify(newPlan));
    }
  };

  const hasEmptyPlan = plan.every(day => day.items.length === 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto pb-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Seu Cronograma</h1>
          <p className="text-muted-foreground mt-1 text-lg">
            Acompanhe suas missões semanais.
          </p>
        </div>
        <Button 
          onClick={generateAIPlan} 
          disabled={isGenerating}
          className="w-full md:w-auto shadow-glow"
        >
          {isGenerating ? (
            <span className="flex items-center">
              <BrainCircuit className="mr-2 h-4 w-4 animate-pulse" /> Processando...
            </span>
          ) : (
            <span className="flex items-center">
              <BrainCircuit className="mr-2 h-4 w-4" /> Gerar Cronograma IA
            </span>
          )}
        </Button>
      </div>

      {hasEmptyPlan && !isGenerating ? (
        <Card className="bg-surface border-dashed border-2 py-12">
          <CardContent className="flex flex-col items-center text-center space-y-4">
            <CalendarDays size={48} className="text-muted-foreground opacity-50" />
            <div>
              <p className="font-medium text-lg">Semana Vazia</p>
              <p className="text-muted-foreground">Clique no botão acima para deixar a Inteligência Artificial organizar sua rotina.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" defaultValue={["Segunda", "Terça", "Quarta", "Quinta", "Sexta"]} className="w-full space-y-4">
          {plan.map((day, idx) => (
            <AccordionItem key={day.dayName} value={day.dayName} className="border bg-surface-elevated rounded-xl px-4 overflow-hidden">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center justify-between w-full pr-4">
                  <h3 className="font-bold text-lg">{day.dayName}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground font-normal">
                    <span className="bg-surface px-2 py-1 rounded">
                      {day.items.filter(i => i.completed).length}/{day.items.length} Concluídos
                    </span>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4 space-y-3">
                {day.items.length === 0 ? (
                  <p className="text-muted-foreground text-sm italic">Dia livre.</p>
                ) : (
                  day.items.map(task => (
                    <div 
                      key={task.id} 
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border transition-all ${
                        task.completed 
                          ? "bg-surface opacity-60 border-transparent" 
                          : "bg-background border-border shadow-sm hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-3">
                        <button 
                          onClick={() => toggleTask(idx, task.id)}
                          className={`mt-1 sm:mt-0 flex-shrink-0 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                            task.completed ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground hover:border-primary"
                          }`}
                        >
                          {task.completed && <CheckCircle2 size={16} />}
                        </button>
                        <div className="flex flex-col">
                          <span className={`font-semibold ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                            {task.subjectName}
                          </span>
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <BookOpen size={12} /> {task.topicName}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-3 sm:mt-0 ml-9 sm:ml-0 flex items-center gap-1 text-sm font-medium bg-surface px-2 py-1 rounded w-fit">
                        <Clock size={14} className="text-secondary-foreground" />
                        {task.durationMinutes} min
                      </div>
                    </div>
                  ))
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

    </div>
  );
}
