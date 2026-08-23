import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Video, GraduationCap, HelpCircle } from "lucide-react";
import { ArticlesAdmin } from "@/components/education-admin/ArticlesAdmin";
import { VideosAdmin } from "@/components/education-admin/VideosAdmin";
import { CoursesAdmin } from "@/components/education-admin/CoursesAdmin";
import { QuizzesAdmin } from "@/components/education-admin/QuizzesAdmin";

const EducationAdmin = () => {
  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Gestão de Conteúdo Educacional
          </h1>
          <p className="text-muted-foreground">
            Crie e gerencie artigos, vídeos, cursos e quizzes para seus clientes
          </p>
        </div>

        <Tabs defaultValue="articles" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="articles">
              <BookOpen className="mr-2 h-4 w-4" />
              Artigos
            </TabsTrigger>
            <TabsTrigger value="videos">
              <Video className="mr-2 h-4 w-4" />
              Vídeos
            </TabsTrigger>
            <TabsTrigger value="courses">
              <GraduationCap className="mr-2 h-4 w-4" />
              Cursos
            </TabsTrigger>
            <TabsTrigger value="quizzes">
              <HelpCircle className="mr-2 h-4 w-4" />
              Quizzes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="articles">
            <ArticlesAdmin />
          </TabsContent>

          <TabsContent value="videos">
            <VideosAdmin />
          </TabsContent>

          <TabsContent value="courses">
            <CoursesAdmin />
          </TabsContent>

          <TabsContent value="quizzes">
            <QuizzesAdmin />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default EducationAdmin;