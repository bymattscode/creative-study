-- Adiciona modelo de revisão global nas preferências de onboarding
ALTER TABLE public.onboarding_preferences
ADD COLUMN IF NOT EXISTS global_review_model text DEFAULT 'classic';
