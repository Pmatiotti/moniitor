import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { GraduationCap, BookOpen, Clock, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Course {
  id: string;
  title: string;
  description: string;
  instructor_name?: string;
  estimated_hours?: number;
  total_lessons?: number;
  difficulty_level?: string;
  category: string;
}

export const CoursesList = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('educational_courses')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCourses(data || []);
    } catch (error: any) {
      console.error('Error fetching courses:', error);
      toast({
        title: "Erro ao carregar cursos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level?: string) => {
    switch (level?.toLowerCase()) {
      case "iniciante": return "bg-success/10 text-success";
      case "intermediário": 
      case "intermediario": return "bg-warning/10 text-warning";
      case "avançado": 
      case "avancado": return "bg-destructive/10 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const handleContinueCourse = (course: Course) => {
    toast({
      title: "Curso selecionado",
      description: course.title,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            Nenhum curso disponível no momento.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {courses.map((course) => (
        <Card key={course.id} className="hover:border-primary transition-colors">
          <CardHeader>
            <div className="flex items-start justify-between mb-2">
              <Badge variant="secondary">{course.category}</Badge>
              {course.difficulty_level && (
                <Badge className={getLevelColor(course.difficulty_level)}>
                  {course.difficulty_level}
                </Badge>
              )}
            </div>
            <CardTitle className="text-xl">{course.title}</CardTitle>
            <CardDescription>{course.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {course.instructor_name && (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <GraduationCap className="h-4 w-4" />
                  <span>{course.instructor_name}</span>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {course.total_lessons && (
                <div className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  <span>{course.total_lessons} aulas</span>
                </div>
              )}
              {course.estimated_hours && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{course.estimated_hours}h</span>
                </div>
              )}
            </div>

            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => handleContinueCourse(course)}
            >
              Ver Curso
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
