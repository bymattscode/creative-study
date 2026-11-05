import { ReactNode, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, RotateCw, X } from "lucide-react";
import { ReviewModel } from "@/types/models";
import { computeNextFlashcardReview } from "./spaced-repetition";
import { Flashcard, FlashcardReviewPerception } from "./types";

interface FlashcardStudyModalProps {
  open: boolean;
  onClose: () => void;
  deck: Flashcard[];
  reviewModel: ReviewModel;
  onRateCard: (
    cardId: string,
    perception: FlashcardReviewPerception,
  ) => Promise<{ updated: Flashcard; nextIntervalDays: number }>;
  /** Slot opcional no verso da carta (usado na Fase 2 para o botão "Explicar melhor" com IA) */
  renderBackExtra?: (card: Flashcard) => ReactNode;
}

export function FlashcardStudyModal({
  open,
  onClose,
  deck,
  reviewModel,
  onRateCard,
  renderBackExtra,
}: FlashcardStudyModalProps) {
  const [sessionCards, setSessionCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  // Inicializa a fila da sessão ao abrir o modal
  useEffect(() => {
    if (open) {
      setSessionCards(deck);
      setCurrentIndex(0);
      setIsFlipped(false);
      setCompletedCount(0);
    }
  }, [open]);

  const currentCard = sessionCards[currentIndex] || null;
  const isFinished = sessionCards.length > 0 && currentIndex >= sessionCards.length;

  const nextIntervalsPreview = useMemo(() => {
    if (!currentCard) return { dificil: 1, medio: 3, facil: 7 };
    return {
      dificil: computeNextFlashcardReview(currentCard, "Difícil", reviewModel).nextIntervalDays,
      medio: computeNextFlashcardReview(currentCard, "Médio", reviewModel).nextIntervalDays,
      facil: computeNextFlashcardReview(currentCard, "Fácil", reviewModel).nextIntervalDays,
    };
  }, [currentCard, reviewModel]);

  if (!open) return null;

  const progressValue =
    sessionCards.length > 0 ? Math.round((completedCount / sessionCards.length) * 100) : 0;

  const handleSelectPerception = async (perception: FlashcardReviewPerception) => {
    if (!currentCard || isSubmitting) return;
    try {
      setIsSubmitting(true);
      const { updated } = await onRateCard(currentCard.id, perception);
      // Atualiza o flashcard na sessão atual para refletir o novo estágio caso o aluno revise novamente
      setSessionCards((prev) =>
        prev.map((c) => (c.id === currentCard.id ? updated : c)),
      );
      setCompletedCount((prev) => prev + 1);
      setIsFlipped(false);
      setCurrentIndex((prev) => prev + 1);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0d0c1d]/95 backdrop-blur-md flex flex-col justify-between p-4 md:p-8 animate-in fade-in duration-200 overflow-y-auto">
      {/* Topo da sessão fullscreen */}
      <div className="max-w-3xl w-full mx-auto space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            {currentCard && (
              <>
                <span
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: currentCard.materia_cor }}
                />
                <span className="font-display font-bold text-sm md:text-base text-foreground truncate">
                  {currentCard.materia_nome}
                </span>
                {currentCard.conteudo_nome && (
                  <Badge
                    variant="outline"
                    className="border-border bg-surface/60 text-muted-foreground text-xs truncate max-w-[200px]"
                  >
                    {currentCard.conteudo_nome}
                  </Badge>
                )}
                <Badge className="bg-primary/15 text-primary border-primary/30 text-[11px]">
                  Estágio: Dia {currentCard.interval_days || 1}
                </Badge>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-semibold text-muted-foreground">
              {Math.min(completedCount + (isFinished ? 0 : 1), sessionCards.length)} de{" "}
              {sessionCards.length}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full text-muted-foreground hover:text-foreground"
              title="Encerrar sessão"
            >
              <X size={20} />
            </Button>
          </div>
        </div>

        <Progress value={progressValue} className="h-1.5" />
      </div>

      {/* Área Central: Carta com Flip ou Tela de Conclusão */}
      <div className="max-w-2xl w-full mx-auto my-6 flex-1 flex flex-col justify-center">
        {sessionCards.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface-elevated p-8 text-center space-y-4">
            <p className="text-lg font-display font-bold text-foreground">
              Nenhum flashcard selecionado para esta sessão.
            </p>
            <Button onClick={onClose} className="shadow-glow font-bold">
              Voltar aos Flashcards
            </Button>
          </div>
        ) : isFinished ? (
          <div className="rounded-2xl border border-primary/40 bg-surface-elevated p-8 md:p-10 text-center space-y-5 shadow-[0_0_35px_rgba(168,255,0,0.08)]">
            <div className="h-14 w-14 rounded-full bg-primary/20 text-primary flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-2xl font-display font-bold text-foreground">
                Sessão de Flashcards Concluída!
              </h2>
              <p className="text-sm text-muted-foreground">
                Você revisou {completedCount} {completedCount === 1 ? "flashcard" : "flashcards"} e
                sua agenda de repetição espaçada foi atualizada automaticamente.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCurrentIndex(0);
                  setCompletedCount(0);
                  setIsFlipped(false);
                }}
              >
                Revisar Novamente
              </Button>
              <Button onClick={onClose} className="shadow-glow font-bold">
                Concluir e Voltar
              </Button>
            </div>
          </div>
        ) : (
          currentCard && (
            <div className="space-y-6">
              {/* Carta Interativa com Flip */}
              <div
                onClick={() => setIsFlipped((prev) => !prev)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setIsFlipped((prev) => !prev);
                  }
                }}
                className="group relative min-h-[280px] md:min-h-[340px] w-full rounded-2xl border border-border bg-[#16132b] p-6 md:p-10 shadow-xl transition-all duration-300 hover:border-primary/50 cursor-pointer flex flex-col justify-between select-none"
                style={{
                  borderTopWidth: "4px",
                  borderTopColor: currentCard.materia_cor,
                }}
              >
                <div className="flex items-center justify-between text-xs uppercase tracking-widest font-bold">
                  <span className={isFlipped ? "text-primary" : "text-muted-foreground"}>
                    {isFlipped ? "Verso • Resposta" : "Frente • Pergunta"}
                  </span>
                  <span className="flex items-center gap-1.5 text-muted-foreground group-hover:text-primary transition-colors">
                    <RotateCw size={13} />
                    {isFlipped ? "Clique para ver a pergunta" : "Clique para virar o flashcard"}
                  </span>
                </div>

                <div className="my-auto py-6 text-center">
                  {!isFlipped ? (
                    <p className="text-lg md:text-2xl font-display font-bold text-foreground whitespace-pre-wrap leading-relaxed">
                      {currentCard.frente}
                    </p>
                  ) : (
                    <p className="text-base md:text-xl text-foreground/95 whitespace-pre-wrap leading-relaxed">
                      {currentCard.verso}
                    </p>
                  )}
                </div>

                <div className="text-center text-[11px] text-muted-foreground">
                  {!isFlipped
                    ? "Tente responder mentalmente antes de virar o flashcard"
                    : "Avalie abaixo o quão fácil foi lembrar da resposta"}
                </div>
              </div>

              {/* Ações do Verso: Explicação com IA (Fase 2) + Autoavaliação Espaçada */}
              {isFlipped ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  {renderBackExtra && (
                    <div onClick={(e) => e.stopPropagation()}>{renderBackExtra(currentCard)}</div>
                  )}

                  <div className="rounded-xl border border-border bg-surface-elevated p-4 space-y-3">
                    <p className="text-xs text-center text-muted-foreground font-medium">
                      Como foi lembrar desta resposta?
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isSubmitting}
                        onClick={() => handleSelectPerception("Difícil")}
                        className="h-auto py-3 px-4 flex flex-col gap-0.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30"
                      >
                        <span className="font-bold text-sm">
                          Difícil • rever em {nextIntervalsPreview.dificil}d
                        </span>
                        <span className="text-[11px] opacity-80">Volta para o Dia 1</span>
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        disabled={isSubmitting}
                        onClick={() => handleSelectPerception("Médio")}
                        className="h-auto py-3 px-4 flex flex-col gap-0.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30"
                      >
                        <span className="font-bold text-sm">
                          Médio • rever em {nextIntervalsPreview.medio}d
                        </span>
                        <span className="text-[11px] opacity-80">Avança 1 intervalo</span>
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        disabled={isSubmitting}
                        onClick={() => handleSelectPerception("Fácil")}
                        className="h-auto py-3 px-4 flex flex-col gap-0.5 bg-primary/15 hover:bg-primary/25 text-primary border-primary/40"
                      >
                        <span className="font-bold text-sm">
                          Fácil • rever em {nextIntervalsPreview.facil}d
                        </span>
                        <span className="text-[11px] opacity-80">Avança 2 intervalos</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center">
                  <Button
                    type="button"
                    onClick={() => setIsFlipped(true)}
                    className="shadow-glow font-bold px-8"
                  >
                    <RotateCw className="mr-2 h-4 w-4" />
                    Mostrar Resposta
                  </Button>
                </div>
              )}
            </div>
          )
        )}
      </div>

      {/* Rodapé discreto */}
      <div className="max-w-3xl w-full mx-auto text-center text-xs text-muted-foreground">
        Modo de Estudo Ativo • Repetição Espaçada Sincronizada
      </div>
    </div>
  );
}

