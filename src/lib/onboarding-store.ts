import { UserProfile, Goal, Subject } from "@/types/models";
import { v4 as uuidv4 } from "uuid"; // We might not have uuid installed, I'll use a simple random string for now if uuid is not there. Wait, I will use a simple generator.

// Simple ID generator since we don't have a backend yet
const generateId = () => Math.random().toString(36).substring(2, 15);

export interface OnboardingData {
  name: string;
  studentType: string;
  goalName: string;
  goalDate: string | null; // ISO string
  hoursPerDay: number;
  preferredTime: "manhã" | "tarde" | "noite" | "madrugada" | "";
  subjects: Array<{ name: string; difficulty: "Fácil" | "Médio" | "Difícil" }>;
}

export const saveOnboardingData = (data: OnboardingData) => {
  try {
    const userId = generateId();
    const goalId = generateId();

    const profile: Partial<UserProfile> & { name: string } = {
      userId,
      name: data.name,
      currentGoalId: goalId,
      preferences: {
        theme: "system",
        notificationsEnabled: true,
        pomodoroLength: 25,
        shortBreakLength: 5,
        longBreakLength: 15,
        hoursPerDay: data.hoursPerDay,
        preferredTime: data.preferredTime,
      },
      updatedAt: new Date(),
    };

    const goal: Goal = {
      id: goalId,
      userId,
      title: data.goalName,
      targetDate: data.goalDate ? new Date(data.goalDate) : undefined,
      isActive: true,
      createdAt: new Date(),
    };

    const subjects: Subject[] = data.subjects.map((sub, index) => {
      // Definindo cores automáticas para as matérias
      const colors = ["#a8ff00", "#37d67a", "#ffcc33", "#ff5c7a", "#2a0863"];
      return {
        id: generateId(),
        userId,
        goalId,
        name: sub.name,
        color: colors[index % colors.length],
        createdAt: new Date(),
      };
    });

    // Save to localStorage
    localStorage.setItem("@sinapse:userProfile", JSON.stringify(profile));
    localStorage.setItem("@sinapse:currentGoal", JSON.stringify(goal));
    localStorage.setItem("@sinapse:subjects", JSON.stringify(subjects));
    localStorage.setItem("@sinapse:onboardingCompleted", "true");

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("on-synced-storage-update", {
          detail: { key: "@sinapse:userProfile", newValue: profile },
        }),
      );
      window.dispatchEvent(
        new CustomEvent("on-synced-storage-update", {
          detail: { key: "@sinapse:currentGoal", newValue: goal },
        }),
      );
      window.dispatchEvent(
        new CustomEvent("on-synced-storage-update", {
          detail: { key: "@sinapse:subjects", newValue: subjects },
        }),
      );
    }

    return true;
  } catch (error) {
    console.error("Failed to save onboarding data", error);
    return false;
  }
};
