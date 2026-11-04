import { ReviewModel } from "@/types/models";

export type FlashcardDifficulty = "Nova" | "Difícil" | "Médio" | "Fácil";

export type FlashcardReviewPerception = "Difícil" | "Médio" | "Fácil";

export interface Flashcard {
  id: string;
  materia_id: string;
  materia_nome: string;
  materia_cor: string;
  conteudo_id: string | null;
  conteudo_nome: string;
  frente: string;
  verso: string;
  dificuldade: FlashcardDifficulty;
  interval_days: number;
  confidence_level: number;
  proxima_revisao: string;
  ultima_revisao: string | null;
  criado_em: string;
}

export interface FlashcardInput {
  materia_id: string;
  materia_nome: string;
  materia_cor: string;
  conteudo_id?: string | null;
  conteudo_nome?: string;
  frente: string;
  verso: string;
}

export interface FlashcardSubjectOption {
  id: string;
  name: string;
  color: string;
}

export interface FlashcardTopicOption {
  id: string;
  subject_id: string;
  name: string;
}

export interface GeneratedFlashcardDraft {
  tempId: string;
  frente: string;
  verso: string;
}

export interface FlashcardScheduleResult {
  nextIntervalDays: number;
  nextConfidenceLevel: number;
  nextReviewDateIso: string;
  dificuldade: FlashcardDifficulty;
  modelUsed: ReviewModel;
}

