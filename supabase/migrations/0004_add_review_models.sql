-- Adiciona coluna de modelo de revisão nas matérias
ALTER TABLE public.subjects
ADD COLUMN IF NOT EXISTS review_model TEXT DEFAULT 'classic' NOT NULL;
