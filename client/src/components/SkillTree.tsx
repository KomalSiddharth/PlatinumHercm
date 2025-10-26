import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { CheckCircle2, Circle, Lock, Play, Trophy, Star, Sparkles, Zap, Crown, Heart } from 'lucide-react';

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
  contentTypes: string[];
}

export default function SkillTree({ area, onStartLesson }: SkillTreeProps) {
  const levels: LevelNode[] = [
    { id: 1, name: 'Health Basics', lessons: 5, completed: 5, status: 'completed', xp: 250, emoji: '🌱', contentTypes: ['Video', 'Quiz'] },
    { id: 2, name: 'Nutrition Fundamentals', lessons: 8, completed: 8, status: 'completed', xp: 400, emoji: '🥗', contentTypes: ['Video', 'Reading', 'Quiz'] },
    { id: 3, name: 'Meal Planning', lessons: 10, completed: 3, status: 'current', xp: 150, emoji: '📋', contentTypes: ['Interactive', 'Reading', 'Challenge'] },
    { id: 4, name: 'Exercise & Movement', lessons: 12, completed: 0, status: 'locked', xp: 0, emoji: '💪', contentTypes: ['Video', 'Exercise', 'Challenge'] },
    { id: 5, name: 'Habit Building', lessons: 8, completed: 0, status: 'locked', xp: 0, emoji: '⭐', contentTypes: ['Video', 'Interactive', 'Quiz'] },
    { id: 6, name: 'Mindfulness & Stress', lessons: 10, completed: 0, status: 'locked', xp: 0, emoji: '🧘', contentTypes: ['Audio', 'Exercise', 'Quiz'] },
    { id: 7, name: 'Sleep Optimization', lessons: 7, completed: 0, status: 'locked', xp: 0, emoji: '😴', contentTypes: ['Video', 'Reading', 'Challenge'] },
    { id: 8, name: 'Energy Management', lessons: 9, completed: 0, status: 'locked', xp: 0, emoji: '⚡', contentTypes: ['Interactive', 'Video', 'Exercise'] },
    { id: 9, name: 'Emotional Health', lessons: 11, completed: 0, status: 'locked', xp: 0, emoji: '❤️', contentTypes: ['Video', 'Exercise', 'Quiz'] },
    { id: 10, name: 'Advanced Wellness', lessons: 13, completed: 0, status: 'locked', xp: 0, emoji: '🏆', contentTypes: ['Video', 'Challenge', 'Assessment'] },
    { id: 11, name: 'Longevity Mastery', lessons: 10, completed: 0, status: 'locked', xp: 0, emoji: '🌟', contentTypes: ['Reading', 'Interactive', 'Challenge'] },
    { id: 12, name: 'Health Champion', lessons: 15, completed: 0, status: 'locked', xp: 0, emoji: '👑', contentTypes: ['All Types', 'Final Assessment'] }
  ];

  const totalLessons = levels.reduce((sum, level) => sum + level.lessons, 0);
  const completedLessons = levels.reduce((sum, level) => sum + level.completed, 0);
  const overallProgress = Math.round((completedLessons / totalLessons) * 100);
  const totalXP = levels.reduce((sum, level) => sum + level.xp, 0);

  const getAvatarForProgress = (progress: number) => {
    if (progress >= 90) return { emoji: '👑', title: 'Master', bg: 'from-yellow-400 via-amber-400 to-orange-500' };
    if (progress >= 70) return { emoji: '🎖️', title: 'Expert', bg: 'from-purple-400 via-pink-400 to-rose-400' };
    if (progress >= 50) return { emoji: '⭐', title: 'Advanced', bg: 'from-blue-400 via-cyan-400 to-teal-400' };
    if (progress >= 30) return { emoji: '🌟', title: 'Intermediate', bg: 'from-green-400 via-emerald-400 to-teal-400' };
    if (progress >= 10) return { emoji: '✨', title: 'Beginner', bg: 'from-indigo-400 via-purple-400 to-pink-400' };
    return { emoji: '🌱', title: 'Starter', bg: 'from-gray-400 via-gray-500 to-gray-600' };
  };

  const avatar = getAvatarForProgress(overallProgress);

  const getLevelPosition = (index: number) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    
    const isEvenRow = row % 2 === 0;
    const actualCol = isEvenRow ? col : 2 - col;
    
    return {
      left: `${actualCol * 40 + 10}%`,
      top: `${row * 220}px`
    };
  };

  return (
    <div className="space-y-6 p-4">
      {/* Header with Avatar */}
      <div className="text-center relative">
        <div className={`w-28 h-28 mx-auto mb-4 rounded-full bg-gradient-to-br ${avatar.bg} flex items-center justify-center shadow-2xl border-4 border-white dark:border-gray-800 animate-pulse`}>
          <div className="text-6xl">{avatar.emoji}</div>
        </div>
        <h2 className={`text-3xl font-black bg-gradient-to-r ${area.color} bg-clip-text text-transparent mb-1`}>
          {area.name} Journey
        </h2>
        <Badge className={`bg-gradient-to-r ${avatar.bg} text-white border-0 mb-2`}>
          <Crown className="w-3 h-3 mr-1" />
          {avatar.title}
        </Badge>
        <p className="text-sm text-muted-foreground">
          Rating {area.currentRating} → {area.targetRating} • {completedLessons}/{totalLessons} lessons
        </p>
      </div>

      {/* Progress Bar */}
      <div className={`bg-gradient-to-r ${area.color} p-4 rounded-2xl text-white shadow-xl`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm opacity-90">Journey Progress</span>
          <span className="font-black flex items-center gap-1">
            <Zap className="w-4 h-4" />
            {totalXP} XP
          </span>
        </div>
        <div className="h-3 bg-white/30 rounded-full overflow-hidden">
          <div 
            className="h-full bg-white rounded-full transition-all duration-500"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
        <div className="text-right text-2xl font-black mt-1">{overallProgress}%</div>
      </div>

      {/* Duolingo-Style Path */}
      <div 
        className="relative min-h-[2800px] rounded-3xl p-8 overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #fef3c7 0%, #fde68a 10%, #fcd34d 20%, #fbbf24 30%, #f59e0b 40%, #f97316 50%, #fb923c 60%, #fdba74 70%, #fed7aa 80%, #ffedd5 90%, #fff7ed 100%)'
        }}
      >
        {/* Decorative elements */}
        <div className="absolute top-10 left-10 text-6xl opacity-20">☁️</div>
        <div className="absolute top-40 right-20 text-5xl opacity-20">⭐</div>
        <div className="absolute top-80 left-5 text-4xl opacity-20">🌈</div>
        <div className="absolute top-[500px] right-10 text-5xl opacity-20">✨</div>
        <div className="absolute top-[800px] left-16 text-6xl opacity-20">🎯</div>
        <div className="absolute top-[1100px] right-12 text-5xl opacity-20">🚀</div>
        <div className="absolute top-[1400px] left-8 text-4xl opacity-20">💎</div>
        <div className="absolute top-[1700px] right-16 text-6xl opacity-20">🏆</div>
        <div className="absolute top-[2000px] left-12 text-5xl opacity-20">👑</div>
        <div className="absolute top-[2300px] right-8 text-6xl opacity-20">🎉</div>

        {/* Level Path */}
        <div className="relative">
        {levels.map((level, index) => {
          const position = getLevelPosition(index);
          const isLast = index === levels.length - 1;
          
          return (
            <div
              key={level.id}
              className="absolute transition-all duration-500"
              style={{
                left: position.left,
                top: position.top,
                transform: 'translateX(-50%)'
              }}
            >
              {/* Connection Line to Next Level */}
              {!isLast && (
                <div 
                  className="absolute top-full left-1/2 w-1 bg-gradient-to-b from-amber-400 to-orange-400 z-0"
                  style={{ 
                    height: '60px',
                    transform: 'translateX(-50%)'
                  }}
                />
              )}

              {/* Level Node */}
              <div 
                className={`relative w-32 h-32 rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all transform hover:scale-110 ${
                  level.status === 'current'
                    ? 'bg-gradient-to-br from-yellow-400 via-amber-400 to-orange-400 shadow-2xl shadow-yellow-400/50 scale-110 animate-pulse'
                    : level.status === 'completed'
                    ? 'bg-gradient-to-br from-green-400 via-emerald-400 to-teal-400 shadow-xl'
                    : 'bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500 opacity-50'
                }`}
                data-testid={`level-${level.id}`}
              >
                {/* Status Badge */}
                <div className={`absolute -top-3 -right-3 w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${
                  level.status === 'completed' ? 'bg-green-600' : level.status === 'current' ? 'bg-yellow-500' : 'bg-gray-500'
                }`}>
                  {level.status === 'completed' ? (
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  ) : level.status === 'locked' ? (
                    <Lock className="w-5 h-5 text-white" />
                  ) : (
                    <Star className="w-5 h-5 text-white animate-spin" style={{ animationDuration: '3s' }} />
                  )}
                </div>

                {/* Level Content */}
                <div className="text-5xl mb-1">{level.emoji}</div>
                <div className="text-xs font-black text-white text-center px-2">
                  Lv {level.id}
                </div>
                
                {/* Progress Ring for Current */}
                {level.status === 'current' && (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-20 h-2 bg-white/30 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white rounded-full transition-all"
                      style={{ width: `${(level.completed / level.lessons) * 100}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Level Info Card on Hover */}
              <div className="absolute left-1/2 -translate-x-1/2 top-36 w-72 opacity-0 hover:opacity-100 transition-opacity z-50 pointer-events-none">
                <Card className="p-4 shadow-2xl border-4 border-primary/20">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm">{level.name}</h3>
                      {level.status === 'current' && (
                        <Badge className="bg-yellow-400 text-yellow-900 text-xs">Active</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{level.lessons} lessons</span>
                      <span>•</span>
                      <span>{level.xp > 0 ? level.xp : level.lessons * 50} XP</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {level.contentTypes.map((type, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {type}
                        </Badge>
                      ))}
                    </div>
                    {level.status === 'current' && (
                      <Button 
                        onClick={onStartLesson}
                        size="sm"
                        className="w-full pointer-events-auto"
                        data-testid={`button-continue-level-${level.id}`}
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Continue
                      </Button>
                    )}
                    {level.status === 'completed' && (
                      <Button 
                        onClick={onStartLesson}
                        size="sm"
                        variant="outline"
                        className="w-full pointer-events-auto"
                        data-testid={`button-review-level-${level.id}`}
                      >
                        Practice Again
                      </Button>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          );
        })}
        </div>
      </div>

      {/* Achievement Message */}
      <div className="bg-gradient-to-r from-purple-50 via-pink-50 to-orange-50 dark:from-purple-950/20 dark:via-pink-950/20 dark:to-orange-950/20 p-6 rounded-2xl border-2 border-purple-200 dark:border-purple-800">
        <div className="flex items-start gap-4">
          <div className="text-5xl">{avatar.emoji}</div>
          <div className="flex-1">
            <h4 className="font-bold text-lg bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
              {avatar.title} Level Unlocked!
            </h4>
            <p className="text-sm text-muted-foreground mb-3">
              Keep learning to unlock better avatars! Complete lessons to progress from 🌱 Starter → ✨ Beginner → 🌟 Intermediate → ⭐ Advanced → 🎖️ Expert → 👑 Master
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Heart className="w-4 h-4 text-pink-500" />
              <span>{levels.length} levels • {totalLessons} lessons • {levels.length * 50 * 10} total XP available</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
