-- Adiciona suporte a horas de estudo individuais por dia
ALTER TABLE public.onboarding_preferences
ADD COLUMN IF NOT EXISTS daily_study_hours JSONB DEFAULT '{}'::jsonb;
