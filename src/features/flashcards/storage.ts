import { supabase } from "@/lib/supabase";
import { ReviewModel } from "@/types/models";
import { computeNextFlashcardReview } from "./spaced-repetition";
import { Flashcard, FlashcardInput, FlashcardReviewPerception } from "./types";

const STORAGE_KEY_PREFIX = "@sinapse:flashcards:v1";
export const FLASHCARDS_UPDATED_EVENT = "sinapse:flashcards-updated";

function getStorageKey(userId?: string): string {
  return `${STORAGE_KEY_PREFIX}:${userId || "anon"}`;
}

function generateId(prefix = "fc"): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function readLocalFlashcards(userId?: string): Flashcard[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(getStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeLocalFlashcards(cards: Flashcard[], userId?: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(getStorageKey(userId), JSON.stringify(cards));
    window.dispatchEvent(new CustomEvent(FLASHCARDS_UPDATED_EVENT, { detail: { userId, cards } }));
  } catch (err) {
    console.error("Erro ao salvar flashcards localmente:", err);
  }
}

export async function loadFlashcards(userId?: string): Promise<Flashcard[]> {
  const localCards = readLocalFlashcards(userId);
  if (!userId) return localCards;

  try {
    const { data } = await supabase.auth.getUser();
    const remoteCards = data?.user?.user_metadata?.flashcards_v1;
    if (Array.isArray(remoteCards) && remoteCards.length > 0 && localCards.length === 0) {
      writeLocalFlashcards(remoteCards, userId);
      return remoteCards;
    }
  } catch {
    // Em modo offline ou falha de rede, mantém os dados locais
  }

  return localCards;
}

export async function saveFlashcards(cards: Flashcard[], userId?: string): Promise<void> {
  writeLocalFlashcards(cards, userId);
  if (!userId) return;

  try {
    await supabase.auth.updateUser({
      data: {
        flashcards_v1: cards,
      },
    });
  } catch {
    // Mantém salvamento local garantido
  }
}

export async function createFlashcardRecord(
  input: FlashcardInput,
  currentCards: Flashcard[],
  userId?: string,
): Promise<{ created: Flashcard; cards: Flashcard[] }> {
  const nowIso = new Date().toISOString();
  const created: Flashcard = {
    id: generateId("fc"),
    materia_id: input.materia_id,
    materia_nome: input.materia_nome.trim() || "Geral",
    materia_cor: input.materia_cor || "#a8ff00",
    conteudo_id: input.conteudo_id || null,
    conteudo_nome: (input.conteudo_nome || "").trim(),
    frente: input.frente.trim(),
    verso: input.verso.trim(),
    dificuldade: "Nova",
    interval_days: 1,
    confidence_level: 50,
    proxima_revisao: nowIso, // Disponível para estudo/revisão imediatamente (Dia 1)
    ultima_revisao: null,
    criado_em: nowIso,
  };

  const nextCards = [created, ...currentCards];
  await saveFlashcards(nextCards, userId);
  return { created, cards: nextCards };
}

export async function createManyFlashcardRecords(
  inputs: FlashcardInput[],
  currentCards: Flashcard[],
  userId?: string,
): Promise<{ created: Flashcard[]; cards: Flashcard[] }> {
  const nowIso = new Date().toISOString();
  const created: Flashcard[] = inputs.map((input) => ({
    id: generateId("fc"),
    materia_id: input.materia_id,
    materia_nome: input.materia_nome.trim() || "Geral",
    materia_cor: input.materia_cor || "#a8ff00",
    conteudo_id: input.conteudo_id || null,
    conteudo_nome: (input.conteudo_nome || "").trim(),
    frente: input.frente.trim(),
    verso: input.verso.trim(),
    dificuldade: "Nova",
    interval_days: 1,
    confidence_level: 50,
    proxima_revisao: nowIso,
    ultima_revisao: null,
    criado_em: nowIso,
  }));

  const nextCards = [...created, ...currentCards];
  await saveFlashcards(nextCards, userId);
  return { created, cards: nextCards };
}

export async function updateFlashcardRecord(
  cardId: string,
  input: FlashcardInput,
  currentCards: Flashcard[],
  userId?: string,
): Promise<{ updated: Flashcard; cards: Flashcard[] }> {
  const existing = currentCards.find((c) => c.id === cardId);
  const nowIso = new Date().toISOString();

  const updated: Flashcard = {
    id: cardId,
    materia_id: input.materia_id,
    materia_nome: input.materia_nome.trim() || existing?.materia_nome || "Geral",
    materia_cor: input.materia_cor || existing?.materia_cor || "#a8ff00",
    conteudo_id: input.conteudo_id ?? existing?.conteudo_id ?? null,
    conteudo_nome: (input.conteudo_nome ?? existing?.conteudo_nome ?? "").trim(),
    frente: input.frente.trim(),
    verso: input.verso.trim(),
    dificuldade: existing?.dificuldade || "Nova",
    interval_days: existing?.interval_days || 1,
    confidence_level: existing?.confidence_level ?? 50,
    proxima_revisao: existing?.proxima_revisao || nowIso,
    ultima_revisao: existing?.ultima_revisao || null,
    criado_em: existing?.criado_em || nowIso,
  };

  const nextCards = currentCards.map((c) => (c.id === cardId ? updated : c));
  await saveFlashcards(nextCards, userId);
  return { updated, cards: nextCards };
}

export async function deleteFlashcardRecord(
  cardId: string,
  currentCards: Flashcard[],
  userId?: string,
): Promise<Flashcard[]> {
  const nextCards = currentCards.filter((c) => c.id !== cardId);
  await saveFlashcards(nextCards, userId);
  return nextCards;
}

export async function reviewFlashcardRecord(
  cardId: string,
  perception: FlashcardReviewPerception,
  model: ReviewModel,
  currentCards: Flashcard[],
  userId?: string,
): Promise<{ updated: Flashcard; nextIntervalDays: number; cards: Flashcard[] }> {
  const target = currentCards.find((c) => c.id === cardId);
  if (!target) {
    throw new Error("Carta não encontrada.");
  }

  const schedule = computeNextFlashcardReview(target, perception, model);
  const updated: Flashcard = {
    ...target,
    dificuldade: schedule.dificuldade,
    interval_days: schedule.nextIntervalDays,
    confidence_level: schedule.nextConfidenceLevel,
    proxima_revisao: schedule.nextReviewDateIso,
    ultima_revisao: new Date().toISOString(),
  };

  const nextCards = currentCards.map((c) => (c.id === cardId ? updated : c));
  await saveFlashcards(nextCards, userId);

  return {
    updated,
    nextIntervalDays: schedule.nextIntervalDays,
    cards: nextCards,
  };
}

