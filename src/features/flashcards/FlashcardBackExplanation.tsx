import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Sparkles } from "lucide-react";
import { explainFlashcardWithAI } from "./ai-client";
import { Flashcard } from "./types";

interface FlashcardBackExplanationProps {
  card: Flashcard;
}

export function FlashcardBackExplanation({ card }: FlashcardBackExplanationProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "empty" | "error">("idle");
  const [explanation, setExplanation] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Reseta a explicação sempre que a carta atual mudar
  useEffect(() => {
    setStatus("idle");
    setExplanation("");
    setErrorMessage("");
  }, [card.id]);

  const handleRequestExplanation = async () => {
    setStatus("loading");
    setErrorMessage("");

    try {
      const result = await explainFlashcardWithAI({
        materiaNome: card.materia_nome,
        frente: card.frente,
        verso: card.verso,
      });

      if (!result) {
        setStatus("empty");
      } else {
        setExplanation(result);
        setStatus("success");
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Não foi possível gerar a explicação neste momento.";
      setErrorMessage(msg);
      setStatus("error");
    }
  };

  if (status === "idle") {
    return (
      <div className="flex justify-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRequestExplanation}
          className="border-primary/40 text-primary hover:bg-primary/10 rounded-full px-4"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Explicar melhor com IA
        </Button>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="rounded-xl border border-primary/30 bg-[#16132b] p-4 space-y-2.5 animate-pulse">
        <div className="flex items-center gap-2 text-xs font-bold text-primary">
          <Sparkles className="h-4 w-4 animate-spin" />
          <span>Gerando explicação...</span>
        </div>
        <div className="h-3 w-full rounded bg-surface-elevated" />
        <div className="h-3 w-5/6 rounded bg-surface-elevated" />
        <div className="h-3 w-3/4 rounded bg-surface-elevated" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5 text-xs text-red-300">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRequestExplanation}
          className="border-red-400/40 text-red-300 hover:bg-red-500/20 shrink-0"
        >
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (status === "empty") {
    return (
      <div className="rounded-xl border border-border bg-surface-elevated p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>Nenhuma explicação retornada pela IA. Tente novamente.</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRequestExplanation}
          className="shrink-0"
        >
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-primary/40 bg-[#16132b] p-4 space-y-2 shadow-[0_0_20px_rgba(168,255,0,0.06)]">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
          <Sparkles size={13} />
          Explicação Didática
        </span>
      </div>
      <p className="text-sm text-foreground/95 leading-relaxed whitespace-pre-wrap">
        {explanation}
      </p>
    </div>
  );
}

