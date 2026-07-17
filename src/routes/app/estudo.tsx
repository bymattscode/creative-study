import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Subject } from "@/types/models";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, FastForward, CheckCircle2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner"; // we might need to add toaster to root, assuming it's setup or just ignore if it fails

export const Route = createFileRoute("/app/estudo")({
  component: EstudoRoute,
});

type TimerMode = "Foco" | "Pausa Curta" | "Pausa Longa";

function EstudoRoute() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");

  const [mode, setMode] = useState<TimerMode>("Foco");
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes
  const [isActive, setIsActive] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    try {
      const subs = localStorage.getItem("@sinapse:subjects");
      if (subs) {
        setSubjects(JSON.parse(subs));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const getDuration = (m: TimerMode) => {
    switch (m) {
      case "Foco": return 25 * 60;
      case "Pausa Curta": return 5 * 60;
      case "Pausa Longa": return 15 * 60;
    }
  };

  const switchMode = (m: TimerMode) => {
    setMode(m);
    setTimeLeft(getDuration(m));
    setIsActive(false);
  };

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(getDuration(mode));
  };

  const completeSession = () => {
    setIsActive(false);
    if (mode === "Foco") {
      setSessionCount((prev) => prev + 1);
      toast.success("Sessão de foco concluída! Ótimo trabalho.");
      // Se completou 4 sessões, pausa longa
      if ((sessionCount + 1) % 4 === 0) {
        switchMode("Pausa Longa");
      } else {
        switchMode("Pausa Curta");
      }
    } else {
      toast("Pausa finalizada. Hora de voltar ao foco!");
      switchMode("Foco");
    }
  };

  // Skip button handler
  const skipTimer = () => completeSession();

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      completeSession();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft, mode]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const progress = ((getDuration(mode) - timeLeft) / getDuration(mode)) * 100;

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] animate-in fade-in duration-500 space-y-8">
      
      {/* Header */}
      <div className="text-center space-y-2 w-full max-w-sm">
        <h1 className="text-3xl font-display font-bold">Estúdio de Foco</h1>
        
        {/* Seletor de Matéria */}
        {subjects.length > 0 ? (
          <div className="mt-4">
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="w-full bg-surface-elevated border-border">
                <SelectValue placeholder="O que vamos estudar agora?" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Nenhuma matéria cadastrada.</p>
        )}
      </div>

      {/* Modos */}
      <div className="flex items-center gap-2 bg-surface p-1.5 rounded-full border border-border">
        {(["Foco", "Pausa Curta", "Pausa Longa"] as TimerMode[]).map(m => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              mode === m 
                ? (m === "Foco" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground")
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Timer Circular Minimalista */}
      <Card className="w-full max-w-sm aspect-square flex flex-col items-center justify-center relative bg-surface-elevated border-border shadow-glow rounded-full">
        {/* Círculo de Progresso Falso no fundo */}
        <div 
          className="absolute inset-4 rounded-full border-4 border-muted/20 pointer-events-none"
        ></div>
        {/* Ring ativo */}
        <svg className="absolute inset-4 transform -rotate-90 pointer-events-none" viewBox="0 0 100 100">
          <circle 
            cx="50" cy="50" r="48" 
            stroke="currentColor" 
            strokeWidth="4" 
            fill="transparent"
            className={`${mode === "Foco" ? "text-primary" : "text-secondary"} transition-all duration-1000 ease-linear`}
            strokeDasharray="301.59" // 2 * pi * 48
            strokeDashoffset={301.59 - (301.59 * progress) / 100}
            strokeLinecap="round"
          />
        </svg>

        <CardContent className="flex flex-col items-center justify-center p-0 z-10">
          <span className="text-7xl font-display font-bold tracking-tighter tabular-nums drop-shadow-md">
            {formatTime(timeLeft)}
          </span>
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest mt-2">
            {mode}
          </span>
        </CardContent>
      </Card>

      {/* Controles */}
      <div className="flex flex-col items-center gap-6 w-full max-w-sm">
        <div className="flex items-center justify-center gap-4">
          <Button 
            variant="outline" 
            size="icon" 
            className="h-12 w-12 rounded-full"
            onClick={resetTimer}
          >
            <RotateCcw size={20} />
          </Button>

          <Button 
            size="icon" 
            className={`h-16 w-16 rounded-full shadow-lg transition-transform hover:scale-105 ${mode !== "Foco" ? "bg-secondary hover:bg-secondary/90 text-secondary-foreground" : ""}`}
            onClick={toggleTimer}
          >
            {isActive ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
          </Button>

          <Button 
            variant="outline" 
            size="icon" 
            className="h-12 w-12 rounded-full"
            onClick={skipTimer}
            title="Pular timer (Testes)"
          >
            <FastForward size={20} />
          </Button>
        </div>

        {/* Resumo */}
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <CheckCircle2 size={16} className="text-primary" />
          <span>{sessionCount} ciclo{sessionCount !== 1 ? 's' : ''} concluído{sessionCount !== 1 ? 's' : ''} hoje</span>
        </div>
      </div>

    </div>
  );
}
