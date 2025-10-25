import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { CheckCircle2, Circle, Lock, Play, Trophy, Star } from 'lucide-react';

interface SkillTreeProps {
  area: {
    id: string;
    name: string;
    icon: string;
    currentRating: number;
    targetRating: number;
    level: number;
    progress: number;
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
}

export default function SkillTree({ area, onStartLesson }: SkillTreeProps) {
  // Static dummy data for UI design
  const levels: LevelNode[] = [
    {
      id: 1,
      name: 'Health Basics',
      lessons: 5,
      completed: 5,
      status: 'completed',
      xp: 250
    },
    {
      id: 2,
      name: 'Nutrition Fundamentals',
      lessons: 8,
      completed: 8,
      status: 'completed',
      xp: 400
    },
    {
      id: 3,
      name: 'Meal Planning',
      lessons: 10,
      completed: 3,
      status: 'current',
      xp: 150
    },
    {
      id: 4,
      name: 'Exercise & Movement',
      lessons: 7,
      completed: 0,
      status: 'locked',
      xp: 0
    },
    {
      id: 5,
      name: 'Habit Building',
      lessons: 5,
      completed: 0,
      status: 'locked',
      xp: 0
    }
  ];

  const totalLessons = levels.reduce((sum, level) => sum + level.lessons, 0);
  const completedLessons = levels.reduce((sum, level) => sum + level.completed, 0);
  const overallProgress = Math.round((completedLessons / totalLessons) * 100);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8 text-green-500" />;
      case 'current':
        return <Circle className="w-6 h-6 md:w-8 md:h-8 text-yellow-500 fill-yellow-500" />;
      case 'locked':
        return <Lock className="w-6 h-6 md:w-8 md:h-8 text-gray-400" />;
      default:
        return <Circle className="w-6 h-6 md:w-8 md:h-8" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'border-green-500 bg-green-50 dark:bg-green-950/20';
      case 'current':
        return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20';
      case 'locked':
        return 'border-gray-300 bg-gray-50 dark:bg-gray-950/20 opacity-60';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-4 md:p-6 rounded-lg border">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg md:text-xl font-bold">Your Goal</h3>
            <p className="text-sm text-muted-foreground">
              Rating {area.currentRating} → {area.targetRating}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl md:text-3xl font-bold text-primary">{overallProgress}%</div>
            <div className="text-xs text-muted-foreground">Complete</div>
          </div>
        </div>
        <Progress value={overallProgress} className="h-3" />
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <span>{completedLessons} / {totalLessons} lessons completed</span>
          <span>Level {area.level}</span>
        </div>
      </div>

      {/* Skill Tree Visualization */}
      <div className="space-y-4">
        <h3 className="text-base md:text-lg font-semibold flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          Learning Path
        </h3>

        <div className="relative space-y-4 md:space-y-6">
          {/* Connecting Line (vertical) */}
          <div className="absolute left-6 md:left-8 top-12 bottom-12 w-0.5 bg-gradient-to-b from-primary/30 to-accent/30" />

          {levels.map((level, index) => (
            <Card
              key={level.id}
              className={`relative border-2 transition-all ${getStatusColor(level.status)} ${
                level.status !== 'locked' ? 'hover-elevate' : ''
              }`}
              data-testid={`level-${level.id}`}
            >
              <div className="p-4 md:p-5">
                <div className="flex items-start gap-4">
                  {/* Status Icon */}
                  <div className="relative z-10 flex-shrink-0">
                    {getStatusIcon(level.status)}
                  </div>

                  {/* Level Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm md:text-base flex items-center gap-2">
                          Level {level.id}: {level.name}
                          {level.status === 'current' && (
                            <Badge variant="default" className="text-xs">Current</Badge>
                          )}
                          {level.status === 'completed' && (
                            <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                              ✓ Complete
                            </Badge>
                          )}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {level.lessons} lessons • {level.xp} XP earned
                        </p>
                      </div>

                      {/* Action Button */}
                      {level.status === 'current' && (
                        <Button 
                          size="sm" 
                          onClick={onStartLesson}
                          data-testid={`button-continue-level-${level.id}`}
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Continue
                        </Button>
                      )}
                      {level.status === 'completed' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={onStartLesson}
                          data-testid={`button-review-level-${level.id}`}
                        >
                          Review
                        </Button>
                      )}
                    </div>

                    {/* Progress Bar for Current Level */}
                    {level.status === 'current' && (
                      <div className="mt-3 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">
                            {level.completed}/{level.lessons} lessons
                          </span>
                        </div>
                        <Progress 
                          value={(level.completed / level.lessons) * 100} 
                          className="h-2"
                        />
                      </div>
                    )}

                    {/* Lessons Grid for Current/Completed */}
                    {level.status !== 'locked' && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {Array.from({ length: level.lessons }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center text-xs font-semibold border-2 ${
                              i < level.completed
                                ? 'bg-green-100 dark:bg-green-900/30 border-green-500 text-green-700 dark:text-green-300'
                                : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500'
                            }`}
                            data-testid={`lesson-indicator-${level.id}-${i + 1}`}
                          >
                            {i < level.completed ? '✓' : i + 1}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Lock Message */}
                    {level.status === 'locked' && (
                      <p className="text-xs text-muted-foreground mt-2">
                        🔒 Complete Level {level.id - 1} to unlock
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-2">
          <span className="text-lg">💡</span>
          <div>
            <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100 mb-1">
              Pro Tip
            </h4>
            <p className="text-xs text-blue-800 dark:text-blue-200">
              Complete at least 1 lesson per day to maintain your streak! 
              Most successful users spend 10-15 minutes daily.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
