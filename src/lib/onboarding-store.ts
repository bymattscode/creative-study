import { UserProfile, Goal, Subject, OnboardingPreference } from "@/types/models";
import { supabase } from "@/lib/supabase";

export interface OnboardingData {
  name: string;
  studentType: string;
  goalName: string;
  goalDate: string | null; // ISO string
  minutesPerDay: number;
  studyDays: number[];
  preferredTime: "manhã" | "tarde" | "noite" | "madrugada" | "";
  subjects: Array<{ name: string; difficulty: "Muito Fácil" | "Fácil" | "Médio" | "Difícil" | "Muito Difícil" }>;
}

export const saveOnboardingData = async (userId: string, data: OnboardingData) => {
  try {
    // 1. Criar Goal
    const { data: goalData, error: goalError } = await supabase
      .from("goals")
      .insert({
        user_id: userId,
        title: data.goalName,
        target_date: data.goalDate || null,
        is_active: true,
      })
      .select("id")
      .single();

    if (goalError) throw new Error(`Erro ao criar meta: ${goalError.message}`);
    const goalId = goalData.id;

    // 2. Atualizar ou Criar UserProfile
    const { error: profileError } = await supabase
      .from("user_profiles")
      .upsert({
        user_id: userId,
        name: data.name,
        student_type: data.studentType,
        current_goal_id: goalId,
        subscription_tier: "free",
      }, { onConflict: "user_id" });

    if (profileError) throw new Error(`Erro ao criar perfil: ${profileError.message}`);

    // 3. Inserir Onboarding Preferences
    const { error: prefError } = await supabase
      .from("onboarding_preferences")
      .upsert({
        user_id: userId,
        theme: "system",
        notifications_enabled: true,
        pomodoro_length: 25,
        short_break_length: 5,
        long_break_length: 15,
        minutes_per_day: data.minutesPerDay,
        study_days: data.studyDays,
        preferred_time: data.preferredTime,
      }, { onConflict: "user_id" });
      
    if (prefError) throw new Error(`Erro nas preferências: ${prefError.message}`);

    // 4. Inserir Subjects (Matérias)
    const colors = ["#a8ff00", "#37d67a", "#ffcc33", "#ff5c7a", "#2a0863"];
    const subjectsToInsert = data.subjects.map((sub, index) => ({
      user_id: userId,
      goal_id: goalId,
      name: sub.name,
      color: colors[index % colors.length],
      difficulty: sub.difficulty,
    }));

    if (subjectsToInsert.length > 0) {
      const { error: subjectsError } = await supabase
        .from("subjects")
        .insert(subjectsToInsert);

      if (subjectsError) throw new Error(`Erro nas matérias: ${subjectsError.message}`);
    }

    // 5. Marcar Onboarding Concluído localmente (cache leve para evitar fetchs repetidos no root)
    localStorage.setItem("@sinapse:onboardingCompleted", "true");

    return true;
  } catch (error) {
    console.error("Falha ao salvar os dados do onboarding na nuvem:", error);
    return false;
  }
};

