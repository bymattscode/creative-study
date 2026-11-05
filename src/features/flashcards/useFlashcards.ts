import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase";
import { ReviewModel } from "@/types/models";
import {
  Flashcard,
  FlashcardInput,
  FlashcardReviewPerception,
  FlashcardSubjectOption,
  FlashcardTopicOption,
} from "./types";
import {
  isFlashcardDueToday,
  isFlashcardDueTodayOrLate,
  isFlashcardLate,
  isFlashcardReviewedToday,
} from "./spaced-repetition";
import {
  createFlashcardRecord,
  createManyFlashcardRecords,
  deleteFlashcardRecord,
  FLASHCARDS_UPDATED_EVENT,
  loadFlashcards,
  readLocalFlashcards,
  reviewFlashcardRecord,
  updateFlashcardRecord,
} from "./storage";

export function useFlashcards() {
  const { user } = useAuth();
  const userId = user?.id;

  const [cards, setCards] = useState<Flashcard[]>(() => readLocalFlashcards(userId));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Reutiliza as matérias já cadastradas na Central de Matérias
  const { data: subjects = [] } = useQuery<FlashcardSubjectOption[]>({
    queryKey: ["subjects", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("subjects")
        .select("id, name, color")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
      return (data || []) as FlashcardSubjectOption[];
    },
    enabled: Boolean(userId),
  });

  const subjectIdsKey = useMemo(() => subjects.map((s) => s.id).join(","), [subjects]);

  // Reutiliza os tópicos/conteúdos já cadastrados na Central de Matérias
  const { data: topics = [] } = useQuery<FlashcardTopicOption[]>({
    queryKey: ["topics", userId, subjectIdsKey],
    queryFn: async () => {
      if (!subjects.length) return [];
      const { data } = await supabase
        .from("topics")
        .select("id, subject_id, name")
        .in(
          "subject_id",
          subjects.map((s) => s.id),
        )
        .order("created_at", { ascending: true });
      return (data || []) as FlashcardTopicOption[];
    },
    enabled: Boolean(userId) && subjects.length > 0,
  });

  // Reutiliza o modelo de revisão espaçada configurado pelo usuário (Dia 1, 3, 7, 15, 30 etc.)
  const { data: preferences } = useQuery({
    queryKey: ["preferences", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("onboarding_preferences")
        .select("global_review_model")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: Boolean(userId),
  });

  const reviewModel: ReviewModel = (preferences?.global_review_model as ReviewModel) || "short_term";

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    loadFlashcards(userId)
      .then((loaded) => {
        if (mounted) {
          setCards(loaded);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    const handleSyncEvent = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom.detail?.userId === userId && Array.isArray(custom.detail?.cards)) {
        setCards(custom.detail.cards);
      }
    };

    window.addEventListener(FLASHCARDS_UPDATED_EVENT, handleSyncEvent);
    return () => {
      mounted = false;
      window.removeEventListener(FLASHCARDS_UPDATED_EVENT, handleSyncEvent);
    };
  }, [userId]);

  // Atualiza cores/nomes das matérias caso tenham sido renomeadas na Central de Matérias
  const hydratedCards = useMemo(() => {
    if (!subjects.length) return cards;
    return cards.map((card) => {
      const matchedSub = subjects.find((s) => s.id === card.materia_id);
      if (!matchedSub) return card;
      return {
        ...card,
        materia_nome: matchedSub.name,
        materia_cor: matchedSub.color || card.materia_cor,
      };
    });
  }, [cards, subjects]);

  const dueTodayOrLateCards = useMemo(
    () => hydratedCards.filter((c) => isFlashcardDueTodayOrLate(c.proxima_revisao)),
    [hydratedCards],
  );

  const lateCards = useMemo(
    () => hydratedCards.filter((c) => isFlashcardLate(c.proxima_revisao)),
    [hydratedCards],
  );

  const strictlyTodayCards = useMemo(
    () => hydratedCards.filter((c) => isFlashcardDueToday(c.proxima_revisao)),
    [hydratedCards],
  );

  const reviewedTodayCount = useMemo(
    () => hydratedCards.filter((c) => isFlashcardReviewedToday(c.ultima_revisao)).length,
    [hydratedCards],
  );

  const cardsGroupedBySubject = useMemo(() => {
    const groups: Record<
      string,
      {
        materiaId: string;
        materiaNome: string;
        materiaCor: string;
        cards: Flashcard[];
      }
    > = {};

    for (const card of hydratedCards) {
      const key = card.materia_id || "geral";
      if (!groups[key]) {
        groups[key] = {
          materiaId: key,
          materiaNome: card.materia_nome || "Geral",
          materiaCor: card.materia_cor || "#a8ff00",
          cards: [],
        };
      }
      groups[key].cards.push(card);
    }

    return Object.values(groups);
  }, [hydratedCards]);

  const createCard = useCallback(
    async (input: FlashcardInput): Promise<Flashcard> => {
      const { created, cards: nextCards } = await createFlashcardRecord(input, cards, userId);
      setCards(nextCards);
      return created;
    },
    [cards, userId],
  );

  const createManyCards = useCallback(
    async (inputs: FlashcardInput[]): Promise<Flashcard[]> => {
      const { created, cards: nextCards } = await createManyFlashcardRecords(inputs, cards, userId);
      setCards(nextCards);
      return created;
    },
    [cards, userId],
  );

  const updateCard = useCallback(
    async (cardId: string, input: FlashcardInput): Promise<Flashcard> => {
      const { updated, cards: nextCards } = await updateFlashcardRecord(
        cardId,
        input,
        cards,
        userId,
      );
      setCards(nextCards);
      return updated;
    },
    [cards, userId],
  );

  const deleteCard = useCallback(
    async (cardId: string): Promise<void> => {
      const nextCards = await deleteFlashcardRecord(cardId, cards, userId);
      setCards(nextCards);
    },
    [cards, userId],
  );

  const reviewCard = useCallback(
    async (
      cardId: string,
      perception: FlashcardReviewPerception,
    ): Promise<{ updated: Flashcard; nextIntervalDays: number }> => {
      const { updated, nextIntervalDays, cards: nextCards } = await reviewFlashcardRecord(
        cardId,
        perception,
        reviewModel,
        cards,
        userId,
      );
      setCards(nextCards);
      return { updated, nextIntervalDays };
    },
    [cards, reviewModel, userId],
  );

  return {
    cards: hydratedCards,
    subjects,
    topics,
    reviewModel,
    isLoading,
    dueTodayOrLateCards,
    lateCards,
    strictlyTodayCards,
    reviewedTodayCount,
    cardsGroupedBySubject,
    createCard,
    createManyCards,
    updateCard,
    deleteCard,
    reviewCard,
  };
}

