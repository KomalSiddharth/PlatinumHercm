import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Heart, CheckCircle2, XCircle, Lightbulb, Trophy, Star, Zap, PartyPopper } from 'lucide-react';

interface LessonPlayerProps {
  onComplete: () => void;
}

export default function LessonPlayer({ onComplete }: LessonPlayerProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [hearts, setHearts] = useState(5);
  const [earnedXP, setEarnedXP] = useState(0);

  const lesson = {
    title: 'Nutrition Basics',
    level: 3,
    totalQuestions: 5,
    xpPerQuestion: 10
  };

  const questions = [
    {
      id: 1,
      type: 'mcq',
      question: 'What are the 3 macronutrients?',
      options: [
        'Vitamins, Minerals, Water',
        'Proteins, Carbs, Fats',
        'Calcium, Iron, Zinc',
        'Sugar, Salt, Oil'
      ],
      correctIndex: 1,
      explanation: 'Macro = Large. These 3 nutrients are needed in large amounts daily!'
    },
    {
      id: 2,
      type: 'true_false',
      question: 'All fats are unhealthy',
      options: ['True', 'False'],
      correctIndex: 1,
      explanation: 'Healthy fats (nuts, avocado, fish) are essential for brain and hormones!'
    },
    {
      id: 3,
      type: 'fill_blank',
      question: 'Proteins help build _______',
      correctAnswer: 'muscles',
      explanation: 'Proteins are building blocks of muscles!'
    }
  ];

  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / lesson.totalQuestions) * 100;

  const handleCheckAnswer = () => {
    setShowResult(true);
    const isCorrect = selectedAnswer === (currentQ as any).correctIndex;
    
    if (isCorrect) {
      setEarnedXP(earnedXP + lesson.xpPerQuestion);
    } else {
      setHearts(Math.max(0, hearts - 1));
    }
  };

  const handleContinue = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      onComplete();
    }
  };

  const isCorrect = selectedAnswer === (currentQ as any).correctIndex;

  return (
    <div className="space-y-6 p-4">
      {/* Header with Hearts */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black">Lesson {lesson.level}</h2>
          <p className="text-sm text-muted-foreground">{lesson.title}</p>
        </div>
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Heart
              key={i}
              className={`w-7 h-7 transition-all ${
                i < hearts
                  ? 'fill-red-500 text-red-500 scale-100'
                  : 'text-gray-300 dark:text-gray-600 scale-90'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Question {currentQuestion + 1}/{questions.length}</span>
          <span className="font-bold flex items-center gap-1">
            <Zap className="w-4 h-4 text-yellow-500" />
            {earnedXP} XP
          </span>
        </div>
        <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <Card className="p-8 border-4 border-primary/20 shadow-xl">
        <div className="space-y-6">
          <h3 className="text-2xl font-bold leading-tight">{currentQ.question}</h3>
          
          {(currentQ.type === 'mcq' || currentQ.type === 'true_false') && (
            <div className="space-y-3">
              {(currentQ as any).options.map((option: string, index: number) => (
                <button
                  key={index}
                  onClick={() => !showResult && setSelectedAnswer(index)}
                  disabled={showResult}
                  className={`w-full p-4 text-left rounded-xl border-3 transition-all font-medium ${
                    selectedAnswer === index
                      ? showResult
                        ? index === (currentQ as any).correctIndex
                          ? 'border-green-500 bg-green-50 dark:bg-green-950/20 scale-105 shadow-lg'
                          : 'border-red-500 bg-red-50 dark:bg-red-950/20'
                        : 'border-primary bg-primary/10 scale-105 shadow-lg'
                      : 'border-gray-300 dark:border-gray-700 hover-elevate active-elevate-2'
                  } ${showResult && index === (currentQ as any).correctIndex ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : ''}`}
                  data-testid={`option-${index}`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-black text-muted-foreground w-8">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="flex-1 text-lg">{option}</span>
                    {showResult && index === (currentQ as any).correctIndex && (
                      <CheckCircle2 className="w-7 h-7 text-green-600 flex-shrink-0" />
                    )}
                    {showResult && selectedAnswer === index && index !== (currentQ as any).correctIndex && (
                      <XCircle className="w-7 h-7 text-red-600 flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {currentQ.type === 'fill_blank' && (
            <Input 
              placeholder="Type your answer..."
              disabled={showResult}
              className="text-xl p-6 border-3 h-auto"
              data-testid="input-fill-blank"
            />
          )}
        </div>
      </Card>

      {/* Result Feedback */}
      {showResult && (
        <div className={`rounded-2xl p-6 border-4 ${
          isCorrect
            ? 'border-green-500 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20'
            : 'border-red-500 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20'
        }`}>
          <div className="flex items-start gap-4">
            <div className="text-5xl">
              {isCorrect ? '🎉' : '😅'}
            </div>
            <div className="flex-1">
              <h4 className={`text-2xl font-black mb-3 ${
                isCorrect ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'
              }`}>
                {isCorrect ? `Awesome! +${lesson.xpPerQuestion} XP` : 'Not quite!'}
              </h4>
              <div className="flex items-start gap-3">
                <Lightbulb className="w-6 h-6 mt-1 flex-shrink-0 text-yellow-600" />
                <p className={`text-lg ${
                  isCorrect ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                }`}>
                  {currentQ.explanation}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="flex justify-end">
        {!showResult ? (
          <Button 
            onClick={handleCheckAnswer}
            disabled={selectedAnswer === null}
            size="lg"
            className="text-lg font-bold px-8 h-14 shadow-lg"
            data-testid="button-check-answer"
          >
            Check Answer
          </Button>
        ) : (
          <Button 
            onClick={handleContinue}
            size="lg"
            className="text-lg font-bold px-8 h-14 shadow-lg gap-3"
            data-testid="button-continue"
          >
            {currentQuestion < questions.length - 1 ? (
              <>Continue</>
            ) : (
              <>
                <Trophy className="w-6 h-6" />
                Complete Lesson
                <PartyPopper className="w-6 h-6" />
              </>
            )}
          </Button>
        )}
      </div>

      {/* Progress Dots */}
      <div className="flex justify-center gap-2">
        {questions.map((_, index) => (
          <div
            key={index}
            className={`w-3 h-3 rounded-full transition-all ${
              index < currentQuestion
                ? 'bg-green-500 scale-100'
                : index === currentQuestion
                ? 'bg-primary scale-125'
                : 'bg-gray-300 dark:bg-gray-600 scale-75'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
