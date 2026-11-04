import {
  GRADE_WEEKDAYS,
  GradeClassBlock,
  GradeConflict,
  GradeCourse,
  GradeCourseInput,
  WeekdayId,
} from "./types";

/**
 * Converte horário no formato "HH:mm" para minutos desde 00:00.
 */
export function timeToMinutes(time: string): number {
  const [hoursStr = "0", minutesStr = "0"] = time.trim().split(":");
  const hours = Number.parseInt(hoursStr, 10);
  const minutes = Number.parseInt(minutesStr, 10);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
  return hours * 60 + minutes;
}

/**
 * Converte minutos desde 00:00 para "HH:mm".
 */
export function minutesToTime(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(totalMinutes)));
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/**
 * Valida se o horário final é estritamente posterior ao horário inicial.
 */
export function isValidTimeRange(startTime: string, endTime: string): boolean {
  if (!startTime || !endTime) return false;
  return timeToMinutes(endTime) > timeToMinutes(startTime);
}

/**
 * Verifica se dois intervalos [startA, endA) e [startB, endB) se sobrepõem.
 * Intervalos adjacentes (ex: 14:00–16:00 e 16:00–18:00) NÃO geram conflito.
 */
export function doIntervalsOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): boolean {
  const sA = timeToMinutes(startA);
  const eA = timeToMinutes(endA);
  const sB = timeToMinutes(startB);
  const eB = timeToMinutes(endB);
  if (eA <= sA || eB <= sB) return false;
  return sA < eB && sB < eA;
}

/**
 * Detecta todos os conflitos de horário de uma matéria candidata em relação
 * às matérias já cadastradas na grade (e também entre os próprios horários da matéria).
 */
export function detectGradeConflicts(
  candidate: GradeCourseInput,
  existingCourses: GradeCourse[],
  ignoreCourseId?: string,
): GradeConflict[] {
  const conflicts: GradeConflict[] = [];

  const getDayLabel = (dayId: WeekdayId) =>
    GRADE_WEEKDAYS.find((d) => d.id === dayId)?.fullLabel || "Dia";

  // 1. Verifica conflitos com outras matérias existentes
  for (const newSlot of candidate.slots) {
    if (!isValidTimeRange(newSlot.startTime, newSlot.endTime)) continue;

    for (const course of existingCourses) {
      if (ignoreCourseId && course.id === ignoreCourseId) continue;

      for (const existingSlot of course.slots) {
        if (existingSlot.dayOfWeek !== newSlot.dayOfWeek) continue;

        if (
          doIntervalsOverlap(
            newSlot.startTime,
            newSlot.endTime,
            existingSlot.startTime,
            existingSlot.endTime,
          )
        ) {
          const overlapStartMins = Math.max(
            timeToMinutes(newSlot.startTime),
            timeToMinutes(existingSlot.startTime),
          );
          const overlapEndMins = Math.min(
            timeToMinutes(newSlot.endTime),
            timeToMinutes(existingSlot.endTime),
          );

          conflicts.push({
            dayOfWeek: newSlot.dayOfWeek,
            dayLabel: getDayLabel(newSlot.dayOfWeek),
            newSlot: {
              dayOfWeek: newSlot.dayOfWeek,
              startTime: newSlot.startTime,
              endTime: newSlot.endTime,
            },
            conflictingCourseId: course.id,
            conflictingCourseName: course.name,
            conflictingRoom: course.room,
            conflictingSlot: existingSlot,
            overlapStart: minutesToTime(overlapStartMins),
            overlapEnd: minutesToTime(overlapEndMins),
            isSelfConflict: false,
          });
        }
      }
    }
  }

  // 2. Verifica conflitos internos (dois horários da mesma matéria sobrepostos no mesmo dia)
  for (let i = 0; i < candidate.slots.length; i++) {
    const slotA = candidate.slots[i];
    if (!isValidTimeRange(slotA.startTime, slotA.endTime)) continue;

    for (let j = i + 1; j < candidate.slots.length; j++) {
      const slotB = candidate.slots[j];
      if (slotA.dayOfWeek !== slotB.dayOfWeek) continue;
      if (!isValidTimeRange(slotB.startTime, slotB.endTime)) continue;

      if (doIntervalsOverlap(slotA.startTime, slotA.endTime, slotB.startTime, slotB.endTime)) {
        const overlapStartMins = Math.max(
          timeToMinutes(slotA.startTime),
          timeToMinutes(slotB.startTime),
        );
        const overlapEndMins = Math.min(
          timeToMinutes(slotA.endTime),
          timeToMinutes(slotB.endTime),
        );

        conflicts.push({
          dayOfWeek: slotA.dayOfWeek,
          dayLabel: getDayLabel(slotA.dayOfWeek),
          newSlot: {
            dayOfWeek: slotA.dayOfWeek,
            startTime: slotA.startTime,
            endTime: slotA.endTime,
          },
          conflictingCourseId: ignoreCourseId || "self",
          conflictingCourseName: `${candidate.name || "Mesma matéria"} (horário duplicado)`,
          conflictingRoom: candidate.room,
          conflictingSlot: {
            id: slotB.id || `self-${j}`,
            dayOfWeek: slotB.dayOfWeek,
            startTime: slotB.startTime,
            endTime: slotB.endTime,
          },
          overlapStart: minutesToTime(overlapStartMins),
          overlapEnd: minutesToTime(overlapEndMins),
          isSelfConflict: true,
        });
      }
    }
  }

  return conflicts;
}

/**
 * Expande a lista de disciplinas em blocos individuais de aula ordenados por horário.
 */
export function expandCoursesToBlocks(courses: GradeCourse[]): GradeClassBlock[] {
  const blocks: GradeClassBlock[] = [];

  for (const course of courses) {
    for (const slot of course.slots) {
      const startMinutes = timeToMinutes(slot.startTime);
      const endMinutes = timeToMinutes(slot.endTime);
      const durationMinutes = Math.max(15, endMinutes - startMinutes);

      blocks.push({
        blockId: `${course.id}_${slot.id}`,
        courseId: course.id,
        slotId: slot.id,
        name: course.name,
        professor: course.professor,
        room: course.room,
        color: course.color,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        startMinutes,
        endMinutes,
        durationMinutes,
      });
    }
  }

  return blocks.sort((a, b) => {
    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
    return a.startMinutes - b.startMinutes;
  });
}

