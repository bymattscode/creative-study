-- 1. Perfis de Usuário
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id)
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Removemos a política se ela já existir para evitar erro ao recriar
DROP POLICY IF EXISTS "Usuários podem ver seus próprios perfis" ON user_profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios perfis" ON user_profiles;
DROP POLICY IF EXISTS "Usuários podem inserir seus próprios perfis" ON user_profiles;

CREATE POLICY "Usuários podem ver seus próprios perfis" ON user_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem atualizar seus próprios perfis" ON user_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem inserir seus próprios perfis" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id)
  VALUES (new.id)
  ON CONFLICT (user_id) DO NOTHING; -- Proteção extra se o perfil já existir
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Removemos a trigger antes de recriar
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-------------------------------------------------------------------------------

-- 2. Objetivos (Goals)
CREATE TABLE IF NOT EXISTS goals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Usuários gerenciam seus próprios objetivos" ON goals;
CREATE POLICY "Usuários gerenciam seus próprios objetivos" ON goals FOR ALL USING (auth.uid() = user_id);

-------------------------------------------------------------------------------

-- 3. Matérias (Subjects)
CREATE TABLE IF NOT EXISTS subjects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  difficulty TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Usuários gerenciam suas próprias matérias" ON subjects;
CREATE POLICY "Usuários gerenciam suas próprias matérias" ON subjects FOR ALL USING (auth.uid() = user_id);

-------------------------------------------------------------------------------

-- 4. Tópicos (Topics)
CREATE TABLE IF NOT EXISTS topics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Usuários gerenciam os tópicos de suas matérias" ON topics;
CREATE POLICY "Usuários gerenciam os tópicos de suas matérias" ON topics FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM subjects 
    WHERE subjects.id = topics.subject_id AND subjects.user_id = auth.uid()
  )
);
