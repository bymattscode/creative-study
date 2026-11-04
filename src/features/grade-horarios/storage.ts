import { supabase } from "@/lib/supabase";
import { GradeCourse, GradeCourseInput, GradeTimeSlot, GradeViewConfig } from "./types";

const STORAGE_KEY_PREFIX = "@sinapse:grade_horarios:v1";
const CONFIG_KEY_PREFIX = "@sinapse:grade_horarios:config:v1";

function getStorageKey(userId?: string): string {
  return `${STORAGE_KEY_PREFIX}:${userId || "anon"}`;
}

function getConfigKey(userId?: string): string {
  return `${CONFIG_KEY_PREFIX}:${userId || "anon"}`;
}

function generateId(prefix = "grd"): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Lê as matérias salvas localmente no navegador.
 */
export function readLocalGradeCourses(userId?: string): GradeCourse[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(getStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Grava as matérias localmente no navegador.
 */
export function writeLocalGradeCourses(courses: GradeCourse[], userId?: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(getStorageKey(userId), JSON.stringify(courses));
  } catch (err) {
    console.error("Erro ao salvar grade localmente:", err);
  }
}

/**
 * Carrega as matérias da grade (localStorage + sincronização com metadados do usuário no Supabase).
 * Não modifica nenhuma tabela existente do banco.
 */
export async function loadGradeCourses(userId?: string): Promise<GradeCourse[]> {
  const localCourses = readLocalGradeCourses(userId);
  if (!userId) return localCourses;

  try {
    const { data } = await supabase.auth.getUser();
    const remoteCourses = data?.user?.user_metadata?.grade_horarios_v1;
    if (Array.isArray(remoteCourses) && remoteCourses.length > 0 && localCourses.length === 0) {
      writeLocalGradeCourses(remoteCourses, userId);
      return remoteCourses;
    }
  } catch {
    // Em modo offline ou falha de rede, mantém os dados locais sem quebrar
  }

  return localCourses;
}

/**
 * Persiste a lista completa de matérias da grade localmente e nos metadados da conta Supabase.
 */
export async function saveGradeCourses(courses: GradeCourse[], userId?: string): Promise<void> {
  writeLocalGradeCourses(courses, userId);

  if (!userId) return;
  try {
    await supabase.auth.updateUser({
      data: {
        grade_horarios_v1: courses,
      },
    });
  } catch {
    // Mantém o salvamento local garantido mesmo se offline
  }
}

function normalizeSlots(inputSlots: GradeCourseInput["slots"]): GradeTimeSlot[] {
  return inputSlots.map((slot) => ({
    id: slot.id || generateId("slot"),
    dayOfWeek: slot.dayOfWeek,
    startTime: slot.startTime.trim(),
    endTime: slot.endTime.trim(),
  }));
}

/**
 * Cria uma nova disciplina na grade.
 */
export async function createGradeCourseRecord(
  input: GradeCourseInput,
  currentCourses: GradeCourse[],
  userId?: string,
): Promise<{ created: GradeCourse; courses: GradeCourse[] }> {
  const now = new Date().toISOString();
  const created: GradeCourse = {
    id: generateId("course"),
    name: input.name.trim(),
    professor: input.professor.trim(),
    room: input.room.trim(),
    color: input.color,
    slots: normalizeSlots(input.slots),
    createdAt: now,
    updatedAt: now,
  };

  const updatedList = [...currentCourses, created];
  await saveGradeCourses(updatedList, userId);
  return { created, courses: updatedList };
}

/**
 * Atualiza uma disciplina existente na grade.
 */
export async function updateGradeCourseRecord(
  courseId: string,
  input: GradeCourseInput,
  currentCourses: GradeCourse[],
  userId?: string,
): Promise<{ updated: GradeCourse; courses: GradeCourse[] }> {
  const existing = currentCourses.find((c) => c.id === courseId);
  const now = new Date().toISOString();

  const updated: GradeCourse = {
    id: courseId,
    name: input.name.trim(),
    professor: input.professor.trim(),
    room: input.room.trim(),
    color: input.color,
    slots: normalizeSlots(input.slots),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  const updatedList = currentCourses.map((c) => (c.id === courseId ? updated : c));
  await saveGradeCourses(updatedList, userId);
  return { updated, courses: updatedList };
}

/**
 * Remove uma disciplina da grade.
 */
export async function deleteGradeCourseRecord(
  courseId: string,
  currentCourses: GradeCourse[],
  userId?: string,
): Promise<GradeCourse[]> {
  const updatedList = currentCourses.filter((c) => c.id !== courseId);
  await saveGradeCourses(updatedList, userId);
  return updatedList;
}

/**
 * Lê a configuração de visualização da grade (ex: exibir ou ocultar fim de semana).
 */
export function loadGradeViewConfig(userId?: string): GradeViewConfig {
  if (typeof window === "undefined") return { showWeekend: false };
  try {
    const raw = window.localStorage.getItem(getConfigKey(userId));
    if (!raw) return { showWeekend: false };
    const parsed = JSON.parse(raw);
    return {
      showWeekend: Boolean(parsed?.showWeekend),
    };
  } catch {
    return { showWeekend: false };
  }
}

/**
 * Salva a configuração de visualização da grade.
 */
export function saveGradeViewConfig(config: GradeViewConfig, userId?: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(getConfigKey(userId), JSON.stringify(config));
  } catch {
    // ignore
  }
}

