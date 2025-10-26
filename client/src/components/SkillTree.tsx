import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Check, Lock, Play, Crown, Sparkles, TrendingUp, Coins, DollarSign, Zap, Trophy } from 'lucide-react';
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
  const isMoney = area.name === 'Money';

  // 24 Health Transformation Levels
  const healthLevels: LevelNode[] = [
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

  // 24 Money Mastery Levels
  const moneyLevels: LevelNode[] = [
    { id: 1, name: 'Money Mindset Foundation', type: 'video', status: 'completed', xp: 5, affirmation: 'I am a money magnet!' },
    { id: 2, name: 'Abundance Consciousness', type: 'video', status: 'completed', xp: 5, affirmation: 'Money flows to me easily' },
    { id: 3, name: 'Track Daily Expenses', type: 'exercise', status: 'current', xp: 0, affirmation: 'I manage money wisely', exerciseDetails: { task: 'Track all expenses for the day' } },
    { id: 4, name: 'Save 10% of Income', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I pay myself first', exerciseDetails: { task: 'Save money', count: 10, unit: '% of income' } },
    { id: 5, name: 'Gratitude for Money', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I appreciate all money', exerciseDetails: { task: 'Write money gratitude list', count: 5, unit: 'items' } },
    { id: 6, name: 'EFT for Money Blocks', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I release money blocks', exerciseDetails: { task: 'Do EFT tapping', count: 10, unit: 'minutes' } },
    { id: 7, name: 'Learn New Money Skill', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I invest in myself', exerciseDetails: { task: 'Study money skill', count: 15, unit: 'minutes' } },
    { id: 8, name: 'Create Income Stream Idea', type: 'exercise', status: 'locked', xp: 0, affirmation: 'Opportunities are everywhere', exerciseDetails: { task: 'Brainstorm income ideas', count: 3, unit: 'ideas' } },
    { id: 9, name: 'Money Affirmations', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I am worthy of wealth', exerciseDetails: { task: 'Repeat money affirmations', count: 10, unit: 'times' } },
    { id: 10, name: 'Review Financial Goals', type: 'exercise', status: 'locked', xp: 0, affirmation: 'My goals are clear', exerciseDetails: { task: 'Review money goals' } },
    { id: 11, name: 'Negotiate Better Deal', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I ask for what I deserve', exerciseDetails: { task: 'Practice negotiation', count: 1, unit: 'deal' } },
    { id: 12, name: 'Invest Small Amount', type: 'exercise', status: 'locked', xp: 0, affirmation: 'My money grows', exerciseDetails: { task: 'Make an investment' } },
    { id: 13, name: 'Cancel Limiting Beliefs', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I deserve abundance', exerciseDetails: { task: 'Practice cancel-cancel on money fears' } },
    { id: 14, name: 'Money Visualization', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I see my wealthy future', exerciseDetails: { task: 'Visualize wealth', count: 10, unit: 'minutes' } },
    { id: 15, name: 'Create Value Today', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I add value everywhere', exerciseDetails: { task: 'Deliver exceptional value' } },
    { id: 16, name: 'Network with Successful', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I attract wealthy connections', exerciseDetails: { task: 'Connect with successful person', count: 1, unit: 'person' } },
    { id: 17, name: 'Read Wealth Book', type: 'exercise', status: 'locked', xp: 0, affirmation: 'Knowledge creates wealth', exerciseDetails: { task: 'Read wealth book', count: 20, unit: 'pages' } },
    { id: 18, name: 'Celebrate Money Wins', type: 'exercise', status: 'locked', xp: 0, affirmation: 'Every win matters', exerciseDetails: { task: 'Acknowledge money victories' } },
    { id: 19, name: 'Give Generously', type: 'exercise', status: 'locked', xp: 0, affirmation: 'Giving multiplies wealth', exerciseDetails: { task: 'Give money/value to someone' } },
    { id: 20, name: 'Money Blueprint Reset', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I choose my money story', exerciseDetails: { task: 'Rewrite money beliefs' } },
    { id: 21, name: 'Calculate Net Worth', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I track my growth', exerciseDetails: { task: 'Calculate total net worth' } },
    { id: 22, name: 'Automate Savings', type: 'exercise', status: 'locked', xp: 0, affirmation: 'Systems create wealth', exerciseDetails: { task: 'Set up automatic transfer' } },
    { id: 23, name: 'Multiple Income Streams', type: 'exercise', status: 'locked', xp: 0, affirmation: 'Money flows from many sources', exerciseDetails: { task: 'Start second income stream' } },
    { id: 24, name: 'Millionaire Mastery', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I am a wealth creator!', exerciseDetails: { task: 'Complete all money practices' } }
  ];

  const levels = isMoney ? moneyLevels : healthLevels;

  const totalXP = levels.reduce((sum, level) => sum + level.xp, 0);
  const maxXP = levels.length * 5;
  const overallProgress = Math.round((totalXP / maxXP) * 100);
  const completedLevels = levels.filter(l => l.status === 'completed').length;

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

  const getMoneyAvatar = (progress: number) => {
    if (progress >= 90) return { 
      icon: '👑', 
      title: 'Wealth Master', 
      bg: 'from-yellow-400 via-amber-400 to-orange-500',
      description: 'Living in abundance!'
    };
    if (progress >= 60) return { 
      icon: '💼', 
      title: 'Prosperous Professional', 
      bg: 'from-purple-400 via-pink-400 to-rose-400',
      description: 'Money flows easily'
    };
    if (progress >= 30) return { 
      icon: '💰', 
      title: 'Growing Wealth', 
      bg: 'from-pink-400 via-purple-400 to-indigo-400',
      description: 'Building prosperity'
    };
    if (progress >= 10) return { 
      icon: '💸', 
      title: 'Money Learner', 
      bg: 'from-purple-300 via-pink-300 to-rose-300',
      description: 'Opening to abundance'
    };
    return { 
      icon: '😔', 
      title: 'Struggling Financially', 
      bg: 'from-gray-400 via-gray-500 to-gray-600',
      description: 'Feeling scarcity'
    };
  };

  const avatar = isMoney ? getMoneyAvatar(overallProgress) : getHealthAvatar(overallProgress);

  const handleLevelClick = (level: LevelNode) => {
    if (level.status === 'locked') return;
    
    if (level.type === 'video') {
      onStartLesson();
    } else {
      console.log('Opening exercise challenge:', level);
    }
  };

  // Smooth curvy path positioning using sine wave
  const getCurvyPosition = (index: number) => {
    const baseY = index * 120; // More vertical spacing to prevent overlap
    const amplitude = 180; // Increased for more curviness
    const frequency = 0.5; // More waves for dramatic curves
    
    // Sine wave for smooth curvy path
    const x = Math.sin(index * frequency) * amplitude;
    
    return { x, y: baseY };
  };

  // Money section - Premium Design with Consistent Background
  if (isMoney) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-indigo-100 dark:from-gray-900 dark:via-purple-950 dark:to-pink-950">
        {/* Compact Header */}
        <div className="relative overflow-hidden border-b border-pink-200 dark:border-pink-800/30">
          <div className="relative z-10 text-center py-6 px-4">
            {/* Compact Avatar */}
            <div className="relative inline-block mb-3">
              <div className={`absolute inset-0 bg-gradient-to-r ${avatar.bg} opacity-20 blur-xl rounded-full animate-pulse`} />
              <div className={`relative w-20 h-20 mx-auto rounded-full bg-gradient-to-br ${avatar.bg} flex items-center justify-center shadow-lg border-2 border-white dark:border-gray-800`}>
                <div className="text-5xl">{avatar.icon}</div>
              </div>
            </div>
            
            <h1 className="text-3xl font-black bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
              Money Mastery
            </h1>
            
            <Badge className={`bg-gradient-to-r ${avatar.bg} text-white border-0 px-3 py-1 text-sm shadow-lg`}>
              <Crown className="w-4 h-4 mr-1" />
              {avatar.title}
            </Badge>
          </div>
        </div>

        {/* Compact Progress Card */}
        <div className="px-4 py-4">
          <Card className="max-w-xl mx-auto shadow-lg bg-white/90 dark:bg-gray-800/90 backdrop-blur border border-pink-200 dark:border-pink-800/30">
            <div className="p-4">
              <div className="grid grid-cols-3 gap-4 mb-3">
                <div className="text-center">
                  <div className="text-2xl font-black bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                    {overallProgress}%
                  </div>
                  <p className="text-xs text-muted-foreground">Progress</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-black bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                    {totalXP}
                  </div>
                  <p className="text-xs text-muted-foreground">XP Earned</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-black bg-gradient-to-r from-indigo-600 to-pink-600 bg-clip-text text-transparent">
                    {completedLevels}
                  </div>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </div>
              
              <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 transition-all duration-1000 ease-out"
                  style={{ width: `${overallProgress}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent animate-pulse" />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Skills Path with Animated Money Background */}
        <div className="px-4 pb-12">
          <div 
            className="relative rounded-3xl shadow-2xl overflow-hidden bg-gradient-to-br from-pink-100 via-purple-100 to-indigo-100 dark:from-gray-900 dark:via-purple-950 dark:to-pink-950"
            style={{
              minHeight: `${levels.length * 120 + 200}px`,
            }}
          >
            {/* Animated Floating Money Symbols - HIGHER OPACITY */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {/* Dollar signs floating - Much more visible */}
              <div className="absolute text-4xl animate-float" style={{ top: '5%', left: '10%', animationDelay: '0s', animationDuration: '8s', opacity: 0.5 }}>💵</div>
              <div className="absolute text-5xl animate-float" style={{ top: '15%', right: '8%', animationDelay: '2s', animationDuration: '10s', opacity: 0.45 }}>💰</div>
              <div className="absolute text-3xl animate-float" style={{ top: '25%', left: '5%', animationDelay: '1s', animationDuration: '9s', opacity: 0.55 }}>💸</div>
              <div className="absolute text-6xl animate-float" style={{ top: '35%', right: '12%', animationDelay: '3s', animationDuration: '11s', opacity: 0.4 }}>💎</div>
              <div className="absolute text-5xl animate-float" style={{ top: '45%', left: '8%', animationDelay: '1.5s', animationDuration: '10s', opacity: 0.5 }}>📈</div>
              <div className="absolute text-4xl animate-float" style={{ top: '55%', right: '10%', animationDelay: '2.5s', animationDuration: '9s', opacity: 0.45 }}>💼</div>
              <div className="absolute text-7xl animate-float" style={{ top: '65%', left: '12%', animationDelay: '0.5s', animationDuration: '12s', opacity: 0.4 }}>🏆</div>
              <div className="absolute text-6xl animate-float" style={{ top: '75%', right: '7%', animationDelay: '3.5s', animationDuration: '11s', opacity: 0.45 }}>👑</div>
              <div className="absolute text-5xl animate-float" style={{ top: '85%', left: '15%', animationDelay: '1s', animationDuration: '10s', opacity: 0.5 }}>✨</div>
              <div className="absolute text-4xl animate-float" style={{ top: '10%', left: '85%', animationDelay: '2s', animationDuration: '9s', opacity: 0.55 }}>💵</div>
              <div className="absolute text-3xl animate-float" style={{ top: '40%', left: '90%', animationDelay: '0s', animationDuration: '8s', opacity: 0.5 }}>📊</div>
              <div className="absolute text-5xl animate-float" style={{ top: '70%', right: '85%', animationDelay: '3s', animationDuration: '11s', opacity: 0.45 }}>💰</div>
            </div>

            {/* Curvy path container */}
            <div className="relative py-16 px-8">
              <div className="relative max-w-2xl mx-auto">
                <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }}>
                  <defs>
                    {levels.map((level, index) => {
                      if (index === levels.length - 1) return null;
                      
                      const currentPos = getCurvyPosition(index);
                      const nextPos = getCurvyPosition(index + 1);
                      
                      const startX = currentPos.x + 400;
                      const startY = currentPos.y + 40;
                      const endX = nextPos.x + 400;
                      const endY = nextPos.y + 40;
                      
                      const controlX1 = startX + (endX - startX) * 0.3;
                      const controlY1 = startY + (endY - startY) * 0.7;
                      const controlX2 = startX + (endX - startX) * 0.7;
                      const controlY2 = startY + (endY - startY) * 0.3;
                      
                      return (
                        <linearGradient key={`grad-${level.id}`} id={`gradient-${level.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor={level.status === 'completed' ? '#ec4899' : level.status === 'current' ? '#fbbf24' : '#d1d5db'} stopOpacity="0.6" />
                          <stop offset="100%" stopColor={level.status === 'completed' ? '#a855f7' : level.status === 'current' ? '#f59e0b' : '#9ca3af'} stopOpacity="0.6" />
                        </linearGradient>
                      );
                    })}
                  </defs>
                  
                  {levels.map((level, index) => {
                    if (index === levels.length - 1) return null;
                    
                    const currentPos = getCurvyPosition(index);
                    const nextPos = getCurvyPosition(index + 1);
                    
                    const startX = currentPos.x + 400;
                    const startY = currentPos.y + 40;
                    const endX = nextPos.x + 400;
                    const endY = nextPos.y + 40;
                    
                    const controlX1 = startX + (endX - startX) * 0.3;
                    const controlY1 = startY + (endY - startY) * 0.7;
                    const controlX2 = startX + (endX - startX) * 0.7;
                    const controlY2 = startY + (endY - startY) * 0.3;
                    
                    return (
                      <path
                        key={`path-${level.id}`}
                        d={`M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`}
                        stroke={`url(#gradient-${level.id})`}
                        strokeWidth="4"
                        fill="none"
                        strokeLinecap="round"
                        opacity="0.7"
                      />
                    );
                  })}
                </svg>

                {levels.map((level, index) => {
                  const position = getCurvyPosition(index);
                  
                  // Alternate between treasure and trophy for current levels
                  const CurrentIcon = index % 2 === 0 ? Coins : Trophy;
                  
                  return (
                    <div 
                      key={level.id}
                      className="relative mb-8 transition-all duration-300"
                      style={{
                        transform: `translateX(${position.x}px)`,
                        marginTop: index === 0 ? '0px' : '0px',
                      }}
                    >
                      {/* Level node */}
                      <div className="relative flex justify-center z-10">
                        <button
                          onClick={() => handleLevelClick(level)}
                          disabled={level.status === 'locked'}
                          className={`group relative transition-all duration-300 ${
                            level.status === 'locked' ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-110'
                          }`}
                          data-testid={`level-${level.id}`}
                        >
                          {/* Glow effect for current level */}
                          {level.status === 'current' && (
                            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 opacity-60 blur-lg rounded-full animate-pulse" />
                          )}
                          
                          {/* Main node - NO BORDER, solid fill */}
                          <div className={`relative w-16 h-16 rounded-full flex items-center justify-center transform transition-all duration-300 ${
                            level.status === 'current'
                              ? 'bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-600 shadow-xl scale-110 animate-pulse'
                              : level.status === 'completed'
                              ? 'bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-700 shadow-lg'
                              : 'bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500 opacity-40'
                          }`}>
                            {/* Icon - Simple check for completed, treasure/trophy for current */}
                            {level.status === 'completed' ? (
                              <Check className="w-10 h-10 text-white drop-shadow-lg" strokeWidth={4} />
                            ) : level.status === 'locked' ? (
                              <Lock className="w-6 h-6 text-white/70" />
                            ) : (
                              <CurrentIcon className="w-8 h-8 text-white animate-pulse drop-shadow-lg" strokeWidth={2.5} />
                            )}
                            
                            {/* Level badge */}
                            <div className={`absolute -bottom-1.5 px-2 py-0.5 rounded-full shadow text-[10px] font-black border ${
                              level.status === 'current' ? 'bg-white border-yellow-400 text-yellow-600' : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700'
                            }`}>
                              {level.id}
                            </div>
                            
                            {/* XP badge */}
                            {level.status === 'completed' && (
                              <div className="absolute -top-1 -right-1 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full px-1.5 py-0.5 shadow border border-white">
                                <span className="text-[10px] font-bold text-white">+5</span>
                              </div>
                            )}
                          </div>
                        </button>
                      </div>

                      {/* Level info */}
                      <div className="text-center mt-2 px-2">
                        <p className={`text-xs font-bold ${
                          level.status === 'locked' 
                            ? 'text-gray-400 dark:text-gray-600' 
                            : 'text-gray-700 dark:text-gray-200'
                        }`}>
                          {level.name}
                        </p>
                        {level.exerciseDetails && level.status !== 'locked' && (
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
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
          </div>
        </div>
      </div>
    );
  }

  // Health section - Vertical Path Design (original)
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
                      <Check className="w-12 h-12 text-white" strokeWidth={4} />
                    ) : level.status === 'locked' ? (
                      <Lock className="w-10 h-10 text-white opacity-70" />
                    ) : (
                      <Trophy className="w-12 h-12 text-white animate-pulse" />
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
