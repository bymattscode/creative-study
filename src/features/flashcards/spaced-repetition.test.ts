import { describe, expect, it } from "vitest";
import {
  computeNextFlashcardReview,
  isFlashcardDueTodayOrLate,
  isFlashcardReviewedToday,
} from "./spaced-repetition";
import { normalizeGeneratedCardsList } from "./ai-client";

describe("flashcards spaced-repetition", () => {
  it("progresses through [1, 3, 7, 15, 30] step-by-step on Médio (+1 stage)", () => {
    const baseDate = new Date("2026-11-04T12:00:00.000Z");

    // 1d -> 3d -> 7d -> 15d -> 30d -> 30d
    const from1 = computeNextFlashcardReview(
      { interval_days: 1, confidence_level: 50 },
      "Médio",
      "classic",
      baseDate,
    );
    expect(from1.nextIntervalDays).toBe(3);

    const from3 = computeNextFlashcardReview(
      { interval_days: 3, confidence_level: 60 },
      "Médio",
      "classic",
      baseDate,
    );
    expect(from3.nextIntervalDays).toBe(7);

    const from7 = computeNextFlashcardReview(
      { interval_days: 7, confidence_level: 70 },
      "Médio",
      "classic",
      baseDate,
    );
    expect(from7.nextIntervalDays).toBe(15);

    const from15 = computeNextFlashcardReview(
      { interval_days: 15, confidence_level: 80 },
      "Médio",
      "classic",
      baseDate,
    );
    expect(from15.nextIntervalDays).toBe(30);

    const from30 = computeNextFlashcardReview(
      { interval_days: 30, confidence_level: 90 },
      "Médio",
      "classic",
      baseDate,
    );
    expect(from30.nextIntervalDays).toBe(30);
  });

  it("progresses through [1, 3, 7, 15, 30] by +2 stages on Fácil and resets to 1d on Difícil", () => {
    const baseDate = new Date("2026-11-04T12:00:00.000Z");

    // Fácil: 1d -> 7d -> 30d; e de 3d -> 15d -> 30d
    expect(
      computeNextFlashcardReview(
        { interval_days: 1, confidence_level: 50 },
        "Fácil",
        "short_term",
        baseDate,
      ).nextIntervalDays,
    ).toBe(7);

    expect(
      computeNextFlashcardReview(
        { interval_days: 3, confidence_level: 60 },
        "Fácil",
        "short_term",
        baseDate,
      ).nextIntervalDays,
    ).toBe(15);

    expect(
      computeNextFlashcardReview(
        { interval_days: 7, confidence_level: 75 },
        "Fácil",
        "short_term",
        baseDate,
      ).nextIntervalDays,
    ).toBe(30);

    // Difícil: qualquer estágio volta para 1d
    for (const current of [1, 3, 7, 15, 30]) {
      expect(
        computeNextFlashcardReview(
          { interval_days: current, confidence_level: 80 },
          "Difícil",
          "short_term",
          baseDate,
        ).nextIntervalDays,
      ).toBe(1);
    }
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
