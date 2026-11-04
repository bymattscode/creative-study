import { describe, expect, it } from "vitest";
import {
  computeNextFlashcardReview,
  isFlashcardDueTodayOrLate,
  isFlashcardReviewedToday,
} from "./spaced-repetition";
import { normalizeGeneratedCardsList } from "./ai-client";

describe("flashcards spaced-repetition", () => {
  it("schedules next interval using short_term sequence (Dia 1, 3, 7, 15, 30)", () => {
    const baseDate = new Date("2026-11-04T12:00:00.000Z");

    const mediumRes = computeNextFlashcardReview(
      { interval_days: 1, confidence_level: 50 },
      "Médio",
      "short_term",
      baseDate,
    );
    expect(mediumRes.nextIntervalDays).toBe(3);
    expect(mediumRes.nextConfidenceLevel).toBe(60);

    const easyRes = computeNextFlashcardReview(
      { interval_days: 1, confidence_level: 50 },
      "Fácil",
      "short_term",
      baseDate,
    );
    expect(easyRes.nextIntervalDays).toBe(7);
    expect(easyRes.nextConfidenceLevel).toBe(75);

    const hardRes = computeNextFlashcardReview(
      { interval_days: 15, confidence_level: 80 },
      "Difícil",
      "short_term",
      baseDate,
    );
    expect(hardRes.nextIntervalDays).toBe(1);
    expect(hardRes.nextConfidenceLevel).toBe(60);
  });

  it("identifies cards due today or late and cards reviewed today", () => {
    const now = new Date("2026-11-04T15:00:00.000Z");
    const todayMorning = "2026-11-04T09:00:00.000Z";
    const yesterday = "2026-11-03T09:00:00.000Z";
    const tomorrow = "2026-11-05T09:00:00.000Z";

    expect(isFlashcardDueTodayOrLate(todayMorning, now)).toBe(true);
    expect(isFlashcardDueTodayOrLate(yesterday, now)).toBe(true);
    expect(isFlashcardDueTodayOrLate(tomorrow, now)).toBe(false);

    expect(isFlashcardReviewedToday(todayMorning, now)).toBe(true);
    expect(isFlashcardReviewedToday(yesterday, now)).toBe(false);
    expect(isFlashcardReviewedToday(null, now)).toBe(false);
  });

  it("normalizes and validates AI generated cards payload safely", () => {
    const valid = normalizeGeneratedCardsList([
      { frente: " O que é um ponteiro? ", verso: " Variável que armazena endereço de memória. " },
      { frente: "", verso: "Incompleto" },
      null,
      { invalido: true },
    ]);
    expect(valid).toEqual([
      { frente: "O que é um ponteiro?", verso: "Variável que armazena endereço de memória." },
    ]);
    expect(normalizeGeneratedCardsList("not-an-array")).toEqual([]);
  });
});

