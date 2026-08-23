import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Video, GraduationCap, Trophy } from "lucide-react";
import { ArticlesList } from "@/components/education/ArticlesList";
import { VideosList } from "@/components/education/VideosList";
import { CoursesList } from "@/components/education/CoursesList";
import { KnowledgeQuiz } from "@/components/education/KnowledgeQuiz";

const Education = () => {
  const [completedArticles, setCompletedArticles] = useState(0);
  const [completedVideos, setCompletedVideos] = useState(0);
  const [quizScore, setQuizScore] = useState(0);

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Centro Educacional</h1>
          <p className="text-muted-foreground">
            Aprenda sobre investimentos, gestão de portfólio e análise de mercado
          </p>
        </div>

        {/* Progress Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Artigos Lidos</CardTitle>
              <BookOpen className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedArticles}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Continue aprendendo
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vídeos Assistidos</CardTitle>
              <Video className="h-4 w-4 text-info" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedVideos}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Conteúdo em vídeo
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cursos em Andamento</CardTitle>
              <GraduationCap className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground mt-1">
                Continue seus estudos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pontuação Quiz</CardTitle>
              <Trophy className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{quizScore}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                Teste seus conhecimentos
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="articles" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="articles">Artigos</TabsTrigger>
            <TabsTrigger value="videos">Vídeos</TabsTrigger>
            <TabsTrigger value="courses">Cursos</TabsTrigger>
            <TabsTrigger value="quiz">Quiz</TabsTrigger>
          </TabsList>

          <TabsContent value="articles">
            <ArticlesList onArticleRead={() => setCompletedArticles(prev => prev + 1)} />
          </TabsContent>

          <TabsContent value="videos">
            <VideosList onVideoWatched={() => setCompletedVideos(prev => prev + 1)} />
          </TabsContent>

          <TabsContent value="courses">
            <CoursesList />
          </TabsContent>

          <TabsContent value="quiz">
            <KnowledgeQuiz onScoreUpdate={setQuizScore} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Education;
