import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { apiRequest, queryClient } from '@/lib/queryClient';
import DashboardHeader from '@/components/DashboardHeader';
import UnifiedHRCMTable from '@/components/UnifiedHRCMTable';
import AddRitualForm from '@/components/AddRitualForm';
import RitualCard from '@/components/RitualCard';
import CourseCard from '@/components/CourseCard';
import ProfileModal from '@/components/ProfileModal';
import RitualHistoryModal from '@/components/RitualHistoryModal';
import UpdateProgressModal from '@/components/UpdateProgressModal';
import BadgeDisplayCard from '@/components/BadgeDisplayCard';
import HRCMHistorySection from '@/components/HRCMHistorySection';
import UserActivitySearch from '@/components/UserActivitySearch';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Trophy, Pause, History as HistoryIcon, Trash2, ChevronDown } from 'lucide-react';
import type { Ritual as DbRitual, RitualCompletion } from '@shared/schema';

interface Ritual {
  id: string;
  title: string;
  recurrence: 'daily' | 'mon-fri' | 'custom';
  points: number;
  active: boolean;
  completed: boolean;
  history: { date: string; completed: boolean }[];
}

// Helper function to get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

// Helper function to generate current month history
const generateCurrentMonthHistory = (completions: RitualCompletion[] = []) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const history = [];
  for (let day = 1; day <= daysInMonth; day++) {
    // Create ISO date string directly without timezone conversion
    const isoDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const date = new Date(year, month, day);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const isCompleted = completions.some(c => c.date === isoDate);
    
    history.push({
      date: dateStr,
      completed: isCompleted
    });
  }
  
  return history;
};

// Map frequency to recurrence
const mapFrequencyToRecurrence = (frequency: string): 'daily' | 'mon-fri' | 'custom' => {
  if (frequency === 'weekly') return 'mon-fri';
  return 'daily';
};

// No longer needed - using points from database directly
// Keeping for backward compatibility but will use dbRitual.points
const calculatePoints = (frequency: string): number => {
  return frequency === 'daily' ? 50 : 75;
};

export default function Dashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeSection, setActiveSection] = useState('hrcm');
  const [profileOpen, setProfileOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [selectedRitual, setSelectedRitual] = useState<Ritual | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  
  const [userName, setUserName] = useState('User');
  const [userEmail, setUserEmail] = useState('');
  const [totalPoints, setTotalPoints] = useState(0);
  
  const todayDate = useMemo(() => getTodayDate(), []);
  const currentMonth = useMemo(() => new Date().getMonth(), []);
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  
  // Fetch current user data
  const { data: currentUser, isLoading: userLoading, error: userError } = useQuery<{ id: string; email: string; firstName?: string; lastName?: string; isAdmin?: boolean }>({
    queryKey: ['/api/auth/user'],
    retry: false,
  });
  
  // Fetch rituals from database
  const { data: dbRituals = [], isLoading: ritualsLoading } = useQuery<DbRitual[]>({
    queryKey: ['/api/rituals'],
    enabled: !!currentUser, // Only fetch when user is authenticated
  });
  
  // Fetch today's ritual completions (for today's status)
  const { data: todayCompletions = [] } = useQuery<RitualCompletion[]>({
    queryKey: ['/api/ritual-completions', todayDate],
    enabled: !!currentUser,
  });

  // Fetch monthly ritual completions (for history)
  const { data: monthlyCompletions = [] } = useQuery<RitualCompletion[]>({
    queryKey: ['/api/ritual-completions/month', currentYear, currentMonth],
    enabled: !!currentUser,
  });

  // Fetch user's HRCM weeks to check 7-day restriction
  const { data: userWeeks = [], isLoading: loadingWeeks, isError: weeksError } = useQuery<any[]>({
    queryKey: ['/api/hercm/weeks'],
    enabled: !!currentUser,
  });
  
  // Map database rituals to Dashboard Ritual interface
  const rituals: Ritual[] = useMemo(() => {
    return dbRituals.map(dbRitual => {
      // Use points from database instead of calculating
      const points = dbRitual.points || calculatePoints(dbRitual.frequency);
      const isCompleted = todayCompletions.some(c => c.ritualId === dbRitual.id);
      // Get this ritual's completions from monthly data
      const ritualCompletions = monthlyCompletions.filter(c => c.ritualId === dbRitual.id);
      
      return {
        id: dbRitual.id,
        title: dbRitual.title,
        recurrence: mapFrequencyToRecurrence(dbRitual.frequency),
        points,
        active: dbRitual.isActive,
        completed: isCompleted,
        history: generateCurrentMonthHistory(ritualCompletions)
      };
    });
  }, [dbRituals, todayCompletions, monthlyCompletions]);

  const hrcmRef = useRef<HTMLDivElement>(null);
  const ritualsRef = useRef<HTMLDivElement>(null);
  const coursesRef = useRef<HTMLDivElement>(null);
  const teamRef = useRef<HTMLDivElement>(null);

  const [currentWeek, setCurrentWeek] = useState(1);
  
  // Calculate total points from completed rituals
  useEffect(() => {
    const points = rituals
      .filter(r => r.completed)
      .reduce((sum, r) => sum + r.points, 0);
    setTotalPoints(points);
  }, [rituals]);

  const scrollToSection = (section: string) => {
    const refs = {
      hrcm: hrcmRef,
      rituals: ritualsRef,
      courses: coursesRef,
      team: teamRef
    };

    refs[section as keyof typeof refs]?.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
    setActiveSection(section);
  };

  // Mutation: Add ritual
  const addRitualMutation = useMutation({
    mutationFn: async (newRitual: { title: string; recurrence: string; points: number }) => {
      const frequency = newRitual.recurrence === 'mon-fri' ? 'weekly' : 'daily';
      const response = await apiRequest('POST', '/api/rituals', {
        title: newRitual.title,
        description: '',
        category: 'Health', // Default category
        frequency,
        points: newRitual.points,
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/rituals'] });
      toast({
        title: 'Ritual Added',
        description: `${variables.title} has been added to your daily rituals.`
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add ritual',
        variant: 'destructive'
      });
    }
  });
  
  const handleAddRitual = (newRitual: { title: string; recurrence: string; points: number }) => {
    addRitualMutation.mutate(newRitual);
  };

  // Mutation: Toggle ritual completion
  const toggleCompleteMutation = useMutation({
    mutationFn: async ({ id, isCompleted }: { id: string; isCompleted: boolean }) => {
      if (isCompleted) {
        // Delete completion
        await apiRequest('DELETE', `/api/ritual-completions/${id}/${todayDate}`);
      } else {
        // Create completion
        await apiRequest('POST', '/api/ritual-completions', {
          ritualId: id,
          date: todayDate,
        });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/ritual-completions', todayDate] });
      queryClient.invalidateQueries({ queryKey: ['/api/ritual-completions/month', currentYear, currentMonth] });
      
      const ritual = rituals.find(r => r.id === variables.id);
      if (ritual && !variables.isCompleted) {
        toast({
          title: 'Points Earned!',
          description: `+${ritual.points} points for completing ${ritual.title}`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update completion',
        variant: 'destructive'
      });
    }
  });
  
  const handleToggleComplete = (id: string) => {
    const ritual = rituals.find(r => r.id === id);
    if (ritual && ritual.active) {
      toggleCompleteMutation.mutate({ id, isCompleted: ritual.completed });
    }
  };

  const handleViewHistory = (id: string) => {
    const ritual = rituals.find(r => r.id === id);
    if (ritual) {
      setSelectedRitual(ritual);
      setHistoryOpen(true);
    }
  };

  // Mutation: Delete ritual
  const deleteRitualMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/rituals/${id}`);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['/api/rituals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ritual-completions', todayDate] });
      
      const ritual = rituals.find(r => r.id === id);
      toast({
        title: 'Ritual Deleted',
        description: `${ritual?.title} has been removed.`,
        variant: 'destructive'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete ritual',
        variant: 'destructive'
      });
    }
  });
  
  const handleDeleteRitual = (id: string) => {
    deleteRitualMutation.mutate(id);
  };

  const handleSaveProfile = (data: { name: string; email: string }) => {
    setUserName(data.name);
    setUserEmail(data.email);
    toast({
      title: 'Profile Updated',
      description: 'Your profile has been successfully updated.'
    });
  };

  const handleLogout = () => {
    console.log('Logout clicked');
    toast({
      title: 'Logging Out',
      description: 'Please wait...'
    });
    
    // Navigate to logout endpoint which handles session clearing and OIDC redirect
    // This must be a full page navigation (not fetch) to properly handle OIDC logout flow
    window.location.href = '/api/logout';
  };

  const handleWeekChange = (newWeek: number) => {
    setCurrentWeek(newWeek);
  };

  const handleUpdateCourseProgress = (id: string) => {
    const course = courses.find(c => c.id === id);
    if (course) {
      setSelectedCourse(course);
      setProgressOpen(true);
    }
  };

  const handleSaveCourseProgress = (progress: number, status: 'not_started' | 'in_progress' | 'completed') => {
    if (selectedCourse) {
      setCourses(courses.map(course =>
        course.id === selectedCourse.id
          ? { ...course, progressPercent: progress, status }
          : course
      ));
      toast({
        title: 'Progress Updated',
        description: `${selectedCourse.title} progress updated to ${progress}%`
      });
    }
  };

  const handleVisitCourse = (id: string) => {
    const course = courses.find(c => c.id === id);
    if (course) {
      toast({
        title: 'Opening Course',
        description: `Redirecting to ${course.title}...`
      });
    }
  };

  // Track completed modules for each course
  const [completedModules, setCompletedModules] = useState<Record<string, string[]>>({});

  const handleModuleToggle = (courseId: string, moduleId: string, completed: boolean) => {
    setCompletedModules(prev => {
      const current = prev[courseId] || [];
      const updated = completed 
        ? [...current, moduleId]
        : current.filter(id => id !== moduleId);
      
      return {
        ...prev,
        [courseId]: updated
      };
    });

    // Auto-save toast
    toast({
      title: completed ? 'Module Completed!' : 'Module Unmarked',
      description: completed ? 'Progress updated successfully' : 'Progress reverted',
    });
  };

  interface CourseLesson {
    id: string;
    title: string;
    url?: string;
    completed: boolean;
  }

  const [courses, setCourses] = useState<Array<{
    id: string;
    title: string;
    url: string;
    tags: string[];
    source: string;
    estimatedHours: number;
    status: 'not_started' | 'in_progress' | 'completed';
    progressPercent: number;
    category: string;
    lessons: CourseLesson[];
  }>>([
    {
      id: 'basic-loa',
      title: 'Basic Law of Attraction',
      url: 'https://www.miteshkhatri.com/Basic',
      tags: ['LOA', 'Manifestation'],
      source: 'Mitesh Khatri',
      estimatedHours: 15,
      status: 'not_started',
      progressPercent: 0,
      category: 'default',
      lessons: [
        { id: 'bloa-intro', title: 'Basic Law of Attraction Course', url: 'https://coaching.miteshkhatri.com/products/basic-law-of-attraction-level-1/categories/2156164675/posts/2181333642', completed: false },
        { id: 'bloa-1', title: 'Law of Attraction Basic LIVE - English', url: 'https://coaching.miteshkhatri.com/products/basic-law-of-attraction-level-1/categories/2147690759', completed: false },
        { id: 'bloa-1-1', title: '1. What are the 4 Levels of LOA', url: 'https://coaching.miteshkhatri.com/products/basic-law-of-attraction-level-1/categories/2147690759/posts/2148209423', completed: false },
        { id: 'bloa-1-2', title: '2. What is Law of Attraction', url: 'https://coaching.miteshkhatri.com/products/basic-law-of-attraction-level-1/categories/2147690759/posts/2148209424', completed: false },
        { id: 'bloa-1-3', title: '3. Why LOA Works', url: 'https://coaching.miteshkhatri.com/products/basic-law-of-attraction-level-1/categories/2147690759/posts/2148209434', completed: false },
        { id: 'bloa-1-4', title: '4. What is The FORMULA of LOA', url: 'https://coaching.miteshkhatri.com/products/basic-law-of-attraction-level-1/categories/2147690759/posts/2148209426', completed: false },
        { id: 'bloa-1-5', title: '5. How to Join 30-Days Subconscious Re-Programming Group', url: 'https://coaching.miteshkhatri.com/products/basic-law-of-attraction-level-1/categories/2147690759/posts/2148209431', completed: false },
        { id: 'bloa-2', title: 'How to Create Affirmation to Attract Your Goals', url: 'https://coaching.miteshkhatri.com/products/basic-law-of-attraction-level-1/categories/2147748284', completed: false },
        { id: 'bloa-2-1', title: '1. Four Rules of Tuning Perfect Affirmations', url: 'https://coaching.miteshkhatri.com/products/basic-law-of-attraction-level-1/categories/2147748284/posts/2148209430', completed: false },
        { id: 'bloa-2-2', title: '2. Four Areas of Tuning Affirmations', url: 'https://coaching.miteshkhatri.com/products/basic-law-of-attraction-level-1/categories/2147748284/posts/2148209429', completed: false },
        { id: 'bloa-2-3', title: '3. Three Type of Affirmations for Success', url: 'https://coaching.miteshkhatri.com/products/basic-law-of-attraction-level-1/categories/2147748284/posts/2148209425', completed: false },
        { id: 'bloa-2-4', title: '4. How to Prepare Your Affirmations', url: 'https://coaching.miteshkhatri.com/products/basic-law-of-attraction-level-1/categories/2147748284/posts/2148209422', completed: false },
        { id: 'bloa-2-5', title: '5. How to Practice Affirmations in the Right Way', url: 'https://coaching.miteshkhatri.com/products/basic-law-of-attraction-level-1/categories/2147748284/posts/2148209433', completed: false },
        { id: 'bloa-3', title: 'Clearing Negative Energy from your Life', url: '', completed: false },
        { id: 'bloa-3-1', title: '1. How to Clear Negative Energy with HO OPONO OPONO', url: 'https://coaching.miteshkhatri.com/products/basic-law-of-attraction-level-1/categories/2147748295', completed: false },
        { id: 'bloa-4', title: 'Hindi LOA LIVE', url: 'https://coaching.miteshkhatri.com/products/basic-law-of-attraction-level-1/categories/2147748295/posts/2148209428', completed: false },
        { id: 'bloa-4-1', title: 'Part 1', url: 'https://coaching.miteshkhatri.com/products/basic-law-of-attraction-level-1/categories/4285636/posts/14388551', completed: false },
        { id: 'bloa-4-2', title: 'Part 2', url: 'https://coaching.miteshkhatri.com/products/basic-law-of-attraction-level-1/categories/4285636/posts/14388552', completed: false },
        { id: 'bloa-4-3', title: 'Part 3', url: 'https://coaching.miteshkhatri.com/products/basic-law-of-attraction-level-1/categories/4285636/posts/14389466', completed: false },
        { id: 'bloa-5', title: '22nd May - Law of Attraction LIVE', url: 'https://coaching.miteshkhatri.com/products/basic-law-of-attraction-level-1/categories/2148012241', completed: false },
        { id: 'bloa-5-1', title: '22nd May - Law of Attraction LIVE Recording', url: 'https://coaching.miteshkhatri.com/products/basic-law-of-attraction-level-1/categories/2148012241/posts/2149365170', completed: false },
      ]
    },
    {
      id: 'advance-loa',
      title: 'Advance Law of Attraction',
      url: 'https://www.miteshkhatri.com/ALOAL01',
      tags: ['LOA', 'Advanced'],
      source: 'Mitesh Khatri',
      estimatedHours: 20,
      status: 'not_started',
      progressPercent: 0,
      category: 'default',
      lessons: [
        { id: 'aloa-0', title: 'Prepare for Advance Law of Attraction And Result Sharing', url: 'https://www.miteshkhatri.com/ALOAL01', completed: false },
        { id: 'aloa-1', title: 'Lesson 1 - Upgrading Your Emotional Frequency', url: 'https://www.miteshkhatri.com/ALOAL1', completed: false },
        { id: 'aloa-1-1', title: 'Lesson 1.1 - Upgrading Your Emotional Frequency', url: 'https://www.miteshkhatri.com/2S2C', completed: false },
        { id: 'aloa-2', title: 'Lesson 2 - Match your FTBA Frequency with your Goal', url: 'https://www.miteshkhatri.com/FTBA', completed: false },
        { id: 'aloa-3', title: 'Lesson 3 - Make Your Positive Emotional Conditions Easy Negative Emotional Conditions Difficult', url: 'https://www.miteshkhatri.com/EmotionalPurpose', completed: false },
        { id: 'aloa-4', title: 'Lesson 4 - Balancing your Yin-Yang Frequency', url: 'https://www.miteshkhatri.com/YinYang', completed: false },
        { id: 'aloa-5', title: 'Lesson 5 - The Source of your Action - Your Values', url: 'https://www.miteshkhatri.com/Values', completed: false },
        { id: 'aloa-6', title: 'Lesson 6 - Seven Chakras Understanding Energizing Activation', url: 'https://www.miteshkhatri.com/Chakras', completed: false },
        { id: 'aloa-7', title: 'Lesson 7 - Seven Energy Needs - How to Align Your Needs with Wants', url: 'https://www.miteshkhatri.com/Needs', completed: false },
        { id: 'aloa-8', title: 'Lesson 8 - Big Small Life Questions to Instantly Change your Frequency', url: 'https://www.miteshkhatri.com/Questions', completed: false },
        { id: 'aloa-9', title: 'Lesson 9 - Change your Limiting Beliefs in just 10 Mins', url: 'https://www.miteshkhatri.com/LimitingBeliefs', completed: false },
        { id: 'aloa-10', title: 'Lesson 10 - Advance Ho Oponopono', url: 'https://www.miteshkhatri.com/AdvanceHo', completed: false },
        { id: 'aloa-11', title: 'Lesson 11 - Removing all your Fears in just 1 Hour', url: 'https://www.miteshkhatri.com/RemoveFear', completed: false },
        { id: 'aloa-12', title: 'Lesson 12 - Integration Exercise of ALOA Lessons', url: 'https://www.miteshkhatri.com/ALOAIntegration', completed: false },
      ]
    },
    {
      id: 'wealth-mastery',
      title: 'Wealth Mastery',
      url: 'https://www.miteshkhatri.com/MoneyAssessment',
      tags: ['Wealth', 'Money'],
      source: 'Mitesh Khatri',
      estimatedHours: 25,
      status: 'not_started',
      progressPercent: 0,
      category: 'Money',
      lessons: [
        { id: 'wm-1', title: 'Lesson 1 - Recognizing your Money Blocks', url: 'https://www.miteshkhatri.com/MoneyAssessment', completed: false },
        { id: 'wm-2', title: 'Lesson 2 - Release Negative Money Frequency with EFT', url: 'https://www.miteshkhatri.com/MoneyEFT', completed: false },
        { id: 'wm-3', title: 'Lesson 3 - Happy Millionaire Emotions', url: 'https://www.miteshkhatri.com/MoneyEmotions', completed: false },
        { id: 'wm-4', title: 'Lesson 4 - Happy Millionaire Beliefs', url: 'https://www.miteshkhatri.com/MoneyBeliefs', completed: false },
        { id: 'wm-5', title: 'Lesson 5 - Happy Millionaire Actions', url: 'https://www.miteshkhatri.com/MoneyActions', completed: false },
        { id: 'wm-6', title: 'Lesson 6 - Attracting Ultimate Financial Freedom with SDE', url: 'https://www.miteshkhatri.com/FinancialFreedom', completed: false },
        { id: 'wm-7', title: 'Lesson 7 - Multiple Money Making Skills to Create Multiple Sources of Income', url: 'https://www.miteshkhatri.com/MSI', completed: false },
        { id: 'wm-8', title: 'Lesson 8 - Match your Needs with Your Goals', url: 'https://www.miteshkhatri.com/MoneyNeeds', completed: false },
        { id: 'wm-9', title: 'Lesson 9 - How to Write Your 1st Book Fast and Easy', url: 'https://www.miteshkhatri.com/BookWriting', completed: false },
        { id: 'wm-10', title: 'Lesson 10 - Changing your Emotional Frequency for Money', url: 'https://www.miteshkhatri.com/WML10', completed: false },
        { id: 'wm-11', title: 'Lesson 11 - PMDSPM System to Manage Money', url: 'https://www.miteshkhatri.com/PMDSPM', completed: false },
        { id: 'wm-12', title: 'Lesson 12 - Coherence Breathing', url: 'https://www.miteshkhatri.com/CoherenceBreathing', completed: false },
        { id: 'wm-13', title: 'Lesson 13 - Decision Making', url: 'https://www.miteshkhatri.com/DecisionMaking', completed: false },
        { id: 'wm-14', title: 'Lesson 14 - Sell First Make Later Fail Fast', url: 'https://www.miteshkhatri.com/WML14', completed: false },
        { id: 'wm-15', title: 'Lesson 15 - How to Invest & Multiply your Money like a Millionaire', url: 'https://www.miteshkhatri.com/WML15', completed: false },
        { id: 'wm-16', title: 'Lesson 16 - Maintain Millionaire Frequency with 5 Beliefs', url: 'https://www.miteshkhatri.com/WML16', completed: false },
        { id: 'wm-17', title: 'Lesson 17 - Complete Investment Guide by Indu Khatri', url: 'https://www.miteshkhatri.com/MoneyIndu', completed: false },
        { id: 'wm-18', title: 'BONUS - The Science of Vastu Explained', url: 'https://www.miteshkhatri.com/MoneyVastu', completed: false },
      ]
    },
    {
      id: 'nlp',
      title: 'NLP - Neuro Linguistic Programming',
      url: '#',
      tags: ['NLP', 'Psychology'],
      source: 'Mitesh Khatri',
      estimatedHours: 30,
      status: 'not_started',
      progressPercent: 0,
      category: 'default',
      lessons: [
        { id: 'nlp-1', title: 'Lesson 1 - NLP Intro Results Sharing of Senior Members', url: '', completed: false },
        { id: 'nlp-2', title: 'Lesson 2 - Generalization Deletion and Distortion Filters', url: 'https://www.miteshkhatri.com/GDD', completed: false },
        { id: 'nlp-3', title: 'Lesson 3 - Primary and Sub-Modalities of VAK', url: 'https://www.miteshkhatri.com/VAK', completed: false },
        { id: 'nlp-4', title: 'Lesson 4 - Like to Dislike anything in just 5 Mins', url: 'https://www.miteshkhatri.com/LikeDislike', completed: false },
        { id: 'nlp-5', title: 'Lesson 5 - Dislike to Like anything in just 5 Mins', url: 'https://www.miteshkhatri.com/DislikeLike', completed: false },
        { id: 'nlp-6', title: 'Lesson 6 - Anchoring - Automatic Emotional Programmes', url: 'https://www.miteshkhatri.com/Anchoring', completed: false },
        { id: 'nlp-7', title: 'Lesson 7 - Swish Technique to Change Small Habits in 5 Mins', url: 'https://www.miteshkhatri.com/Swish', completed: false },
        { id: 'nlp-8', title: 'Lesson 8 - Stack Anchoring', url: 'https://www.miteshkhatri.com/StackingAnchors', completed: false },
        { id: 'nlp-9', title: 'Lesson 9 - Eye Accessing Cues', url: 'https://www.miteshkhatri.com/Eyes', completed: false },
        { id: 'nlp-10', title: 'Lesson 10 - Pre-Framing Re-Framing Post-Framing', url: 'https://www.miteshkhatri.com/Framing', completed: false },
        { id: 'nlp-11', title: 'Lesson 11 - Removing Any FEAR in just 5 Mins', url: 'https://www.miteshkhatri.com/Fear', completed: false },
        { id: 'nlp-12', title: 'Lesson 12 - Cure Any Phobia in just 10 Mins', url: 'https://www.miteshkhatri.com/Phobia', completed: false },
        { id: 'nlp-13', title: 'Lesson 13 - Belief Transfer in just 10 Mins', url: 'https://www.miteshkhatri.com/Beliefs', completed: false },
        { id: 'nlp-14', title: 'Lesson 14 - Modelling - The Science of Replicating Success 10x Faster', url: 'https://www.miteshkhatri.com/Modeling', completed: false },
        { id: 'nlp-15', title: 'Lesson 15 - Rapport Building Conversational Hypnosis', url: 'https://www.miteshkhatri.com/RapportBuilding', completed: false },
        { id: 'nlp-16', title: 'Lesson 16 - Transformational Vocabulary', url: 'https://www.miteshkhatri.com/Vocabulary', completed: false },
        { id: 'nlp-17', title: 'Lesson 17 - Conversational Hypnosis', url: 'https://www.miteshkhatri.com/ConversationalHypnosis', completed: false },
        { id: 'nlp-18', title: 'Lesson 18 - Timeline Therapy to Change Emotions Memories', url: 'https://www.miteshkhatri.com/Timeline', completed: false },
      ]
    },
    {
      id: 'hooponopono-eft',
      title: "Ho'Oponopono + EFT Certification Course",
      url: 'https://www.miteshkhatri.com/HOOPL1',
      tags: ['Healing', 'EFT'],
      source: 'Mitesh Khatri',
      estimatedHours: 18,
      status: 'not_started',
      progressPercent: 0,
      category: 'default',
      lessons: [
        { id: 'ho-1', title: 'Lesson 1 - Demonstration of Advance Ho Oponpono', url: 'https://www.miteshkhatri.com/HOOPL1', completed: false },
        { id: 'ho-1-1', title: 'Lesson 1.1 - Understanding Practice of Basic Vs Advance Ho Oponpono', url: 'https://www.miteshkhatri.com/AdvanceHope', completed: false },
        { id: 'ho-2', title: 'Lesson 2 - Ho Oponopono Letting Go Technique', url: 'https://www.miteshkhatri.com/LettingGo', completed: false },
        { id: 'ho-3', title: 'Lesson 3 - NLP Balloon Healing Technique', url: 'https://www.miteshkhatri.com/Balloon', completed: false },
        { id: 'ho-4', title: 'Lesson 4 - Emotional Freedom Technique EFT', url: 'https://www.miteshkhatri.com/EFT', completed: false },
        { id: 'ho-5', title: 'Lesson 5 - Love Ponopono Healing Technique', url: 'https://www.miteshkhatri.com/LovePono', completed: false },
        { id: 'ho-6', title: 'Lesson 6 - Clarity on How Much Money You Can Make As a Healer', url: 'https://www.miteshkhatri.com/HOOPL6', completed: false },
        { id: 'ho-7', title: 'Lesson 7 - Ready Script for Inviting People for Free Healing Sessions', url: 'https://www.miteshkhatri.com/HoWebinar', completed: false },
        { id: 'ho-8', title: 'Lesson 8 - Free Webinar Part 1 - How to Prepare People in your Webinar', url: 'https://www.miteshkhatri.com/HOOPL8', completed: false },
        { id: 'ho-9', title: 'Lesson 9 - Free Webinar Part 2 - Giving Tears of Joy Experience', url: 'https://www.miteshkhatri.com/HOOPL9', completed: false },
        { id: 'ho-10', title: 'Lesson 10 - Free Webinar Part 3 - Inviting People for 5 Days Free Healing', url: 'https://www.miteshkhatri.com/HOOPL10', completed: false },
        { id: 'ho-11', title: 'Lesson 11 - What to Deliver in the 5 Days Free Healing Sessions', url: 'https://www.miteshkhatri.com/HOOPL11', completed: false },
        { id: 'ho-12', title: 'Lesson 12 - Ready to Script to Sell on Graduation Day', url: 'https://www.miteshkhatri.com/HOOPL12', completed: false },
        { id: 'ho-13', title: 'Lesson 13 - What to Deliver in 30 Days Paid Healing Sessions', url: 'https://www.miteshkhatri.com/HOOPL13', completed: false },
        { id: 'ho-14', title: 'Lesson 14 - How to Get Your Certificate', url: 'https://www.miteshkhatri.com/HoCertificate', completed: false },
        { id: 'ho-15', title: 'Lesson 15 - Remote Healing Technique', url: 'https://www.miteshkhatri.com/RemoteHealing', completed: false },
        { id: 'ho-16', title: 'Lesson 16 - The Best in Me Inviting the Best in You', url: 'https://www.miteshkhatri.com/HOOPL16', completed: false },
        { id: 'ho-17', title: 'Lesson 17 - Subconscious Programming to Get Comfortable to Charge for Healing', url: 'https://www.miteshkhatri.com/HOOPL17', completed: false },
        { id: 'ho-18', title: 'Lesson 18 - How to Share Music in Zoom and What Music to Use', url: 'https://www.miteshkhatri.com/HOOPL18', completed: false },
        { id: 'ho-19', title: 'Lesson 19 - How to Attract Unlimited Students from YouTube', url: 'https://www.miteshkhatri.com/HoYouTube', completed: false },
      ]
    },
    {
      id: 'relationship-mastery',
      title: 'Relationship Mastery with Mitesh Khatri',
      url: 'https://www.miteshkhatri.com/Source',
      tags: ['Relationships', 'Communication'],
      source: 'Mitesh Khatri',
      estimatedHours: 18,
      status: 'not_started',
      progressPercent: 0,
      category: 'Relationship',
      lessons: [
        { id: 'rm-1', title: 'Lesson 1 - The Source of your Relationships - Your Parents', url: 'https://www.miteshkhatri.com/Source', completed: false },
        { id: 'rm-2', title: 'Lesson 2 - The Skill to Master Loving Accepting Yourself with Reflection', url: 'https://www.miteshkhatri.com/Reflection', completed: false },
        { id: 'rm-3', title: 'Lesson 3 - The Skill to Understand Difference Between Men Vs Women', url: 'https://www.miteshkhatri.com/MenWomen', completed: false },
        { id: 'rm-4', title: 'Lesson 4 - Ritual Of Relating', url: 'https://www.miteshkhatri.com/Rituals', completed: false },
        { id: 'rm-5', title: 'Recap Result Sharing', url: '', completed: false },
        { id: 'rm-6', title: 'Lesson 5 - The skill to understand and accept your partner through FIRO-B', url: 'https://www.miteshkhatri.com/FiroB', completed: false },
        { id: 'rm-7', title: 'How to Achieve 10 year Of Success in 1 year', url: '', completed: false },
        { id: 'rm-8', title: 'Lesson 6 - Fulfilling Each other s Needs', url: 'https://www.miteshkhatri.com/RNeeds', completed: false },
        { id: 'rm-9', title: 'Lesson 7 - The Skill to Balance Perspective to Master Acceptance', url: 'https://www.miteshkhatri.com/Balance', completed: false },
        { id: 'rm-10', title: 'Lesson 8 - The skill to Trust Bank Account', url: 'https://www.miteshkhatri.com/TBA', completed: false },
        { id: 'rm-11', title: 'Lesson 9 - Rapport Building', url: 'https://www.miteshkhatri.com/Rapport', completed: false },
        { id: 'rm-12', title: 'Lesson 10 - The Skill to Break Up Easily Let People Go with Love', url: 'https://www.miteshkhatri.com/BreakUp', completed: false },
        { id: 'rm-13', title: 'Lesson 11 - How to Manage Conflict bv Managing Categories of Relationships', url: 'https://www.miteshkhatri.com/Conflicts', completed: false },
        { id: 'rm-14', title: 'Lesson 12 - Master the Skill to Recover from Fights', url: 'https://www.miteshkhatri.com/Fights', completed: false },
        { id: 'rm-15', title: 'Lesson 13 - The skill to Managing Ego - Child Adult Parent EGO', url: 'https://www.miteshkhatri.com/Ego', completed: false },
      ]
    },
    {
      id: 'practical-spirituality',
      title: 'Practical Spirituality By IMK',
      url: '#',
      tags: ['Spirituality', 'Growth'],
      source: 'Mitesh Khatri',
      estimatedHours: 20,
      status: 'not_started',
      progressPercent: 0,
      category: 'default',
      lessons: [
        { id: 'ps-1', title: 'Practical Spirituality With My Guru', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2151628144', completed: false },
        { id: 'ps-1-1', title: '6th Nov - Part 1', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2151628144/posts/2162812399', completed: false },
        { id: 'ps-1-2', title: '6th Nov - Spirituality Q&A', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2151628144/posts/2162811998', completed: false },
        { id: 'ps-1-3', title: '20th Nov - Meditation & 4 Questions Exercise of Byron Katie with GD', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2151628144/posts/2163187094', completed: false },
        { id: 'ps-1-4', title: '27th Nov - Practical Spirituality with Sahil', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2151628144/posts/2163367754', completed: false },
        { id: 'ps-1-5', title: '4th Dec - Session with Sahil on Addictions', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2151628144/posts/2163530206', completed: false },
        { id: 'ps-1-6', title: '11th Dec - Reflections & Projection to Remove Depression', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2151628144/posts/2163747120', completed: false },
        { id: 'ps-2', title: '1st Jan - Practical Spirituality', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2152005517', completed: false },
        { id: 'ps-2-1', title: '1. Meditation & Questions', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2152005517/posts/2164300041', completed: false },
        { id: 'ps-2-2', title: '2. Meditation', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2152005517/posts/2164299713', completed: false },
        { id: 'ps-3', title: '8th Jan - Relationship Healing with 4 Questions', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2152050601', completed: false },
        { id: 'ps-4', title: '18th Dec - Questions with Sahil', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2151912146', completed: false },
        { id: 'ps-4-1', title: '18th Dec - Meditation', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2151912146/posts/2163925059', completed: false },
        { id: 'ps-4-2', title: '18th Dec - Questions with Sahil', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2151912146/posts/2163925060', completed: false },
        { id: 'ps-5', title: '25th Dec - Everything is Always Perfect', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2151955959', completed: false },
        { id: 'ps-5-1', title: 'Meditation Part 1', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2151955959/posts/2164105986', completed: false },
        { id: 'ps-5-2', title: 'Meditation Part 2', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2151955959/posts/2164105987', completed: false },
        { id: 'ps-5-3', title: 'Results Everything is Always Perfect', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2151955959/posts/2164105988', completed: false },
        { id: 'ps-6', title: '15th Jan - Session with Sahil', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2152098120', completed: false },
        { id: 'ps-6-1', title: '15th Jan - Meditation', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2152098120/posts/2164649570', completed: false },
        { id: 'ps-6-2', title: 'Questions on Guilt', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2152098120/posts/2164649571', completed: false },
        { id: 'ps-6-3', title: '15th Jan - Closing Meditation', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2152098120/posts/2164649569', completed: false },
        { id: 'ps-7', title: '22nd Jan - Meditation on Addiction', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2152161880', completed: false },
        { id: 'ps-7-1', title: 'Starting Meditation on Addiction', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2152161880/posts/2164900491', completed: false },
        { id: 'ps-7-2', title: 'Q A on Addiction', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2152161880/posts/2164900489', completed: false },
        { id: 'ps-7-3', title: 'Closing Meditation on Relationships', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2152161880/posts/2164900490', completed: false },
        { id: 'ps-8', title: '5th Feb - Practical Spirituality With My Guru', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2152263790', completed: false },
        { id: 'ps-8-1', title: '5th Feb - Practical Spirituality With My Guru', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2152263790/posts/2165283961', completed: false },
        { id: 'ps-9', title: '12th Feb - Practical Spirituality With My Guru', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2152306089', completed: false },
        { id: 'ps-9-1', title: 'Part 1 - Meditation On Unexplained Sadness', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2152306089/posts/2165447993', completed: false },
        { id: 'ps-9-2', title: 'Part 2 - Meditation On Forgiveness', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2152306089/posts/2165447994', completed: false },
        { id: 'ps-10', title: '19th Feb - Practical Spirituality With My Guru', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2152364235', completed: false },
        { id: 'ps-10-1', title: '1. Meditation For Health', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2152364235/posts/2165673989', completed: false },
        { id: 'ps-10-2', title: '2. Question & Answer', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2152364235/posts/2165673990', completed: false },
        { id: 'ps-10-3', title: '3. Meditation For Forgiveness', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2152364235/posts/2165673992', completed: false },
        { id: 'ps-11', title: '26th Feb - Practical Spirituality With My Guru', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2152411411', completed: false },
        { id: 'ps-11-1', title: '26th Feb - Meditation', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2152411411/posts/2165854852', completed: false },
        { id: 'ps-11-2', title: '26th Feb - Question & Answer', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2152411411/posts/2165854854', completed: false },
        { id: 'ps-12', title: '5th March - Practical Spirituality Recording', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2152462074', completed: false },
        { id: 'ps-12-1', title: '1. Starting Maditation', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2152462074/posts/2166055056', completed: false },
        { id: 'ps-12-2', title: '2. Question & Answer', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2152462074/posts/2166055057', completed: false },
        { id: 'ps-12-3', title: '3. Question & Answer', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2152462074/posts/2166055058', completed: false },
        { id: 'ps-12-4', title: '4. Closing Meditation', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2152462074/posts/2166055059', completed: false },
        { id: 'ps-13', title: 'Practical Spirituality - Batch 2 Latest', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2149643015', completed: false },
        { id: 'ps-13-1', title: '1. What is Practical Spirituality', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2149643015/posts/2155201011', completed: false },
        { id: 'ps-13-2', title: '2. The Oneness Meditation Experience', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2149643015/posts/2155200995', completed: false },
        { id: 'ps-13-3', title: '3. Meditation Experience Sharing', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2149643015/posts/2155200996', completed: false },
        { id: 'ps-13-4', title: '4. Loving Accepting Your Dark Side', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2149643015/posts/2155200997', completed: false },
        { id: 'ps-13-5', title: '5. Questions on Practical Spirituality', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2149643015/posts/2155201018', completed: false },
        { id: 'ps-14', title: 'Lesson 2 - If I Am Energy, Then..', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2149689287', completed: false },
        { id: 'ps-14-1', title: 'Realisation Sharing', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2149689287/posts/2155372146', completed: false },
        { id: 'ps-14-2', title: 'Lesson 2 - If I AM Energy Then', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2149689287/posts/2155372144', completed: false },
        { id: 'ps-14-3', title: 'Questions', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2149689287/posts/2155372147', completed: false },
        { id: 'ps-15', title: 'Lesson 3 - How to Create Balance in your Life', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2149742782', completed: false },
        { id: 'ps-15-1', title: '7th Feb - Recap Sharing', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2149742782/posts/2155580204', completed: false },
        { id: 'ps-15-2', title: '7th Feb - Experiencing Balance in Life', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2149742782/posts/2155580205', completed: false },
        { id: 'ps-16', title: 'Lesson 4 - I Deserve to Achieve My Goals Because I Am Energy', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2149838283', completed: false },
        { id: 'ps-16-1', title: 'I Deserve Affirmation & Questions on Spirituality', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2149838283/posts/2155933952', completed: false },
        { id: 'ps-17', title: 'Lesson 5 - Feeling Balanced by Removing Comparison', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2149885048', completed: false },
        { id: 'ps-17-1', title: 'Oneness Meditation', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2149885048/posts/2156109548', completed: false },
        { id: 'ps-17-2', title: 'Feeling Balanced by Removing Comparison', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2149885048/posts/2156109549', completed: false },
        { id: 'ps-17-3', title: 'Questions', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2149885048/posts/2156109550', completed: false },
        { id: 'ps-18', title: 'Lesson 6 - Being The Shiva', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2149933676', completed: false },
        { id: 'ps-18-1', title: 'Results Sharing', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2149933676/posts/2156288006', completed: false },
        { id: 'ps-18-2', title: 'Why No Me', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2149933676/posts/2156288007', completed: false },
        { id: 'ps-18-3', title: 'Questions', url: 'https://coaching.miteshkhatri.com/products/practical-spirituality-by-imk/categories/2149933676/posts/2156288008', completed: false },
      ]
    },
    {
      id: 'life-coaching',
      title: 'Life Coaching',
      url: 'https://www.miteshkhatri.com/CoachingDemo',
      tags: ['Coaching', 'Career'],
      source: 'Mitesh Khatri',
      estimatedHours: 22,
      status: 'not_started',
      progressPercent: 0,
      category: 'Career',
      lessons: [
        { id: 'lc-1', title: 'Code of Honor to be a Life Coach Result sharing', url: '', completed: false },
        { id: 'lc-2', title: 'Lesson 1 - Demo of Life Coaching Framework', url: 'https://www.miteshkhatri.com/CoachingDemo', completed: false },
        { id: 'lc-3', title: 'Lesson 2 - Understanding the Life Coaching Framework', url: 'https://www.miteshkhatri.com/CoachingFramework', completed: false },
        { id: 'lc-4', title: 'Experience Sharing of Tony Robbins Movie', url: '', completed: false },
        { id: 'lc-5', title: 'Lesson 3 - Health Coaching Blueprint', url: 'https://www.miteshkhatri.com/HealthCoaching', completed: false },
        { id: 'lc-6', title: 'Lesson 4 - Relationship Coaching Blueprint', url: 'https://www.miteshkhatri.com/RelationshipCoaching', completed: false },
        { id: 'lc-7', title: 'Result Sharing Day 2', url: 'https://www.miteshkhatri.com/CareerCoaching', completed: false },
        { id: 'lc-8', title: 'Lesson 5 - Career Coaching Blueprint', url: '', completed: false },
        { id: 'lc-9', title: 'Lesson 6 - How to make Business Strategies', url: '', completed: false },
        { id: 'lc-10', title: 'Lesson 7 - Webinar Selling Formula Explained', url: 'https://www.miteshkhatri.com/WebinarSelling', completed: false },
        { id: 'lc-11', title: 'Lesson 8 - Discovery call Method to Convert Client', url: 'https://www.miteshkhatri.com/ClarityCall', completed: false },
        { id: 'lc-12', title: 'Lesson 9 - Ready Script for Relationship Mastery Webinar', url: '', completed: false },
        { id: 'lc-13', title: 'Lesson 10 - Ready Script for Health Mastery Webinar', url: '', completed: false },
        { id: 'lc-14', title: 'Lesson 11 - How to Create 3 Levels of Sales Funnel', url: 'https://www.miteshkhatri.com/SalesFunnel', completed: false },
      ]
    },
    {
      id: 'corporate-trainer',
      title: 'Corporate Train The Trainer by Mitesh Khatri',
      url: 'https://www.miteshkhatri.com/CoporateTraining',
      tags: ['Corporate', 'Training'],
      source: 'Mitesh Khatri',
      estimatedHours: 24,
      status: 'not_started',
      progressPercent: 0,
      category: 'Career',
      lessons: [
        { id: 'ct-1', title: 'Day 1 - Manifest your Corporate Training Career', url: 'https://www.miteshkhatri.com/CoporateTraining', completed: false },
        { id: 'ct-1-1', title: '1. Manifest Your Corporate Training Identity Topic', url: 'https://coaching.miteshkhatri.com/products/corporate-train-the-trainer-by-mitesh-khatri/categories/2152496854/posts/2166026956', completed: false },
        { id: 'ct-1-2', title: '2. How to Prove Your Results after Every Module', url: 'https://coaching.miteshkhatri.com/products/corporate-train-the-trainer-by-mitesh-khatri/categories/2152496854/posts/2166026957', completed: false },
        { id: 'ct-2', title: '2 - Creating Content Confidence', url: 'https://coaching.miteshkhatri.com/products/corporate-train-the-trainer-by-mitesh-khatri/categories/2152454496', completed: false },
        { id: 'ct-2-1', title: '1. How to Design Content Part 1', url: 'https://coaching.miteshkhatri.com/products/corporate-train-the-trainer-by-mitesh-khatri/categories/2152454496/posts/2166026958', completed: false },
        { id: 'ct-2-2', title: '2. How to Design Content Part 2', url: 'https://coaching.miteshkhatri.com/products/corporate-train-the-trainer-by-mitesh-khatri/categories/2152454496/posts/2166026959', completed: false },
        { id: 'ct-2-3', title: '3. How to Design Methodologies for your Training', url: 'https://coaching.miteshkhatri.com/products/corporate-train-the-trainer-by-mitesh-khatri/categories/2152454496/posts/2166026960', completed: false },
        { id: 'ct-2-4', title: '4. Results of Zoom Rooms after Creating a Training Design', url: 'https://coaching.miteshkhatri.com/products/corporate-train-the-trainer-by-mitesh-khatri/categories/2152454496/posts/2166026961', completed: false },
        { id: 'ct-2-5', title: '5. Criteria\'s for Designing Activities', url: 'https://coaching.miteshkhatri.com/products/corporate-train-the-trainer-by-mitesh-khatri/categories/2152454496/posts/2166026962', completed: false },
        { id: 'ct-2-6', title: '6. Assignment for Creating Training Content for 3 Topics', url: 'https://coaching.miteshkhatri.com/products/corporate-train-the-trainer-by-mitesh-khatri/categories/2152454496/posts/2166026963', completed: false },
        { id: 'ct-3', title: 'Day 2 - Readymade Workshop Design & Delivery Skills', url: 'https://coaching.miteshkhatri.com/products/corporate-train-the-trainer-by-mitesh-khatri/categories/2152505504', completed: false },
        { id: 'ct-3-1', title: 'Recap of Day 1', url: 'https://coaching.miteshkhatri.com/products/corporate-train-the-trainer-by-mitesh-khatri/categories/2152505504/posts/2166222702', completed: false },
        { id: 'ct-3-2', title: '1. Introduction to WOW & Build Comfort', url: 'https://coaching.miteshkhatri.com/products/corporate-train-the-trainer-by-mitesh-khatri/categories/2152505504/posts/2166220136', completed: false },
        { id: 'ct-3-3', title: '2. Business Communication Skills Demo', url: 'https://coaching.miteshkhatri.com/products/corporate-train-the-trainer-by-mitesh-khatri/categories/2152505504/posts/2166222701', completed: false },
        { id: 'ct-3-4', title: '3. Experience Team Building with Ready Team Building Design', url: 'https://coaching.miteshkhatri.com/products/corporate-train-the-trainer-by-mitesh-khatri/categories/2152505504/posts/2166223893', completed: false },
        { id: 'ct-3-5', title: 'Readymade Modules to Deliver', url: 'https://coaching.miteshkhatri.com/products/corporate-train-the-trainer-by-mitesh-khatri/categories/2152505504/posts/2166222320', completed: false },
        { id: 'ct-4', title: 'Day 3 - Motivational Speech, Collaboration & Selling Skills', url: 'https://coaching.miteshkhatri.com/products/corporate-train-the-trainer-by-mitesh-khatri/categories/2152511528', completed: false },
        { id: 'ct-4-1', title: '2 Hrs Motivational Talk with Glasswalk', url: 'https://coaching.miteshkhatri.com/products/corporate-train-the-trainer-by-mitesh-khatri/categories/2152511528/posts/2166242585', completed: false },
        { id: 'ct-4-2', title: 'Win As Much As You Can Part 1', url: 'https://coaching.miteshkhatri.com/products/corporate-train-the-trainer-by-mitesh-khatri/categories/2152511528/posts/2166243050', completed: false },
        { id: 'ct-4-3', title: 'Win As Much As You Can Part 2', url: 'https://coaching.miteshkhatri.com/products/corporate-train-the-trainer-by-mitesh-khatri/categories/2152511528/posts/2166243066', completed: false },
        { id: 'ct-4-4', title: 'Explaining Win Mas Much As You Game', url: 'https://coaching.miteshkhatri.com/products/corporate-train-the-trainer-by-mitesh-khatri/categories/2152511528/posts/2166242586', completed: false },
        { id: 'ct-4-5', title: 'How to Sell your Corporate Training Business', url: 'https://coaching.miteshkhatri.com/products/corporate-train-the-trainer-by-mitesh-khatri/categories/2152511528/posts/2166242587', completed: false },
        { id: 'ct-5', title: 'Train The Trainer - One Day Miracle Day 2', url: 'https://coaching.miteshkhatri.com/products/corporate-train-the-trainer-by-mitesh-khatri/categories/2153853858', completed: false },
        { id: 'ct-5-1', title: 'part 1', url: 'https://coaching.miteshkhatri.com/products/corporate-train-the-trainer-by-mitesh-khatri/categories/2153853858/posts/2171543362', completed: false },
        { id: 'ct-5-2', title: 'part 2', url: 'https://coaching.miteshkhatri.com/products/corporate-train-the-trainer-by-mitesh-khatri/categories/2153853858/posts/2171543363', completed: false },
        { id: 'ct-5-3', title: 'part 3', url: 'https://coaching.miteshkhatri.com/products/corporate-train-the-trainer-by-mitesh-khatri/categories/2153853858/posts/2171543364', completed: false },
        { id: 'ct-5-4', title: 'part 4', url: 'https://coaching.miteshkhatri.com/products/corporate-train-the-trainer-by-mitesh-khatri/categories/2153853858/posts/2171543365', completed: false },
        { id: 'ct-5-5', title: 'part 5', url: 'https://coaching.miteshkhatri.com/products/corporate-train-the-trainer-by-mitesh-khatri/categories/2153853858/posts/2171543366', completed: false },
        { id: 'ct-6', title: 'Old Corporate Train The Trainer Batch', url: 'https://coaching.miteshkhatri.com/products/corporate-train-the-trainer-by-mitesh-khatri/categories/2152454077', completed: false },
        { id: 'ct-7', title: 'How to Become a Rich & Powerful Trainer', url: 'https://coaching.miteshkhatri.com/products/corporate-train-the-trainer-by-mitesh-khatri/categories/4762351', completed: false },
        { id: 'ct-7-1', title: '5 Priciples of Being a Rich Powerful Trainer', url: 'https://coaching.miteshkhatri.com/products/corporate-train-the-trainer-by-mitesh-khatri/categories/4762351/posts/16012043', completed: false },
        { id: 'ct-7-2', title: 'The Model of a Rich & Powerful Trainer', url: 'https://coaching.miteshkhatri.com/products/corporate-train-the-trainer-by-mitesh-khatri/categories/4762351/posts/16012040', completed: false },
        { id: 'ct-7-3', title: 'Question on Model of a Successful Trainer', url: 'https://coaching.miteshkhatri.com/products/corporate-train-the-trainer-by-mitesh-khatri/categories/4762351/posts/16012039', completed: false },
        { id: 'ct-7-4', title: 'Zoom Room Sharing', url: 'https://coaching.miteshkhatri.com/products/corporate-train-the-trainer-by-mitesh-khatri/categories/4762351/posts/16012042', completed: false },
        { id: 'ct-8', title: 'Delivery Skills - How to Deliver to any Audience with WOW', url: 'https://coaching.miteshkhatri.com/products/corporate-train-the-trainer-by-mitesh-khatri/categories/4815829', completed: false },
        { id: 'ct-8-1', title: '1. How to Start a Training with WOW', url: 'https://coaching.miteshkhatri.com/products/corporate-train-the-trainer-by-mitesh-khatri/categories/4815829/posts/16012041', completed: false },
        { id: 'ct-8-2', title: '1. Recap of 5 Principles Creating WOW Moment', url: 'https://coaching.miteshkhatri.com/products/corporate-train-the-trainer-by-mitesh-khatri/categories/4815829/posts/16205149', completed: false },
        { id: 'ct-8-3', title: '2. How to Preframe-Reframe PostFrame to Influence your Audience', url: 'https://coaching.miteshkhatri.com/products/corporate-train-the-trainer-by-mitesh-khatri/categories/4815829/posts/16205150', completed: false },
        { id: 'ct-8-4', title: '3. Examples Questions on Framing', url: 'https://coaching.miteshkhatri.com/products/corporate-train-the-trainer-by-mitesh-khatri/categories/4815829/posts/16205150', completed: false },
        { id: 'ct-8-5', title: '4. How to Reframe to Engage your Audience', url: 'https://coaching.miteshkhatri.com/products/corporate-train-the-trainer-by-mitesh-khatri/categories/4815829/posts/16205152', completed: false },
        { id: 'ct-8-6', title: '5. More Training Methods to Keep your Audience Engaged', url: 'https://coaching.miteshkhatri.com/products/corporate-train-the-trainer-by-mitesh-khatri/categories/4815829/posts/16394580', completed: false },
        { id: 'ct-9', title: 'Delivery Skills - Creating Confidence & Managing Difficult People', url: 'https://coaching.miteshkhatri.com/products/corporate-train-the-trainer-by-mitesh-khatri/categories/4923895', completed: false },
        { id: 'ct-9-1', title: '1. How to Create Extraordinary Comfort for Public Speaking', url: 'https://coaching.miteshkhatri.com/products/corporate-train-the-trainer-by-mitesh-khatri/categories/4923895/posts/16579062', completed: false },
        { id: 'ct-9-2', title: '2. How to Handle Difficult People Questions', url: 'https://coaching.miteshkhatri.com/products/corporate-train-the-trainer-by-mitesh-khatri/categories/4923895/posts/16579061', completed: false },
        { id: 'ct-10', title: 'Designing Trainings like a Master Trainer', url: 'https://coaching.miteshkhatri.com/products/corporate-train-the-trainer-by-mitesh-khatri/categories/2147587555', completed: false },
        { id: 'ct-10-1', title: '4 Steps to Designing Training s like a Master', url: 'https://coaching.miteshkhatri.com/products/corporate-train-the-trainer-by-mitesh-khatri/categories/2147587555/posts/2147841603', completed: false },
        { id: 'ct-10-2', title: 'Questions on Designing Trainings', url: 'https://coaching.miteshkhatri.com/products/corporate-train-the-trainer-by-mitesh-khatri/categories/2147587555/posts/2147841604', completed: false },
        { id: 'ct-11', title: 'Selling & Marketing your Courses', url: 'https://coaching.miteshkhatri.com/products/corporate-train-the-trainer-by-mitesh-khatri/categories/2147642792', completed: false },
        { id: 'ct-11-1', title: '1. Selling Marketing your Courses', url: 'https://coaching.miteshkhatri.com/products/corporate-train-the-trainer-by-mitesh-khatri/categories/2147642792/posts/2148039372', completed: false },
        { id: 'ct-11-2', title: '2. Questions on Selling Marketing', url: 'https://coaching.miteshkhatri.com/products/corporate-train-the-trainer-by-mitesh-khatri/categories/2147642792/posts/2148039372', completed: false },
      ]
    },
    {
      id: 'loa-dmp-certification',
      title: 'LOA & DMP Certification',
      url: '#',
      tags: ['LOA', 'DMP'],
      source: 'Mitesh Khatri',
      estimatedHours: 30,
      status: 'not_started',
      progressPercent: 0,
      category: 'default',
      lessons: [
        { id: 'loa-1', title: 'Lesson 1 - LOA Certification', url: 'https://www.miteshkhatri.com/LOACoach', completed: false },
        { id: 'loa-1-1', title: '21st May - Lesson 1 LOA Certification', url: 'https://coaching.miteshkhatri.com/products/loa-dmp-certification/categories/2150272418/posts/2157587028', completed: false },
        { id: 'loa-2', title: 'Lesson 2 - What Content to Teach for Free & How to Invite for Paid Sessions', url: 'https://coaching.miteshkhatri.com/products/loa-dmp-certification/categories/2150522271', completed: false },
        { id: 'loa-2-1', title: 'Recap Of Lesson 1', url: 'https://coaching.miteshkhatri.com/products/loa-dmp-certification/categories/2150522271/posts/2158564189', completed: false },
        { id: 'loa-2-2', title: 'What LOA Content to Teach for Free & How to Teach', url: 'https://coaching.miteshkhatri.com/products/loa-dmp-certification/categories/2150522271/posts/2158564192', completed: false },
        { id: 'loa-2-3', title: 'How to Invite People for your Paid Sessions', url: 'https://coaching.miteshkhatri.com/products/loa-dmp-certification/categories/2150522271/posts/2158564195', completed: false },
        { id: 'loa-2-4', title: 'Assignment Questions', url: 'https://coaching.miteshkhatri.com/products/loa-dmp-certification/categories/2150522271/posts/2158564197', completed: false },
        { id: 'loa-3', title: 'Lesson 3 - LOA Certification', url: 'https://coaching.miteshkhatri.com/products/loa-dmp-certification/categories/2150561445', completed: false },
        { id: 'loa-3-1', title: 'Result Sharing', url: 'https://coaching.miteshkhatri.com/products/loa-dmp-certification/categories/2150561445/posts/2158712318', completed: false },
        { id: 'loa-3-2', title: '11th June - Lesson 3 LOA Certification Part 1', url: 'https://coaching.miteshkhatri.com/products/loa-dmp-certification/categories/2150561445/posts/2158712259', completed: false },
        { id: 'loa-3-3', title: '11th June - Lesson 3 LOA Certification Part 2', url: 'https://coaching.miteshkhatri.com/products/loa-dmp-certification/categories/2150561445/posts/2158712312', completed: false },
        { id: 'loa-3-4', title: '11th June - Lesson 3 LOA Certification Part 3', url: 'https://coaching.miteshkhatri.com/products/loa-dmp-certification/categories/2150561445/posts/2158712316', completed: false },
        { id: 'loa-4', title: 'Lesson 4 - Ready Videos Ads, Testimonials & Questions', url: 'https://coaching.miteshkhatri.com/products/loa-dmp-certification/categories/2150602345', completed: false },
        { id: 'loa-4-1', title: 'Recap', url: 'https://coaching.miteshkhatri.com/products/loa-dmp-certification/categories/2150602345/posts/2158867806', completed: false },
        { id: 'loa-4-2', title: 'Results Sharing', url: 'https://coaching.miteshkhatri.com/products/loa-dmp-certification/categories/2150602345/posts/2158867809', completed: false },
        { id: 'loa-4-3', title: '18th June - Ready Videos Ads, Testimonials & Questions', url: 'https://coaching.miteshkhatri.com/products/loa-dmp-certification/categories/2150602345/posts/2158867738', completed: false },
        { id: 'loa-4-4', title: 'Assignment to Start Teaching LOA', url: 'https://coaching.miteshkhatri.com/products/loa-dmp-certification/categories/2150602345/posts/2158867812', completed: false },
        { id: 'dmp-1', title: 'Lesson 1 - DMP Certification', url: 'https://coaching.miteshkhatri.com/products/loa-dmp-certification/categories/2150642576', completed: false },
        { id: 'dmp-1-1', title: '1. The Power & Potential of DMP', url: 'https://coaching.miteshkhatri.com/products/loa-dmp-certification/categories/2150642576/posts/2159019044', completed: false },
        { id: 'dmp-1-2', title: '2. Technical Equipments Required for DMP', url: 'https://coaching.miteshkhatri.com/products/loa-dmp-certification/categories/2150642576/posts/2159019210', completed: false },
        { id: 'dmp-1-3', title: '3. Visible Framework on DMP - The Iron Man Suite', url: 'https://coaching.miteshkhatri.com/products/loa-dmp-certification/categories/2150642576/posts/2159019235', completed: false },
        { id: 'dmp-1-4', title: '4. How Much Money You Can Make with DMP', url: 'https://coaching.miteshkhatri.com/products/loa-dmp-certification/categories/2150642576/posts/2159019415', completed: false },
        { id: 'dmp-1-5', title: '5. The Invisible Framework of DMP - Jarvis', url: 'https://coaching.miteshkhatri.com/products/loa-dmp-certification/categories/2150642576/posts/2159019485', completed: false },
        { id: 'dmp-1-6', title: '6. Result Sharing', url: 'https://coaching.miteshkhatri.com/products/loa-dmp-certification/categories/2150642576/posts/2159020597', completed: false },
        { id: 'dmp-2', title: 'Lesson 2 - DMP Certification', url: 'https://coaching.miteshkhatri.com/products/loa-dmp-certification/categories/2150690656', completed: false },
        { id: 'dmp-2-1', title: 'Results Sharing', url: 'https://coaching.miteshkhatri.com/products/loa-dmp-certification/categories/2150690656/posts/2159190082', completed: false },
        { id: 'dmp-2-2', title: 'Engaging VAK Anchoring', url: 'https://coaching.miteshkhatri.com/products/loa-dmp-certification/categories/2150690656/posts/2159190083', completed: false },
        { id: 'dmp-2-3', title: 'Using Metaphors to Deliver Deep Impact', url: 'https://coaching.miteshkhatri.com/products/loa-dmp-certification/categories/2150690656/posts/2159190084', completed: false },
        { id: 'dmp-2-4', title: 'Assignment', url: 'https://coaching.miteshkhatri.com/products/loa-dmp-certification/categories/2150690656/posts/2159190080', completed: false },
        { id: 'dmp-3', title: 'Final Lesson - DMP Certification', url: 'https://coaching.miteshkhatri.com/products/loa-dmp-certification/categories/2150732999', completed: false },
        { id: 'dmp-3-1', title: 'Results Sharing', url: 'https://coaching.miteshkhatri.com/products/loa-dmp-certification/categories/2150732999/posts/2159355951', completed: false },
        { id: 'dmp-3-2', title: 'Using Intention to Bless your Students', url: 'https://coaching.miteshkhatri.com/products/loa-dmp-certification/categories/2150732999/posts/2159355953', completed: false },
        { id: 'dmp-3-3', title: 'How to Sell DMP Effectively', url: 'https://coaching.miteshkhatri.com/products/loa-dmp-certification/categories/2150732999/posts/2159355952', completed: false },
        { id: 'dmp-3-4', title: 'Questions', url: 'https://coaching.miteshkhatri.com/products/loa-dmp-certification/categories/2150732999/posts/2159355954', completed: false },
        { id: 'support-1', title: '2022 Support Call Recording', url: 'https://coaching.miteshkhatri.com/products/loa-dmp-certification/categories/2150825530', completed: false },
        { id: 'support-2', title: 'July 16 - Question & Answer', url: 'https://coaching.miteshkhatri.com/products/loa-dmp-certification/categories/2150776924', completed: false },
        { id: 'support-2-1', title: 'Results Sharing', url: 'https://coaching.miteshkhatri.com/products/loa-dmp-certification/categories/2150776924/posts/2159525805', completed: false },
        { id: 'support-2-2', title: 'Questions', url: 'https://coaching.miteshkhatri.com/products/loa-dmp-certification/categories/2150776924/posts/2159525806', completed: false },
        { id: 'support-3', title: '23rd July - Support Call Recording', url: 'https://coaching.miteshkhatri.com/products/loa-dmp-certification/categories/2150825610', completed: false },
        { id: 'support-3-1', title: '23rd July - Result Sharing', url: 'https://coaching.miteshkhatri.com/products/loa-dmp-certification/categories/2150825610/posts/2159736822', completed: false },
        { id: 'support-3-2', title: '23rd July - Question & Answer', url: 'https://coaching.miteshkhatri.com/products/loa-dmp-certification/categories/2150825610/posts/2159736857', completed: false },
        { id: 'support-4', title: '30th July - LOA & DMP Support Call', url: 'https://coaching.miteshkhatri.com/products/loa-dmp-certification/categories/2150939198', completed: false },
        { id: 'support-4-1', title: '30th July - Result Sharing', url: 'https://coaching.miteshkhatri.com/products/loa-dmp-certification/categories/2150939198/posts/2160215996', completed: false },
        { id: 'support-4-2', title: '30th July - Questions part 1', url: 'https://coaching.miteshkhatri.com/products/loa-dmp-certification/categories/2150939198/posts/2160216145', completed: false },
        { id: 'support-4-3', title: '30th July - Questions part 2', url: 'https://coaching.miteshkhatri.com/products/loa-dmp-certification/categories/2150939198/posts/2160216207', completed: false },
        { id: 'support-5', title: '10th Sep - Support Call', url: 'https://coaching.miteshkhatri.com/products/loa-dmp-certification/categories/2151265550', completed: false },
        { id: 'support-5-1', title: '10th Sep - Support Call', url: 'https://coaching.miteshkhatri.com/products/loa-dmp-certification/categories/2151265550/posts/2161432355', completed: false },
        { id: 'support-6', title: '24th Sep - Support Call', url: 'https://coaching.miteshkhatri.com/products/loa-dmp-certification/categories/2151338114', completed: false },
        { id: 'support-6-1', title: 'Question & Answer', url: 'https://coaching.miteshkhatri.com/products/loa-dmp-certification/categories/2151338114/posts/2161705657', completed: false },
        { id: 'assessment-1', title: 'Basic LOA Certification Assessment', url: 'https://coaching.miteshkhatri.com/products/loa-dmp-certification/categories/2151726862', completed: false },
        { id: 'assessment-1-1', title: 'Basic LOA Certification Assessment', url: 'https://coaching.miteshkhatri.com/products/loa-dmp-certification/categories/2151726862/posts/2163188448', completed: false },
      ]
    },
    {
      id: 'loa-vastu',
      title: 'LOA With Vastu Frequency',
      url: 'https://www.miteshkhatri.com/VastuCourse',
      tags: ['LOA', 'Vastu'],
      source: 'Mitesh Khatri',
      estimatedHours: 16,
      status: 'not_started',
      progressPercent: 0,
      category: 'default',
      lessons: [
        { id: 'vastu-1', title: 'Lesson 1 - Science of Directions, Elements & Impact on Health & Life', url: 'https://coaching.miteshkhatri.com/products/loa-with-vastu-frequency/categories/2151480116', completed: false },
        { id: 'vastu-1-1', title: '1. How to Attend Vastu Course', url: 'https://coaching.miteshkhatri.com/products/loa-with-vastu-frequency/categories/2151480116/posts/2161892411', completed: false },
        { id: 'vastu-1-2', title: '2. Science Behind Vastu', url: 'https://coaching.miteshkhatri.com/products/loa-with-vastu-frequency/categories/2151480116/posts/2161892405', completed: false },
        { id: 'vastu-1-3', title: '3. Primary Directions and Their Importance', url: 'https://coaching.miteshkhatri.com/products/loa-with-vastu-frequency/categories/2151480116/posts/2161892406', completed: false },
        { id: 'vastu-1-4', title: '4. Sub-Directions with Elements Their Importance', url: 'https://coaching.miteshkhatri.com/products/loa-with-vastu-frequency/categories/2151480116/posts/2161892410', completed: false },
        { id: 'vastu-1-5', title: '5. Recap', url: 'https://coaching.miteshkhatri.com/products/loa-with-vastu-frequency/categories/2151480116/posts/2161892408', completed: false },
        { id: 'vastu-1-6', title: '6. How to Predict Specific Health Problems Related to Different Body Parts', url: 'https://coaching.miteshkhatri.com/products/loa-with-vastu-frequency/categories/2151480116/posts/2161892407', completed: false },
        { id: 'vastu-1-7', title: '7. Assignment for this Lesson', url: 'https://coaching.miteshkhatri.com/products/loa-with-vastu-frequency/categories/2151480116/posts/2161892409', completed: false },
        { id: 'vastu-2', title: 'Lesson 2 - Importance of 7 Chakras and Impact on Vastu', url: 'https://coaching.miteshkhatri.com/products/loa-with-vastu-frequency/categories/2151434948', completed: false },
        { id: 'vastu-2-1', title: '1. Recap of Lesson 1', url: 'https://coaching.miteshkhatri.com/products/loa-with-vastu-frequency/categories/2151434948/posts/2162079079', completed: false },
        { id: 'vastu-2-2', title: '2. Understanding 7 Chakras with Vastu Directions', url: 'https://coaching.miteshkhatri.com/products/loa-with-vastu-frequency/categories/2151434948/posts/2162079127', completed: false },
        { id: 'vastu-2-3', title: '3. How to Check Vastu Directions Correctly with a Compass', url: 'https://coaching.miteshkhatri.com/products/loa-with-vastu-frequency/categories/2151434948/posts/2162079319', completed: false },
        { id: 'vastu-2-4', title: 'Lesson 2 Part 4', url: 'https://coaching.miteshkhatri.com/products/loa-with-vastu-frequency/categories/2151434948/posts/2162079349', completed: false },
        { id: 'vastu-3', title: 'Lesson 3 - Alternatives for All Vastu Rooms', url: 'https://coaching.miteshkhatri.com/products/loa-with-vastu-frequency/categories/2151480583', completed: false },
        { id: 'vastu-3-1', title: '1. Recap', url: 'https://coaching.miteshkhatri.com/products/loa-with-vastu-frequency/categories/2151480583/posts/2162249374', completed: false },
        { id: 'vastu-3-2', title: 'Alternative Options for Every Room - Part 1', url: 'https://coaching.miteshkhatri.com/products/loa-with-vastu-frequency/categories/2151480583/posts/2162249406', completed: false },
        { id: 'vastu-3-3', title: 'Alternative Options for Every Room - Part 2', url: 'https://coaching.miteshkhatri.com/products/loa-with-vastu-frequency/categories/2151480583/posts/2162249486', completed: false },
        { id: 'vastu-4', title: 'Lesson 4 - Understanding Plot Shapes & Extensions', url: 'https://coaching.miteshkhatri.com/products/loa-with-vastu-frequency/categories/2151572620', completed: false },
        { id: 'vastu-4-1', title: 'Recap', url: 'https://coaching.miteshkhatri.com/products/loa-with-vastu-frequency/categories/2151480583/posts/2162249374', completed: false },
        { id: 'vastu-4-2', title: '1. Understanding Perfect Shape Slope for Plots', url: 'https://coaching.miteshkhatri.com/products/loa-with-vastu-frequency/categories/2151572620/posts/2162596240', completed: false },
        { id: 'vastu-4-3', title: '2. South East Extension', url: 'https://coaching.miteshkhatri.com/products/loa-with-vastu-frequency/categories/2151572620/posts/2162596244', completed: false },
        { id: 'vastu-4-4', title: '3. South East Extension Remedies', url: 'https://coaching.miteshkhatri.com/products/loa-with-vastu-frequency/categories/2151572620/posts/2162596246', completed: false },
        { id: 'vastu-4-5', title: '4. North West Extension', url: 'https://coaching.miteshkhatri.com/products/loa-with-vastu-frequency/categories/2151572620/posts/2162596247', completed: false },
        { id: 'vastu-4-6', title: '5. South West Extension', url: 'https://coaching.miteshkhatri.com/products/loa-with-vastu-frequency/categories/2151572620/posts/2162596241', completed: false },
        { id: 'vastu-4-7', title: '6. North East Extension', url: 'https://coaching.miteshkhatri.com/products/loa-with-vastu-frequency/categories/2151572620/posts/2162596245', completed: false },
        { id: 'vastu-4-8', title: '7. Assignment for Other Shapes', url: 'https://coaching.miteshkhatri.com/products/loa-with-vastu-frequency/categories/2151572620/posts/2162596242', completed: false },
        { id: 'vastu-5', title: 'Lesson 5 - Vastu Remedies with Crystals', url: 'https://coaching.miteshkhatri.com/products/loa-with-vastu-frequency/categories/2151668740', completed: false },
        { id: 'vastu-5-1', title: 'Result Sharing', url: 'https://coaching.miteshkhatri.com/products/loa-with-vastu-frequency/categories/2151668740/posts/2162966931', completed: false },
        { id: 'vastu-5-2', title: 'Part 1 - 5 Remedies For Vastu', url: 'https://coaching.miteshkhatri.com/products/loa-with-vastu-frequency/categories/2151668740/posts/2162966947', completed: false },
        { id: 'vastu-5-3', title: 'Part 2 - Crystal Remedies', url: 'https://coaching.miteshkhatri.com/products/loa-with-vastu-frequency/categories/2151668740/posts/2162966954', completed: false },
        { id: 'vastu-5-4', title: 'Questions', url: 'https://coaching.miteshkhatri.com/products/loa-with-vastu-frequency/categories/2151668740/posts/2162967047', completed: false },
        { id: 'vastu-5-5', title: 'Assignment For Crystal', url: 'https://coaching.miteshkhatri.com/products/loa-with-vastu-frequency/categories/2151668740/posts/2162967074', completed: false },
        { id: 'vastu-6', title: 'Lesson 6 - Vastu Remedies with Copper Wire & Mirrors', url: 'https://coaching.miteshkhatri.com/products/loa-with-vastu-frequency/categories/2151718258/posts/2163157550', completed: false },
        { id: 'vastu-6-1', title: 'Recap Results Sharing', url: 'https://coaching.miteshkhatri.com/products/loa-with-vastu-frequency/categories/2151718258/posts/2163157550', completed: false },
        { id: 'vastu-6-2', title: '1. Copper Wire Remedy for Vastu Dosh', url: 'https://coaching.miteshkhatri.com/products/loa-with-vastu-frequency/categories/2151718258/posts/2163157552', completed: false },
        { id: 'vastu-6-3', title: '2. Mirror Remedy for Vastu Dosh', url: 'https://coaching.miteshkhatri.com/products/loa-with-vastu-frequency/categories/2151718258/posts/2163157549', completed: false },
        { id: 'vastu-6-4', title: '3. Questions', url: 'https://coaching.miteshkhatri.com/products/loa-with-vastu-frequency/categories/2151718258/posts/2163157551', completed: false },
        { id: 'vastu-7', title: 'Lesson 7 - Color Remedies', url: 'https://coaching.miteshkhatri.com/products/loa-with-vastu-frequency/categories/2151768362', completed: false },
        { id: 'vastu-7-1', title: 'Recap', url: 'https://coaching.miteshkhatri.com/products/loa-with-vastu-frequency/categories/2151768362/posts/2163340818', completed: false },
        { id: 'vastu-7-2', title: 'Vastu Color Remedies', url: 'https://coaching.miteshkhatri.com/products/loa-with-vastu-frequency/categories/2151768362/posts/2163340820', completed: false },
        { id: 'vastu-7-3', title: 'Result Sharing', url: 'https://coaching.miteshkhatri.com/products/loa-with-vastu-frequency/categories/2151768362/posts/2163340819', completed: false },
        { id: 'vastu-8', title: 'Lesson 8 - LOA Remedies For Vastu', url: 'https://coaching.miteshkhatri.com/products/loa-with-vastu-frequency/categories/2151814151', completed: false },
        { id: 'vastu-8-1', title: '1. Result Sharing & Questions With Nirmal Shah', url: 'https://coaching.miteshkhatri.com/products/loa-with-vastu-frequency/categories/2151814151/posts/2163513608', completed: false },
        { id: 'vastu-8-2', title: '2. LOA Remedies For Vastu', url: '', completed: false },
        { id: 'vastu-9', title: 'Lesson 9 - How To Sell Vastu Consultancy & Create YouTube Video', url: 'https://coaching.miteshkhatri.com/products/loa-with-vastu-frequency/categories/2151952437', completed: false },
        { id: 'vastu-9-1', title: 'Recap', url: 'https://coaching.miteshkhatri.com/products/loa-with-vastu-frequency/categories/2151952437/posts/2164077483', completed: false },
        { id: 'vastu-9-2', title: 'How to sell Your Vastu Consultancy', url: 'https://coaching.miteshkhatri.com/products/loa-with-vastu-frequency/categories/2151952437/posts/2164077484', completed: false },
        { id: 'vastu-9-3', title: 'Create YouTube Video', url: 'https://coaching.miteshkhatri.com/products/loa-with-vastu-frequency/categories/2151952437/posts/2164077485', completed: false },
        { id: 'vastu-9-4', title: 'Question & Answer', url: 'https://coaching.miteshkhatri.com/products/loa-with-vastu-frequency/categories/2151952437/posts/2164077494', completed: false },
      ]
    },
    {
      id: 'health-mastery',
      title: 'Health Mastery & Happy Gym',
      url: '#',
      tags: ['Health', 'Fitness'],
      source: 'Mitesh Khatri',
      estimatedHours: 20,
      status: 'not_started',
      progressPercent: 0,
      category: 'Health',
      lessons: [
        { id: 'hm-1', title: 'Health Mastery Batch 2', url: 'https://coaching.miteshkhatri.com/products/health-mastery-happy-gym', completed: false },
        { id: 'hm-1-1', title: '3rd April - Health Mastery Recording Part 1', url: 'https://coaching.miteshkhatri.com/products/health-mastery-happy-gym/categories/2150122912/posts/2157032446', completed: false },
        { id: 'hm-1-2', title: '3rd April - Health Mastery Recording part 2', url: 'https://coaching.miteshkhatri.com/products/health-mastery-happy-gym/categories/2150204707/posts/2157330556', completed: false },
        { id: 'hm-1-3', title: '18th April - Health Mastery', url: 'https://coaching.miteshkhatri.com/products/health-mastery-happy-gym/categories/2150248651/posts/2157496270', completed: false },
        { id: 'hm-1-4', title: '24th April - Health Mastery', url: 'https://coaching.miteshkhatri.com/products/health-mastery-happy-gym/categories/2150248651/posts/2157496270', completed: false },
        { id: 'hm-2', title: 'Health Mastery & Happy Gym', url: 'https://coaching.miteshkhatri.com/products/health-mastery-happy-gym', completed: false },
        { id: 'hm-2-1', title: '1. What is Health - An Eye Opening Session', url: 'https://coaching.miteshkhatri.com/products/health-mastery-happy-gym/categories/3437855/posts/11723270', completed: false },
        { id: 'hm-2-2', title: '2. Breaking Health Limiting Beliefs', url: 'https://coaching.miteshkhatri.com/products/health-mastery-happy-gym/categories/3437855/posts/11880530', completed: false },
        { id: 'hm-2-3', title: '3. Creating a Lifestyle Diet Plan', url: 'https://coaching.miteshkhatri.com/products/health-mastery-happy-gym/categories/3437855/posts/12035104', completed: false },
        { id: 'hm-2-4', title: '4. Transforming your Health Habits Part 1', url: 'https://coaching.miteshkhatri.com/products/health-mastery-happy-gym/categories/3437855/posts/12198567', completed: false },
        { id: 'hm-2-5', title: '5. Transforming Habits Part 2', url: 'https://coaching.miteshkhatri.com/products/health-mastery-happy-gym/categories/3437855/posts/12367867', completed: false },
        { id: 'hm-2-6', title: '6. Integrating 7 Master Steps', url: 'https://coaching.miteshkhatri.com/products/health-mastery-happy-gym/categories/3437855/posts/12544878', completed: false },
        { id: 'hm-2-7', title: '7. Raise your Health Standards', url: 'https://coaching.miteshkhatri.com/products/health-mastery-happy-gym/categories/3437855/posts/12713231', completed: false },
        { id: 'hm-2-8', title: '8. Recap of 7 Master Steps', url: 'https://coaching.miteshkhatri.com/products/health-mastery-happy-gym/categories/3437855/posts/13221408', completed: false },
        { id: 'hm-2-9', title: '9. How to Design Workout', url: 'https://coaching.miteshkhatri.com/products/health-mastery-happy-gym/categories/3437855/posts/13221310', completed: false },
        { id: 'hm-3', title: 'Morning Happy Gym Dance Videos', url: 'https://coaching.miteshkhatri.com/products/health-mastery-happy-gym/categories/2147982346', completed: false },
        { id: 'hm-3-1', title: 'Happy Gym for Platinum Members', url: 'https://coaching.miteshkhatri.com/products/health-mastery-happy-gym/categories/2147982346/posts/2149258653', completed: false },
        { id: 'hm-3-2', title: 'Happy Gym Orientation', url: 'https://coaching.miteshkhatri.com/products/health-mastery-happy-gym/categories/2147982346/posts/2149258778', completed: false },
        { id: 'hm-3-3', title: 'Day 1 Happy Gym', url: 'https://coaching.miteshkhatri.com/products/health-mastery-happy-gym/categories/2147982346/posts/2149258778', completed: false },
        { id: 'hm-3-4', title: 'Day 2 Happy Gym', url: 'https://coaching.miteshkhatri.com/products/health-mastery-happy-gym/categories/2147982346/posts/2149258780', completed: false },
        { id: 'hm-3-5', title: '25th May - Happy Gym', url: 'https://coaching.miteshkhatri.com/products/health-mastery-happy-gym/categories/2147982346/posts/2149335453', completed: false },
        { id: 'hm-3-6', title: '27th May - Happy Gym', url: 'https://coaching.miteshkhatri.com/products/health-mastery-happy-gym/categories/2147982346/posts/2149398426', completed: false },
        { id: 'hm-3-7', title: '28th May - Happy Gym', url: 'https://coaching.miteshkhatri.com/products/health-mastery-happy-gym/categories/2147982346/posts/2149423392', completed: false },
        { id: 'hm-3-8', title: '29th May - Happy Gym', url: 'https://coaching.miteshkhatri.com/products/health-mastery-happy-gym/categories/2147982346/posts/2149439289', completed: false },
        { id: 'hm-3-9', title: '31st May - Happy Gym', url: 'https://coaching.miteshkhatri.com/products/health-mastery-happy-gym/categories/2147982346/posts/2149472696', completed: false },
        { id: 'hm-3-10', title: '1st June - Happy Gym', url: 'https://coaching.miteshkhatri.com/products/health-mastery-happy-gym/categories/2147982346/posts/2149503733', completed: false },
        { id: 'hm-3-11', title: '3rd June - Happy Gym', url: 'https://coaching.miteshkhatri.com/products/health-mastery-happy-gym/categories/2147982346/posts/2149557385', completed: false },
        { id: 'hm-3-12', title: '4th June - Happy Gym', url: 'https://coaching.miteshkhatri.com/products/health-mastery-happy-gym/categories/2147982346/posts/2149580868', completed: false },
        { id: 'hm-3-13', title: '5th June - Happy Gym', url: 'https://coaching.miteshkhatri.com/products/health-mastery-happy-gym/categories/2147982346/posts/2149607368', completed: false },
        { id: 'hm-3-14', title: '7th June - Happy Gym', url: 'https://coaching.miteshkhatri.com/products/health-mastery-happy-gym/categories/2147982346/posts/2149648354', completed: false },
        { id: 'hm-3-15', title: '8th June - Happy Gym', url: 'https://coaching.miteshkhatri.com/products/health-mastery-happy-gym/categories/2147982346/posts/2149679898', completed: false },
        { id: 'hm-3-16', title: '10th June - Happy Gym', url: 'https://coaching.miteshkhatri.com/products/health-mastery-happy-gym/categories/2147982346/posts/2149737410', completed: false },
        { id: 'hm-3-17', title: '11th June - Happy Gym', url: 'https://coaching.miteshkhatri.com/products/health-mastery-happy-gym/categories/2147982346/posts/2149776430', completed: false },
        { id: 'hm-3-18', title: '14th June - Back & Biceps', url: 'https://coaching.miteshkhatri.com/products/health-mastery-happy-gym/categories/2147982346/posts/2149806929', completed: false },
        { id: 'hm-3-19', title: '15th June - Shoulder & Legs', url: 'https://coaching.miteshkhatri.com/products/health-mastery-happy-gym/categories/2147982346/posts/2149833643', completed: false },
        { id: 'hm-3-20', title: '16th June - Chest & Triceps', url: 'https://coaching.miteshkhatri.com/products/health-mastery-happy-gym/categories/2147982346/posts/2149888103', completed: false },
        { id: 'hm-3-21', title: '22nd June - Back & Biceps', url: 'https://coaching.miteshkhatri.com/products/health-mastery-happy-gym/categories/2147982346/posts/2149997031', completed: false },
        { id: 'hm-4', title: 'Oct\'21 Happy Gym', url: 'https://coaching.miteshkhatri.com/products/health-mastery-happy-gym/categories/2148966126', completed: false },
        { id: 'hm-4-1', title: '12th Oct - Happy Gym', url: 'https://coaching.miteshkhatri.com/products/health-mastery-happy-gym/categories/2148966126/posts/2152730276', completed: false },
        { id: 'hm-4-2', title: '18th Oct - Happy Gym', url: 'https://coaching.miteshkhatri.com/products/health-mastery-happy-gym/categories/2148966126/posts/2152883616', completed: false },
      ]
    },
    {
      id: 'depression-celebration',
      title: 'Depression To Celebration',
      url: '#',
      tags: ['Mental Health', 'Wellness'],
      source: 'Mitesh Khatri',
      estimatedHours: 14,
      status: 'not_started',
      progressPercent: 0,
      category: 'Health',
      lessons: [
        { id: 'dc-1', title: 'Lesson 1 - Depression To Celebration', url: 'https://coaching.miteshkhatri.com/products/depression-to-celebration/categories/2151886711/posts/2163826138', completed: false },
        { id: 'dc-2', title: 'Lesson 2 - Depression To Celebration', url: 'https://coaching.miteshkhatri.com/products/depression-to-celebration/categories/2151886711/posts/2163857695', completed: false },
      ]
    },
    {
      id: 'demartini-breakthrough',
      title: 'Dr. Demartini BreakThrough Follow Up Session With IMK',
      url: 'https://www.miteshkhatri.com/DemartiniMethod',
      tags: ['Breakthrough', 'Coaching'],
      source: 'Mitesh Khatri',
      estimatedHours: 10,
      status: 'not_started',
      progressPercent: 0,
      category: 'default',
      lessons: [
        { id: 'db-1', title: 'Part 1', url: 'https://www.miteshkhatri.com/DemartiniMethod', completed: false },
        { id: 'db-2', title: 'Part 2', url: 'https://coaching.miteshkhatri.com/products/dr-demartini-breakthrough-follow-up-session-with-imk/categories/2152256524/posts/2165255550', completed: false },
        { id: 'db-3', title: 'Part 3', url: 'https://coaching.miteshkhatri.com/products/dr-demartini-breakthrough-follow-up-session-with-imk/categories/2152256524/posts/2165255553', completed: false },
      ]
    },
    {
      id: 'demartini-values',
      title: "Dr. John Demartini's Values By Mitesh Khatri",
      url: '#',
      tags: ['Values', 'Growth'],
      source: 'Mitesh Khatri',
      estimatedHours: 15,
      status: 'not_started',
      progressPercent: 0,
      category: 'default',
      lessons: [
        { id: 'dv-1', title: 'Lesson 1 - Importance Of Values', url: 'https://coaching.miteshkhatri.com/products/dr-john-demartini-s-values-by-mitesh-khatri/categories/2155070794/posts/2176449422', completed: false },
        { id: 'dv-2', title: 'Lesson 2 - Impact of Values', url: 'https://coaching.miteshkhatri.com/products/dr-john-demartini-s-values-by-mitesh-khatri/categories/2155070794/posts/2176449423', completed: false },
        { id: 'dv-3', title: 'Lesson 3 - Dr. Demartini Values Recognition Method', url: 'https://coaching.miteshkhatri.com/products/dr-john-demartini-s-values-by-mitesh-khatri/categories/2155070794/posts/2176449424', completed: false },
        { id: 'dv-4', title: 'Lesson 4 - How to Change Your Values', url: 'https://coaching.miteshkhatri.com/products/dr-john-demartini-s-values-by-mitesh-khatri/categories/2155070794/posts/2176449425', completed: false },
        { id: 'dv-5', title: 'Result Sharing', url: 'https://coaching.miteshkhatri.com/products/dr-john-demartini-s-values-by-mitesh-khatri/categories/2155070794/posts/2176449486', completed: false },
        { id: 'dv-6', title: 'Lesson 5 - How to Associate with Values', url: 'https://coaching.miteshkhatri.com/products/dr-john-demartini-s-values-by-mitesh-khatri/categories/2155070794/posts/2176449484', completed: false },
        { id: 'dv-7', title: 'Lesson 6 - How To Understand Someone Values', url: 'https://coaching.miteshkhatri.com/products/dr-john-demartini-s-values-by-mitesh-khatri/categories/2155070794/posts/2176449485', completed: false },
        { id: 'dv-8', title: '22nd April - Values Session By Mitesh Khatri', url: 'https://coaching.miteshkhatri.com/products/dr-john-demartini-s-values-by-mitesh-khatri/categories/2152810300', completed: false },
        { id: 'dv-8-1', title: 'Lesson 1 - Importance Of Values', url: 'https://coaching.miteshkhatri.com/products/dr-john-demartini-s-values-by-mitesh-khatri/categories/2152810300/posts/2167425929', completed: false },
        { id: 'dv-8-2', title: 'Lesson 2.1 - How To Identify Our values', url: 'https://coaching.miteshkhatri.com/products/dr-john-demartini-s-values-by-mitesh-khatri/categories/2152810300/posts/2167425931', completed: false },
        { id: 'dv-8-3', title: 'Lesson 2.2 - Intention Of Exercise', url: 'https://coaching.miteshkhatri.com/products/dr-john-demartini-s-values-by-mitesh-khatri/categories/2152810300/posts/2167425930', completed: false },
        { id: 'dv-8-4', title: 'Lesson 3 - How Discover Our True Values', url: 'https://coaching.miteshkhatri.com/products/dr-john-demartini-s-values-by-mitesh-khatri/categories/2152810300/posts/2167425932', completed: false },
        { id: 'dv-8-5', title: 'Lesson 3.2 - TMFS Values', url: 'https://coaching.miteshkhatri.com/products/dr-john-demartini-s-values-by-mitesh-khatri/categories/2152810300/posts/2167504040', completed: false },
        { id: 'dv-9', title: '23rd April Values Session By Mitesh Khatri', url: 'https://coaching.miteshkhatri.com/products/dr-john-demartini-s-values-by-mitesh-khatri/categories/2152810411', completed: false },
        { id: 'dv-9-1', title: 'Lesson 4 - Recap & Practice', url: 'https://coaching.miteshkhatri.com/products/dr-john-demartini-s-values-by-mitesh-khatri/categories/2152810411/posts/2167426937', completed: false },
        { id: 'dv-9-2', title: 'Lesson 5 - How To Communicate To Others With Their Values', url: 'https://coaching.miteshkhatri.com/products/dr-john-demartini-s-values-by-mitesh-khatri/categories/2152810411/posts/2167429985', completed: false },
        { id: 'dv-9-3', title: 'Result Sharing', url: 'https://coaching.miteshkhatri.com/products/dr-john-demartini-s-values-by-mitesh-khatri/categories/2152810411/posts/2167426911', completed: false },
        { id: 'dv-9-4', title: 'Lesson 6 - How To Understand Someone Values', url: 'https://coaching.miteshkhatri.com/products/dr-john-demartini-s-values-by-mitesh-khatri/categories/2152810411/posts/2167427057', completed: false },
        { id: 'dv-9-5', title: 'Lesson 7 - Values Relationship', url: 'https://coaching.miteshkhatri.com/products/dr-john-demartini-s-values-by-mitesh-khatri/categories/2152810411/posts/2167430001', completed: false },
        { id: 'dv-9-6', title: 'Lesson 7 Sharing', url: 'https://coaching.miteshkhatri.com/products/dr-john-demartini-s-values-by-mitesh-khatri/categories/2152810411/posts/2167430013', completed: false },
        { id: 'dv-9-7', title: 'Lesson 8 - How To Sell By Values', url: 'https://coaching.miteshkhatri.com/products/dr-john-demartini-s-values-by-mitesh-khatri/categories/2152810411/posts/2167430024', completed: false },
      ]
    }
  ]);

  // Fetch live leaderboard data
  const { data: leaderboardData = [] } = useQuery<Array<{
    rank: number;
    userId: string;
    name: string;
    email: string;
    points: number;
    isCurrentUser: boolean;
  }>>({
    queryKey: ['/api/leaderboard'],
  });

  const leaderboardEntries = leaderboardData;

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!userLoading && !currentUser) {
      setLocation('/');
    }
  }, [currentUser, userLoading, setLocation]);
  
  // Update userName and userEmail when user data is fetched
  useEffect(() => {
    if (currentUser) {
      const fullName = currentUser.firstName && currentUser.lastName 
        ? `${currentUser.firstName} ${currentUser.lastName}`
        : currentUser.firstName || currentUser.lastName || currentUser.email || 'User';
      setUserName(fullName || 'User');
      setUserEmail(currentUser.email || '');
    }
  }, [currentUser]);

  // Show loading state while checking authentication
  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Skeleton className="h-12 w-64" />
      </div>
    );
  }
  
  // Don't render dashboard if not authenticated
  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        userName={userName}
        userPoints={totalPoints}
        isAdmin={false}
        activeSection={activeSection}
        onNavigate={scrollToSection}
        onProfileClick={() => setProfileOpen(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        <section ref={hrcmRef} id="hrcm" className="scroll-mt-20 bg-blue-50 dark:bg-blue-950/40 p-6 rounded-lg border-2 border-blue-200 dark:border-blue-800">
          <UnifiedHRCMTable 
            weekNumber={currentWeek}
            onWeekChange={handleWeekChange}
          />
        </section>

        <section ref={ritualsRef} id="rituals" className="scroll-mt-20 p-6 rounded-lg border-2" style={{ backgroundColor: '#00008c', borderColor: '#0000cc' }}>
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-white">
                Daily Rituals
              </h2>
              <p className="text-white/80 mt-1">Build consistent habits and earn points</p>
            </div>

            <AddRitualForm onAdd={handleAddRitual} />

            {ritualsLoading ? (
              <Card className="p-4">
                <Skeleton className="h-6 w-full mb-3" />
                <Skeleton className="h-6 w-full mb-3" />
                <Skeleton className="h-6 w-full mb-3" />
                <Skeleton className="h-6 w-full" />
              </Card>
            ) : (
              <>
                {rituals.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg border-white/30">
                    <p className="text-white/80">No rituals yet. Add your first ritual above!</p>
                  </div>
                ) : (
                  <Card>
                    <div className="divide-y">
                      {rituals.map((ritual) => (
                        <div 
                          key={ritual.id} 
                          className={`flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors ${!ritual.active ? 'opacity-40' : ''}`}
                          data-testid={`ritual-row-${ritual.id}`}
                        >
                          <Checkbox
                            checked={ritual.completed}
                            onCheckedChange={() => handleToggleComplete(ritual.id)}
                            disabled={!ritual.active}
                            className="w-5 h-5"
                            data-testid={`checkbox-ritual-${ritual.id}`}
                          />
                          
                          <div className="flex-1 min-w-0">
                            <h3 className={`font-medium ${ritual.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                              {ritual.title}
                            </h3>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {!ritual.active && (
                              <Badge variant="secondary" className="text-xs gap-1">
                                <Pause className="w-3 h-3" />
                                Paused
                              </Badge>
                            )}
                            
                            <Badge className="gap-1 bg-gradient-to-r from-primary to-accent text-white border-0">
                              <Trophy className="w-3 h-3" />
                              {ritual.points}
                            </Badge>
                            
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleViewHistory(ritual.id)}
                                    data-testid={`button-history-${ritual.id}`}
                                    className="w-8 h-8"
                                  >
                                    <HistoryIcon className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View history</TooltipContent>
                              </Tooltip>
                              
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteRitual(ritual.id)}
                                    data-testid={`button-delete-${ritual.id}`}
                                    className="w-8 h-8"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </>
            )}
          </div>
        </section>

        <section ref={coursesRef} id="courses" className="scroll-mt-20 bg-green-100 dark:bg-green-900/60 p-6 rounded-lg border-2 border-green-400 dark:border-green-600">
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold">Course Tracker</h2>
              <p className="text-muted-foreground mt-1">Manage your learning journey and skill development</p>
            </div>

            {/* Overall Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Overall Course Progress</span>
                <span className="font-semibold">
                  {(() => {
                    const totalLessons = courses.reduce((sum, c) => sum + c.lessons.length, 0);
                    const completedLessons = courses.reduce((sum, c) => sum + c.lessons.filter(l => l.completed).length, 0);
                    return totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
                  })()}%
                </span>
              </div>
              <div className="h-3 bg-white/50 dark:bg-black/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-300"
                  style={{ 
                    width: `${(() => {
                      const totalLessons = courses.reduce((sum, c) => sum + c.lessons.length, 0);
                      const completedLessons = courses.reduce((sum, c) => sum + c.lessons.filter(l => l.completed).length, 0);
                      return totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
                    })()}%`
                  }}
                />
              </div>
            </div>

            {/* Single Card with Course List */}
            <Card>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {courses.map((course, index) => {
                    const completedLessons = course.lessons.filter(l => l.completed).length;
                    const totalLessons = course.lessons.length;
                    const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

                    return (
                      <Collapsible key={course.id}>
                        <div className={`flex items-center gap-3 p-3 rounded-lg hover-elevate ${index !== courses.length - 1 ? 'border-b' : ''}`}>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-sm">{course.title}</h3>
                              {totalLessons > 0 && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                  {completedLessons}/{totalLessons}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{course.source}</p>
                            {totalLessons > 0 && (
                              <div className="mt-1.5 flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-teal-500 transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-muted-foreground font-medium">{progress}%</span>
                              </div>
                            )}
                          </div>
                          {totalLessons > 0 && (
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1"
                                data-testid={`button-expand-${course.id}`}
                              >
                                <ChevronDown className="w-4 h-4" />
                              </Button>
                            </CollapsibleTrigger>
                          )}
                        </div>
                        <CollapsibleContent className="px-3 pb-3">
                          {totalLessons > 0 ? (
                            <div className="bg-muted/30 rounded-lg p-3 mt-2 space-y-2">
                              {course.lessons.map((lesson) => (
                                <div key={lesson.id} className="flex items-start gap-2">
                                  <Checkbox
                                    checked={lesson.completed}
                                    onCheckedChange={(checked) => {
                                      setCourses(prev => prev.map(c => 
                                        c.id === course.id
                                          ? {
                                              ...c,
                                              lessons: c.lessons.map(l =>
                                                l.id === lesson.id
                                                  ? { ...l, completed: checked as boolean }
                                                  : l
                                              )
                                            }
                                          : c
                                      ));
                                      toast({
                                        title: checked ? 'Lesson Completed!' : 'Lesson Unchecked',
                                        description: checked ? '✓ Progress updated' : 'Marked as incomplete',
                                      });
                                    }}
                                    className="mt-0.5"
                                    data-testid={`checkbox-lesson-${lesson.id}`}
                                  />
                                  {lesson.url ? (
                                    <a
                                      href={lesson.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`text-xs cursor-pointer flex-1 hover:underline ${lesson.completed ? 'line-through text-muted-foreground' : 'text-primary hover:text-primary/80'}`}
                                      data-testid={`link-lesson-${lesson.id}`}
                                    >
                                      {lesson.title}
                                    </a>
                                  ) : (
                                    <span className={`text-xs flex-1 ${lesson.completed ? 'line-through text-muted-foreground' : ''}`}>
                                      {lesson.title}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="bg-muted/30 rounded-lg p-3 mt-2">
                              <p className="text-xs text-muted-foreground">No lessons available yet</p>
                            </div>
                          )}
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Team Activity Section - Hidden as per user request */}
        {/* <section ref={teamRef} id="team" className="scroll-mt-20 bg-purple-50 dark:bg-purple-950/40 p-6 rounded-lg border-2 border-purple-200 dark:border-purple-800">
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold">Team Activity</h2>
              <p className="text-muted-foreground mt-1">Search and monitor team members' HRCM progress</p>
            </div>

            <UserActivitySearch />
          </div>
        </section> */}

        {/* Achievements, Badges & Leaderboard Section */}
        <section className="scroll-mt-20">
          <BadgeDisplayCard 
            leaderboardEntries={leaderboardEntries} 
            currentUserId={currentUser?.id}
          />
        </section>

        {/* HRCM History Section */}
        <section className="scroll-mt-20">
          <HRCMHistorySection currentWeek={currentWeek} />
        </section>
      </main>

      <ProfileModal
        open={profileOpen}
        onOpenChange={setProfileOpen}
        userName={userName}
        userEmail={userEmail}
        totalPoints={totalPoints}
        onSave={handleSaveProfile}
        onLogout={handleLogout}
      />

      {selectedRitual && (
        <RitualHistoryModal
          open={historyOpen}
          onOpenChange={setHistoryOpen}
          ritualTitle={selectedRitual.title}
          history={selectedRitual.history}
        />
      )}

      {selectedCourse && (
        <UpdateProgressModal
          open={progressOpen}
          onOpenChange={setProgressOpen}
          courseTitle={selectedCourse.title}
          currentProgress={selectedCourse.progressPercent}
          currentStatus={selectedCourse.status}
          onUpdate={handleSaveCourseProgress}
        />
      )}
    </div>
  );
}
