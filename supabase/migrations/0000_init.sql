-- Habilita extensão para gerar UUIDs se não estiver habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================================================================
-- 1. Usuários e Perfis
-- ====================================================================================

-- Tabela de espelho para ter perfis públicos/privados dos usuários do Supabase Auth
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  student_type TEXT,
  current_goal_id UUID, -- Adicionaremos FK via ALTER depois para evitar ciclo
  subscription_tier TEXT CHECK (subscription_tier IN ('free', 'pro')) DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Preferências de Onboarding (1-para-1 com user)
CREATE TABLE public.onboarding_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  theme TEXT CHECK (theme IN ('light', 'dark', 'system')) DEFAULT 'system',
  notifications_enabled BOOLEAN DEFAULT true,
  pomodoro_length INTEGER DEFAULT 25,
  short_break_length INTEGER DEFAULT 5,
  long_break_length INTEGER DEFAULT 15,
  hours_per_day INTEGER DEFAULT 4,
  preferred_time TEXT CHECK (preferred_time IN ('manhã', 'tarde', 'noite', 'madrugada', '')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);


-- ====================================================================================
-- 2. Objetivos e Estrutura Acadêmica
-- ====================================================================================

CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- FK cíclica resolvida
ALTER TABLE public.user_profiles 
  ADD CONSTRAINT fk_current_goal 
  FOREIGN KEY (current_goal_id) REFERENCES public.goals(id) ON DELETE SET NULL;

CREATE TABLE public.exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  exam_date DATE NOT NULL,
  institution TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('Fácil', 'Médio', 'Difícil')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE public.topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  mastery_level INTEGER CHECK (mastery_level >= 0 AND mastery_level <= 100) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);


-- ====================================================================================
-- 3. Planejamento (Planner Semanal)
-- ====================================================================================

CREATE TABLE public.weekly_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE public.plan_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  weekly_plan_id UUID NOT NULL REFERENCES public.weekly_plans(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);


-- ====================================================================================
-- 4. Estudo, Desempenho e Revisões (SRS)
-- ====================================================================================

CREATE TABLE public.study_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER NOT NULL,
  focus_score INTEGER CHECK (focus_score >= 0 AND focus_score <= 100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE public.review_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  topic_name TEXT NOT NULL,
  next_review_date TIMESTAMP WITH TIME ZONE NOT NULL,
  last_review_date TIMESTAMP WITH TIME ZONE,
  interval_days INTEGER DEFAULT 1,
  confidence_level INTEGER CHECK (confidence_level >= 0 AND confidence_level <= 100) DEFAULT 50,
  priority TEXT CHECK (priority IN ('Alta', 'Média', 'Baixa')) DEFAULT 'Média',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE public.review_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_item_id UUID NOT NULL REFERENCES public.review_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  perception TEXT CHECK (perception IN ('Fácil', 'Médio', 'Difícil')) NOT NULL
);

CREATE TABLE public.performance_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_study_minutes INTEGER DEFAULT 0,
  avg_focus_score INTEGER DEFAULT 0,
  topics_completed INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, date) -- Evitar múltiplos snapshots pro mesmo dia pro mesmo user
);


-- ====================================================================================
-- RLS (Row Level Security) Básico
-- ====================================================================================
-- Configuração para que os usuários vejam apenas os próprios dados.
-- Executar `ALTER TABLE tabela ENABLE ROW LEVEL SECURITY;` em todas as tabelas:

DO $$ 
DECLARE
  t text;
BEGIN
  FOR t IN 
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN ('user_profiles', 'onboarding_preferences', 'goals', 'exams', 'subjects', 'topics', 'weekly_plans', 'plan_items', 'study_sessions', 'review_items', 'review_logs', 'performance_snapshots')
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    
    -- Política de permissão (exemplo) para usuários poderem acessar e modificar a própria linha.
    -- Obs: Algumas tabelas usam user_id, outras auth.uid(). As queries abaixo usam user_id.
    
    -- Ignorando tabelas que não têm user_id diretamente (exams, topics, plan_items, review_logs têm chaves estrangeiras, precisa de JOIN ou de denormalizar user_id, 
    -- nós adicionamos user_id em quase todas, exceto exams e topics. Em produção, topics herdará RLS via subject_id, etc.
  END LOOP;
END $$;
