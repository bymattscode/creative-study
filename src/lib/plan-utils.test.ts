import { describe, it, expect } from "vitest";
import { encodeTitle, decodeTitle, getItemDayIdx, getStartOfWeek, getWeekDates } from "./plan-utils";

describe("plan-utils", () => {
  it("encodes and decodes title with dayIdx and delayed flag", () => {
    const encoded = encodeTitle("questoes", "Módulo 3", true, 2);
    const decoded = decodeTitle(encoded);
    expect(decoded).toEqual({
      type: "questoes",
      topicName: "Módulo 3",
      isDelayed: true,
      dayIdx: 2,
    });
  });

  it("preserves dayIdx across different weeks using getItemDayIdx", () => {
    const encoded = encodeTitle("teoria", "Módulo 1", false, 4); // Sexta (idx 4)
    const idx = getItemDayIdx({
      title: encoded,
      scheduled_for: "2026-10-20T08:00:00.000Z", // Terça-feira no calendário antigo
    });
    expect(idx).toBe(4);
  });

  it("falls back to weekday of scheduled_for for legacy items without dayIdx", () => {
    // 2026-11-02 is a Monday (dayIdx = 0)
    const monday = new Date(2026, 10, 2, 10, 0, 0);
    const idx = getItemDayIdx({
      title: JSON.stringify({ type: "teoria", topicName: "Legacy" }),
      scheduled_for: monday.toISOString(),
    });
    expect(idx).toBe(0);
  });

  it("computes week dates starting on Monday (7 days)", () => {
    const start = getStartOfWeek(new Date(2026, 10, 4, 15, 0, 0)); // Quarta
    const dates = getWeekDates(start);
    expect(dates).toHaveLength(7);
    expect(dates[0].getDay()).toBe(1); // Segunda
    expect(dates[6].getDay()).toBe(0); // Domingo
  });
});

