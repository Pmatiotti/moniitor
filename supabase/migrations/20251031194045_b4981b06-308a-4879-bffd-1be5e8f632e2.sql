-- Criar tabela de artigos educacionais
CREATE TABLE IF NOT EXISTS public.educational_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  reading_time INTEGER, -- em minutos
  image_url TEXT,
  author_name TEXT,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_featured BOOLEAN DEFAULT false,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de vídeos educacionais
CREATE TABLE IF NOT EXISTS public.educational_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  category TEXT NOT NULL,
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  duration INTEGER, -- em segundos
  instructor_name TEXT,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_featured BOOLEAN DEFAULT false,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de cursos educacionais
CREATE TABLE IF NOT EXISTS public.educational_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  detailed_description TEXT,
  category TEXT NOT NULL,
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  thumbnail_url TEXT,
  instructor_name TEXT,
  total_lessons INTEGER DEFAULT 0,
  estimated_hours INTEGER, -- duração estimada em horas
  price NUMERIC DEFAULT 0, -- 0 para gratuito
  is_published BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de lições dos cursos
CREATE TABLE IF NOT EXISTS public.course_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.educational_courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  content TEXT,
  video_url TEXT,
  duration INTEGER, -- em segundos
  is_free_preview BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de quizzes
CREATE TABLE IF NOT EXISTS public.educational_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  passing_score INTEGER DEFAULT 70, -- porcentagem mínima para passar
  time_limit INTEGER, -- em minutos (null = sem limite)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de questões dos quizzes
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.educational_quizzes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false')),
  options JSONB NOT NULL, -- array de opções
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de progresso do usuário
CREATE TABLE IF NOT EXISTS public.user_education_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('article', 'video', 'course', 'quiz')),
  content_id UUID NOT NULL,
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  quiz_score INTEGER, -- apenas para quizzes
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, content_type, content_id)
);

-- Habilitar RLS
ALTER TABLE public.educational_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.educational_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.educational_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.educational_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_education_progress ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para conteúdo educacional (público para leitura)
CREATE POLICY "Anyone can view published articles"
  ON public.educational_articles FOR SELECT
  USING (published_at <= now());

CREATE POLICY "Admins can manage articles"
  ON public.educational_articles FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view published videos"
  ON public.educational_videos FOR SELECT
  USING (published_at <= now());

CREATE POLICY "Admins can manage videos"
  ON public.educational_videos FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view published courses"
  ON public.educational_courses FOR SELECT
  USING (is_published = true);

CREATE POLICY "Admins can manage courses"
  ON public.educational_courses FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view lessons of published courses"
  ON public.course_lessons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.educational_courses
      WHERE id = course_lessons.course_id AND is_published = true
    )
  );

CREATE POLICY "Admins can manage lessons"
  ON public.course_lessons FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active quizzes"
  ON public.educational_quizzes FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage quizzes"
  ON public.educational_quizzes FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view questions of active quizzes"
  ON public.quiz_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.educational_quizzes
      WHERE id = quiz_questions.quiz_id AND is_active = true
    )
  );

CREATE POLICY "Admins can manage questions"
  ON public.quiz_questions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Políticas para progresso do usuário
CREATE POLICY "Users can view own progress"
  ON public.user_education_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own progress"
  ON public.user_education_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON public.user_education_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all progress"
  ON public.user_education_progress FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_articles_category ON public.educational_articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_published ON public.educational_articles(published_at);
CREATE INDEX IF NOT EXISTS idx_videos_category ON public.educational_videos(category);
CREATE INDEX IF NOT EXISTS idx_courses_published ON public.educational_courses(is_published);
CREATE INDEX IF NOT EXISTS idx_lessons_course ON public.course_lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_questions_quiz ON public.quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_progress_user ON public.user_education_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_content ON public.user_education_progress(content_type, content_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_education_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_articles_updated_at
  BEFORE UPDATE ON public.educational_articles
  FOR EACH ROW EXECUTE FUNCTION update_education_updated_at();

CREATE TRIGGER update_videos_updated_at
  BEFORE UPDATE ON public.educational_videos
  FOR EACH ROW EXECUTE FUNCTION update_education_updated_at();

CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON public.educational_courses
  FOR EACH ROW EXECUTE FUNCTION update_education_updated_at();

CREATE TRIGGER update_lessons_updated_at
  BEFORE UPDATE ON public.course_lessons
  FOR EACH ROW EXECUTE FUNCTION update_education_updated_at();

CREATE TRIGGER update_progress_updated_at
  BEFORE UPDATE ON public.user_education_progress
  FOR EACH ROW EXECUTE FUNCTION update_education_updated_at();