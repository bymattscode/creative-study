/**
 * Tipagens Centrais da Aplicação (MVP Sinapse)
 * Este arquivo funciona como a representação do Schema de Banco de Dados.
 */

// ==========================================
// 1. Usuários e Perfil
// ==========================================

export interface User {
  id: string; // UUID referenciando auth.users
  email: string;
  createdAt: Date;
}

export interface UserProfile {
  id: string; // UUID (Espelho de auth.users.id ou id próprio)
  userId: string; // Fk -> User
  name: string;
  avatarUrl?: string;
  studentType?: string; // Ex: Concurseiro, Vestibulando
  currentGoalId?: string; // Fk -> Goal
  subscriptionTier?: "free" | "pro"; // Controle de Paywall e Monetização
  createdAt: Date;
  updatedAt: Date;
}

export interface OnboardingPreference {
  id: string; // UUID
  userId: string; // Fk -> User
  theme: "light" | "dark" | "system";
  notificationsEnabled: boolean;
  pomodoroLength: number; // Em minutos, padrão 25
  shortBreakLength: number; // Em minutos, padrão 5
  longBreakLength: number; // Em minutos, padrão 15
  hoursPerDay?: number; // legacy
  minutesPerDay: number;
  studyDays: number[];
  dailyStudyHours?: Record<string, number>; // Novo: minutos por dia. ex: { "1": 120, "2": 240 } (0=Dom, 1=Seg...)
  preferredTime: string; // ex: "manhã, tarde"
  globalReviewModel?: ReviewModel; // Modelo de revisão global
  createdAt: Date;
  updatedAt: Date;
}

// ==========================================
// 2. Objetivos e Provas
// ==========================================

export interface Goal {
  id: string; // UUID
  userId: string; // Fk -> User
  title: string; // ex: "Passar em Medicina"
  targetDate?: Date; // Data principal se houver
  isActive: boolean;
  createdAt: Date;
}

export interface Exam {
  id: string; // UUID
  goalId: string; // Fk -> Goal
  name: string; // ex: "ENEM 2026"
  examDate: Date;
  institution?: string; // ex: "INEP"
}

// ==========================================
// 3. Estrutura Acadêmica
// ==========================================

export type ReviewModel = "none" | "short_term" | "classic" | "bimonthly" | "semiannual";

export interface Subject {
  id: string; // UUID
  userId: string; // Fk -> User
  goalId?: string; // Fk -> Goal (Matéria atrelada a um objetivo específico)
  name: string; // ex: "Biologia"
  color: string; // Código Hex
  difficulty?: "Muito Fácil" | "Fácil" | "Médio" | "Difícil" | "Muito Difícil"; // Nível reportado no onboarding
  reviewModel?: ReviewModel; // Modelo de revisão
  createdAt: Date;
}

export interface Topic {
  id: string; // UUID
  subjectId: string; // Fk -> Subject
  name: string; // ex: "Citologia"
  masteryLevel: number; // 0 a 100
  createdAt: Date;
}

// ==========================================
// 4. Planejamento
// ==========================================

export interface WeeklyPlan {
  id: string; // UUID
  userId: string; // Fk -> User
  startDate: Date;
  endDate: Date;
  createdAt: Date;
}

export interface PlanItem {
  id: string; // UUID
  weeklyPlanId: string; // Fk -> WeeklyPlan
  subjectId?: string; // Fk -> Subject
  topicId?: string; // Fk -> Topic
  title: string; // JSON string contendo { type: "teoria" | "questoes", text: "..." } ou string simples
  scheduledFor: Date;
  durationMinutes: number;
  completed: boolean;
  startTime?: string; // Novo: Horário de início no formato HH:mm
  endTime?: string; // Novo: Horário de fim no formato HH:mm
  createdAt: Date;
}

// ==========================================
// 5. Estudo e Desempenho
// ==========================================

export interface StudySession {
  id: string; // UUID
  userId: string; // Fk -> User
  subjectId?: string; // Fk -> Subject
  topicId?: string; // Fk -> Topic
  startTime: Date;
  endTime?: Date; // Fica nulo enquanto a sessão está rolando
  durationMinutes: number;
  focusScore?: number; // 0 a 100, baseado em pausas, distrações, etc.
  notes?: string;
  createdAt: Date;
}

export interface PerformanceSnapshot {
  id: string; // UUID
  userId: string; // Fk -> User
  date: string; // YYYY-MM-DD
  totalStudyMinutes: number;
  avgFocusScore: number;
  topicsCompleted: number;
  createdAt: Date; // Usado para ordenar snapshots ao longo do tempo
}

// ==========================================
// 6. Sistema de Revisão (Spaced Repetition)
// ==========================================

export interface ReviewItem {
  id: string;
  userId: string; // Fk -> User
  subjectId: string;
  topicName: string;
  nextReviewDate: string; // ISO String
  lastReviewDate?: string; // ISO String
  intervalDays: number;
  confidenceLevel: number; // 0 a 100
  priority: "Alta" | "Média" | "Baixa";
  createdAt: Date;
}

export interface ReviewLog {
  id: string;
  reviewItemId: string; // Fk -> ReviewItem
  userId: string; // Fk -> User
  reviewedAt: string; // ISO String
  perception: "Fácil" | "Médio" | "Difícil";
}

// ==========================================
// 7. Inteligência Artificial
// ==========================================

export interface AiRecommendation {
  id: string; // UUID
  userId: string; // Fk -> User
  type: "schedule_adjustment" | "review_priority" | "study_insight";
  content: string; // O que a IA disse/recomendou
  isApplied: boolean; // Se o usuário acatou a recomendação
  createdAt: Date;
}
