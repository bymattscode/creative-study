import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Layers, Play } from "lucide-react";
import { toast } from "sonner";
import { useFlashcards } from "./useFlashcards";
import { FlashcardStudyModal } from "./FlashcardStudyModal";
import { FlashcardBackExplanation } from "./FlashcardBackExplanation";

export function TodayFlashcardsReviewSection() {
  const { dueTodayOrLateCards, reviewModel, reviewCard } = useFlashcards();
  const [studyOpen, setStudyOpen] = useState(false);

  if (dueTodayOrLateCards.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      <Card className="bg-surface-elevated border-primary/40 overflow-hidden shadow-sm">
        <div className="h-1 w-full bg-primary" />
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Layers size={15} className="text-primary" />
              <span className="text-xs font-bold uppercase tracking-widest text-primary">
                Flashcards Agendados para Hoje
              </span>
              <Badge className="bg-primary/20 text-primary border-none text-[10px]">
                {dueTodayOrLateCards.length}{" "}
                {dueTodayOrLateCards.length === 1 ? "carta" : "cartas"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Você possui flashcards na fila de repetição espaçada prontos para revisar hoje.
            </p>
          </div>

          <Button
            type="button"
            onClick={() => setStudyOpen(true)}
            className="rounded-full shadow-glow font-bold shrink-0"
          >
            <Play size={14} className="mr-1.5 fill-current" />
            Estudar Cartas de Hoje
          </Button>
        </CardContent>
      </Card>

      <FlashcardStudyModal
        open={studyOpen}
        onClose={() => setStudyOpen(false)}
        deck={dueTodayOrLateCards}
        reviewModel={reviewModel}
        onRateCard={async (cardId, perception) => {
          const res = await reviewCard(cardId, perception);
          toast.success(
            `Carta revisada (${perception})! Próxima revisão em ${res.nextIntervalDays} dia(s).`,
          );
          return res;
        }}
        renderBackExtra={(card) => <FlashcardBackExplanation card={card} />}
      />
    </div>
  );
}

