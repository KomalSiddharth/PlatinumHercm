import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { CheckCircle2, Circle, Lock, Play, Trophy, Star, Sparkles, Zap } from 'lucide-react';

interface SkillTreeProps {
  area: {
    id: string;
    name: string;
    emoji: string;
    currentRating: number;
    targetRating: number;
    color: string;
  };
  onStartLesson: () => void;
}

interface LevelNode {
  id: number;
  name: string;
  lessons: number;
  completed: number;
  status: 'locked' | 'current' | 'completed';
  xp: number;
  emoji: string;
}

export default function SkillTree({ area, onStartLesson }: SkillTreeProps) {
  const levels: LevelNode[] = [
    { id: 1, name: 'Health Basics', lessons: 5, completed: 5, status: 'completed', xp: 250, emoji: '🌱' },
    { id: 2, name: 'Nutrition Fundamentals', lessons: 8, completed: 8, status: 'completed', xp: 400, emoji: '🥗' },
    { id: 3, name: 'Meal Planning', lessons: 10, completed: 3, status: 'current', xp: 150, emoji: '📋' },
    { id: 4, name: 'Exercise & Movement', lessons: 7, completed: 0, status: 'locked', xp: 0, emoji: '💪' },
    { id: 5, name: 'Habit Building', lessons: 5, completed: 0, status: 'locked', xp: 0, emoji: '⭐' }
  ];

  const totalLessons = levels.reduce((sum, level) => sum + level.lessons, 0);
  const completedLessons = levels.reduce((sum, level) => sum + level.completed, 0);
  const overallProgress = Math.round((completedLessons / totalLessons) * 100);
  const totalXP = levels.reduce((sum, level) => sum + level.xp, 0);

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="text-center">
        <div className="text-6xl mb-3">{area.emoji}</div>
        <h2 className={`text-3xl font-black bg-gradient-to-r ${area.color} bg-clip-text text-transparent mb-2`}>
          {area.name}
        </h2>
        <p className="text-muted-foreground">Your personalized learning journey</p>
      </div>

      {/* Progress Summary */}
      <div className={`bg-gradient-to-r ${area.color} p-6 rounded-2xl text-white shadow-xl`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm opacity-90 mb-1">Your Goal</div>
            <div className="text-2xl font-black">
              Rating {area.currentRating} → {area.targetRating}
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-black">{overallProgress}%</div>
            <div className="text-sm opacity-90">Complete</div>
          </div>
        </div>
        <div className="h-4 bg-white/30 rounded-full overflow-hidden">
          <div 
            className="h-full bg-white rounded-full transition-all duration-500"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-3 text-sm">
          <span className="opacity-90">{completedLessons} / {totalLessons} lessons</span>
          <span className="opacity-90 flex items-center gap-1">
            <Zap className="w-4 h-4" />
            {totalXP} XP earned
          </span>
        </div>
      </div>

      {/* Level Path */}
      <div className="space-y-6">
        {levels.map((level, index) => (
          <Card
            key={level.id}
            className={`relative overflow-hidden border-3 transition-all ${
              level.status === 'current'
                ? 'border-yellow-400 shadow-2xl shadow-yellow-400/30 scale-105'
                : level.status === 'completed'
                ? 'border-green-400 shadow-lg'
                : level.status === 'locked'
                ? 'border-gray-300 opacity-60'
                : 'border-primary/30 shadow-md hover-elevate'
            }`}
            data-testid={`level-${level.id}`}
          >
            {/* Level Number Badge */}
            <div className={`absolute -left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center font-black text-lg shadow-lg z-10 ${
              level.status === 'completed'
                ? 'bg-green-500 text-white'
                : level.status === 'current'
                ? 'bg-yellow-400 text-yellow-900'
                : level.status === 'locked'
                ? 'bg-gray-400 text-white'
                : 'bg-primary text-white'
            }`}>
              {level.status === 'completed' ? '✓' : level.id}
            </div>

            <div className="p-6 pl-10">
              <div className="flex items-start gap-4">
                {/* Emoji */}
                <div className="text-5xl">{level.emoji}</div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        Level {level.id}: {level.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        {level.status === 'current' && (
                          <Badge className="bg-yellow-400 text-yellow-900 border-0 animate-pulse">
                            <Sparkles className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        )}
                        {level.status === 'completed' && (
                          <Badge className="bg-green-500 text-white border-0">
                            <Trophy className="w-3 h-3 mr-1" />
                            Mastered
                          </Badge>
                        )}
                        {level.status === 'locked' && (
                          <Badge variant="secondary">
                            <Lock className="w-3 h-3 mr-1" />
                            Locked
                          </Badge>
                        )}
                        <span className="text-sm text-muted-foreground">
                          {level.lessons} lessons • {level.xp > 0 ? `${level.xp} XP` : '350 XP available'}
                        </span>
                      </div>
                    </div>

                    {/* Action Button */}
                    {level.status === 'current' && (
                      <Button 
                        onClick={onStartLesson}
                        className="gap-2 font-bold shadow-lg"
                        data-testid={`button-continue-level-${level.id}`}
                      >
                        <Play className="w-4 h-4" />
                        Continue
                      </Button>
                    )}
                    {level.status === 'completed' && (
                      <Button 
                        onClick={onStartLesson}
                        variant="outline"
                        className="gap-2"
                        data-testid={`button-review-level-${level.id}`}
                      >
                        Practice
                      </Button>
                    )}
                  </div>

                  {/* Progress for current level */}
                  {level.status === 'current' && (
                    <div className="mb-4 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-bold">
                          {level.completed}/{level.lessons} lessons
                        </span>
                      </div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full bg-gradient-to-r ${area.color} transition-all duration-500`}
                          style={{ width: `${(level.completed / level.lessons) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Lesson Dots */}
                  {level.status !== 'locked' && (
                    <div className="flex flex-wrap gap-2">
                      {Array.from({ length: level.lessons }).map((_, i) => (
                        <div
                          key={i}
                          className={`relative w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold border-2 transition-all ${
                            i < level.completed
                              ? 'bg-green-100 dark:bg-green-900/30 border-green-500 text-green-700 dark:text-green-300'
                              : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 hover:scale-110'
                          }`}
                          data-testid={`lesson-indicator-${level.id}-${i + 1}`}
                        >
                          {i < level.completed ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <Circle className="w-5 h-5" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Lock message */}
                  {level.status === 'locked' && (
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 text-center">
                      <Lock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Complete Level {level.id - 1} to unlock
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Completion celebration overlay */}
            {level.status === 'completed' && (
              <div className="absolute top-2 right-2">
                <div className="text-3xl animate-bounce">🎉</div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Encouragement */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 p-6 rounded-2xl border-2 border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-4">
          <div className="text-4xl">💡</div>
          <div>
            <h4 className="font-bold text-lg text-blue-900 dark:text-blue-100 mb-2">
              Pro Tip!
            </h4>
            <p className="text-blue-800 dark:text-blue-200 text-sm">
              Complete at least 1 lesson per day to maintain your streak! 
              Most successful learners spend 10-15 minutes daily. You got this! 🚀
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
