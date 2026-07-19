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
      userId: "user-1",
      subjectId: "sub-1",
      topicName: `Topic ${i}`,
      intervalDays: 1,
      confidenceLevel: 50,
      priority: "Alta",
      lastReviewDate: undefined,
      nextReviewDate: yesterday.toISOString(),
      createdAt: new Date(),
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
          userId: "user-1",
          subjectId: "sub-1",
          startTime: today,
          durationMinutes: 30,
          notes: JSON.stringify({ type: "teoria", topic: "x" }),
          focusScore: 100,
          createdAt: today,
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
        userId: "user-1",
        subjectId: "sub-1",
        startTime: fourDaysAgo,
        durationMinutes: 60,
        notes: JSON.stringify({ type: "teoria", topic: "x" }),
        focusScore: 100,
        createdAt: fourDaysAgo,
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
        userId: "user-1",
        subjectId: "sub-1",
        startTime: today,
        durationMinutes: 80,
        notes: JSON.stringify({ type: "teoria", topic: "x" }),
        focusScore: 100,
        createdAt: today,
      },
      {
        id: "sess-2",
        userId: "user-1",
        subjectId: "sub-1",
        startTime: today,
        durationMinutes: 20,
        notes: JSON.stringify({ type: "questoes", topic: "y" }),
        focusScore: 100,
        createdAt: today,
      },
    ];

    const insight = generateDailyInsight(history, [], []);
    expect(insight).toContain("consumido muita Teoria");
  });
});
