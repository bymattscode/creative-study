-- ====================================================================================
-- Tabela Exams (Provas)
-- ====================================================================================
CREATE TABLE IF NOT EXISTS public.exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  exam_date DATE NOT NULL,
  institution TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Usuários gerenciam suas provas" ON exams;
CREATE POLICY "Usuários gerenciam suas provas" ON exams FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM goals 
    WHERE goals.id = exams.goal_id AND goals.user_id = auth.uid()
  )
);

-- ====================================================================================
-- Tabelas do Planner Semanal
-- ====================================================================================
CREATE TABLE IF NOT EXISTS public.weekly_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Usuários gerenciam seus planos semanais" ON weekly_plans;
CREATE POLICY "Usuários gerenciam seus planos semanais" ON weekly_plans FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.plan_items (
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

ALTER TABLE plan_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Usuários gerenciam seus itens do plano" ON plan_items;
CREATE POLICY "Usuários gerenciam seus itens do plano" ON plan_items FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM weekly_plans 
    WHERE weekly_plans.id = plan_items.weekly_plan_id AND weekly_plans.user_id = auth.uid()
  )
);


-- ====================================================================================
-- Tabelas de Estudo, Revisões e Desempenho
-- ====================================================================================
CREATE TABLE IF NOT EXISTS public.study_sessions (
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

ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Usuários gerenciam suas sessões" ON study_sessions;
CREATE POLICY "Usuários gerenciam suas sessões" ON study_sessions FOR ALL USING (auth.uid() = user_id);


CREATE TABLE IF NOT EXISTS public.review_items (
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

ALTER TABLE review_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Usuários gerenciam suas revisões" ON review_items;
CREATE POLICY "Usuários gerenciam suas revisões" ON review_items FOR ALL USING (auth.uid() = user_id);


CREATE TABLE IF NOT EXISTS public.review_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_item_id UUID NOT NULL REFERENCES public.review_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  perception TEXT CHECK (perception IN ('Fácil', 'Médio', 'Difícil')) NOT NULL
);

ALTER TABLE review_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Usuários gerenciam seus logs de revisão" ON review_logs;
CREATE POLICY "Usuários gerenciam seus logs de revisão" ON review_logs FOR ALL USING (auth.uid() = user_id);


CREATE TABLE IF NOT EXISTS public.performance_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_study_minutes INTEGER DEFAULT 0,
  avg_focus_score INTEGER DEFAULT 0,
  topics_completed INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, date)
);

ALTER TABLE performance_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Usuários gerenciam seus desempenhos" ON performance_snapshots;
CREATE POLICY "Usuários gerenciam seus desempenhos" ON performance_snapshots FOR ALL USING (auth.uid() = user_id);
