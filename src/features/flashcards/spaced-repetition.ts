import { ReviewModel } from "@/types/models";
import {
  Flashcard,
  FlashcardReviewPerception,
  FlashcardScheduleResult,
} from "./types";

/**
 * Sequência progressiva oficial de repetição espaçada dos flashcards:
 * Dia 1 -> Dia 3 -> Dia 7 -> Dia 15 -> Dia 30
 */
export const FLASHCARD_INTERVAL_SEQUENCE = [1, 3, 7, 15, 30] as const;

export function getSequenceForReviewModel(_model: ReviewModel = "short_term"): number[] {
  return [...FLASHCARD_INTERVAL_SEQUENCE];
}

/**
 * Retorna o índice do estágio atual (0 a 4) na sequência [1, 3, 7, 15, 30].
 */
export function getStageIndexForInterval(intervalDays: number): number {
  const seq = FLASHCARD_INTERVAL_SEQUENCE;
  const safeInterval = intervalDays || 1;
  const idx = seq.findIndex((val) => val >= safeInterval);
  return idx === -1 ? seq.length - 1 : idx;
}

/**
 * Calcula o próximo intervalo e data de revisão de um flashcard de forma progressiva
 * na sequência [1, 3, 7, 15, 30]:
 * - Difícil: retrocede para o Dia 1 (índice 0 -> 1d)
 * - Médio: avança 1 intervalo na sequência (ex: 1d -> 3d -> 7d -> 15d -> 30d)
 * - Fácil: avança 2 intervalos na sequência (ex: 1d -> 7d -> 30d, ou 3d -> 15d -> 30d)
 */
export function computeNextFlashcardReview(
  card: Pick<Flashcard, "interval_days" | "confidence_level">,
  perception: FlashcardReviewPerception,
  model: ReviewModel = "short_term",
  baseDate: Date = new Date(),
): FlashcardScheduleResult {
  const seq = getSequenceForReviewModel(model);
  const currentIdx = getStageIndexForInterval(card.interval_days || 1);
  let nextIdx = currentIdx;
  let newConfidence = card.confidence_level ?? 50;

  switch (perception) {
    case "Difícil":
      nextIdx = 0; // Volta para o Dia 1
      newConfidence = Math.max(0, newConfidence - 20);
      break;
    case "Médio":
      nextIdx = Math.min(seq.length - 1, currentIdx + 1); // Avança 1 intervalo
      newConfidence = Math.min(100, newConfidence + 10);
      break;
    case "Fácil":
      nextIdx = Math.min(seq.length - 1, currentIdx + 2); // Avança 2 intervalos
      newConfidence = Math.min(100, newConfidence + 25);
      break;
  }

  const nextInterval = seq[nextIdx];
  const nextDate = new Date(baseDate);
  nextDate.setDate(nextDate.getDate() + nextInterval);

  return {
    nextIntervalDays: nextInterval,
    nextConfidenceLevel: newConfidence,
    nextReviewDateIso: nextDate.toISOString(),
    dificuldade: perception,
    modelUsed: model,
  };
}

function toMidnightTime(dateOrIso: Date | string): number {
  const d = new Date(dateOrIso);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function isFlashcardLate(proximaRevisaoIso: string, now: Date = new Date()): boolean {
  return toMidnightTime(proximaRevisaoIso) < toMidnightTime(now);
}

export function isFlashcardDueToday(proximaRevisaoIso: string, now: Date = new Date()): boolean {
  return toMidnightTime(proximaRevisaoIso) === toMidnightTime(now);
}

export function isFlashcardDueTodayOrLate(
  proximaRevisaoIso: string,
  now: Date = new Date(),
): boolean {
  return toMidnightTime(proximaRevisaoIso) <= toMidnightTime(now);
}

export function isFlashcardReviewedToday(
  ultimaRevisaoIso: string | null,
  now: Date = new Date(),
): boolean {
  if (!ultimaRevisaoIso) return false;
  return toMidnightTime(ultimaRevisaoIso) === toMidnightTime(now);
}
