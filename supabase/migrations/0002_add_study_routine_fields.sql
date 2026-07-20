-- Adiciona colunas para controle da rotina de estudos

-- study_days: Array de inteiros representando os dias da semana (0=Domingo, 1=Segunda, ..., 6=Sábado)
-- O padrão inicializa com todos os dias selecionados para manter compatibilidade com usuários existentes.
ALTER TABLE public.onboarding_preferences 
ADD COLUMN IF NOT EXISTS study_days INTEGER[] DEFAULT '{0,1,2,3,4,5,6}';

-- minutes_per_day: Granularidade maior do tempo de estudo (15 em 15 min).
-- O padrão de 240 minutos = 4 horas, como era antes.
ALTER TABLE public.onboarding_preferences 
ADD COLUMN IF NOT EXISTS minutes_per_day INTEGER DEFAULT 240;

-- Migrar dados antigos (se existirem) de hours_per_day para minutes_per_day
UPDATE public.onboarding_preferences
SET minutes_per_day = hours_per_day * 60
WHERE hours_per_day IS NOT NULL;
