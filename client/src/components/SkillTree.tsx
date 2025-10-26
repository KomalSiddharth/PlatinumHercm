import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Check, Lock, Play, Crown, Sparkles, TrendingUp, Coins, DollarSign, Zap, Trophy, Heart, Users, Briefcase, Target, Star } from 'lucide-react';
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
  videoUrl?: string;
  exerciseDetails?: {
    task: string;
    count?: number;
    unit?: string;
    tasks?: string[]; // Multiple sub-tasks for complex exercises
  };
}

export default function SkillTree({ area, onStartLesson }: SkillTreeProps) {
  // State to manage level statuses dynamically
  const [levelStatuses, setLevelStatuses] = useState<Record<number, 'locked' | 'current' | 'completed'>>({});

  // 216 Health Mastery Levels (36 video lessons + 180 exercise challenges)
  // Pattern: 1 video lesson → 5 exercise challenges (repeat)
  const healthLevels: LevelNode[] = [
    // Levels 1-6: Lesson 1 + 5 Exercises
    { id: 1, name: 'Lesson 1: 3rd April Part 1', type: 'video', status: 'current', xp: 0, affirmation: 'I am ready for transformation!', videoUrl: 'https://coaching.miteshkhatri.com/products/health-mastery-happy-gym/categories/2150122912/posts/2157032446' },
    { 
      id: 2, 
      name: 'Baseline Setup', 
      type: 'exercise', 
      status: 'locked', 
      xp: 0, 
      affirmation: 'I document my starting point', 
      exerciseDetails: { 
        task: 'Complete baseline setup',
        tasks: [
          'Take baseline photos (front, side, back)',
          'Weigh yourself and take measurements',
          'Set your "why" - write down 3 reasons you\'re starting',
          'Action: Drink 6 glasses of water today'
        ]
      } 
    },
    { 
      id: 3, 
      name: 'Assessment Day', 
      type: 'exercise', 
      status: 'locked', 
      xp: 0, 
      affirmation: 'I assess my current fitness', 
      exerciseDetails: { 
        task: 'Complete fitness assessment',
        tasks: [
          'Morning: Rate your current health 1-10 in all areas',
          'Test: How many push-ups can you do? (Any variation)',
          'Test: How long can you hold a plank?',
          'Test: Walk/jog for 10 minutes - note how you feel',
          'Action: Walk 3,000 steps + drink 6 glasses water'
        ]
      } 
    },
    { id: 4, name: 'Body Appreciation', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I love my body', exerciseDetails: { task: 'Mirror appreciation practice' } },
    { id: 5, name: 'Health Vision Board', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I visualize my health', exerciseDetails: { task: 'Create vision board' } },
    { id: 6, name: 'Health Declaration', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I declare perfect health', exerciseDetails: { task: 'Write health declaration' } },
    
    // Levels 7-12: Lesson 2 + 5 Exercises
    { id: 7, name: 'Lesson 2: 3rd April Part 2', type: 'video', status: 'locked', xp: 0, affirmation: 'Health is my natural state!', videoUrl: 'https://coaching.miteshkhatri.com/products/health-mastery-happy-gym/categories/2150204707/posts/2157330556' },
    { id: 8, name: 'Define Health Goals', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I set clear goals', exerciseDetails: { task: 'Write 10 health goals' } },
    { id: 9, name: 'Visualize Perfect Health', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I see my healthy self', exerciseDetails: { task: 'Visualization practice', count: 10, unit: 'minutes' } },
    { id: 10, name: 'Health Affirmations', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I speak health into being', exerciseDetails: { task: 'Repeat affirmations', count: 21, unit: 'times' } },
    { id: 11, name: 'Energy Level Check', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I monitor my energy', exerciseDetails: { task: 'Track energy levels hourly' } },
    { id: 12, name: 'Health Journal Start', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I document my journey', exerciseDetails: { task: 'Start health journal' } },
    
    // Levels 13-18: Lesson 3 + 5 Exercises
    { id: 13, name: 'Lesson 3: 18th April Session', type: 'video', status: 'locked', xp: 0, affirmation: 'I commit to my health!', videoUrl: 'https://coaching.miteshkhatri.com/products/health-mastery-happy-gym/categories/2150248651/posts/2157496270' },
    { id: 14, name: 'Walk 3 Kilometers', type: 'exercise', status: 'locked', xp: 0, affirmation: 'Every step heals me', exerciseDetails: { task: 'Walk daily', count: 3, unit: 'km' } },
    { id: 15, name: 'Track Daily Habits', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I am consistent', exerciseDetails: { task: 'Track 3 health habits', count: 7, unit: 'days' } },
    { id: 16, name: 'Commitment Declaration', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I commit fully', exerciseDetails: { task: 'Write health commitment letter' } },
    { id: 17, name: 'Daily Movement Ritual', type: 'exercise', status: 'locked', xp: 0, affirmation: 'Movement is medicine', exerciseDetails: { task: 'Move every hour', count: 5, unit: 'minutes' } },
    { id: 18, name: 'Progress Photo', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I celebrate progress', exerciseDetails: { task: 'Take baseline photo' } },
    
    // Levels 19-24: Lesson 4 + 5 Exercises
    { id: 19, name: 'Lesson 4: 24th April Session', type: 'video', status: 'locked', xp: 0, affirmation: 'I am consistent!', videoUrl: 'https://coaching.miteshkhatri.com/products/health-mastery-happy-gym/categories/2150248651/posts/2157496270' },
    { id: 20, name: 'Morning Routine Challenge', type: 'exercise', status: 'locked', xp: 0, affirmation: 'My morning sets the tone', exerciseDetails: { task: 'Create energizing morning routine' } },
    { id: 21, name: 'Evening Reflection', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I review my progress', exerciseDetails: { task: 'Evening health reflection', count: 10, unit: 'minutes' } },
    { id: 22, name: 'Sleep 8 Hours Challenge', type: 'exercise', status: 'locked', xp: 0, affirmation: 'Sleep restores me', exerciseDetails: { task: 'Get quality sleep', count: 8, unit: 'hours' } },
    { id: 23, name: 'Consistency Tracker', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I show up daily', exerciseDetails: { task: 'Track daily consistency', count: 21, unit: 'days' } },
    { id: 24, name: 'Accountability Setup', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I find support', exerciseDetails: { task: 'Find accountability partner' } },
    
    // Levels 25-30: Lesson 5 + 5 Exercises
    { id: 25, name: 'Lesson 5: What is Health', type: 'video', status: 'locked', xp: 0, affirmation: 'I understand true health!', videoUrl: 'https://coaching.miteshkhatri.com/products/health-mastery-happy-gym/categories/3437855/posts/11723270' },
    { id: 26, name: 'Define Perfect Health', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I know what health means', exerciseDetails: { task: 'Write your health definition' } },
    { id: 27, name: 'Health Philosophy', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I create my philosophy', exerciseDetails: { task: 'Write health philosophy' } },
    { id: 28, name: 'Health Standards List', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I set my standards', exerciseDetails: { task: 'Write 10 health standards' } },
    { id: 29, name: 'Health Role Models', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I find inspiration', exerciseDetails: { task: 'List 3 health role models' } },
    { id: 30, name: 'Health Blueprint', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I design my blueprint', exerciseDetails: { task: 'Create health blueprint' } }
    
    // TODO: Continue with remaining 26 lessons (Lessons 6-36) following same pattern (1 video + 5 exercises)
    // Target: 216 total levels (36 lessons × 6 levels each)
  ];

  // 52 Relationship Mastery Levels (13 video lessons + 39 exercise challenges)
  const relationshipLevels: LevelNode[] = [
    // Level 1: Lesson 1
    { id: 1, name: 'Lesson 1: The Source - Your Parents', type: 'video', status: 'current', xp: 0, affirmation: 'I honor my relationship roots!', videoUrl: 'https://www.miteshkhatri.com/Source' },
    // Levels 2-4: Exercises
    { id: 2, name: 'Gratitude for Parents', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I appreciate my roots', exerciseDetails: { task: 'Write gratitude letter to parents' } },
    { id: 3, name: 'Reflect on Childhood', type: 'exercise', status: 'locked', xp: 0, affirmation: 'My past shapes my love', exerciseDetails: { task: 'Journal childhood memories', count: 30, unit: 'minutes' } },
    { id: 4, name: 'Forgive Parents', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I release old patterns', exerciseDetails: { task: 'Practice ho\'oponopono for parents' } },
    
    // Level 5: Lesson 2
    { id: 5, name: 'Lesson 2: Self-Love with Reflection', type: 'video', status: 'locked', xp: 0, affirmation: 'I love and accept myself completely!', videoUrl: 'https://www.miteshkhatri.com/Reflection' },
    // Levels 6-8: Exercises
    { id: 6, name: 'Mirror Affirmations', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I am worthy of love', exerciseDetails: { task: 'Say affirmations in mirror', count: 21, unit: 'days' } },
    { id: 7, name: 'Self-Care Ritual', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I prioritize myself', exerciseDetails: { task: 'Create self-care routine', count: 1, unit: 'hour' } },
    { id: 8, name: 'Celebrate Yourself', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I am amazing', exerciseDetails: { task: 'List 10 things you love about yourself' } },
    
    // Level 9: Lesson 3
    { id: 9, name: 'Lesson 3: Men Vs Women Differences', type: 'video', status: 'locked', xp: 0, affirmation: 'I understand and celebrate differences!', videoUrl: 'https://www.miteshkhatri.com/MenWomen' },
    // Levels 10-12: Exercises
    { id: 10, name: 'Observe Gender Patterns', type: 'exercise', status: 'locked', xp: 0, affirmation: 'Understanding creates harmony', exerciseDetails: { task: 'Notice communication differences', count: 3, unit: 'conversations' } },
    { id: 11, name: 'Appreciate Partner', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I value our differences', exerciseDetails: { task: 'Compliment partner genuinely', count: 3, unit: 'times' } },
    { id: 12, name: 'Gender Appreciation', type: 'exercise', status: 'locked', xp: 0, affirmation: 'Differences make us stronger', exerciseDetails: { task: 'Journal what you appreciate about opposite gender' } },
    
    // Level 13: Lesson 4
    { id: 13, name: 'Lesson 4: Ritual of Relating', type: 'video', status: 'locked', xp: 0, affirmation: 'I create loving rituals daily!', videoUrl: 'https://www.miteshkhatri.com/Rituals' },
    // Levels 14-16: Exercises
    { id: 14, name: 'Morning Connection', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I start the day with love', exerciseDetails: { task: 'Morning hug and greeting', count: 7, unit: 'days' } },
    { id: 15, name: 'Evening Check-in', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I end the day connected', exerciseDetails: { task: 'Share daily highlights together' } },
    { id: 16, name: 'Weekly Date Night', type: 'exercise', status: 'locked', xp: 0, affirmation: 'Romance keeps love alive', exerciseDetails: { task: 'Plan weekly quality time' } },
    
    // Level 17: Lesson 5
    { id: 17, name: 'Lesson 5: FIRO-B Understanding', type: 'video', status: 'locked', xp: 0, affirmation: 'I understand my partner\'s needs!', videoUrl: 'https://www.miteshkhatri.com/FiroB' },
    // Levels 18-20: Exercises
    { id: 18, name: 'Discover Your FIRO-B', type: 'exercise', status: 'locked', xp: 0, affirmation: 'Self-awareness improves relationships', exerciseDetails: { task: 'Take FIRO-B assessment' } },
    { id: 19, name: 'Partner\'s Needs Analysis', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I understand deeply', exerciseDetails: { task: 'Identify partner\'s FIRO-B needs' } },
    { id: 20, name: 'Meet Their Needs', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I fulfill what they need', exerciseDetails: { task: 'Act on partner\'s needs', count: 3, unit: 'ways' } },
    
    // Level 21: Lesson 6
    { id: 21, name: 'Lesson 6: Fulfilling Each Other\'s Needs', type: 'video', status: 'locked', xp: 0, affirmation: 'We fulfill each other completely!', videoUrl: 'https://www.miteshkhatri.com/RNeeds' },
    // Levels 22-24: Exercises
    { id: 22, name: 'Love Language Practice', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I speak their love language', exerciseDetails: { task: 'Express love in their language', count: 5, unit: 'times' } },
    { id: 23, name: 'Need Communication', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I express my needs clearly', exerciseDetails: { task: 'Share your needs openly' } },
    { id: 24, name: 'Quality Time Together', type: 'exercise', status: 'locked', xp: 0, affirmation: 'Presence is my gift', exerciseDetails: { task: 'Undistracted quality time', count: 2, unit: 'hours' } },
    
    // Level 25: Lesson 7
    { id: 25, name: 'Lesson 7: Balance Perspective', type: 'video', status: 'locked', xp: 0, affirmation: 'I see all perspectives with love!', videoUrl: 'https://www.miteshkhatri.com/Balance' },
    // Levels 26-28: Exercises
    { id: 26, name: 'Demartini Method', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I balance my perceptions', exerciseDetails: { task: 'Practice Demartini on partner', count: 30, unit: 'minutes' } },
    { id: 27, name: 'Find the Blessing', type: 'exercise', status: 'locked', xp: 0, affirmation: 'Everything serves me', exerciseDetails: { task: 'Find blessing in challenge' } },
    { id: 28, name: 'Gratitude for Partner', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I appreciate them fully', exerciseDetails: { task: 'List 50 things you love about partner' } },
    
    // Level 29: Lesson 8
    { id: 29, name: 'Lesson 8: Trust Bank Account', type: 'video', status: 'locked', xp: 0, affirmation: 'I build trust every day!', videoUrl: 'https://www.miteshkhatri.com/TBA' },
    // Levels 30-32: Exercises
    { id: 30, name: 'Keep Promises', type: 'exercise', status: 'locked', xp: 0, affirmation: 'My word is my bond', exerciseDetails: { task: 'Keep all promises today', count: 7, unit: 'days' } },
    { id: 31, name: 'Build Trust Deposits', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I add to trust bank daily', exerciseDetails: { task: 'Make 5 trust deposits', count: 5, unit: 'actions' } },
    { id: 32, name: 'Reliability Practice', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I am dependable', exerciseDetails: { task: 'Be on time for everything' } },
    
    // Level 33: Lesson 9
    { id: 33, name: 'Lesson 9: Rapport Building', type: 'video', status: 'locked', xp: 0, affirmation: 'I connect deeply with everyone!', videoUrl: 'https://www.miteshkhatri.com/Rapport' },
    // Levels 34-36: Exercises
    { id: 34, name: 'Active Listening Practice', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I truly hear others', exerciseDetails: { task: 'Practice active listening', count: 5, unit: 'conversations' } },
    { id: 35, name: 'Mirror & Match', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I create instant connection', exerciseDetails: { task: 'Practice mirroring body language' } },
    { id: 36, name: 'Deep Questions', type: 'exercise', status: 'locked', xp: 0, affirmation: 'Meaningful talks create bonds', exerciseDetails: { task: 'Ask deep questions', count: 10, unit: 'questions' } },
    
    // Level 37: Lesson 10
    { id: 37, name: 'Lesson 10: Let People Go with Love', type: 'video', status: 'locked', xp: 0, affirmation: 'I release with grace and love!', videoUrl: 'https://www.miteshkhatri.com/BreakUp' },
    // Levels 38-40: Exercises
    { id: 38, name: 'Forgiveness Practice', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I release and heal', exerciseDetails: { task: 'Forgive past relationships' } },
    { id: 39, name: 'Ho\'oponopono for Ex', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I send love to all', exerciseDetails: { task: 'Practice ho\'oponopono for ex', count: 21, unit: 'days' } },
    { id: 40, name: 'Closure Ritual', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I am complete', exerciseDetails: { task: 'Create closure ritual' } },
    
    // Level 41: Lesson 11
    { id: 41, name: 'Lesson 11: Manage Conflict Categories', type: 'video', status: 'locked', xp: 0, affirmation: 'I handle conflicts with wisdom!', videoUrl: 'https://www.miteshkhatri.com/Conflicts' },
    // Levels 42-44: Exercises
    { id: 42, name: 'Conflict Resolution', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I resolve peacefully', exerciseDetails: { task: 'Resolve a conflict today' } },
    { id: 43, name: 'Communication Practice', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I communicate clearly', exerciseDetails: { task: 'Use "I" statements in conflict' } },
    { id: 44, name: 'Categorize Relationships', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I manage boundaries wisely', exerciseDetails: { task: 'List and categorize all relationships' } },
    
    // Level 45: Lesson 12
    { id: 45, name: 'Lesson 12: Recover from Fights', type: 'video', status: 'locked', xp: 0, affirmation: 'I repair and reconnect quickly!', videoUrl: 'https://www.miteshkhatri.com/Fights' },
    // Levels 46-48: Exercises
    { id: 46, name: 'Apology Practice', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I admit mistakes easily', exerciseDetails: { task: 'Give sincere apology', count: 3, unit: 'times' } },
    { id: 47, name: 'Repair Ritual', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I heal relationships fast', exerciseDetails: { task: 'Create post-fight ritual' } },
    { id: 48, name: 'Reconnection Time', type: 'exercise', status: 'locked', xp: 0, affirmation: 'Love repairs everything', exerciseDetails: { task: 'Schedule makeup time after fights' } },
    
    // Level 49: Lesson 13
    { id: 49, name: 'Lesson 13: Managing Ego States', type: 'video', status: 'locked', xp: 0, affirmation: 'I master my ego states!', videoUrl: 'https://www.miteshkhatri.com/Ego' },
    // Levels 50-52: Final Challenges
    { id: 50, name: 'Adult State Practice', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I respond from wisdom', exerciseDetails: { task: 'Stay in adult ego state', count: 24, unit: 'hours' } },
    { id: 51, name: 'Ego Awareness', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I notice my states', exerciseDetails: { task: 'Track ego states throughout day' } },
    { id: 52, name: 'Love Master Champion', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I am a relationship master!', exerciseDetails: { task: 'Complete all relationship mastery practices' } }
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

  // 70 Money Mastery Levels - Integrating all 18 Wealth Mastery Lessons
  const moneyLevels: LevelNode[] = [
    // Level 1: Lesson 1
    { id: 1, name: 'Lesson 1: Money Blocks', type: 'video', status: 'current', xp: 0, affirmation: 'I recognize and release money blocks!', videoUrl: 'https://www.miteshkhatri.com/MoneyAssessment' },
    // Levels 2-4: Exercises
    { id: 2, name: 'Track Daily Expenses', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I manage money wisely', exerciseDetails: { task: 'Track all expenses today' } },
    { id: 3, name: 'Money Gratitude List', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I appreciate all money', exerciseDetails: { task: 'Write gratitude for money', count: 5, unit: 'items' } },
    { id: 4, name: 'Save 10% Challenge', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I pay myself first', exerciseDetails: { task: 'Save', count: 10, unit: '% of income' } },
    
    // Level 5: Lesson 2
    { id: 5, name: 'Lesson 2: Money EFT', type: 'video', status: 'locked', xp: 0, affirmation: 'I release negative money frequency!', videoUrl: 'https://www.miteshkhatri.com/MoneyEFT' },
    // Levels 6-8: Exercises
    { id: 6, name: 'Practice EFT Tapping', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I tap into abundance', exerciseDetails: { task: 'EFT tapping session', count: 10, unit: 'minutes' } },
    { id: 7, name: 'Identify Money Fears', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I acknowledge my fears', exerciseDetails: { task: 'List money fears', count: 3, unit: 'fears' } },
    { id: 8, name: 'Cancel Limiting Beliefs', type: 'exercise', status: 'locked', xp: 0, affirmation: 'Cancel-cancel works!', exerciseDetails: { task: 'Practice cancel-cancel on money beliefs' } },
    
    // Level 9: Lesson 3
    { id: 9, name: 'Lesson 3: Millionaire Emotions', type: 'video', status: 'locked', xp: 0, affirmation: 'I feel like a happy millionaire!', videoUrl: 'https://www.miteshkhatri.com/MoneyEmotions' },
    // Levels 10-12: Exercises
    { id: 10, name: 'Embody Wealthy Emotions', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I feel abundant now', exerciseDetails: { task: 'Practice wealthy feelings', count: 10, unit: 'minutes' } },
    { id: 11, name: 'Millionaire Visualization', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I see my wealthy future', exerciseDetails: { task: 'Visualize wealth', count: 15, unit: 'minutes' } },
    { id: 12, name: 'Celebrate Money Wins', type: 'exercise', status: 'locked', xp: 0, affirmation: 'Every win matters', exerciseDetails: { task: 'Acknowledge financial victories' } },
    
    // Level 13: Lesson 4
    { id: 13, name: 'Lesson 4: Millionaire Beliefs', type: 'video', status: 'locked', xp: 0, affirmation: 'I think like a millionaire!', videoUrl: 'https://www.miteshkhatri.com/MoneyBeliefs' },
    // Levels 14-16: Exercises
    { id: 14, name: 'Install New Beliefs', type: 'exercise', status: 'locked', xp: 0, affirmation: 'Beliefs create reality', exerciseDetails: { task: 'Write new money beliefs', count: 5, unit: 'beliefs' } },
    { id: 15, name: 'Money Affirmations', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I am worthy of wealth', exerciseDetails: { task: 'Repeat affirmations', count: 21, unit: 'times' } },
    { id: 16, name: 'Belief Journaling', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I write my new story', exerciseDetails: { task: 'Journal about wealth beliefs' } },
    
    // Level 17: Lesson 5
    { id: 17, name: 'Lesson 5: Millionaire Actions', type: 'video', status: 'locked', xp: 0, affirmation: 'I take millionaire actions!', videoUrl: 'https://www.miteshkhatri.com/MoneyActions' },
    // Levels 18-20: Exercises
    { id: 18, name: 'Create Value Today', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I add massive value', exerciseDetails: { task: 'Deliver 10x value' } },
    { id: 19, name: 'Income Stream Idea', type: 'exercise', status: 'locked', xp: 0, affirmation: 'Opportunities are everywhere', exerciseDetails: { task: 'Brainstorm income ideas', count: 3, unit: 'ideas' } },
    { id: 20, name: 'Skill Learning', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I invest in myself', exerciseDetails: { task: 'Learn money skill', count: 30, unit: 'minutes' } },
    
    // Level 21: Lesson 6
    { id: 21, name: 'Lesson 6: Financial Freedom', type: 'video', status: 'locked', xp: 0, affirmation: 'I attract financial freedom!', videoUrl: 'https://www.miteshkhatri.com/FinancialFreedom' },
    // Levels 22-24: Exercises
    { id: 22, name: 'Freedom Visualization', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I am financially free', exerciseDetails: { task: 'Visualize freedom', count: 15, unit: 'minutes' } },
    { id: 23, name: 'SDE Practice', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I manifest with SDE', exerciseDetails: { task: 'SDE technique', count: 10, unit: 'minutes' } },
    { id: 24, name: 'Freedom Goals', type: 'exercise', status: 'locked', xp: 0, affirmation: 'My goals are clear', exerciseDetails: { task: 'Define financial freedom number' } },
    
    // Level 25: Lesson 7
    { id: 25, name: 'Lesson 7: Multiple Income', type: 'video', status: 'locked', xp: 0, affirmation: 'Money flows from many sources!', videoUrl: 'https://www.miteshkhatri.com/MSI' },
    // Levels 26-28: Exercises
    { id: 26, name: 'Identify Money Skills', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I have valuable skills', exerciseDetails: { task: 'List money skills', count: 5, unit: 'skills' } },
    { id: 27, name: 'Start Second Stream', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I create multiple streams', exerciseDetails: { task: 'Begin new income source' } },
    { id: 28, name: 'Skill Monetization', type: 'exercise', status: 'locked', xp: 0, affirmation: 'My skills create wealth', exerciseDetails: { task: 'Plan to monetize a skill' } },
    
    // Level 29: Lesson 8
    { id: 29, name: 'Lesson 8: Needs & Goals', type: 'video', status: 'locked', xp: 0, affirmation: 'I align needs with goals!', videoUrl: 'https://www.miteshkhatri.com/MoneyNeeds' },
    // Levels 30-32: Exercises
    { id: 30, name: 'Calculate Monthly Needs', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I know my numbers', exerciseDetails: { task: 'Calculate monthly needs' } },
    { id: 31, name: 'Set Financial Goals', type: 'exercise', status: 'locked', xp: 0, affirmation: 'My goals guide me', exerciseDetails: { task: 'Set money goals', count: 3, unit: 'goals' } },
    { id: 32, name: 'Action Plan Creation', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I plan for success', exerciseDetails: { task: 'Create 90-day money plan' } },
    
    // Level 33: Lesson 9
    { id: 33, name: 'Lesson 9: Book Writing', type: 'video', status: 'locked', xp: 0, affirmation: 'I write my first book!', videoUrl: 'https://www.miteshkhatri.com/BookWriting' },
    // Levels 34-36: Exercises
    { id: 34, name: 'Book Idea Brainstorm', type: 'exercise', status: 'locked', xp: 0, affirmation: 'Ideas flow to me', exerciseDetails: { task: 'List book ideas', count: 3, unit: 'ideas' } },
    { id: 35, name: 'Outline Creation', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I structure my knowledge', exerciseDetails: { task: 'Create book outline' } },
    { id: 36, name: 'Write First Chapter', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I am an author', exerciseDetails: { task: 'Write', count: 500, unit: 'words' } },
    
    // Level 37: Lesson 10
    { id: 37, name: 'Lesson 10: Money Frequency', type: 'video', status: 'locked', xp: 0, affirmation: 'I vibrate at wealth frequency!', videoUrl: 'https://www.miteshkhatri.com/WML10' },
    // Levels 38-40: Exercises
    { id: 38, name: 'Frequency Check-In', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I monitor my vibration', exerciseDetails: { task: 'Check emotional frequency', count: 3, unit: 'times daily' } },
    { id: 39, name: 'Raise Frequency Ritual', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I elevate my energy', exerciseDetails: { task: 'Practice frequency raising', count: 15, unit: 'minutes' } },
    { id: 40, name: 'High Vibe Activities', type: 'exercise', status: 'locked', xp: 0, affirmation: 'Joy attracts wealth', exerciseDetails: { task: 'Do high-vibe activity' } },
    
    // Level 41: Lesson 11
    { id: 41, name: 'Lesson 11: PMDSPM System', type: 'video', status: 'locked', xp: 0, affirmation: 'I manage money like a pro!', videoUrl: 'https://www.miteshkhatri.com/PMDSPM' },
    // Levels 42-44: Exercises
    { id: 42, name: 'Set Up Money Jars', type: 'exercise', status: 'locked', xp: 0, affirmation: 'Systems create wealth', exerciseDetails: { task: 'Create PMDSPM system' } },
    { id: 43, name: 'Allocate Income', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I allocate wisely', exerciseDetails: { task: 'Distribute income by percentages' } },
    { id: 44, name: 'Track Allocations', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I monitor my system', exerciseDetails: { task: 'Track weekly allocations' } },
    
    // Level 45: Lesson 12
    { id: 45, name: 'Lesson 12: Coherence Breathing', type: 'video', status: 'locked', xp: 0, affirmation: 'I breathe in abundance!', videoUrl: 'https://www.miteshkhatri.com/CoherenceBreathing' },
    // Levels 46-48: Exercises
    { id: 46, name: 'Morning Coherence', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I start aligned', exerciseDetails: { task: 'Coherence breathing', count: 5, unit: 'minutes' } },
    { id: 47, name: 'Money Meditation', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I meditate on wealth', exerciseDetails: { task: 'Money abundance meditation', count: 10, unit: 'minutes' } },
    { id: 48, name: 'Evening Gratitude', type: 'exercise', status: 'locked', xp: 0, affirmation: 'Gratitude multiplies', exerciseDetails: { task: 'Evening gratitude practice' } },
    
    // Level 49: Lesson 13
    { id: 49, name: 'Lesson 13: Decision Making', type: 'video', status: 'locked', xp: 0, affirmation: 'I make powerful decisions!', videoUrl: 'https://www.miteshkhatri.com/DecisionMaking' },
    // Levels 50-52: Exercises
    { id: 50, name: 'Practice Quick Decisions', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I decide with clarity', exerciseDetails: { task: 'Make decisions quickly', count: 5, unit: 'decisions' } },
    { id: 51, name: 'Trust Your Gut', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I trust my intuition', exerciseDetails: { task: 'Follow intuition on decision' } },
    { id: 52, name: 'Review Past Decisions', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I learn from experience', exerciseDetails: { task: 'Analyze past money decisions' } },
    
    // Level 53: Lesson 14
    { id: 53, name: 'Lesson 14: Sell First Strategy', type: 'video', status: 'locked', xp: 0, affirmation: 'I validate before creating!', videoUrl: 'https://www.miteshkhatri.com/WML14' },
    // Levels 54-56: Exercises
    { id: 54, name: 'Test Product Idea', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I validate fast', exerciseDetails: { task: 'Get pre-orders', count: 1, unit: 'product' } },
    { id: 55, name: 'Fail Fast Practice', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I learn quickly', exerciseDetails: { task: 'Test and pivot idea' } },
    { id: 56, name: 'Create MVP', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I start small', exerciseDetails: { task: 'Launch minimum viable product' } },
    
    // Level 57: Lesson 15
    { id: 57, name: 'Lesson 15: Investment Mastery', type: 'video', status: 'locked', xp: 0, affirmation: 'I invest like a millionaire!', videoUrl: 'https://www.miteshkhatri.com/WML15' },
    // Levels 58-60: Exercises
    { id: 58, name: 'Research Investments', type: 'exercise', status: 'locked', xp: 0, affirmation: 'Knowledge creates wealth', exerciseDetails: { task: 'Study investment options', count: 30, unit: 'minutes' } },
    { id: 59, name: 'Start Small Investment', type: 'exercise', status: 'locked', xp: 0, affirmation: 'My money grows', exerciseDetails: { task: 'Make first investment' } },
    { id: 60, name: 'Automate Investing', type: 'exercise', status: 'locked', xp: 0, affirmation: 'Systems build wealth', exerciseDetails: { task: 'Set up auto-invest' } },
    
    // Level 61: Lesson 16
    { id: 61, name: 'Lesson 16: 5 Millionaire Beliefs', type: 'video', status: 'locked', xp: 0, affirmation: 'I maintain millionaire frequency!', videoUrl: 'https://www.miteshkhatri.com/WML16' },
    // Levels 62-64: Exercises
    { id: 62, name: 'Daily Belief Practice', type: 'exercise', status: 'locked', xp: 0, affirmation: 'Beliefs become reality', exerciseDetails: { task: 'Affirm 5 beliefs', count: 21, unit: 'times' } },
    { id: 63, name: 'Belief Visualization', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I embody wealth', exerciseDetails: { task: 'Visualize as millionaire', count: 10, unit: 'minutes' } },
    { id: 64, name: 'Act As If', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I already am wealthy', exerciseDetails: { task: 'Behave like millionaire today' } },
    
    // Level 65: Lesson 17
    { id: 65, name: 'Lesson 17: Investment Guide', type: 'video', status: 'locked', xp: 0, affirmation: 'I learn from experts!', videoUrl: 'https://www.miteshkhatri.com/MoneyIndu' },
    // Levels 66-68: Exercises
    { id: 66, name: 'Create Investment Plan', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I plan strategically', exerciseDetails: { task: 'Design investment strategy' } },
    { id: 67, name: 'Diversify Portfolio', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I spread risk wisely', exerciseDetails: { task: 'Allocate across assets' } },
    { id: 68, name: 'Calculate Net Worth', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I track my growth', exerciseDetails: { task: 'Calculate total net worth' } },
    
    // Level 69: Lesson 18
    { id: 69, name: 'Lesson 18: Vastu Science', type: 'video', status: 'locked', xp: 0, affirmation: 'I optimize my space for wealth!', videoUrl: 'https://www.miteshkhatri.com/MoneyVastu' },
    // Level 70: Final Challenge
    { id: 70, name: 'Wealth Master Champion', type: 'exercise', status: 'locked', xp: 0, affirmation: 'I am a wealth creator!', exerciseDetails: { task: 'Complete all money mastery practices' } }
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

  const baseLevels = getLevels();
  
  // Apply dynamic statuses from state, merging with base levels
  const levels = baseLevels.map(level => ({
    ...level,
    status: levelStatuses[level.id] || level.status
  }));

  const totalXP = levels.reduce((sum, level) => sum + level.xp, 0);
  const maxXP = levels.length * 5;
  const overallProgress = Math.round((totalXP / maxXP) * 100);
  const completedLevels = levels.filter(l => l.status === 'completed').length;


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
    
    if (level.type === 'video') {
      // For areas with videoUrl, open the video link
      if (level.videoUrl && (area.name === 'Health' || area.name === 'Relationships' || area.name === 'Money')) {
        window.open(level.videoUrl, '_blank');
      } else {
        onStartLesson();
      }
    } else {
      console.log('Opening exercise challenge:', level);
    }
  };

  const handleMarkComplete = (level: LevelNode) => {
    console.log('Marking level as complete:', level);
    
    // Update level statuses and XP
    setLevelStatuses(prev => {
      const newStatuses = { ...prev };
      
      // Mark current level as completed
      newStatuses[level.id] = 'completed';
      
      // Update the level's XP (add 5 points for video lessons)
      const currentIndex = baseLevels.findIndex(l => l.id === level.id);
      if (currentIndex !== -1) {
        baseLevels[currentIndex].xp = 5;
      }
      
      // Find and unlock the next level
      if (currentIndex !== -1 && currentIndex < baseLevels.length - 1) {
        const nextLevel = baseLevels[currentIndex + 1];
        newStatuses[nextLevel.id] = 'current';
      }
      
      return newStatuses;
    });
    
    // TODO: Save completion to backend
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
                        
                        {/* Video lesson details */}
                        {level.type === 'video' && level.videoUrl && level.status !== 'locked' && (area.name === 'Health' || area.name === 'Relationships' || area.name === 'Money') && (
                          <div className="flex flex-col gap-0.5 mt-1.5">
                            <Button
                              size="sm"
                              variant="default"
                              className="h-5 text-[9px] px-1.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(level.videoUrl, '_blank');
                              }}
                              data-testid={`watch-video-${level.id}`}
                            >
                              <Play className="w-2 h-2 mr-0.5" />
                              Watch
                            </Button>
                            {level.status === 'current' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[10px] px-2 border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkComplete(level);
                                }}
                                data-testid={`mark-complete-${level.id}`}
                              >
                                <Check className="w-2.5 h-2.5 mr-0.5" />
                                Complete
                              </Button>
                            )}
                          </div>
                        )}
                        
                        {/* Exercise details */}
                        {level.exerciseDetails && level.status !== 'locked' && (
                          <div className="mt-1.5">
                            {/* Multi-task exercise with detailed tasks */}
                            {level.exerciseDetails.tasks && level.exerciseDetails.tasks.length > 0 ? (
                              <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-2 text-left">
                                <p className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                  {level.exerciseDetails.task}:
                                </p>
                                <div className="space-y-1">
                                  {level.exerciseDetails.tasks.map((task, idx) => (
                                    <div key={idx} className="flex items-start gap-1.5">
                                      <div className="w-3 h-3 rounded border border-gray-400 dark:border-gray-500 bg-white dark:bg-gray-700 mt-0.5 flex-shrink-0" />
                                      <p className="text-[9px] text-gray-600 dark:text-gray-400 leading-tight">
                                        {task}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                                {level.status === 'current' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 text-[10px] px-2 mt-2 w-full border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMarkComplete(level);
                                    }}
                                    data-testid={`mark-complete-${level.id}`}
                                  >
                                    <Check className="w-2.5 h-2.5 mr-0.5" />
                                    Mark Complete
                                  </Button>
                                )}
                              </div>
                            ) : (
                              /* Simple single-task exercise */
                              <>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                  {level.exerciseDetails.task}
                                  {level.exerciseDetails.count && ` (${level.exerciseDetails.count} ${level.exerciseDetails.unit})`}
                                </p>
                                {level.status === 'current' && level.type === 'exercise' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 text-[10px] px-2 mt-1 border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMarkComplete(level);
                                    }}
                                    data-testid={`mark-complete-${level.id}`}
                                  >
                                    <Check className="w-2.5 h-2.5 mr-0.5" />
                                    Mark Complete
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
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
    </div>
  );
}
