import { describe, it, expect } from "vitest";
import { generateDailyInsight } from "./ai-insights";
import { StudySession, ReviewItem, Subject } from "../types/models";

describe("generateDailyInsight", () => {
  it("returns welcome message for new users with no history", () => {
    const insight = generateDailyInsight([], [], []);
    expect(insight).toContain("Bem-vindo");
  });

  it("warns about late reviews if there are more than 5", () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const lateReviews: ReviewItem[] = Array.from({ length: 6 }).map((_, i) => ({
      id: `rev-${i}`,
      subjectId: "sub-1",
      topicName: `Topic ${i}`,
      intervalDays: 1,
      confidenceLevel: 50,
      priority: "Alta",
      lastReviewDate: undefined,
      nextReviewDate: yesterday.toISOString(),
    }));

    const subjects: Subject[] = [
      {
        id: "sub-1",
        name: "Matemática",
        userId: "user-1",
        goalId: "goal-1",
        color: "#000",
        createdAt: new Date(),
      },
    ];

    const insight = generateDailyInsight(
      [
        {
          id: "sess-1",
          subjectId: "sub-1",
          topic: "x",
          durationMinutes: 30,
          type: "teoria",
          focusScore: 100,
          goalId: "g",
          createdAt: today.toISOString(),
        },
      ],
      lateReviews,
      subjects,
    );
    expect(insight).toContain("acumulou 6 revisões");
    expect(insight).toContain("Matemática");
  });

  it("warns about dropped consistency", () => {
    const today = new Date();
    const fourDaysAgo = new Date(today);
    fourDaysAgo.setDate(today.getDate() - 4);

    const history: StudySession[] = [
      {
        id: "sess-1",
        subjectId: "sub-1",
        topic: "x",
        durationMinutes: 60,
        type: "teoria",
        focusScore: 100,
        goalId: "g",
        createdAt: fourDaysAgo.toISOString(),
      },
    ];

    const insight = generateDailyInsight(history, [], []);
    expect(insight).toContain("Seu ritmo caiu");
  });

  it("warns about too much theory", () => {
    const today = new Date();
    const history: StudySession[] = [
      {
        id: "sess-1",
        subjectId: "sub-1",
        topic: "x",
        durationMinutes: 80,
        type: "teoria",
        focusScore: 100,
        goalId: "g",
        createdAt: today.toISOString(),
      },
      {
        id: "sess-2",
        subjectId: "sub-1",
        topic: "y",
        durationMinutes: 20,
        type: "questoes",
        focusScore: 100,
        goalId: "g",
        createdAt: today.toISOString(),
      },
    ];

    const insight = generateDailyInsight(history, [], []);
    expect(insight).toContain("consumido muita Teoria");
  });
});
