import { ReviewModel } from "@/types/models";
import {
  Flashcard,
  FlashcardReviewPerception,
  FlashcardScheduleResult,
} from "./types";

export function getSequenceForReviewModel(model: ReviewModel = "short_term"): number[] {
  if (model === "short_term") return [1, 3, 7, 15, 30];
  if (model === "bimonthly") return [1, 15, 60];
  if (model === "semiannual") return [1, 30, 90, 180];
  // "classic" ou "none" (para flashcards, mantém progressão espaçada padrão)
  if (model === "classic") return [1, 7, 30, 90];
  return [1, 3, 7, 15, 30];
}

/**
 * Calcula o próximo intervalo e data de revisão de um flashcard
 * seguindo exatamente a mesma lógica do motor de Revisões existente.
 */
export function computeNextFlashcardReview(
  card: Pick<Flashcard, "interval_days" | "confidence_level">,
  perception: FlashcardReviewPerception,
  model: ReviewModel = "short_term",
  baseDate: Date = new Date(),
): FlashcardScheduleResult {
  const seq = getSequenceForReviewModel(model);
  let nextInterval = card.interval_days || 1;
  let newConfidence = card.confidence_level ?? 50;

  let currentIdx = seq.findIndex((val) => val >= nextInterval);
  if (currentIdx === -1) currentIdx = seq.length - 1;

  switch (perception) {
    case "Difícil":
      nextInterval = 1;
      newConfidence = Math.max(0, newConfidence - 20);
      break;
    case "Médio":
      currentIdx = Math.min(seq.length - 1, currentIdx + 1);
      nextInterval = seq[currentIdx];
      newConfidence = Math.min(100, newConfidence + 10);
      break;
    case "Fácil":
      currentIdx = Math.min(seq.length - 1, currentIdx + 2);
      nextInterval = seq[currentIdx];
      newConfidence = Math.min(100, newConfidence + 25);
      break;
  }

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

