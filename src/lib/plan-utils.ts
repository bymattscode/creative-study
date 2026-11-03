import { supabase } from "@/lib/supabase";

export type ActivityType = "teoria" | "questoes" | "revisao" | "leitura" | "redacao";
export type TaskStatus = "pendente" | "concluido" | "atrasado";

export const WEEK_DAYS = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo",
];

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  teoria: "Teoria",
  questoes: "Questões",
  revisao: "Revisão",
  leitura: "Leitura",
  redacao: "Redação",
};

export const ACTIVITY_COLORS: Record<ActivityType, string> = {
  teoria: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  questoes: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  revisao: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  leitura: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  redacao: "bg-pink-500/10 text-pink-500 border-pink-500/20",
};

export const getStartOfWeek = (d: Date) => {
  const date = new Date(d);
  const day = date.getDay(); // 0 é domingo
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

export const getEndOfWeek = (start: Date) => {
  const date = new Date(start);
  date.setDate(date.getDate() + 6);
  date.setHours(23, 59, 59, 999);
  return date;
};

export const getWeekDates = (start: Date) => {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
};

export const formatDateOnly = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const encodeTitle = (
  type: ActivityType,
  topicName: string,
  isDelayed: boolean = false,
  dayIdx?: number,
) => JSON.stringify({ type, topicName, isDelayed, ...(typeof dayIdx === "number" ? { dayIdx } : {}) });

export const decodeTitle = (raw: string) => {
  try {
    const parsed = JSON.parse(raw);
    return {
      type: (parsed.type || "teoria") as ActivityType,
      topicName: (parsed.topicName || "") as string,
      isDelayed: !!parsed.isDelayed,
      dayIdx: typeof parsed.dayIdx === "number" ? parsed.dayIdx : undefined,
    };
  } catch {
    return {
      type: "teoria" as ActivityType,
      topicName: raw,
      isDelayed: false,
      dayIdx: undefined,
    };
  }
};

/**
 * Retorna o índice do dia da semana (0 = Segunda ... 6 = Domingo)
 * preservando o dia mesmo que o plano tenha sido criado em semanas anteriores.
 */
export const getItemDayIdx = (item: { title: string; scheduled_for: string }): number => {
  const decoded = decodeTitle(item.title);
  if (typeof decoded.dayIdx === "number" && decoded.dayIdx >= 0 && decoded.dayIdx <= 6) {
    return decoded.dayIdx;
  }
  const d = new Date(item.scheduled_for);
  const jsDay = d.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
  return jsDay === 0 ? 6 : jsDay - 1;
};

export const getTodayDayIdx = (): number => {
  const jsDay = new Date().getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
};

const PLAN_CACHE_PREFIX = "@sinapse:weeklyPlan:";
const ITEMS_CACHE_PREFIX = "@sinapse:planItems:";

export const getCachedWeeklyPlan = (userId?: string) => {
  if (!userId || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${PLAN_CACHE_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setCachedWeeklyPlan = (userId: string | undefined, plan: any) => {
  if (!userId || typeof window === "undefined") return;
  try {
    if (plan) {
      window.localStorage.setItem(`${PLAN_CACHE_PREFIX}${userId}`, JSON.stringify(plan));
    } else {
      window.localStorage.removeItem(`${PLAN_CACHE_PREFIX}${userId}`);
    }
  } catch {
    // ignore storage errors
  }
};

export const getCachedPlanItems = (userId?: string): any[] => {
  if (!userId || typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(`${ITEMS_CACHE_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const setCachedPlanItems = (userId: string | undefined, items: any[]) => {
  if (!userId || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${ITEMS_CACHE_PREFIX}${userId}`, JSON.stringify(items));
  } catch {
    // ignore storage errors
  }
};

/**
 * Busca o plano semanal ativo do usuário de forma resiliente:
 * - Não falha se houver múltiplos registros em weekly_plans
 * - Não apaga/oculta o cronograma quando vira a semana
 * - Prioriza o plano mais recente que possui itens salvos
 */
export async function fetchActiveWeeklyPlan(userId: string) {
  const { data: plans, error } = await supabase
    .from("weekly_plans")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    const cached = getCachedWeeklyPlan(userId);
    if (cached) return cached;
    throw error;
  }

  if (!plans || plans.length === 0) {
    setCachedWeeklyPlan(userId, null);
    return null;
  }

  if (plans.length === 1) {
    setCachedWeeklyPlan(userId, plans[0]);
    return plans[0];
  }

  // Se houver múltiplos planos (ex: criados em semanas diferentes ou cliques duplos),
  // escolhe o mais recente que possua itens cadastrados.
  const planIds = plans.map((p) => p.id);
  const { data: itemsRef } = await supabase
    .from("plan_items")
    .select("weekly_plan_id")
    .in("weekly_plan_id", planIds);

  if (itemsRef && itemsRef.length > 0) {
    const plansWithItems = new Set(itemsRef.map((i) => i.weekly_plan_id));
    const activePlan = plans.find((p) => plansWithItems.has(p.id)) || plans[0];
    setCachedWeeklyPlan(userId, activePlan);
    return activePlan;
  }

  setCachedWeeklyPlan(userId, plans[0]);
  return plans[0];
}

export async function fetchActivePlanItems(userId: string, weeklyPlanId: string) {
  const { data, error } = await supabase
    .from("plan_items")
    .select("*")
    .eq("weekly_plan_id", weeklyPlanId)
    .order("scheduled_for", { ascending: true });

  if (error) {
    const cached = getCachedPlanItems(userId);
    if (cached.length > 0) return cached;
    throw error;
  }

  const items = data || [];
  setCachedPlanItems(userId, items);
  return items;
}

export interface ActivePlanBlockSession {
  planItemId: string;
  subjectId: string;
  subjectName: string;
  type: ActivityType;
  topicName: string;
  durationMinutes: number;
}

const ACTIVE_BLOCK_KEY = "@sinapse:estudo:activeBlock";

export const setActivePlanBlockForStudy = (block: ActivePlanBlockSession | null) => {
  if (typeof window === "undefined") return;
  try {
    if (block) {
      window.localStorage.setItem(ACTIVE_BLOCK_KEY, JSON.stringify(block));
    } else {
      window.localStorage.removeItem(ACTIVE_BLOCK_KEY);
    }
  } catch {
    // ignore
  }
};

export const getActivePlanBlockForStudy = (): ActivePlanBlockSession | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_BLOCK_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/**
 * Alterna o status de conclusão de um item do cronograma no banco de dados
 * e sincroniza com study_sessions para manter Horas Líquidas, Ofensiva e Progresso salvos.
 */
export async function togglePlanItemCompletionInDb(params: {
  userId: string;
  itemId: string;
  subjectId?: string | null;
  durationMinutes: number;
  currentCompleted: boolean;
  rawTitle: string;
}) {
  const { userId, itemId, subjectId, durationMinutes, currentCompleted, rawTitle } = params;
  const newStatus = !currentCompleted;

  const decoded = decodeTitle(rawTitle);
  const updatedTitle = encodeTitle(
    decoded.type,
    decoded.topicName,
    newStatus ? false : decoded.isDelayed,
    decoded.dayIdx,
  );

  const { error: updateError } = await supabase
    .from("plan_items")
    .update({ completed: newStatus, title: updatedTitle })
    .eq("id", itemId);

  if (updateError) throw updateError;

  if (newStatus && subjectId) {
    const now = new Date();
    const startTime = new Date(now.getTime() - durationMinutes * 60000).toISOString();
    await supabase.from("study_sessions").insert({
      user_id: userId,
      subject_id: subjectId,
      duration_minutes: durationMinutes,
      start_time: startTime,
      end_time: now.toISOString(),
      focus_score: 100,
      notes: JSON.stringify({
        type: decoded.type,
        topicName: decoded.topicName,
        planItemId: itemId,
      }),
    });
  } else if (!newStatus && subjectId) {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0).toISOString();
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString();

    const { data: sessions } = await supabase
      .from("study_sessions")
      .select("id, notes")
      .eq("user_id", userId)
      .eq("subject_id", subjectId)
      .eq("duration_minutes", durationMinutes)
      .gte("created_at", startOfDay)
      .lte("created_at", endOfDay)
      .order("created_at", { ascending: false })
      .limit(5);

    if (sessions && sessions.length > 0) {
      const exactMatch = sessions.find((s) => {
        try {
          return JSON.parse(s.notes || "{}").planItemId === itemId;
        } catch {
          return false;
        }
      });
      const targetSessionId = exactMatch ? exactMatch.id : sessions[0].id;
      await supabase.from("study_sessions").delete().eq("id", targetSessionId);
    }
  }

  return { newStatus, updatedTitle };
}

