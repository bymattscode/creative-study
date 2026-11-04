import { describe, expect, it } from "vitest";
import {
  detectGradeConflicts,
  doIntervalsOverlap,
  expandCoursesToBlocks,
  isValidTimeRange,
  minutesToTime,
  timeToMinutes,
} from "./conflict-utils";
import { GradeCourse, GradeCourseInput } from "./types";

describe("grade-horarios conflict-utils", () => {
  it("converts HH:mm to minutes and back accurately", () => {
    expect(timeToMinutes("08:00")).toBe(480);
    expect(timeToMinutes("14:30")).toBe(870);
    expect(minutesToTime(480)).toBe("08:00");
    expect(minutesToTime(870)).toBe("14:30");
  });

  it("validates time ranges properly", () => {
    expect(isValidTimeRange("14:00", "16:00")).toBe(true);
    expect(isValidTimeRange("16:00", "14:00")).toBe(false);
    expect(isValidTimeRange("14:00", "14:00")).toBe(false);
  });

  it("detects overlapping intervals and ignores adjacent intervals", () => {
    expect(doIntervalsOverlap("14:00", "16:00", "15:00", "17:00")).toBe(true);
    expect(doIntervalsOverlap("14:00", "16:00", "16:00", "18:00")).toBe(false);
    expect(doIntervalsOverlap("08:00", "10:00", "08:30", "09:30")).toBe(true);
  });

  it("detects conflicts on the same day and ignores different days or edited course", () => {
    const existing: GradeCourse[] = [
      {
        id: "course_1",
        name: "Cálculo I",
        professor: "Prof. Silva",
        room: "Sala 201",
        color: "#a8ff00",
        slots: [
          { id: "s1", dayOfWeek: 0, startTime: "14:00", endTime: "16:00" },
          { id: "s2", dayOfWeek: 2, startTime: "14:00", endTime: "16:00" },
        ],
        createdAt: "2026-11-04T00:00:00.000Z",
        updatedAt: "2026-11-04T00:00:00.000Z",
      },
    ];

    const candidateWithConflict: GradeCourseInput = {
      name: "Física I",
      professor: "Prof. Costa",
      room: "Lab 3",
      color: "#00f0ff",
      slots: [
        { dayOfWeek: 0, startTime: "15:00", endTime: "17:00" }, // Conflito na Segunda 15:00-16:00
        { dayOfWeek: 1, startTime: "14:00", endTime: "16:00" }, // Terça sem conflito
      ],
    };

    const conflicts = detectGradeConflicts(candidateWithConflict, existing);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].conflictingCourseName).toBe("Cálculo I");
    expect(conflicts[0].overlapStart).toBe("15:00");
    expect(conflicts[0].overlapEnd).toBe("16:00");

    // Ignorando a própria matéria durante edição
    const selfEditConflicts = detectGradeConflicts(candidateWithConflict, existing, "course_1");
    expect(selfEditConflicts).toHaveLength(0);
  });

  it("expands courses into sorted class blocks", () => {
    const courses: GradeCourse[] = [
      {
        id: "course_1",
        name: "Algoritmos",
        professor: "Prof. Ana",
        room: "Lab 1",
        color: "#a8ff00",
        slots: [
          { id: "s2", dayOfWeek: 2, startTime: "10:00", endTime: "12:00" },
          { id: "s1", dayOfWeek: 0, startTime: "08:00", endTime: "10:00" },
        ],
        createdAt: "2026-11-04T00:00:00.000Z",
        updatedAt: "2026-11-04T00:00:00.000Z",
      },
    ];

    const blocks = expandCoursesToBlocks(courses);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].dayOfWeek).toBe(0);
    expect(blocks[0].durationMinutes).toBe(120);
    expect(blocks[1].dayOfWeek).toBe(2);
  });
});

