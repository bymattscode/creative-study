import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Layers,
  Pencil,
  Play,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Flashcard, FlashcardInput } from "./types";
import { isFlashcardDueTodayOrLate } from "./spaced-repetition";
import { useFlashcards } from "./useFlashcards";
import { FlashcardFormDialog } from "./FlashcardFormDialog";
import { DeleteFlashcardDialog } from "./DeleteFlashcardDialog";
import { GenerateFlashcardsAIDialog } from "./GenerateFlashcardsAIDialog";
import { FlashcardStudyModal } from "./FlashcardStudyModal";
import { FlashcardBackExplanation } from "./FlashcardBackExplanation";

export function FlashcardsTabContent() {
  const {
    cards,
    subjects,
    topics,
    reviewModel,
    isLoading,
    dueTodayOrLateCards,
    reviewedTodayCount,
    cardsGroupedBySubject,
    createCard,
    createManyCards,
    updateCard,
    deleteCard,
    reviewCard,
  } = useFlashcards();

  const [formOpen, setFormOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [cardToDelete, setCardToDelete] = useState<Flashcard | null>(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);

  const [studyModalOpen, setStudyModalOpen] = useState(false);
  const [studyDeck, setStudyDeck] = useState<Flashcard[]>([]);

  const handleOpenCreate = () => {
    setEditingCard(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (card: Flashcard) => {
    setEditingCard(card);
    setFormOpen(true);
  };

  const handleSaveCard = async (input: FlashcardInput, editingId?: string) => {
    if (editingId) {
      await updateCard(editingId, input);
      toast.success("Flashcard atualizado!");
    } else {
      await createCard(input);
      toast.success("Novo flashcard criado!");
    }
  };

  const handleSaveGeneratedCards = async (inputs: FlashcardInput[]) => {
    await createManyCards(inputs);
  };

  const handleConfirmDelete = async (card: Flashcard) => {
    await deleteCard(card.id);
    toast.info("Flashcard excluído do seu deck.");
  };

  const handleStartStudySession = (customCards?: Flashcard[]) => {
    const targetDeck =
      customCards && customCards.length > 0
        ? customCards
        : dueTodayOrLateCards.length > 0
          ? dueTodayOrLateCards
          : cards;

    if (targetDeck.length === 0) {
      toast.info("Crie ou gere alguns flashcards primeiro para iniciar o estudo.");
      return;
    }

    setStudyDeck(targetDeck);
    setStudyModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Topo: Contadores em cards compactos (estilo Grade de Horários) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-surface-elevated border-border">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <Layers size={20} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total de Flashcards</p>
              <p className="text-xl font-display font-bold text-foreground">{cards.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface-elevated border-border">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <CalendarCheck size={20} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Flashcards para Hoje</p>
              <p className="text-xl font-display font-bold text-foreground">
                {dueTodayOrLateCards.length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface-elevated border-border">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Flashcards Revisados Hoje</p>
              <p className="text-xl font-display font-bold text-foreground">
                {reviewedTodayCount} {reviewedTodayCount === 1 ? "flashcard" : "flashcards"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de ações principais */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-elevated border border-border rounded-xl p-4">
        <div className="space-y-0.5">
          <p className="text-sm font-bold text-foreground">
            {dueTodayOrLateCards.length > 0
              ? `Você tem ${dueTodayOrLateCards.length} ${
                  dueTodayOrLateCards.length === 1
                    ? "flashcard agendado para revisar hoje"
                    : "flashcards agendados para revisar hoje"
                }`
              : cards.length > 0
                ? "Todos os flashcards do dia foram revisados! Você ainda pode praticar livremente."
                : "Monte seu deck manualmente ou gere flashcards com IA a partir das suas matérias."}
          </p>
          <p className="text-xs text-muted-foreground">
            {reviewedTodayCount}{" "}
            {reviewedTodayCount === 1 ? "flashcard revisado" : "flashcards revisados"} hoje •
            Integrado ao modelo de repetição espaçada
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {cards.length > 0 && (
            <Button
              type="button"
              onClick={() => handleStartStudySession()}
              className="rounded-full shadow-glow font-bold"
            >
              <Play className="mr-1.5 h-4 w-4 fill-current" />
              Estudar Flashcards (
              {dueTodayOrLateCards.length > 0 ? dueTodayOrLateCards.length : cards.length})
            </Button>
          )}

          <Button
            type="button"
            variant={cards.length > 0 ? "outline" : "default"}
            onClick={() => setAiModalOpen(true)}
            className={
              cards.length > 0
                ? "rounded-full border-primary/50 text-primary hover:bg-primary/10 font-bold"
                : "rounded-full shadow-glow font-bold"
            }
          >
            <Sparkles className="mr-1.5 h-4 w-4" />
            Gerar com IA
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleOpenCreate}
            className="rounded-full border-border hover:border-primary/50 font-semibold"
          >
            <Plus className="mr-1.5 h-4 w-4 text-primary" />
            Novo Flashcard
          </Button>
        </div>
      </div>

      {/* Corpo: Decks agrupados por matéria */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground animate-pulse">
          Carregando flashcards...
        </div>
      ) : cards.length === 0 ? (
        <Card className="bg-surface/40 border-dashed border-border py-14 shadow-none">
          <CardContent className="flex flex-col items-center text-center space-y-4">
            <Layers size={48} className="text-muted-foreground/30" />
            <div className="space-y-1 max-w-md">
              <p className="font-display font-bold text-lg text-foreground">
                Nenhum flashcard criado ainda
              </p>
              <p className="text-sm text-muted-foreground">
                Crie seus flashcards manualmente ou use a IA para gerar perguntas e respostas
                automaticamente a partir dos tópicos das suas matérias.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <Button
                type="button"
                onClick={() => setAiModalOpen(true)}
                className="rounded-full shadow-glow font-bold"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Gerar com IA
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleOpenCreate}
                className="rounded-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Novo Flashcard Manual
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {cardsGroupedBySubject.map((group) => {
            const dueInGroup = group.cards.filter((c) =>
              isFlashcardDueTodayOrLate(c.proxima_revisao),
            );
            return (
              <div key={group.materiaId} className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-3.5 w-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: group.materiaCor }}
                    />
                    <h3 className="font-display font-bold text-base text-foreground">
                      {group.materiaNome}
                    </h3>
                    <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                      {group.cards.length} {group.cards.length === 1 ? "flashcard" : "flashcards"}
                    </Badge>
                    {dueInGroup.length > 0 && (
                      <Badge className="bg-primary/20 text-primary border-none text-[10px] uppercase">
                        {dueInGroup.length} para hoje
                      </Badge>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      handleStartStudySession(dueInGroup.length > 0 ? dueInGroup : group.cards)
                    }
                    className="h-7 text-xs text-primary hover:bg-primary/10"
                  >
                    <Play size={12} className="mr-1 fill-current" />
                    Estudar matéria
                  </Button>
                </div>

                {/* Lista empilhada no mobile e em grid no desktop */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {group.cards.map((card) => {
                    const isDue = isFlashcardDueTodayOrLate(card.proxima_revisao);
                    return (
                      <Card
                        key={card.id}
                        className="bg-surface border-border hover:border-primary/40 transition-colors overflow-hidden"
                        style={{
                          borderLeftWidth: "4px",
                          borderLeftColor: card.materia_cor,
                        }}
                      >
                        <CardContent className="p-4 space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {card.conteudo_nome && (
                                <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                                  <BookOpen size={11} className="text-primary" />
                                  {card.conteudo_nome}
                                </span>
                              )}
                              {isDue && (
                                <Badge className="bg-primary/20 text-primary border-none text-[10px] h-4 px-1.5 uppercase">
                                  Revisar Hoje
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-primary"
                                onClick={() => handleOpenEdit(card)}
                                title="Editar flashcard"
                              >
                                <Pencil size={13} />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => setCardToDelete(card)}
                                title="Excluir flashcard"
                              >
                                <Trash2 size={13} />
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <p className="font-bold text-sm text-foreground line-clamp-2">
                              {card.frente}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {card.verso}
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock size={11} className="text-primary" />
                              Próxima:{" "}
                              {new Date(card.proxima_revisao).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                              })}{" "}
                              ({card.interval_days}d)
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStartStudySession([card])}
                              className="h-6 px-2 text-[11px] text-primary hover:bg-primary/10"
                            >
                              Praticar flashcard
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Criar / Editar Carta Manual */}
      <FlashcardFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editingCard={editingCard}
        subjects={subjects}
        topics={topics}
        onSave={handleSaveCard}
      />

      {/* Modal Gerar Cartas com IA (Gemini via Supabase Edge Function) */}
      <GenerateFlashcardsAIDialog
        open={aiModalOpen}
        onOpenChange={setAiModalOpen}
        subjects={subjects}
        topics={topics}
        onSaveGeneratedCards={handleSaveGeneratedCards}
      />

      {/* Modal Confirmar Exclusão */}
      <DeleteFlashcardDialog
        card={cardToDelete}
        open={Boolean(cardToDelete)}
        onOpenChange={(open) => {
          if (!open) setCardToDelete(null);
        }}
        onConfirmDelete={handleConfirmDelete}
      />

      {/* Sessão de Estudo Fullscreen com Flip + Autoavaliação + Explicar com IA */}
      <FlashcardStudyModal
        open={studyModalOpen}
        onClose={() => setStudyModalOpen(false)}
        deck={studyDeck}
        reviewModel={reviewModel}
        onRateCard={async (cardId, perception) => {
          const res = await reviewCard(cardId, perception);
          toast.success(
            `Flashcard avaliado (${perception})! Próxima revisão em ${res.nextIntervalDays}d.`,
          );
          return res;
        }}
        renderBackExtra={(card) => <FlashcardBackExplanation card={card} />}
      />
    </div>
  );
}

