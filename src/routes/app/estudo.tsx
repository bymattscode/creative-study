import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Subject, StudySession } from "@/types/models";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, FastForward, CheckCircle2, History, Square } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/app/estudo")({
  component: EstudoRoute,
});

type TimerMode = "Foco" | "Pausa Curta" | "Pausa Longa" | "Livre";
type ActivityType = "teoria" | "questoes" | "revisao" | "leitura" | "redacao";

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  teoria: "Teoria",
  questoes: "Questões",
  revisao: "Revisão",
  leitura: "Leitura",
  redacao: "Redação"
};

function EstudoRoute() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [history, setHistory] = useState<StudySession[]>([]);
  
  // Form State
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedType, setSelectedType] = useState<ActivityType>("teoria");
  const [topic, setTopic] = useState("");

  // Timer State
  const [mode, setMode] = useState<TimerMode>("Foco");
  const [timeLeft, setTimeLeft] = useState(25 * 60); // In seconds
  const [elapsedTime, setElapsedTime] = useState(0); // For free mode
  const [isActive, setIsActive] = useState(false);
  const [sessionCount, setSessionCount] = useState(0); // Number of pomodoros

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    try {
      const subs = localStorage.getItem("@sinapse:subjects");
      if (subs) {
        setSubjects(JSON.parse(subs));
      }
      
      const hist = localStorage.getItem("@sinapse:studyHistory");
      if (hist) {
        setHistory(JSON.parse(hist));
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
      case "Livre": return 0; // Starts at 0
    }
  };

  const switchMode = (m: TimerMode) => {
    setMode(m);
    setTimeLeft(getDuration(m));
    setElapsedTime(0);
    setIsActive(false);
  };

  const toggleTimer = () => {
    if (!selectedSubject && (mode === "Foco" || mode === "Livre")) {
      toast.error("Por favor, selecione uma matéria primeiro.");
      return;
    }
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(getDuration(mode));
    setElapsedTime(0);
  };

  const saveSessionToHistory = (durationSeconds: number) => {
    if (!selectedSubject || durationSeconds < 60) return; // Don't save sessions under 1 min for realism (unless forced by UI)

    const newSession: StudySession = {
      id: Math.random().toString(36).substring(7),
      goalId: "default", // would come from goal
      subjectId: selectedSubject,
      topic: topic || "Sem tópico",
      durationMinutes: Math.floor(durationSeconds / 60),
      type: selectedType,
      focusScore: 100, // mock
      createdAt: new Date().toISOString()
    };

    const updatedHistory = [newSession, ...history];
    setHistory(updatedHistory);
    localStorage.setItem("@sinapse:studyHistory", JSON.stringify(updatedHistory));
  };

  const completeSession = (forceSaveLivre = false) => {
    setIsActive(false);
    
    if (mode === "Foco") {
      setSessionCount((prev) => prev + 1);
      toast.success("Sessão de foco concluída! Ótimo trabalho.");
      saveSessionToHistory(25 * 60); // Full pomodoro
      
      if ((sessionCount + 1) % 4 === 0) {
        switchMode("Pausa Longa");
      } else {
        switchMode("Pausa Curta");
      }
    } else if (mode === "Livre" || forceSaveLivre) {
      if (elapsedTime >= 60) {
        saveSessionToHistory(elapsedTime);
        toast.success(`Sessão finalizada. ${Math.floor(elapsedTime / 60)} minutos registrados!`);
      } else {
        toast("Sessão muito curta para registrar (menos de 1 min).");
      }
      resetTimer();
    } else {
      toast("Pausa finalizada. Hora de voltar ao foco!");
      switchMode("Foco");
    }
  };

  // Skip button handler (Useful for testing Pomodoros quickly)
  const skipTimer = () => {
    if (mode === "Livre") {
      // In livre mode, skip adds 60 mock minutes to elapsed and stops
      setElapsedTime(prev => prev + 3600); // add 1 hour
      setIsActive(false);
      toast("1 hora adicionada via atalho de teste. Clique em Parar para salvar.");
    } else {
      completeSession();
    }
  };

  // Timer Tick
  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        if (mode === "Livre") {
          setElapsedTime(prev => prev + 1);
        } else {
          setTimeLeft(prev => {
            if (prev <= 1) {
              completeSession();
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, mode]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const progress = mode === "Livre" 
    ? 100 // Full ring for free mode, or some pulsing effect
    : ((getDuration(mode) - timeLeft) / getDuration(mode)) * 100;

  return (
    <div className="flex flex-col items-center min-h-[80vh] animate-in fade-in duration-500 space-y-8 pb-12">
      
      {/* Header & Controls */}
      <div className="text-center w-full max-w-sm mt-4">
        <h1 className="text-3xl font-display font-bold mb-6">Estúdio de Foco</h1>
        
        {/* Modos */}
        <div className="flex items-center justify-center gap-1 bg-surface p-1.5 rounded-full border border-border mb-6">
          {(["Foco", "Pausa Curta", "Pausa Longa", "Livre"] as TimerMode[]).map(m => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              disabled={isActive}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                mode === m 
                  ? (m === "Foco" ? "bg-primary text-primary-foreground" 
                    : m === "Livre" ? "bg-purple-500 text-white" 
                    : "bg-secondary text-secondary-foreground")
                  : "text-muted-foreground hover:text-foreground disabled:opacity-50"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Inputs da Sessão (Só mostra se for modo Foco ou Livre) */}
        {(mode === "Foco" || mode === "Livre") && (
          <div className="space-y-3 mb-4 text-left">
            <div className="grid grid-cols-2 gap-2">
              <Select value={selectedSubject} onValueChange={setSelectedSubject} disabled={isActive}>
                <SelectTrigger className="w-full bg-surface-elevated border-border text-sm">
                  <SelectValue placeholder="Matéria" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                  {subjects.length === 0 && <SelectItem value="none" disabled>Nenhuma matéria</SelectItem>}
                </SelectContent>
              </Select>

              <Select value={selectedType} onValueChange={(v: ActivityType) => setSelectedType(v)} disabled={isActive}>
                <SelectTrigger className="w-full bg-surface-elevated border-border text-sm">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ACTIVITY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Input 
              placeholder="Qual o tópico (opcional)?" 
              value={topic} 
              onChange={e => setTopic(e.target.value)}
              disabled={isActive}
              className="bg-surface-elevated border-border text-sm"
            />
          </div>
        )}
      </div>

      {/* Timer Circular */}
      <Card className="w-full max-w-sm aspect-square flex flex-col items-center justify-center relative bg-surface-elevated border-border shadow-glow rounded-full">
        {/* Círculo de Progresso Falso */}
        <div className="absolute inset-4 rounded-full border-4 border-muted/20 pointer-events-none"></div>
        
        {/* Ring ativo */}
        <svg className="absolute inset-4 transform -rotate-90 pointer-events-none" viewBox="0 0 100 100">
          <circle 
            cx="50" cy="50" r="48" 
            stroke="currentColor" 
            strokeWidth="4" 
            fill="transparent"
            className={`
              ${mode === "Foco" ? "text-primary" : mode === "Livre" ? "text-purple-500" : "text-secondary"} 
              transition-all duration-1000 ease-linear
            `}
            strokeDasharray="301.59"
            strokeDashoffset={mode === "Livre" ? 0 : 301.59 - (301.59 * progress) / 100}
            strokeLinecap="round"
          />
        </svg>

        <CardContent className="flex flex-col items-center justify-center p-0 z-10">
          <span className="text-7xl font-display font-bold tracking-tighter tabular-nums drop-shadow-md">
            {mode === "Livre" ? formatTime(elapsedTime) : formatTime(timeLeft)}
          </span>
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest mt-2 flex items-center gap-1">
            {mode === "Livre" && isActive && <span className="h-2 w-2 rounded-full bg-purple-500 animate-pulse"></span>}
            {mode}
          </span>
        </CardContent>
      </Card>

      {/* Controles do Player */}
      <div className="flex flex-col items-center gap-6 w-full max-w-sm">
        <div className="flex items-center justify-center gap-4">
          <Button 
            variant="outline" 
            size="icon" 
            className="h-12 w-12 rounded-full"
            onClick={resetTimer}
            disabled={mode === "Foco" && isActive} // Can't reset active pomodoro usually, but let's allow it for freedom
          >
            <RotateCcw size={20} />
          </Button>

          <Button 
            size="icon" 
            className={`h-16 w-16 rounded-full shadow-lg transition-transform hover:scale-105 
              ${mode === "Foco" ? "" : mode === "Livre" ? "bg-purple-600 hover:bg-purple-700 text-white" : "bg-secondary hover:bg-secondary/90 text-secondary-foreground"}`}
            onClick={toggleTimer}
          >
            {isActive ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
          </Button>
          
          {mode === "Livre" ? (
             <Button 
             variant="outline" 
             size="icon" 
             className="h-12 w-12 rounded-full border-red-500/50 text-red-500 hover:bg-red-500/10"
             onClick={() => completeSession(true)}
             title="Parar e Salvar"
             disabled={elapsedTime < 60 && !isActive}
           >
             <Square size={20} />
           </Button>
          ) : (
            <Button 
              variant="outline" 
              size="icon" 
              className="h-12 w-12 rounded-full"
              onClick={skipTimer}
              title="Pular timer (Testes)"
            >
              <FastForward size={20} />
            </Button>
          )}

        </div>

        {/* Resumo & Atalho Skip */}
        {mode === "Livre" && (
           <Button variant="link" size="sm" onClick={skipTimer} className="text-muted-foreground text-xs h-6">
            + 1h (Debug)
          </Button>
        )}
      </div>

      {/* Histórico Recente (Opcional) */}
      {history.length > 0 && (
        <div className="w-full max-w-sm mt-8 space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground font-bold uppercase tracking-widest border-b border-border pb-2">
            <History size={14} /> Últimas Sessões
          </div>
          <div className="space-y-2">
            {history.slice(0, 3).map(sess => {
              const sub = subjects.find(s => s.id === sess.subjectId);
              return (
                <div key={sess.id} className="flex items-center justify-between p-3 rounded-lg bg-surface border border-border text-sm">
                  <div className="flex flex-col">
                    <span className="font-bold">{sub ? sub.name : "Desconhecida"}</span>
                    <span className="text-xs text-muted-foreground">{sess.topic}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-bold">{sess.durationMinutes} min</span>
                    <Badge variant="outline" className="text-[9px] uppercase px-1 h-4 bg-background">{ACTIVITY_LABELS[sess.type as ActivityType] || sess.type}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
