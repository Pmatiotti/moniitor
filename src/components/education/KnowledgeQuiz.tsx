import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Trophy, RotateCcw, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Question {
  id: string;
  question: string;
  options: any;
  correct_answer: string;
  explanation?: string;
  quiz_id: string;
}

interface Quiz {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
}

interface KnowledgeQuizProps {
  onScoreUpdate: (score: number) => void;
}

export const KnowledgeQuiz = ({ onScoreUpdate }: KnowledgeQuizProps) => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      const { data: quizzesData, error: quizzesError } = await supabase
        .from('educational_quizzes')
        .select('*')
        .eq('is_active', true);

      if (quizzesError) throw quizzesError;

      if (quizzesData && quizzesData.length > 0) {
        const quizzesWithQuestions = await Promise.all(
          quizzesData.map(async (quiz) => {
            const { data: questionsData, error: questionsError } = await supabase
              .from('quiz_questions')
              .select('*')
              .eq('quiz_id', quiz.id)
              .order('order_index');

            if (questionsError) throw questionsError;

            return {
              ...quiz,
              questions: questionsData || []
            };
          })
        );

        setQuizzes(quizzesWithQuestions);
        if (quizzesWithQuestions.length > 0) {
          setSelectedQuiz(quizzesWithQuestions[0]);
        }
      }
    } catch (error: any) {
      console.error('Error fetching quizzes:', error);
      toast({
        title: "Erro ao carregar quizzes",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionId: string, answer: string) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const calculateScore = () => {
    if (!selectedQuiz) return 0;
    
    let correct = 0;
    selectedQuiz.questions.forEach(q => {
      if (selectedAnswers[q.id] === q.correct_answer) {
        correct++;
      }
    });
    
    const percentage = Math.round((correct / selectedQuiz.questions.length) * 100);
    return percentage;
  };

  const handleSubmit = () => {
    const finalScore = calculateScore();
    setScore(finalScore);
    setShowResults(true);
    onScoreUpdate(finalScore);
    
    toast({
      title: "Quiz concluído!",
      description: `Sua pontuação: ${finalScore}%`,
    });
  };

  const handleRestart = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setShowResults(false);
    setScore(0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!selectedQuiz || selectedQuiz.questions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <HelpCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            Nenhum quiz disponível no momento.
          </p>
        </CardContent>
      </Card>
    );
  }

  const currentQuestion = selectedQuiz.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === selectedQuiz.questions.length - 1;

  if (showResults) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <Trophy className="h-16 w-16 text-warning" />
          </div>
          <CardTitle className="text-center text-2xl">Quiz Concluído!</CardTitle>
          <CardDescription className="text-center">
            Você completou o quiz "{selectedQuiz.title}"
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-primary mb-2">{score}%</div>
            <p className="text-muted-foreground leading-relaxed">
              {score >= 70 ? "Excelente trabalho!" : "Continue estudando!"}
            </p>
          </div>

          <div className="space-y-4">
            {selectedQuiz.questions.map((question, idx) => {
              const isCorrect = selectedAnswers[question.id] === question.correct_answer;
              
              return (
                <Card key={question.id} className={isCorrect ? "border-success" : "border-destructive"}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-2">
                      {isCorrect ? (
                        <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <CardTitle className="text-sm font-medium">
                          Questão {idx + 1}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {question.question}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  {question.explanation && (
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground">
                        {question.explanation}
                      </p>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>

          <Button onClick={handleRestart} className="w-full">
            <RotateCcw className="mr-2 h-4 w-4" />
            Fazer Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <CardTitle>{selectedQuiz.title}</CardTitle>
          <span className="text-sm text-muted-foreground">
            Questão {currentQuestionIndex + 1} de {selectedQuiz.questions.length}
          </span>
        </div>
        {selectedQuiz.description && (
          <CardDescription>{selectedQuiz.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">{currentQuestion.question}</h3>
          
          <RadioGroup
            value={selectedAnswers[currentQuestion.id] || ""}
            onValueChange={(value) => handleAnswerSelect(currentQuestion.id, value)}
          >
            {Array.isArray(currentQuestion.options) && currentQuestion.options.map((option: any, idx: number) => {
              const optionText = typeof option === 'string' ? option : option.text;
              return (
                <div key={idx} className="flex items-center space-x-2 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value={optionText} id={`${currentQuestion.id}-${idx}`} />
                  <Label
                    htmlFor={`${currentQuestion.id}-${idx}`}
                    className="flex-1 cursor-pointer"
                  >
                    {optionText}
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
        </div>

        <div className="flex gap-2">
          {currentQuestionIndex > 0 && (
            <Button
              variant="outline"
              onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
              className="flex-1"
            >
              Anterior
            </Button>
          )}
          
          {!isLastQuestion ? (
            <Button
              onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
              disabled={!selectedAnswers[currentQuestion.id]}
              className="flex-1"
            >
              Próxima
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={selectedQuiz.questions.some(q => !selectedAnswers[q.id])}
              className="flex-1"
            >
              Finalizar Quiz
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
