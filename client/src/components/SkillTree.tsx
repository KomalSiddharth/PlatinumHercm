import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle2, Lock, Play, Star, Crown, Sparkles } from 'lucide-react';
import { useState } from 'react';

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
  type: 'video' | 'exercise';
  status: 'locked' | 'current' | 'completed';
  xp: number;
  affirmation: string;
  exerciseDetails?: {
    task: string;
    count?: number;
    unit?: string;
  };
}

export default function SkillTree({ area, onStartLesson }: SkillTreeProps) {
  // 24 Health Transformation Levels
  const levels: LevelNode[] = [
    { id: 1, name: 'Welcome to Health Mastery', type: 'video', status: 'completed', xp: 5, affirmation: 'I am ready to transform my health!' },
    { id: 2, name: 'Understanding Your Body', type: 'video', status: 'completed', xp: 5, affirmation: 'My body is a temple of wellness' },
    { id: 3, name: 'Drink 8 Glasses of Water', type: 'exercise', status: 'current', xp: 0, affirmation: 'Water is my source of vitality!', exerciseDetails: { task: 'Drink water', count: 8, unit: 'glasses' } },
    { id: 4, name: 'Morning Squats Challenge', type: 'exercise', status: 'locked', xp: 0, affirmation: 'Movement is my medicine!', exerciseDetails: { task: 'Do squats', count: 10, unit: 'reps' } },
    { id: 5, name: 'Healthy Breakfast', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I nourish my body with love', exerciseDetails: { task: 'Eat healthy breakfast', count: 1, unit: 'meal' } },
    { id: 6, name: 'Check Emotional Frequency', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I control my emotional state', exerciseDetails: { task: 'Check energy levels every 2 hours' } },
    { id: 7, name: '100 Pushups Quest', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I am getting stronger every day!', exerciseDetails: { task: 'Do pushups', count: 100, unit: 'reps' } },
    { id: 8, name: 'Sleep 8 Hours', type: 'exercise', status: 'locked', xp: 0, affirmation: 'Sleep restores my superpowers', exerciseDetails: { task: 'Sleep', count: 8, unit: 'hours' } },
    { id: 9, name: 'Walking Affirmations', type: 'exercise', status: 'locked', xp: 0, affirmation: 'My words shape my reality!', exerciseDetails: { task: 'Practice walking-talking affirmations' } },
    { id: 10, name: 'Walk 3 Kilometers', type: 'exercise', status: 'locked', xp: 0, affirmation: 'Every step brings me closer to health', exerciseDetails: { task: 'Walk', count: 3, unit: 'km' } },
    { id: 11, name: 'Cancel-Cancel Technique', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I reject negative thoughts instantly', exerciseDetails: { task: 'Practice cancel-cancel for negativity' } },
    { id: 12, name: 'Ho\'oponopono Practice', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I release and heal', exerciseDetails: { task: 'Do ho\'oponopono meditation', count: 10, unit: 'minutes' } },
    { id: 13, name: 'Gratitude Journal', type: 'exercise', status: 'locked', xp: 0, affirmation: 'Gratitude fills my heart', exerciseDetails: { task: 'Write gratitude list', count: 5, unit: 'items' } },
    { id: 14, name: 'Belief System Reset', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I believe in myself completely!', exerciseDetails: { task: 'Reprogram limiting beliefs' } },
    { id: 15, name: 'Deep Breathing Exercise', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I breathe in peace, exhale stress', exerciseDetails: { task: 'Deep breathing', count: 10, unit: 'minutes' } },
    { id: 16, name: 'Yoga Sun Salutations', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I flow with energy', exerciseDetails: { task: 'Do sun salutations', count: 5, unit: 'rounds' } },
    { id: 17, name: 'Positive Affirmations', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I am responsible for my feelings', exerciseDetails: { task: 'Repeat affirmations', count: 10, unit: 'times' } },
    { id: 18, name: 'Mindful Eating Practice', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I eat with awareness and joy', exerciseDetails: { task: 'Practice mindful eating', count: 1, unit: 'meal' } },
    { id: 19, name: 'Energy Boosting Workout', type: 'exercise', status: 'locked', xp: 0, affirmation: 'Energy flows through me', exerciseDetails: { task: 'Musical workout', count: 10, unit: 'minutes' } },
    { id: 20, name: 'Evening Meditation', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I release the day peacefully', exerciseDetails: { task: 'Evening meditation', count: 15, unit: 'minutes' } },
    { id: 21, name: 'Body Scan Awareness', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I listen to my body', exerciseDetails: { task: 'Body scan practice', count: 10, unit: 'minutes' } },
    { id: 22, name: 'Laughter Therapy', type: 'exercise', status: 'locked', xp: 0, affirmation: 'Joy is my natural state', exerciseDetails: { task: 'Laugh intentionally', count: 5, unit: 'minutes' } },
    { id: 23, name: 'Cold Shower Challenge', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I embrace discomfort for growth', exerciseDetails: { task: 'Take cold shower', count: 2, unit: 'minutes' } },
    { id: 24, name: 'Health Champion Mastery', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I am a health champion!', exerciseDetails: { task: 'Complete all daily health practices' } }
  ];

  const totalXP = levels.reduce((sum, level) => sum + level.xp, 0);
  const maxXP = levels.length * 5;
  const overallProgress = Math.round((totalXP / maxXP) * 100);
  const completedLevels = levels.filter(l => l.status === 'completed').length;

  // Animated Avatar Evolution based on progress
  const getHealthAvatar = (progress: number) => {
    if (progress >= 90) return { 
      icon: '🦸', 
      title: 'Health Champion', 
      bg: 'from-yellow-400 via-amber-400 to-orange-500',
      description: 'Heroic aura, peak vitality!'
    };
    if (progress >= 60) return { 
      icon: '💪', 
      title: 'Fit Warrior', 
      bg: 'from-purple-400 via-pink-400 to-rose-400',
      description: 'Fit posture, showing biceps!'
    };
    if (progress >= 30) return { 
      icon: '😊', 
      title: 'Energetic Being', 
      bg: 'from-blue-400 via-cyan-400 to-teal-400',
      description: 'Smiling, more colorful!'
    };
    if (progress >= 10) return { 
      icon: '🙂', 
      title: 'Awakening', 
      bg: 'from-green-400 via-emerald-400 to-teal-400',
      description: 'Starting to feel better...'
    };
    return { 
      icon: '😓', 
      title: 'Starting Journey', 
      bg: 'from-gray-400 via-gray-500 to-gray-600',
      description: 'Tired & slouched'
    };
  };

  const avatar = getHealthAvatar(overallProgress);

  const handleLevelClick = (level: LevelNode) => {
    if (level.status === 'locked') return;
    
    // Level 1 & 2 (videos) - open course lesson player
    if (level.type === 'video') {
      onStartLesson();
    } else {
      // Exercise levels - show exercise dialog
      // TODO: Implement exercise challenge dialog
      console.log('Opening exercise challenge:', level);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Avatar Header */}
      <div className="text-center">
        <div className={`w-32 h-32 mx-auto mb-4 rounded-full bg-gradient-to-br ${avatar.bg} flex items-center justify-center shadow-2xl border-4 border-white dark:border-gray-800 transform transition-all duration-1000`}>
          <div className="text-7xl">{avatar.icon}</div>
        </div>
        <h2 className={`text-3xl font-black bg-gradient-to-r ${area.color} bg-clip-text text-transparent mb-2`}>
          Health Transformation
        </h2>
        <Badge className={`bg-gradient-to-r ${avatar.bg} text-white border-0 mb-2`}>
          <Crown className="w-4 h-4 mr-1" />
          {avatar.title}
        </Badge>
        <p className="text-sm text-muted-foreground">{avatar.description}</p>
      </div>

      {/* Progress Stats */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm text-muted-foreground">Progress</p>
            <p className="text-2xl font-black">{overallProgress}%</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">XP Earned</p>
            <p className="text-2xl font-black text-primary">{totalXP} / {maxXP}</p>
          </div>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div 
            className={`h-full bg-gradient-to-r ${avatar.bg} transition-all duration-500`}
            style={{ width: `${overallProgress}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          {completedLevels} / {levels.length} levels completed
        </p>
      </Card>

      {/* Duolingo-Style Vertical Path */}
      <div 
        className="relative rounded-3xl p-8 overflow-hidden"
        style={{
          minHeight: `${levels.length * 180}px`,
          background: 'linear-gradient(180deg, #dbeafe 0%, #bfdbfe 10%, #93c5fd 20%, #60a5fa 30%, #3b82f6 40%, #2563eb 50%, #1d4ed8 60%, #1e40af 70%, #1e3a8a 80%, #312e81 85%, #4c1d95 90%, #7e22ce 95%, #9333ea 100%)'
        }}
      >
        {/* Background decorative elements */}
        <div className="absolute inset-0 opacity-10">
          {[...Array(12)].map((_, i) => (
            <div 
              key={i}
              className="absolute text-6xl"
              style={{
                top: `${i * 200 + 50}px`,
                left: i % 2 === 0 ? '20px' : 'auto',
                right: i % 2 === 1 ? '20px' : 'auto'
              }}
            >
              {['💪', '🏃', '🧘', '🍎', '💧', '😴', '❤️', '⚡', '🔥', '🎯', '🏆', '✨'][i % 12]}
            </div>
          ))}
        </div>

        {/* Vertical Path */}
        <div className="relative max-w-md mx-auto">
          {levels.map((level, index) => {
            const isLast = index === levels.length - 1;
            const isLeftAffirmation = index % 2 === 0;
            
            return (
              <div key={level.id} className="relative mb-12">
                {/* Connection Line */}
                {!isLast && (
                  <div className="absolute left-1/2 top-full w-1 h-12 -translate-x-1/2 z-0"
                    style={{
                      background: level.status === 'completed' 
                        ? 'linear-gradient(to bottom, #10b981, #059669)' 
                        : level.status === 'current'
                        ? 'linear-gradient(to bottom, #fbbf24, #f59e0b)'
                        : 'linear-gradient(to bottom, #d1d5db, #9ca3af)'
                    }}
                  />
                )}

                {/* Affirmation on Connection Line - Alternating Sides */}
                {!isLast && (
                  <div 
                    className={`absolute top-full mt-3 ${isLeftAffirmation ? 'right-full mr-6' : 'left-full ml-6'} w-48 z-20`}
                  >
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-lg border-2 border-purple-200 dark:border-purple-700">
                      <div className="flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs font-semibold italic text-purple-700 dark:text-purple-300">
                          "{level.affirmation}"
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Level Node */}
                <div className="relative flex justify-center">
                  <button
                    onClick={() => handleLevelClick(level)}
                    disabled={level.status === 'locked'}
                    className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all transform hover:scale-110 z-10 ${
                      level.status === 'current'
                        ? 'bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500 shadow-2xl shadow-yellow-400/60 scale-110 animate-pulse cursor-pointer'
                        : level.status === 'completed'
                        ? 'bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 shadow-xl cursor-pointer'
                        : 'bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500 opacity-40 cursor-not-allowed'
                    }`}
                    data-testid={`level-${level.id}`}
                  >
                    {/* Status Icon */}
                    {level.status === 'completed' ? (
                      <CheckCircle2 className="w-12 h-12 text-white" strokeWidth={3} />
                    ) : level.status === 'locked' ? (
                      <Lock className="w-10 h-10 text-white opacity-70" />
                    ) : (
                      <Star className="w-12 h-12 text-white animate-pulse" />
                    )}

                    {/* Level Number Badge */}
                    <div className="absolute -bottom-2 bg-white dark:bg-gray-900 rounded-full px-3 py-1 shadow-lg border-2 border-current">
                      <span className="text-xs font-black">{level.id}</span>
                    </div>

                    {/* XP Badge */}
                    {level.status === 'completed' && (
                      <div className="absolute -top-2 -right-2 bg-primary rounded-full px-2 py-1 shadow-lg">
                        <span className="text-xs font-bold text-white">+5</span>
                      </div>
                    )}
                  </button>
                </div>

                {/* Level Name (below node) */}
                <div className="text-center mt-3">
                  <p className="text-sm font-bold text-white dark:text-gray-100">
                    {level.name}
                  </p>
                  {level.exerciseDetails && level.status !== 'locked' && (
                    <p className="text-xs text-white/80 dark:text-gray-300 mt-1">
                      {level.exerciseDetails.task}
                      {level.exerciseDetails.count && ` (${level.exerciseDetails.count} ${level.exerciseDetails.unit})`}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Evolution Message */}
      <Card className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-2 border-purple-200 dark:border-purple-800">
        <div className="flex items-start gap-3">
          <div className="text-5xl">{avatar.icon}</div>
          <div>
            <h4 className="font-bold text-lg mb-1">Avatar Evolution System</h4>
            <p className="text-sm text-muted-foreground">
              Complete quests to evolve: 😓 Tired → 🙂 Awakening → 😊 Energetic → 💪 Fit Warrior → 🦸 Health Champion!
            </p>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="text-xs">5 XP per quest</Badge>
              <Badge variant="secondary" className="text-xs">{levels.length} total quests</Badge>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
