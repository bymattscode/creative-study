export type WeekdayId = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface WeekdayMeta {
  id: WeekdayId;
  shortLabel: string;
  fullLabel: string;
  isWeekend: boolean;
}

export const GRADE_WEEKDAYS: WeekdayMeta[] = [
  { id: 0, shortLabel: "Seg", fullLabel: "Segunda-feira", isWeekend: false },
  { id: 1, shortLabel: "Ter", fullLabel: "Terça-feira", isWeekend: false },
  { id: 2, shortLabel: "Qua", fullLabel: "Quarta-feira", isWeekend: false },
  { id: 3, shortLabel: "Qui", fullLabel: "Quinta-feira", isWeekend: false },
  { id: 4, shortLabel: "Sex", fullLabel: "Sexta-feira", isWeekend: false },
  { id: 5, shortLabel: "Sáb", fullLabel: "Sábado", isWeekend: true },
  { id: 6, shortLabel: "Dom", fullLabel: "Domingo", isWeekend: true },
];

export interface GradeColorOption {
  value: string;
  label: string;
}

/**
 * Paleta de cores compatível com o tema escuro oficial do Sinapse (#0f0b1f / #21193a)
 */
export const GRADE_COLOR_PALETTE: GradeColorOption[] = [
  { value: "#a8ff00", label: "Verde Neon" },
  { value: "#00f0ff", label: "Ciano Elétrico" },
  { value: "#ff007a", label: "Rosa Vibrante" },
  { value: "#9d4edd", label: "Roxo Sinapse" },
  { value: "#ffcc33", label: "Amarelo Solar" },
  { value: "#37d67a", label: "Esmeralda" },
  { value: "#ff5c7a", label: "Coral" },
  { value: "#3b82f6", label: "Azul Real" },
  { value: "#f97316", label: "Laranja" },
  { value: "#14b8a6", label: "Turquesa" },
];

export interface GradeTimeSlot {
  id: string;
  dayOfWeek: WeekdayId;
  /** Formato "HH:mm" (ex: "14:00") */
  startTime: string;
  /** Formato "HH:mm" (ex: "16:00") */
  endTime: string;
}

export interface GradeCourse {
  id: string;
  name: string;
  professor: string;
  room: string;
  color: string;
  slots: GradeTimeSlot[];
  createdAt: string;
  updatedAt: string;
}

export interface GradeCourseInput {
  name: string;
  professor: string;
  room: string;
  color: string;
  slots: Array<{
    id?: string;
    dayOfWeek: WeekdayId;
    startTime: string;
    endTime: string;
  }>;
}

export interface GradeConflict {
  dayOfWeek: WeekdayId;
  dayLabel: string;
  newSlot: {
    dayOfWeek: WeekdayId;
    startTime: string;
    endTime: string;
  };
  conflictingCourseId: string;
  conflictingCourseName: string;
  conflictingRoom: string;
  conflictingSlot: GradeTimeSlot;
  overlapStart: string;
  overlapEnd: string;
  isSelfConflict?: boolean;
}

export interface GradeClassBlock {
  blockId: string;
  courseId: string;
  slotId: string;
  name: string;
  professor: string;
  room: string;
  color: string;
  dayOfWeek: WeekdayId;
  startTime: string;
  endTime: string;
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
}

export interface GradeViewConfig {
  showWeekend: boolean;
}

