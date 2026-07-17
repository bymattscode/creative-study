/**
 * Tipagens Centrais da Aplicação (MVP Sinapse)
 * Este arquivo funciona como a representação do Schema de Banco de Dados.
 */

// ==========================================
// 1. Usuários e Perfil
// ==========================================

export interface User {
  id: string; // UUID
  email: string;
  createdAt: Date;
}

export interface UserProfile {
  userId: string; // Fk -> User
  name: string;
  avatarUrl?: string;
  currentGoalId?: string; // Fk -> Goal
  preferences: {
    theme: "light" | "dark" | "system";
    notificationsEnabled: boolean;
    pomodoroLength: number; // Em minutos, padrão 25
    shortBreakLength: number; // Em minutos, padrão 5
    longBreakLength: number; // Em minutos, padrão 15
  };
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

export interface Subject {
  id: string; // UUID
  userId: string; // Fk -> User
  goalId?: string; // Fk -> Goal (Matéria atrelada a um objetivo específico)
  name: string; // ex: "Biologia"
  color: string; // Código Hex
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
  title: string; // Descrição rápida se não houver tópico/matéria atrelado
  scheduledFor: Date;
  durationMinutes: number;
  completed: boolean;
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
  id: string; // UUID
  userId: string; // Fk -> User
  topicId: string; // Fk -> Topic
  nextReviewDate: Date;
  intervalDays: number;
  easeFactor: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewLog {
  id: string; // UUID
  reviewItemId: string; // Fk -> ReviewItem
  reviewedAt: Date;
  confidenceLevel: 1 | 2 | 3 | 4; // 1: Errou/Esqueceu, 2: Difícil, 3: Bom, 4: Fácil
  durationSeconds: number;
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
