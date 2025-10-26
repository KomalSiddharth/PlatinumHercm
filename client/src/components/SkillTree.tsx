import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle2, Lock, Play, Star, Zap, Crown, Heart, Flame, Droplets, Battery } from 'lucide-react';

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
  quest: string;
  affirmation: string;
}

export default function SkillTree({ area, onStartLesson }: SkillTreeProps) {
  // Actual Health Mastery Course Lessons - Single Continuous Track
  const levels: LevelNode[] = [
    { id: 1, name: 'Welcome to Health Mastery', lessons: 1, completed: 1, status: 'completed', xp: 5, emoji: '🌱', quest: '🔓 Unlock Your Health Journey', affirmation: 'I am ready to transform my health!' },
    { id: 2, name: 'Understanding Your Body', lessons: 1, completed: 1, status: 'completed', xp: 5, emoji: '🧬', quest: '🧭 Discover Your Body Map', affirmation: 'My body is a temple of wellness' },
    { id: 3, name: 'Magic Water Morning Ritual', lessons: 1, completed: 0, status: 'current', xp: 0, emoji: '💧', quest: '💦 Collect Energy Potion (8 Glasses)', affirmation: 'Water is my source of vitality!' },
    { id: 4, name: 'Healthy Breakfast Power', lessons: 1, completed: 0, status: 'locked', xp: 0, emoji: '🍳', quest: '🍽️ Fuel the Morning Engine', affirmation: 'I nourish my body with love' },
    { id: 5, name: 'Musical Workout Challenge', lessons: 1, completed: 0, status: 'locked', xp: 0, emoji: '🎵', quest: '🐉 Defeat the Lazy Dragon (10 Squats)', affirmation: 'Movement is my medicine!' },
    { id: 6, name: 'Emotional Frequency Mastery', lessons: 1, completed: 0, status: 'locked', xp: 0, emoji: '😊', quest: '📊 Check Energy Levels Every 2 Hours', affirmation: 'I control my emotional state' },
    { id: 7, name: '100 Pushups Challenge', lessons: 1, completed: 0, status: 'locked', xp: 0, emoji: '💪', quest: '⚡ Power-Up Quest (100 Reps)', affirmation: 'I am getting stronger every day!' },
    { id: 8, name: 'Sleep Scroll Unlock', lessons: 1, completed: 0, status: 'locked', xp: 0, emoji: '😴', quest: '🌙 Unlock 8-Hour Sleep Treasure', affirmation: 'Sleep restores my superpowers' },
    { id: 9, name: 'Walking-Talking Affirmations', lessons: 1, completed: 0, status: 'locked', xp: 0, emoji: '🚶', quest: '🗣️ Speak Your Power into Existence', affirmation: 'My words shape my reality!' },
    { id: 10, name: 'Cancel-Cancel Technique', lessons: 1, completed: 0, status: 'locked', xp: 0, emoji: '🚫', quest: '🛡️ Block Negativity Shield', affirmation: 'I reject negative thoughts instantly' },
    { id: 11, name: 'Belief System Reset', lessons: 1, completed: 0, status: 'locked', xp: 0, emoji: '🧠', quest: '🔄 Reprogram Your Mind Matrix', affirmation: 'I believe in myself completely!' },
    { id: 12, name: 'Health Champion Mastery', lessons: 1, completed: 0, status: 'locked', xp: 0, emoji: '👑', quest: '🏆 Claim Your Health Crown', affirmation: 'I am a health champion!' }
  ];

  const totalLessons = levels.reduce((sum, level) => sum + level.lessons, 0);
  const completedLessons = levels.reduce((sum, level) => sum + level.completed, 0);
  const overallProgress = Math.round((completedLessons / totalLessons) * 100);
  const totalXP = levels.reduce((sum, level) => sum + level.xp, 0);

  // Animated Human Avatar Evolution based on progress
  const getHealthAvatar = (progress: number) => {
    if (progress >= 90) return { 
      emoji: '🦸', 
      title: 'Health Champion', 
      bg: 'from-yellow-400 via-amber-400 to-orange-500',
      description: 'Heroic aura, peak vitality! 🌟',
      body: 'Glowing with superhuman energy!'
    };
    if (progress >= 60) return { 
      emoji: '💪', 
      title: 'Fit Warrior', 
      bg: 'from-purple-400 via-pink-400 to-rose-400',
      description: 'Fit posture, showing biceps! 💪',
      body: 'Strong, confident, energetic!'
    };
    if (progress >= 30) return { 
      emoji: '😊', 
      title: 'Energetic Being', 
      bg: 'from-blue-400 via-cyan-400 to-teal-400',
      description: 'Smiling, more colorful! 😊',
      body: 'Feeling lighter and happier'
    };
    if (progress >= 10) return { 
      emoji: '🙂', 
      title: 'Awakening', 
      bg: 'from-green-400 via-emerald-400 to-teal-400',
      description: 'Starting to feel better...',
      body: 'Small positive changes happening'
    };
    return { 
      emoji: '😓', 
      title: 'Starting Journey', 
      bg: 'from-gray-400 via-gray-500 to-gray-600',
      description: 'Tired & slouched 😓',
      body: 'Feeling weak, need energy...'
    };
  };

  const avatar = getHealthAvatar(overallProgress);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Animated Avatar Header */}
      <div className="text-center relative">
        <div className={`w-32 h-32 mx-auto mb-4 rounded-full bg-gradient-to-br ${avatar.bg} flex items-center justify-center shadow-2xl border-4 border-white dark:border-gray-800 transform transition-all duration-1000 hover:scale-110`}
          style={{
            animation: overallProgress >= 25 ? 'pulse 2s ease-in-out infinite' : 'none'
          }}
        >
          <div className="text-7xl">{avatar.emoji}</div>
        </div>
        <h2 className={`text-3xl font-black bg-gradient-to-r ${area.color} bg-clip-text text-transparent mb-2`}>
          {area.name} Transformation Journey
        </h2>
        <Badge className={`bg-gradient-to-r ${avatar.bg} text-white border-0 mb-2 text-sm px-4 py-1`}>
          <Crown className="w-4 h-4 mr-1" />
          {avatar.title}
        </Badge>
        <p className="text-sm text-muted-foreground mb-1">{avatar.description}</p>
        <p className="text-xs text-muted-foreground italic">{avatar.body}</p>
      </div>

      {/* XP Progress Bar */}
      <div className={`bg-gradient-to-r ${area.color} p-5 rounded-2xl text-white shadow-xl`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm opacity-90 font-bold">Health Transformation Progress</span>
          <span className="font-black flex items-center gap-1 text-lg">
            <Zap className="w-5 h-5" />
            {totalXP} / {totalLessons * 5} XP
          </span>
        </div>
        <div className="h-4 bg-white/30 rounded-full overflow-hidden shadow-inner">
          <div 
            className="h-full bg-gradient-to-r from-white to-yellow-200 rounded-full transition-all duration-500 shadow-lg"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-sm">
          <span>{completedLessons}/{totalLessons} quests completed</span>
          <span className="text-2xl font-black">{overallProgress}%</span>
        </div>
      </div>

      {/* Single Continuous Vertical Track */}
      <div 
        className="relative rounded-3xl p-6 sm:p-10 overflow-hidden min-h-[3200px]"
        style={{
          background: 'linear-gradient(180deg, #dbeafe 0%, #bfdbfe 8%, #93c5fd 16%, #60a5fa 24%, #3b82f6 32%, #2563eb 40%, #1d4ed8 48%, #1e40af 56%, #1e3a8a 64%, #312e81 72%, #4c1d95 80%, #6b21a8 88%, #7e22ce 96%, #9333ea 100%)'
        }}
      >
        {/* Health-Themed Decorative Elements */}
        <div className="absolute top-10 left-10 text-6xl opacity-20">💪</div>
        <div className="absolute top-32 right-16 text-5xl opacity-20">🏃</div>
        <div className="absolute top-64 left-8 text-6xl opacity-20">🧘</div>
        <div className="absolute top-96 right-12 text-5xl opacity-20">🍎</div>
        <div className="absolute top-[600px] left-16 text-6xl opacity-20">💧</div>
        <div className="absolute top-[800px] right-10 text-5xl opacity-20">😴</div>
        <div className="absolute top-[1000px] left-12 text-6xl opacity-20">❤️</div>
        <div className="absolute top-[1200px] right-16 text-5xl opacity-20">🌟</div>
        <div className="absolute top-[1400px] left-10 text-6xl opacity-20">⚡</div>
        <div className="absolute top-[1600px] right-12 text-5xl opacity-20">🔥</div>
        <div className="absolute top-[1800px] left-14 text-6xl opacity-20">🎯</div>
        <div className="absolute top-[2000px] right-8 text-5xl opacity-20">🏆</div>
        <div className="absolute top-[2200px] left-10 text-6xl opacity-20">👑</div>
        <div className="absolute top-[2400px] right-14 text-5xl opacity-20">🎉</div>
        <div className="absolute top-[2600px] left-12 text-6xl opacity-20">✨</div>
        <div className="absolute top-[2800px] right-10 text-5xl opacity-20">🌈</div>

        {/* Single Continuous Vertical Path */}
        <div className="relative max-w-2xl mx-auto">
          {levels.map((level, index) => {
            const isLast = index === levels.length - 1;
            
            return (
              <div
                key={level.id}
                className="relative mb-8"
              >
                {/* Connection Line */}
                {!isLast && (
                  <div 
                    className="absolute left-1/2 top-full w-1 h-8 -translate-x-1/2 z-0"
                    style={{
                      background: level.status === 'completed' 
                        ? 'linear-gradient(to bottom, #10b981, #059669)' 
                        : level.status === 'current'
                        ? 'linear-gradient(to bottom, #fbbf24, #f59e0b)'
                        : 'linear-gradient(to bottom, #9ca3af, #6b7280)'
                    }}
                  />
                )}

                {/* Level Node Container */}
                <div className="relative flex flex-col items-center">
                  {/* Level Circle Node */}
                  <div 
                    className={`relative w-36 h-36 rounded-full flex flex-col items-center justify-center cursor-pointer transition-all transform hover:scale-110 z-10 ${
                      level.status === 'current'
                        ? 'bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500 shadow-2xl shadow-yellow-400/60 scale-110 animate-pulse'
                        : level.status === 'completed'
                        ? 'bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 shadow-xl shadow-green-400/40'
                        : 'bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500 opacity-50 shadow-md'
                    }`}
                    data-testid={`level-${level.id}`}
                    onClick={level.status === 'current' || level.status === 'completed' ? onStartLesson : undefined}
                  >
                    {/* Status Badge */}
                    <div className={`absolute -top-2 -right-2 w-11 h-11 rounded-full flex items-center justify-center shadow-lg ${
                      level.status === 'completed' ? 'bg-green-600' : level.status === 'current' ? 'bg-yellow-500 animate-bounce' : 'bg-gray-500'
                    }`}>
                      {level.status === 'completed' ? (
                        <CheckCircle2 className="w-6 h-6 text-white" />
                      ) : level.status === 'locked' ? (
                        <Lock className="w-5 h-5 text-white" />
                      ) : (
                        <Star className="w-6 h-6 text-white animate-spin" style={{ animationDuration: '3s' }} />
                      )}
                    </div>

                    {/* Level Number Badge */}
                    <div className="absolute -top-3 -left-3 w-10 h-10 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center font-black text-lg shadow-lg border-2 border-current">
                      {level.id}
                    </div>

                    {/* Level Emoji */}
                    <div className="text-6xl mb-1">{level.emoji}</div>
                    
                    {/* XP Badge */}
                    {level.status !== 'locked' && (
                      <Badge variant={level.status === 'completed' ? 'default' : 'secondary'} className="text-xs font-bold">
                        +5 XP
                      </Badge>
                    )}
                  </div>

                  {/* Quest Name & Affirmation Card */}
                  <Card className="mt-4 p-4 max-w-md w-full shadow-xl border-2 border-primary/20 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm">
                    <div className="space-y-2">
                      {/* Quest */}
                      <div className="flex items-start gap-2">
                        <Flame className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-orange-600 dark:text-orange-400 mb-1">DAILY QUEST</p>
                          <p className="text-sm font-bold">{level.quest}</p>
                        </div>
                      </div>

                      {/* Lesson Name */}
                      <div className="flex items-start gap-2">
                        <Battery className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">LESSON</p>
                          <p className="text-sm font-semibold">{level.name}</p>
                        </div>
                      </div>

                      {/* Affirmation */}
                      <div className="flex items-start gap-2 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-3 rounded-lg border border-purple-200 dark:border-purple-700">
                        <Droplets className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-purple-600 dark:text-purple-400 mb-1">AFFIRMATION</p>
                          <p className="text-sm font-semibold italic text-purple-700 dark:text-purple-300">"{level.affirmation}"</p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-2">
                        {level.status === 'current' && (
                          <Button 
                            onClick={onStartLesson}
                            className="w-full gap-2 font-bold shadow-lg"
                            data-testid={`button-continue-level-${level.id}`}
                          >
                            <Play className="w-4 h-4" />
                            Start Quest
                          </Button>
                        )}
                        {level.status === 'completed' && (
                          <Button 
                            onClick={onStartLesson}
                            variant="outline"
                            className="w-full gap-2 border-2"
                            data-testid={`button-review-level-${level.id}`}
                          >
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            Quest Complete! Practice Again
                          </Button>
                        )}
                        {level.status === 'locked' && (
                          <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-3 text-center">
                            <Lock className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                            <p className="text-xs text-muted-foreground">
                              Complete previous quest to unlock
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Avatar Evolution Message */}
      <div className="bg-gradient-to-r from-purple-50 via-pink-50 to-orange-50 dark:from-purple-950/20 dark:via-pink-950/20 dark:to-orange-950/20 p-6 rounded-2xl border-2 border-purple-200 dark:border-purple-800">
        <div className="flex items-start gap-4">
          <div className="text-6xl">{avatar.emoji}</div>
          <div className="flex-1">
            <h4 className="font-bold text-xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
              Your Avatar Evolves Every 3 Days! 🌟
            </h4>
            <p className="text-sm text-muted-foreground mb-3">
              Complete quests daily to see your avatar transform: 😓 Tired & Slouched → 🙂 Awakening → 😊 Smiling & Colorful → 💪 Fit with Biceps → 🦸 Heroic Aura!
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Heart className="w-4 h-4 text-pink-500" />
              <span className="text-muted-foreground">{totalLessons} health quests • 5 XP each • Total {totalLessons * 5} XP available</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
