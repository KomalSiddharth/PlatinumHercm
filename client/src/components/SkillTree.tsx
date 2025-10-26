import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Check, Lock, Play, Crown, Sparkles, TrendingUp, Coins, DollarSign, Zap, Trophy, Heart, Users, Briefcase, Target, Star } from 'lucide-react';
import { useState, useEffect } from 'react';

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

  // 24 Relationship Mastery Levels
  const relationshipLevels: LevelNode[] = [
    { id: 1, name: 'Relationship Foundations', type: 'video', status: 'completed', xp: 5, affirmation: 'I attract loving relationships!' },
    { id: 2, name: 'Communication Mastery', type: 'video', status: 'completed', xp: 5, affirmation: 'I speak with love and clarity' },
    { id: 3, name: 'Active Listening Practice', type: 'exercise', status: 'current', xp: 0, affirmation: 'I truly hear others', exerciseDetails: { task: 'Practice active listening', count: 3, unit: 'conversations' } },
    { id: 4, name: 'Express Gratitude', type: 'exercise', status: 'locked', xp: 0, affirmation: 'Appreciation deepens bonds', exerciseDetails: { task: 'Thank someone genuinely', count: 3, unit: 'people' } },
    { id: 5, name: 'Quality Time Together', type: 'exercise', status: 'locked', xp: 0, affirmation: 'Presence is my gift', exerciseDetails: { task: 'Spend quality time', count: 1, unit: 'hour' } },
    { id: 6, name: 'Conflict Resolution', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I navigate conflicts with grace', exerciseDetails: { task: 'Practice peaceful conflict resolution' } },
    { id: 7, name: 'Words of Affirmation', type: 'exercise', status: 'locked', xp: 0, affirmation: 'My words uplift others', exerciseDetails: { task: 'Give genuine compliments', count: 5, unit: 'compliments' } },
    { id: 8, name: 'Acts of Service', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I serve with love', exerciseDetails: { task: 'Do something helpful', count: 2, unit: 'acts' } },
    { id: 9, name: 'Physical Touch', type: 'exercise', status: 'locked', xp: 0, affirmation: 'Connection heals', exerciseDetails: { task: 'Hug loved ones', count: 5, unit: 'hugs' } },
    { id: 10, name: 'Receiving Love', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I am worthy of love', exerciseDetails: { task: 'Accept love graciously' } },
    { id: 11, name: 'Forgiveness Practice', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I release resentment', exerciseDetails: { task: 'Forgive someone' } },
    { id: 12, name: 'Empathy Building', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I understand others deeply', exerciseDetails: { task: 'Practice empathy', count: 10, unit: 'minutes' } },
    { id: 13, name: 'Boundaries Setting', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I honor my boundaries', exerciseDetails: { task: 'Set healthy boundary', count: 1, unit: 'boundary' } },
    { id: 14, name: 'Trust Building', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I am trustworthy', exerciseDetails: { task: 'Keep a promise' } },
    { id: 15, name: 'Vulnerability Practice', type: 'exercise', status: 'locked', xp: 0, affirmation: 'Vulnerability is strength', exerciseDetails: { task: 'Share feelings openly' } },
    { id: 16, name: 'Date Night Planning', type: 'exercise', status: 'locked', xp: 0, affirmation: 'Romance flourishes', exerciseDetails: { task: 'Plan special date', count: 1, unit: 'date' } },
    { id: 17, name: 'Family Bonding', type: 'exercise', status: 'locked', xp: 0, affirmation: 'Family strengthens me', exerciseDetails: { task: 'Family activity', count: 1, unit: 'activity' } },
    { id: 18, name: 'Friendship Nurturing', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I cherish my friends', exerciseDetails: { task: 'Connect with friend', count: 1, unit: 'friend' } },
    { id: 19, name: 'Laughter Together', type: 'exercise', status: 'locked', xp: 0, affirmation: 'Joy multiplies when shared', exerciseDetails: { task: 'Laugh together', count: 15, unit: 'minutes' } },
    { id: 20, name: 'Relationship Vision', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I create beautiful connections', exerciseDetails: { task: 'Visualize ideal relationships', count: 10, unit: 'minutes' } },
    { id: 21, name: 'Difficult Conversations', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I communicate bravely', exerciseDetails: { task: 'Have honest conversation' } },
    { id: 22, name: 'Love Languages', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I speak all love languages', exerciseDetails: { task: 'Practice partner\'s love language' } },
    { id: 23, name: 'Appreciation Ritual', type: 'exercise', status: 'locked', xp: 0, affirmation: 'Gratitude deepens love', exerciseDetails: { task: 'Evening appreciation sharing' } },
    { id: 24, name: 'Relationship Champion', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I am a relationship master!', exerciseDetails: { task: 'Complete all relationship practices' } }
  ];

  // 24 Career Mastery Levels
  const careerLevels: LevelNode[] = [
    { id: 1, name: 'Career Vision Clarity', type: 'video', status: 'completed', xp: 5, affirmation: 'My career path is clear!' },
    { id: 2, name: 'Professional Excellence', type: 'video', status: 'completed', xp: 5, affirmation: 'I excel in my work' },
    { id: 3, name: 'Daily Planning', type: 'exercise', status: 'current', xp: 0, affirmation: 'I plan for success', exerciseDetails: { task: 'Create daily plan', count: 1, unit: 'plan' } },
    { id: 4, name: 'Priority Management', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I focus on what matters', exerciseDetails: { task: 'Identify top priorities', count: 3, unit: 'priorities' } },
    { id: 5, name: 'Deep Work Session', type: 'exercise', status: 'locked', xp: 0, affirmation: 'Focus fuels excellence', exerciseDetails: { task: 'Deep work session', count: 90, unit: 'minutes' } },
    { id: 6, name: 'Skill Development', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I grow daily', exerciseDetails: { task: 'Learn new skill', count: 30, unit: 'minutes' } },
    { id: 7, name: 'Value Creation', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I add tremendous value', exerciseDetails: { task: 'Deliver 10x value today' } },
    { id: 8, name: 'Networking Activity', type: 'exercise', status: 'locked', xp: 0, affirmation: 'Connections create opportunities', exerciseDetails: { task: 'Connect with professional', count: 1, unit: 'person' } },
    { id: 9, name: 'Goal Setting', type: 'exercise', status: 'locked', xp: 0, affirmation: 'Clear goals guide me', exerciseDetails: { task: 'Set career goals', count: 3, unit: 'goals' } },
    { id: 10, name: 'Productivity Boost', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I work smart', exerciseDetails: { task: 'Use productivity technique' } },
    { id: 11, name: 'Professional Reading', type: 'exercise', status: 'locked', xp: 0, affirmation: 'Knowledge is power', exerciseDetails: { task: 'Read professional content', count: 30, unit: 'minutes' } },
    { id: 12, name: 'Presentation Skills', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I communicate powerfully', exerciseDetails: { task: 'Practice presentation' } },
    { id: 13, name: 'Problem Solving', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I solve challenges creatively', exerciseDetails: { task: 'Solve difficult problem' } },
    { id: 14, name: 'Leadership Practice', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I inspire others', exerciseDetails: { task: 'Lead team activity' } },
    { id: 15, name: 'Innovation Time', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I create new solutions', exerciseDetails: { task: 'Brainstorm innovations', count: 5, unit: 'ideas' } },
    { id: 16, name: 'Feedback Seeking', type: 'exercise', status: 'locked', xp: 0, affirmation: 'Feedback helps me grow', exerciseDetails: { task: 'Ask for constructive feedback' } },
    { id: 17, name: 'Time Blocking', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I control my time', exerciseDetails: { task: 'Block time for priorities' } },
    { id: 18, name: 'Energy Management', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I manage my energy wisely', exerciseDetails: { task: 'Take strategic breaks', count: 3, unit: 'breaks' } },
    { id: 19, name: 'Celebration Ritual', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I celebrate my wins', exerciseDetails: { task: 'Acknowledge achievements' } },
    { id: 20, name: 'Mentor Connection', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I learn from the best', exerciseDetails: { task: 'Connect with mentor' } },
    { id: 21, name: 'Project Completion', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I finish what I start', exerciseDetails: { task: 'Complete important project' } },
    { id: 22, name: 'Strategic Thinking', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I think long-term', exerciseDetails: { task: 'Plan strategic moves', count: 15, unit: 'minutes' } },
    { id: 23, name: 'Excellence Standard', type: 'exercise', status: 'locked', xp: 0, affirmation: 'Excellence is my standard', exerciseDetails: { task: 'Deliver exceptional work' } },
    { id: 24, name: 'Career Champion', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I am a career master!', exerciseDetails: { task: 'Complete all career practices' } }
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

  // Select levels based on area
  const getLevels = () => {
    switch (area.name) {
      case 'Health': return healthLevels;
      case 'Relationships': return relationshipLevels;
      case 'Career': return careerLevels;
      case 'Money': return moneyLevels;
      default: return healthLevels;
    }
  };

  const levels = getLevels();

  const totalXP = levels.reduce((sum, level) => sum + level.xp, 0);
  const maxXP = levels.length * 5;
  const overallProgress = Math.round((totalXP / maxXP) * 100);
  const completedLevels = levels.filter(l => l.status === 'completed').length;

  // State for animated avatar and affirmations
  const [currentAffirmation, setCurrentAffirmation] = useState<string | null>(null);
  const [isWalking, setIsWalking] = useState(false);
  const [isDancing, setIsDancing] = useState(false);

  // Trigger affirmation pop-ups and animations
  const showAffirmation = (affirmation: string) => {
    setCurrentAffirmation(affirmation);
    setIsDancing(true);
    
    // Clear affirmation after 3 seconds
    setTimeout(() => {
      setCurrentAffirmation(null);
      setIsDancing(false);
    }, 3000);
  };

  // Auto-walk animation when making progress
  useEffect(() => {
    if (completedLevels > 0) {
      setIsWalking(true);
    }
  }, [completedLevels]);

  const getHealthAvatar = (progress: number) => {
    if (progress >= 90) return { 
      icon: '🦸', 
      title: 'Health Champion', 
      bg: 'from-yellow-400 via-amber-400 to-orange-500'
    };
    if (progress >= 60) return { 
      icon: '💪', 
      title: 'Fit Warrior', 
      bg: 'from-purple-400 via-pink-400 to-rose-400'
    };
    if (progress >= 30) return { 
      icon: '😊', 
      title: 'Energetic Being', 
      bg: 'from-blue-400 via-cyan-400 to-teal-400'
    };
    if (progress >= 10) return { 
      icon: '🙂', 
      title: 'Awakening', 
      bg: 'from-green-400 via-emerald-400 to-teal-400'
    };
    return { 
      icon: '😓', 
      title: 'Starting Journey', 
      bg: 'from-gray-400 via-gray-500 to-gray-600'
    };
  };

  const getRelationshipAvatar = (progress: number) => {
    if (progress >= 90) return { 
      icon: '💖', 
      title: 'Love Master', 
      bg: 'from-yellow-400 via-amber-400 to-orange-500'
    };
    if (progress >= 60) return { 
      icon: '🫂', 
      title: 'Connection Expert', 
      bg: 'from-purple-400 via-pink-400 to-rose-400'
    };
    if (progress >= 30) return { 
      icon: '💕', 
      title: 'Growing Bonds', 
      bg: 'from-pink-400 via-purple-400 to-indigo-400'
    };
    if (progress >= 10) return { 
      icon: '❤️', 
      title: 'Opening Heart', 
      bg: 'from-purple-300 via-pink-300 to-rose-300'
    };
    return { 
      icon: '💔', 
      title: 'Healing Relationships', 
      bg: 'from-gray-400 via-gray-500 to-gray-600'
    };
  };

  const getCareerAvatar = (progress: number) => {
    if (progress >= 90) return { 
      icon: '👑', 
      title: 'Career Champion', 
      bg: 'from-yellow-400 via-amber-400 to-orange-500'
    };
    if (progress >= 60) return { 
      icon: '🎯', 
      title: 'High Achiever', 
      bg: 'from-purple-400 via-pink-400 to-rose-400'
    };
    if (progress >= 30) return { 
      icon: '📈', 
      title: 'Rising Star', 
      bg: 'from-pink-400 via-purple-400 to-indigo-400'
    };
    if (progress >= 10) return { 
      icon: '🌱', 
      title: 'Career Builder', 
      bg: 'from-purple-300 via-pink-300 to-rose-300'
    };
    return { 
      icon: '😕', 
      title: 'Finding Path', 
      bg: 'from-gray-400 via-gray-500 to-gray-600'
    };
  };

  const getMoneyAvatar = (progress: number) => {
    if (progress >= 90) return { 
      icon: '👑', 
      title: 'Wealth Master', 
      bg: 'from-yellow-400 via-amber-400 to-orange-500'
    };
    if (progress >= 60) return { 
      icon: '💼', 
      title: 'Prosperous Professional', 
      bg: 'from-purple-400 via-pink-400 to-rose-400'
    };
    if (progress >= 30) return { 
      icon: '💰', 
      title: 'Growing Wealth', 
      bg: 'from-pink-400 via-purple-400 to-indigo-400'
    };
    if (progress >= 10) return { 
      icon: '💸', 
      title: 'Money Learner', 
      bg: 'from-purple-300 via-pink-300 to-rose-300'
    };
    return { 
      icon: '😔', 
      title: 'Struggling Financially', 
      bg: 'from-gray-400 via-gray-500 to-gray-600'
    };
  };

  const getAvatar = () => {
    switch (area.name) {
      case 'Health': return getHealthAvatar(overallProgress);
      case 'Relationships': return getRelationshipAvatar(overallProgress);
      case 'Career': return getCareerAvatar(overallProgress);
      case 'Money': return getMoneyAvatar(overallProgress);
      default: return getHealthAvatar(overallProgress);
    }
  };

  const avatar = getAvatar();

  const handleLevelClick = (level: LevelNode) => {
    if (level.status === 'locked') return;
    
    // Show affirmation pop-up
    showAffirmation(level.affirmation);
    
    if (level.type === 'video') {
      onStartLesson();
    } else {
      console.log('Opening exercise challenge:', level);
    }
  };

  // Smooth curvy path positioning using sine wave
  const getCurvyPosition = (index: number) => {
    const baseY = index * 120;
    const amplitude = 180;
    const frequency = 0.5;
    const x = Math.sin(index * frequency) * amplitude;
    return { x, y: baseY };
  };

  // Themed Background Elements
  const getBackgroundElements = () => {
    const commonProps = { className: "absolute animate-float" };
    
    switch (area.name) {
      case 'Health':
        return (
          <>
            <div {...commonProps} style={{ top: '3%', left: '8%', animationDelay: '0s', animationDuration: '9s', opacity: 0.6 }}>💪</div>
            <div {...commonProps} style={{ top: '8%', right: '5%', animationDelay: '2s', animationDuration: '11s', opacity: 0.55 }}>🏃</div>
            <div {...commonProps} style={{ top: '12%', left: '15%', animationDelay: '1s', animationDuration: '10s', opacity: 0.5 }}>🧘</div>
            <div {...commonProps} style={{ top: '18%', right: '10%', animationDelay: '3s', animationDuration: '12s', opacity: 0.6 }}>🍎</div>
            <div {...commonProps} style={{ top: '22%', left: '3%', animationDelay: '1.5s', animationDuration: '10s', opacity: 0.55 }}>💧</div>
            <div {...commonProps} style={{ top: '28%', right: '18%', animationDelay: '2.5s', animationDuration: '11s', opacity: 0.5 }}>😴</div>
            <div {...commonProps} style={{ top: '32%', left: '12%', animationDelay: '0.5s', animationDuration: '9s', opacity: 0.6 }}>❤️</div>
            <div {...commonProps} style={{ top: '38%', right: '8%', animationDelay: '1s', animationDuration: '10s', opacity: 0.55 }}>⚡</div>
            <div {...commonProps} style={{ top: '42%', left: '6%', animationDelay: '3s', animationDuration: '12s', opacity: 0.5 }}>🔥</div>
            <div {...commonProps} style={{ top: '48%', right: '15%', animationDelay: '0s', animationDuration: '9s', opacity: 0.6 }}>🎯</div>
            <div {...commonProps} style={{ top: '52%', left: '10%', animationDelay: '2s', animationDuration: '11s', opacity: 0.5 }}>🏆</div>
            <div {...commonProps} style={{ top: '58%', right: '12%', animationDelay: '1.5s', animationDuration: '10s', opacity: 0.55 }}>✨</div>
            <div {...commonProps} style={{ top: '62%', left: '18%', animationDelay: '3.5s', animationDuration: '12s', opacity: 0.6 }}>💪</div>
            <div {...commonProps} style={{ top: '68%', right: '6%', animationDelay: '0.5s', animationDuration: '9s', opacity: 0.55 }}>🏃</div>
            <div {...commonProps} style={{ top: '72%', left: '8%', animationDelay: '2.5s', animationDuration: '11s', opacity: 0.6 }}>🧘</div>
            <div {...commonProps} style={{ top: '78%', right: '14%', animationDelay: '1s', animationDuration: '10s', opacity: 0.5 }}>🍎</div>
            <div {...commonProps} style={{ top: '82%', left: '12%', animationDelay: '3s', animationDuration: '12s', opacity: 0.55 }}>💧</div>
            <div {...commonProps} style={{ top: '88%', right: '10%', animationDelay: '1.5s', animationDuration: '10s', opacity: 0.6 }}>😴</div>
            <div {...commonProps} style={{ top: '92%', left: '15%', animationDelay: '0s', animationDuration: '9s', opacity: 0.55 }}>❤️</div>
            <div {...commonProps} style={{ top: '5%', left: '85%', animationDelay: '2s', animationDuration: '10s', opacity: 0.6 }}>⚡</div>
            <div {...commonProps} style={{ top: '15%', left: '88%', animationDelay: '0.5s', animationDuration: '11s', opacity: 0.55 }}>🔥</div>
            <div {...commonProps} style={{ top: '25%', left: '92%', animationDelay: '3s', animationDuration: '9s', opacity: 0.5 }}>🎯</div>
            <div {...commonProps} style={{ top: '35%', left: '86%', animationDelay: '1s', animationDuration: '12s', opacity: 0.6 }}>🏆</div>
            <div {...commonProps} style={{ top: '45%', left: '90%', animationDelay: '2.5s', animationDuration: '10s', opacity: 0.55 }}>✨</div>
            <div {...commonProps} style={{ top: '55%', left: '88%', animationDelay: '0s', animationDuration: '11s', opacity: 0.6 }}>💪</div>
            <div {...commonProps} style={{ top: '65%', left: '84%', animationDelay: '3.5s', animationDuration: '12s', opacity: 0.5 }}>🏃</div>
            <div {...commonProps} style={{ top: '75%', left: '90%', animationDelay: '1.5s', animationDuration: '10s', opacity: 0.55 }}>🧘</div>
            <div {...commonProps} style={{ top: '85%', left: '87%', animationDelay: '2s', animationDuration: '9s', opacity: 0.6 }}>🍎</div>
            <div {...commonProps} style={{ top: '10%', left: '50%', animationDelay: '1s', animationDuration: '8s', opacity: 0.7 }}>✨</div>
            <div {...commonProps} style={{ top: '30%', left: '45%', animationDelay: '2.5s', animationDuration: '9s', opacity: 0.65 }}>✨</div>
            <div {...commonProps} style={{ top: '50%', left: '55%', animationDelay: '0.5s', animationDuration: '10s', opacity: 0.7 }}>✨</div>
            <div {...commonProps} style={{ top: '70%', left: '48%', animationDelay: '3s', animationDuration: '8s', opacity: 0.65 }}>✨</div>
            <div {...commonProps} style={{ top: '90%', left: '52%', animationDelay: '1.5s', animationDuration: '9s', opacity: 0.7 }}>✨</div>
          </>
        );

      case 'Relationships':
        return (
          <>
            <div {...commonProps} style={{ top: '3%', left: '8%', animationDelay: '0s', animationDuration: '9s', opacity: 0.6 }}>💕</div>
            <div {...commonProps} style={{ top: '8%', right: '5%', animationDelay: '2s', animationDuration: '11s', opacity: 0.55 }}>💖</div>
            <div {...commonProps} style={{ top: '12%', left: '15%', animationDelay: '1s', animationDuration: '10s', opacity: 0.5 }}>❤️</div>
            <div {...commonProps} style={{ top: '18%', right: '10%', animationDelay: '3s', animationDuration: '12s', opacity: 0.6 }}>💝</div>
            <div {...commonProps} style={{ top: '22%', left: '3%', animationDelay: '1.5s', animationDuration: '10s', opacity: 0.55 }}>💗</div>
            <div {...commonProps} style={{ top: '28%', right: '18%', animationDelay: '2.5s', animationDuration: '11s', opacity: 0.5 }}>🫂</div>
            <div {...commonProps} style={{ top: '32%', left: '12%', animationDelay: '0.5s', animationDuration: '9s', opacity: 0.6 }}>👫</div>
            <div {...commonProps} style={{ top: '38%', right: '8%', animationDelay: '1s', animationDuration: '10s', opacity: 0.55 }}>👨‍👩‍👧‍👦</div>
            <div {...commonProps} style={{ top: '42%', left: '6%', animationDelay: '3s', animationDuration: '12s', opacity: 0.5 }}>💑</div>
            <div {...commonProps} style={{ top: '48%', right: '15%', animationDelay: '0s', animationDuration: '9s', opacity: 0.6 }}>🤗</div>
            <div {...commonProps} style={{ top: '52%', left: '10%', animationDelay: '2s', animationDuration: '11s', opacity: 0.5 }}>💞</div>
            <div {...commonProps} style={{ top: '58%', right: '12%', animationDelay: '1.5s', animationDuration: '10s', opacity: 0.55 }}>🌟</div>
            <div {...commonProps} style={{ top: '62%', left: '18%', animationDelay: '3.5s', animationDuration: '12s', opacity: 0.6 }}>💕</div>
            <div {...commonProps} style={{ top: '68%', right: '6%', animationDelay: '0.5s', animationDuration: '9s', opacity: 0.55 }}>💖</div>
            <div {...commonProps} style={{ top: '72%', left: '8%', animationDelay: '2.5s', animationDuration: '11s', opacity: 0.6 }}>❤️</div>
            <div {...commonProps} style={{ top: '78%', right: '14%', animationDelay: '1s', animationDuration: '10s', opacity: 0.5 }}>💝</div>
            <div {...commonProps} style={{ top: '82%', left: '12%', animationDelay: '3s', animationDuration: '12s', opacity: 0.55 }}>💗</div>
            <div {...commonProps} style={{ top: '88%', right: '10%', animationDelay: '1.5s', animationDuration: '10s', opacity: 0.6 }}>🫂</div>
            <div {...commonProps} style={{ top: '92%', left: '15%', animationDelay: '0s', animationDuration: '9s', opacity: 0.55 }}>👫</div>
            <div {...commonProps} style={{ top: '5%', left: '85%', animationDelay: '2s', animationDuration: '10s', opacity: 0.6 }}>👨‍👩‍👧‍👦</div>
            <div {...commonProps} style={{ top: '15%', left: '88%', animationDelay: '0.5s', animationDuration: '11s', opacity: 0.55 }}>💑</div>
            <div {...commonProps} style={{ top: '25%', left: '92%', animationDelay: '3s', animationDuration: '9s', opacity: 0.5 }}>🤗</div>
            <div {...commonProps} style={{ top: '35%', left: '86%', animationDelay: '1s', animationDuration: '12s', opacity: 0.6 }}>💞</div>
            <div {...commonProps} style={{ top: '45%', left: '90%', animationDelay: '2.5s', animationDuration: '10s', opacity: 0.55 }}>🌟</div>
            <div {...commonProps} style={{ top: '55%', left: '88%', animationDelay: '0s', animationDuration: '11s', opacity: 0.6 }}>💕</div>
            <div {...commonProps} style={{ top: '65%', left: '84%', animationDelay: '3.5s', animationDuration: '12s', opacity: 0.5 }}>💖</div>
            <div {...commonProps} style={{ top: '75%', left: '90%', animationDelay: '1.5s', animationDuration: '10s', opacity: 0.55 }}>❤️</div>
            <div {...commonProps} style={{ top: '85%', left: '87%', animationDelay: '2s', animationDuration: '9s', opacity: 0.6 }}>💝</div>
            <div {...commonProps} style={{ top: '10%', left: '50%', animationDelay: '1s', animationDuration: '8s', opacity: 0.7 }}>✨</div>
            <div {...commonProps} style={{ top: '30%', left: '45%', animationDelay: '2.5s', animationDuration: '9s', opacity: 0.65 }}>✨</div>
            <div {...commonProps} style={{ top: '50%', left: '55%', animationDelay: '0.5s', animationDuration: '10s', opacity: 0.7 }}>✨</div>
            <div {...commonProps} style={{ top: '70%', left: '48%', animationDelay: '3s', animationDuration: '8s', opacity: 0.65 }}>✨</div>
            <div {...commonProps} style={{ top: '90%', left: '52%', animationDelay: '1.5s', animationDuration: '9s', opacity: 0.7 }}>✨</div>
          </>
        );

      case 'Career':
        return (
          <>
            <div {...commonProps} style={{ top: '3%', left: '8%', animationDelay: '0s', animationDuration: '9s', opacity: 0.6 }}>💼</div>
            <div {...commonProps} style={{ top: '8%', right: '5%', animationDelay: '2s', animationDuration: '11s', opacity: 0.55 }}>📈</div>
            <div {...commonProps} style={{ top: '12%', left: '15%', animationDelay: '1s', animationDuration: '10s', opacity: 0.5 }}>🎯</div>
            <div {...commonProps} style={{ top: '18%', right: '10%', animationDelay: '3s', animationDuration: '12s', opacity: 0.6 }}>🏆</div>
            <div {...commonProps} style={{ top: '22%', left: '3%', animationDelay: '1.5s', animationDuration: '10s', opacity: 0.55 }}>⭐</div>
            <div {...commonProps} style={{ top: '28%', right: '18%', animationDelay: '2.5s', animationDuration: '11s', opacity: 0.5 }}>💡</div>
            <div {...commonProps} style={{ top: '32%', left: '12%', animationDelay: '0.5s', animationDuration: '9s', opacity: 0.6 }}>📊</div>
            <div {...commonProps} style={{ top: '38%', right: '8%', animationDelay: '1s', animationDuration: '10s', opacity: 0.55 }}>🚀</div>
            <div {...commonProps} style={{ top: '42%', left: '6%', animationDelay: '3s', animationDuration: '12s', opacity: 0.5 }}>📝</div>
            <div {...commonProps} style={{ top: '48%', right: '15%', animationDelay: '0s', animationDuration: '9s', opacity: 0.6 }}>💻</div>
            <div {...commonProps} style={{ top: '52%', left: '10%', animationDelay: '2s', animationDuration: '11s', opacity: 0.5 }}>👔</div>
            <div {...commonProps} style={{ top: '58%', right: '12%', animationDelay: '1.5s', animationDuration: '10s', opacity: 0.55 }}>📱</div>
            <div {...commonProps} style={{ top: '62%', left: '18%', animationDelay: '3.5s', animationDuration: '12s', opacity: 0.6 }}>💼</div>
            <div {...commonProps} style={{ top: '68%', right: '6%', animationDelay: '0.5s', animationDuration: '9s', opacity: 0.55 }}>📈</div>
            <div {...commonProps} style={{ top: '72%', left: '8%', animationDelay: '2.5s', animationDuration: '11s', opacity: 0.6 }}>🎯</div>
            <div {...commonProps} style={{ top: '78%', right: '14%', animationDelay: '1s', animationDuration: '10s', opacity: 0.5 }}>🏆</div>
            <div {...commonProps} style={{ top: '82%', left: '12%', animationDelay: '3s', animationDuration: '12s', opacity: 0.55 }}>⭐</div>
            <div {...commonProps} style={{ top: '88%', right: '10%', animationDelay: '1.5s', animationDuration: '10s', opacity: 0.6 }}>💡</div>
            <div {...commonProps} style={{ top: '92%', left: '15%', animationDelay: '0s', animationDuration: '9s', opacity: 0.55 }}>📊</div>
            <div {...commonProps} style={{ top: '5%', left: '85%', animationDelay: '2s', animationDuration: '10s', opacity: 0.6 }}>🚀</div>
            <div {...commonProps} style={{ top: '15%', left: '88%', animationDelay: '0.5s', animationDuration: '11s', opacity: 0.55 }}>📝</div>
            <div {...commonProps} style={{ top: '25%', left: '92%', animationDelay: '3s', animationDuration: '9s', opacity: 0.5 }}>💻</div>
            <div {...commonProps} style={{ top: '35%', left: '86%', animationDelay: '1s', animationDuration: '12s', opacity: 0.6 }}>👔</div>
            <div {...commonProps} style={{ top: '45%', left: '90%', animationDelay: '2.5s', animationDuration: '10s', opacity: 0.55 }}>📱</div>
            <div {...commonProps} style={{ top: '55%', left: '88%', animationDelay: '0s', animationDuration: '11s', opacity: 0.6 }}>💼</div>
            <div {...commonProps} style={{ top: '65%', left: '84%', animationDelay: '3.5s', animationDuration: '12s', opacity: 0.5 }}>📈</div>
            <div {...commonProps} style={{ top: '75%', left: '90%', animationDelay: '1.5s', animationDuration: '10s', opacity: 0.55 }}>🎯</div>
            <div {...commonProps} style={{ top: '85%', left: '87%', animationDelay: '2s', animationDuration: '9s', opacity: 0.6 }}>🏆</div>
            <div {...commonProps} style={{ top: '10%', left: '50%', animationDelay: '1s', animationDuration: '8s', opacity: 0.7 }}>✨</div>
            <div {...commonProps} style={{ top: '30%', left: '45%', animationDelay: '2.5s', animationDuration: '9s', opacity: 0.65 }}>✨</div>
            <div {...commonProps} style={{ top: '50%', left: '55%', animationDelay: '0.5s', animationDuration: '10s', opacity: 0.7 }}>✨</div>
            <div {...commonProps} style={{ top: '70%', left: '48%', animationDelay: '3s', animationDuration: '8s', opacity: 0.65 }}>✨</div>
            <div {...commonProps} style={{ top: '90%', left: '52%', animationDelay: '1.5s', animationDuration: '9s', opacity: 0.7 }}>✨</div>
          </>
        );

      case 'Money':
        return (
          <>
            <div {...commonProps} style={{ top: '3%', left: '8%', animationDelay: '0s', animationDuration: '9s', opacity: 0.6 }}>💵</div>
            <div {...commonProps} style={{ top: '8%', right: '5%', animationDelay: '2s', animationDuration: '11s', opacity: 0.55 }}>💰</div>
            <div {...commonProps} style={{ top: '12%', left: '15%', animationDelay: '1s', animationDuration: '10s', opacity: 0.5 }}>🪙</div>
            <div {...commonProps} style={{ top: '18%', right: '10%', animationDelay: '3s', animationDuration: '12s', opacity: 0.6 }}>💎</div>
            <div {...commonProps} style={{ top: '22%', left: '3%', animationDelay: '1.5s', animationDuration: '10s', opacity: 0.55 }}>💠</div>
            <div {...commonProps} style={{ top: '28%', right: '18%', animationDelay: '2.5s', animationDuration: '11s', opacity: 0.5 }}>🔷</div>
            <div {...commonProps} style={{ top: '32%', left: '12%', animationDelay: '0.5s', animationDuration: '9s', opacity: 0.6 }}>💎</div>
            <div {...commonProps} style={{ top: '38%', right: '8%', animationDelay: '1s', animationDuration: '10s', opacity: 0.55 }}>🪙</div>
            <div {...commonProps} style={{ top: '42%', left: '6%', animationDelay: '3s', animationDuration: '12s', opacity: 0.5 }}>💰</div>
            <div {...commonProps} style={{ top: '48%', right: '15%', animationDelay: '0s', animationDuration: '9s', opacity: 0.6 }}>💵</div>
            <div {...commonProps} style={{ top: '52%', left: '10%', animationDelay: '2s', animationDuration: '11s', opacity: 0.5 }}>👑</div>
            <div {...commonProps} style={{ top: '58%', right: '12%', animationDelay: '1.5s', animationDuration: '10s', opacity: 0.55 }}>🏆</div>
            <div {...commonProps} style={{ top: '62%', left: '18%', animationDelay: '3.5s', animationDuration: '12s', opacity: 0.6 }}>💎</div>
            <div {...commonProps} style={{ top: '68%', right: '6%', animationDelay: '0.5s', animationDuration: '9s', opacity: 0.55 }}>✨</div>
            <div {...commonProps} style={{ top: '72%', left: '8%', animationDelay: '2.5s', animationDuration: '11s', opacity: 0.6 }}>💠</div>
            <div {...commonProps} style={{ top: '78%', right: '14%', animationDelay: '1s', animationDuration: '10s', opacity: 0.5 }}>🪙</div>
            <div {...commonProps} style={{ top: '82%', left: '12%', animationDelay: '3s', animationDuration: '12s', opacity: 0.55 }}>💎</div>
            <div {...commonProps} style={{ top: '88%', right: '10%', animationDelay: '1.5s', animationDuration: '10s', opacity: 0.6 }}>💰</div>
            <div {...commonProps} style={{ top: '92%', left: '15%', animationDelay: '0s', animationDuration: '9s', opacity: 0.55 }}>🪙</div>
            <div {...commonProps} style={{ top: '5%', left: '85%', animationDelay: '2s', animationDuration: '10s', opacity: 0.6 }}>💵</div>
            <div {...commonProps} style={{ top: '15%', left: '88%', animationDelay: '0.5s', animationDuration: '11s', opacity: 0.55 }}>💎</div>
            <div {...commonProps} style={{ top: '25%', left: '92%', animationDelay: '3s', animationDuration: '9s', opacity: 0.5 }}>✨</div>
            <div {...commonProps} style={{ top: '35%', left: '86%', animationDelay: '1s', animationDuration: '12s', opacity: 0.6 }}>🪙</div>
            <div {...commonProps} style={{ top: '45%', left: '90%', animationDelay: '2.5s', animationDuration: '10s', opacity: 0.55 }}>💠</div>
            <div {...commonProps} style={{ top: '55%', left: '88%', animationDelay: '0s', animationDuration: '11s', opacity: 0.6 }}>💰</div>
            <div {...commonProps} style={{ top: '65%', left: '84%', animationDelay: '3.5s', animationDuration: '12s', opacity: 0.5 }}>👑</div>
            <div {...commonProps} style={{ top: '75%', left: '90%', animationDelay: '1.5s', animationDuration: '10s', opacity: 0.55 }}>💎</div>
            <div {...commonProps} style={{ top: '85%', left: '87%', animationDelay: '2s', animationDuration: '9s', opacity: 0.6 }}>🪙</div>
            <div {...commonProps} style={{ top: '10%', left: '50%', animationDelay: '1s', animationDuration: '8s', opacity: 0.7 }}>✨</div>
            <div {...commonProps} style={{ top: '30%', left: '45%', animationDelay: '2.5s', animationDuration: '9s', opacity: 0.65 }}>✨</div>
            <div {...commonProps} style={{ top: '50%', left: '55%', animationDelay: '0.5s', animationDuration: '10s', opacity: 0.7 }}>✨</div>
            <div {...commonProps} style={{ top: '70%', left: '48%', animationDelay: '3s', animationDuration: '8s', opacity: 0.65 }}>✨</div>
            <div {...commonProps} style={{ top: '90%', left: '52%', animationDelay: '1.5s', animationDuration: '9s', opacity: 0.7 }}>✨</div>
          </>
        );

      default:
        return null;
    }
  };

  // Calculate avatar position along the curvy path
  const getCurrentLevelIndex = () => {
    // Find the first 'current' or 'locked' level (avatar should be at current progress point)
    const currentIndex = levels.findIndex(l => l.status === 'current');
    if (currentIndex !== -1) return currentIndex;
    
    // If no current level, place at last completed level
    const lastCompleted = levels.filter(l => l.status === 'completed').length;
    return Math.min(lastCompleted, levels.length - 1);
  };

  const avatarLevelIndex = getCurrentLevelIndex();
  const avatarPosition = getCurvyPosition(avatarLevelIndex);

  // UNIFIED PREMIUM DESIGN FOR ALL AREAS
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-indigo-100 dark:from-gray-900 dark:via-purple-950 dark:to-pink-950">
      {/* Compact Header */}
      <div className="relative overflow-hidden border-b border-pink-200 dark:border-pink-800/30">
        <div className="relative z-10 text-center py-4 px-4">
          <h1 className="text-3xl font-black bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            {area.name} Mastery
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

      {/* Skills Path with Themed Background */}
      <div className="px-4 pb-12">
        <div 
          className="relative rounded-3xl shadow-2xl overflow-hidden bg-gradient-to-br from-pink-100 via-purple-100 to-indigo-100 dark:from-gray-900 dark:via-purple-950 dark:to-pink-950"
          style={{
            minHeight: `${levels.length * 120 + 200}px`,
          }}
        >
          {/* Themed Background Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none text-4xl">
            {getBackgroundElements()}
          </div>

          {/* Curvy path container */}
          <div className="relative py-16 px-8">
            <div className="relative max-w-2xl mx-auto">
              <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }}>
                <defs>
                  {levels.map((level, index) => {
                    if (index === levels.length - 1) return null;
                    
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
                      fill="none"
                      stroke={`url(#gradient-${level.id})`}
                      strokeWidth="6"
                      strokeLinecap="round"
                    />
                  );
                })}
              </svg>

              {/* Level nodes */}
              <div className="relative" style={{ zIndex: 10 }}>
                {levels.map((level, index) => {
                  const position = getCurvyPosition(index);
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
                          
                          {/* Main node */}
                          <div className={`relative w-16 h-16 rounded-full flex items-center justify-center transform transition-all duration-300 ${
                            level.status === 'current'
                              ? 'bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-600 shadow-xl scale-110 animate-pulse'
                              : level.status === 'completed'
                              ? 'bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-700 shadow-lg'
                              : 'bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500 opacity-40'
                          }`}>
                            {/* Icon */}
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

                {/* Animated Avatar Traveling Along the Path */}
                <div 
                  className="absolute transition-all duration-1000 ease-out pointer-events-none"
                  style={{
                    transform: `translateX(${avatarPosition.x}px) translateY(${avatarPosition.y}px)`,
                    zIndex: 50,
                    left: '50%',
                    marginLeft: '-40px', // Center the 80px avatar
                    top: '0',
                  }}
                >
                  {/* Affirmation Pop-up Above Avatar */}
                  {currentAffirmation && (
                    <div 
                      className="affirmation-popup absolute -top-20 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap"
                      data-testid="affirmation-popup"
                    >
                      <Card className="px-4 py-2 bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-500 border-2 border-white shadow-2xl">
                        <p className="text-sm font-bold text-white drop-shadow-lg flex items-center gap-2">
                          <Sparkles className="w-4 h-4 animate-pulse" />
                          {currentAffirmation}
                          <Sparkles className="w-4 h-4 animate-pulse" />
                        </p>
                      </Card>
                    </div>
                  )}
                  
                  {/* Avatar Background Glow */}
                  <div className={`absolute inset-0 bg-gradient-to-r ${avatar.bg} opacity-30 blur-2xl rounded-full animate-pulse`} />
                  
                  {/* Animated Avatar */}
                  <div 
                    className={`relative w-20 h-20 mx-auto rounded-full bg-gradient-to-br ${avatar.bg} flex items-center justify-center shadow-2xl border-4 border-white dark:border-gray-800 ${
                      isDancing ? 'animate-dance' : isWalking ? 'animate-walk' : 'animate-bounce-continuous'
                    }`}
                    data-testid="animated-avatar"
                  >
                    <div className="text-5xl">{avatar.icon}</div>
                  </div>

                  {/* Progress indicator below avatar */}
                  {!isDancing && completedLevels > 0 && (
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1 bg-white/90 dark:bg-gray-800/90 backdrop-blur px-2 py-1 rounded-full shadow-lg border border-pink-200 dark:border-pink-800/30">
                        <Trophy className="w-3 h-3 text-yellow-600" />
                        <span className="text-[10px] font-bold text-gray-700 dark:text-gray-200">
                          {completedLevels} Complete
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
