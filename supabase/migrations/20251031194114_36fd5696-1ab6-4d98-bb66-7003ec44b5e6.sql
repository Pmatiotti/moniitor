-- Corrigir search_path da função update_education_updated_at
DROP FUNCTION IF EXISTS update_education_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION update_education_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recriar triggers
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