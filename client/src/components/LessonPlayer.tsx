import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Heart, CheckCircle2, XCircle, Lightbulb, Trophy, Star } from 'lucide-react';

interface LessonPlayerProps {
  onComplete: () => void;
}

export default function LessonPlayer({ onComplete }: LessonPlayerProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [hearts, setHearts] = useState(4);
  const [earnedXP, setEarnedXP] = useState(0);

  // Static dummy data for UI design
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
    },
    {
      id: 4,
      type: 'scenario',
      question: 'Your friend eats only junk food. What advice will you give?',
      explanation: 'Practical, small changes work best! Start by replacing one meal with healthy food.'
    },
    {
      id: 5,
      type: 'match',
      question: 'Match the nutrient to its main function',
      pairs: [
        { left: 'Proteins', right: 'Build & repair muscles' },
        { left: 'Carbs', right: 'Provide quick energy' },
        { left: 'Fats', right: 'Support brain & hormones' }
      ],
      explanation: 'Each macronutrient has a unique role in your body!'
    }
  ];

  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / lesson.totalQuestions) * 100;

  const handleAnswerSelect = (index: number) => {
    setSelectedAnswer(index);
  };

  const handleCheckAnswer = () => {
    setShowResult(true);
    // In real app, check if answer is correct
    const isCorrect = selectedAnswer === (currentQ as any).correctIndex;
    
    if (isCorrect) {
      setEarnedXP(earnedXP + lesson.xpPerQuestion);
    } else {
      setHearts(hearts - 1);
    }
  };

  const handleContinue = () => {
    if (currentQuestion < lesson.totalQuestions - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      onComplete();
    }
  };

  const renderQuestion = () => {
    switch (currentQ.type) {
      case 'mcq':
      case 'true_false':
        return (
          <div className="space-y-3">
            <h3 className="text-base md:text-lg font-semibold mb-4">{currentQ.question}</h3>
            <div className="space-y-2">
              {(currentQ as any).options.map((option: string, index: number) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={showResult}
                  className={`w-full p-3 md:p-4 text-left rounded-lg border-2 transition-all text-sm md:text-base ${
                    selectedAnswer === index
                      ? showResult
                        ? index === (currentQ as any).correctIndex
                          ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                          : 'border-red-500 bg-red-50 dark:bg-red-950/20'
                        : 'border-primary bg-primary/10'
                      : 'border-gray-200 dark:border-gray-700 hover-elevate'
                  } ${showResult && index === (currentQ as any).correctIndex ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : ''}`}
                  data-testid={`option-${index}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-muted-foreground">
                      {String.fromCharCode(65 + index)})
                    </span>
                    <span className="flex-1">{option}</span>
                    {showResult && index === (currentQ as any).correctIndex && (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    )}
                    {showResult && selectedAnswer === index && index !== (currentQ as any).correctIndex && (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 'fill_blank':
        return (
          <div className="space-y-4">
            <h3 className="text-base md:text-lg font-semibold">{currentQ.question}</h3>
            <Input 
              placeholder="Type your answer..."
              disabled={showResult}
              className="text-base"
              data-testid="input-fill-blank"
            />
          </div>
        );

      case 'scenario':
        return (
          <div className="space-y-4">
            <h3 className="text-base md:text-lg font-semibold">{currentQ.question}</h3>
            <Textarea 
              placeholder="Type your answer in your own words..."
              rows={4}
              disabled={showResult}
              className="text-sm md:text-base resize-none"
              data-testid="textarea-scenario"
            />
          </div>
        );

      case 'match':
        return (
          <div className="space-y-4">
            <h3 className="text-base md:text-lg font-semibold mb-4">{currentQ.question}</h3>
            <div className="space-y-3">
              {(currentQ as any).pairs.map((pair: any, index: number) => (
                <Card key={index} className="p-3 md:p-4 hover-elevate" data-testid={`match-pair-${index}`}>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 font-medium text-sm md:text-base">{pair.left}</div>
                    <div className="text-muted-foreground">→</div>
                    <div className="flex-1 text-sm md:text-base text-muted-foreground">{pair.right}</div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg md:text-xl font-bold">Lesson {lesson.level}: {lesson.title}</h2>
            <p className="text-xs md:text-sm text-muted-foreground">
              Question {currentQuestion + 1} / {lesson.totalQuestions}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Heart
                key={i}
                className={`w-5 h-5 md:w-6 md:h-6 ${
                  i < hearts
                    ? 'fill-red-500 text-red-500'
                    : 'text-gray-300 dark:text-gray-600'
                }`}
              />
            ))}
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question Card */}
      <Card className="p-4 md:p-6">
        {renderQuestion()}
      </Card>

      {/* Result Feedback */}
      {showResult && (
        <Card className={`p-4 border-2 ${
          selectedAnswer === (currentQ as any).correctIndex
            ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
            : 'border-red-500 bg-red-50 dark:bg-red-950/20'
        }`}>
          <div className="flex items-start gap-3">
            {selectedAnswer === (currentQ as any).correctIndex ? (
              <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
            ) : (
              <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
            )}
            <div className="flex-1">
              <h4 className={`font-semibold mb-2 ${
                selectedAnswer === (currentQ as any).correctIndex
                  ? 'text-green-900 dark:text-green-100'
                  : 'text-red-900 dark:text-red-100'
              }`}>
                {selectedAnswer === (currentQ as any).correctIndex ? '✅ Correct! +10 XP' : '❌ Oops! Try Again'}
              </h4>
              <div className="flex items-start gap-2 text-sm">
                <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0 text-yellow-600" />
                <p className={`${
                  selectedAnswer === (currentQ as any).correctIndex
                    ? 'text-green-800 dark:text-green-200'
                    : 'text-red-800 dark:text-red-200'
                }`}>
                  {currentQ.explanation}
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-3">
        <Badge variant="outline" className="gap-1">
          <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
          <span className="text-sm">{earnedXP} XP</span>
        </Badge>
        
        {!showResult ? (
          <Button 
            onClick={handleCheckAnswer}
            disabled={selectedAnswer === null && currentQ.type !== 'scenario' && currentQ.type !== 'fill_blank'}
            data-testid="button-check-answer"
          >
            Check Answer
          </Button>
        ) : (
          <Button 
            onClick={handleContinue}
            className="gap-2"
            data-testid="button-continue"
          >
            {currentQuestion < lesson.totalQuestions - 1 ? 'Continue' : (
              <>
                <Trophy className="w-4 h-4" />
                Complete Lesson
              </>
            )}
          </Button>
        )}
      </div>

      {/* Progress Indicators */}
      <div className="flex justify-center gap-2 pt-2">
        {questions.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full ${
              index < currentQuestion
                ? 'bg-green-500'
                : index === currentQuestion
                ? 'bg-primary'
                : 'bg-gray-300 dark:bg-gray-600'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
