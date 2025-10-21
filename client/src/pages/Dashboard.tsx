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
import UserActivitySearch from '@/components/UserActivitySearch';
import EmotionalTracker from '@/components/EmotionalTracker';
import { CourseRecommendations } from '@/components/CourseRecommendations';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Trophy, Pause, History as HistoryIcon, Trash2, ChevronDown, Book } from 'lucide-react';
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

// Helper function to get current week's start date (Monday) in YYYY-MM-DD format
const getWeekStartDate = () => {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day; // If Sunday (0), go back 6 days, else go to Monday
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  return monday.toISOString().split('T')[0];
};

// Helper function to get current week's end date (Sunday) in YYYY-MM-DD format
const getWeekEndDate = () => {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? 0 : 7 - day; // If Sunday, stay same, else go to next Sunday
  const sunday = new Date(today);
  sunday.setDate(today.getDate() + diff);
  return sunday.toISOString().split('T')[0];
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
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [pendingAssignmentLessons, setPendingAssignmentLessons] = useState<AssignmentLesson[]>([]);
  
  const [userName, setUserName] = useState('User');
  const [userEmail, setUserEmail] = useState('');
  const [totalPoints, setTotalPoints] = useState(0);
  
  const todayDate = useMemo(() => getTodayDate(), []);
  const weekStartDate = useMemo(() => getWeekStartDate(), []);
  const weekEndDate = useMemo(() => getWeekEndDate(), []);
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
  
  // Fetch today's ritual completions (for today's checkbox status)
  const { data: todayCompletions = [] } = useQuery<RitualCompletion[]>({
    queryKey: ['/api/ritual-completions', todayDate],
    enabled: !!currentUser,
  });

  // Fetch current week's ritual completions (for cumulative weekly points)
  const { data: weeklyCompletions = [] } = useQuery<RitualCompletion[]>({
    queryKey: ['/api/ritual-completions/week', weekStartDate, weekEndDate],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/ritual-completions/week/${weekStartDate}/${weekEndDate}`);
      return response.json();
    },
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
  const achievementsRef = useRef<HTMLDivElement>(null);
  const teamRef = useRef<HTMLDivElement>(null);

  const [currentWeek, setCurrentWeek] = useState(1);

  const scrollToSection = (section: string) => {
    const refs = {
      hrcm: hrcmRef,
      rituals: ritualsRef,
      courses: coursesRef,
      achievements: achievementsRef,
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

  // Load completed videos from database on mount
  useEffect(() => {
    const loadCompletedVideos = async () => {
      const allCompletions: Record<string, string[]> = {};
      
      for (const course of courses) {
        try {
          const response = await fetch(`/api/course-video-completions/${course.id}`);
          if (response.ok) {
            const completions = await response.json();
            // Extract module IDs from videoId (format: courseId-moduleId)
            const moduleIds = completions.map((c: any) => c.videoId.replace(`${course.id}-`, ''));
            allCompletions[course.id] = moduleIds;
          }
        } catch (error) {
          console.error(`Failed to load completions for ${course.id}:`, error);
        }
      }
      
      setCompletedModules(allCompletions);
    };
    
    loadCompletedVideos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount - courses array is static

  // Mutation to persist course video completions to database
  const toggleVideoCompletionMutation = useMutation({
    mutationFn: async ({ videoId, courseId }: { videoId: string; courseId: string }) => {
      return await apiRequest('POST', '/api/course-video-completions/toggle', { videoId, courseId });
    },
  });

  const handleModuleToggle = async (courseId: string, moduleId: string, completed: boolean) => {
    // Update local state immediately for responsive UI
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

    // Persist to database
    const videoId = `${courseId}-${moduleId}`;
    try {
      await toggleVideoCompletionMutation.mutateAsync({ videoId, courseId });
      
      // Auto-save toast
      toast({
        title: completed ? 'Module Completed!' : 'Module Unmarked',
        description: completed ? 'Progress saved successfully' : 'Progress reverted',
      });
    } catch (error) {
      console.error('Failed to save progress:', error);
      toast({
        title: 'Error',
        description: 'Failed to save progress. Please try again.',
        variant: 'destructive',
      });
      
      // Revert local state on error
      setCompletedModules(prev => {
        const current = prev[courseId] || [];
        const reverted = !completed 
          ? [...current, moduleId]
          : current.filter(id => id !== moduleId);
        
        return {
          ...prev,
          [courseId]: reverted
        };
      });
    }
  };

  interface CourseLesson {
    id: string;
    title: string;
    url?: string;
    completed: boolean;
    points?: number; // Points awarded for completing this lesson (default: 10)
  }

  interface AssignmentLesson {
    id: string;
    courseId: string;
    courseName: string;
    lessonName: string;
    url: string;
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
        { id: 'nlp-intro', title: 'Introduction To NLP', url: '', completed: false },
        { id: 'nlp-1', title: 'Lesson 1 - NLP Intro Results Sharing of Senior Members', url: '', completed: false },
        { id: 'nlp-2', title: 'Lesson 2 - Generalization Deletion and Distortion Filters', url: 'https://www.miteshkhatri.com/GDD', completed: false },
        { id: 'nlp-2-results', title: 'Lesson 2 - Results of GDD', url: '', completed: false },
        { id: 'nlp-3', title: 'Lesson 3 - Primary and Sub-Modalities of VAK', url: 'https://www.miteshkhatri.com/VAK', completed: false },
        { id: 'nlp-4', title: 'Lesson 4 - Like to Dislike anything in just 5 Mins', url: 'https://www.miteshkhatri.com/LikeDislike', completed: false },
        { id: 'nlp-5', title: 'Lesson 5 - Dislike to Like anything in just 5 Mins', url: 'https://www.miteshkhatri.com/DislikeLike', completed: false },
        { id: 'nlp-recap', title: 'Recap Result Sharing', url: '', completed: false },
        { id: 'nlp-6', title: 'Lesson 6 - Anchoring - Automatic Emotional Programmes', url: 'https://www.miteshkhatri.com/Anchoring', completed: false },
        { id: 'nlp-7', title: 'Lesson 7 - Swish Technique to Change Small Habits in 5 Mins', url: 'https://www.miteshkhatri.com/Swish', completed: false },
        { id: 'nlp-10yr', title: 'How to Achieve 10yr Success in 1 yr', url: '', completed: false },
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
        { id: 'nlp-integration', title: 'Integration Exercise for all NLP Techniques', url: '', completed: false },
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
    },
    {
      id: 'lead-business',
      title: 'Lead Business',
      url: 'https://coaching.miteshkhatri.com/products/lead-business',
      tags: ['Business', 'Leadership'],
      source: 'Mitesh Khatri',
      estimatedHours: 25,
      status: 'not_started',
      progressPercent: 0,
      category: 'Career',
      lessons: [
        { id: 'lb-1', title: '1. The Entrepreneur Identity', url: 'https://coaching.miteshkhatri.com/products/lead-business/categories/4241548/posts/14243457', completed: false },
        { id: 'lb-2', title: '2. Creating a Big Goal with Blind Faith', url: 'https://coaching.miteshkhatri.com/products/lead-business/categories/4241548/posts/14243458', completed: false },
        { id: 'lb-3', title: '3. Five Pillars of Business Mastery', url: 'https://coaching.miteshkhatri.com/products/lead-business/categories/4241548/posts/14507725', completed: false },
        { id: 'lb-4', title: '4. Pillar 1 - Q&A Mission Examples', url: 'https://coaching.miteshkhatri.com/products/lead-business/categories/4241548/posts/14507724', completed: false },
        { id: 'lb-sleep', title: 'Sleeping Technique', url: 'https://www.miteshkhatri.com/SleepingTechnique', completed: false },
        { id: 'lb-5', title: '5. Pillar 3 - Recognising Business Limiting Beliefs', url: 'https://coaching.miteshkhatri.com/products/lead-business/categories/4241548/posts/14644127', completed: false },
        { id: 'lb-5-1', title: '5.1 - Breaking Limiting Beliefs Process', url: 'https://coaching.miteshkhatri.com/products/lead-business/categories/4241548/posts/14644290', completed: false },
        { id: 'lb-5-2', title: '5.2 - Creating New Beliefs Process', url: 'https://coaching.miteshkhatri.com/products/lead-business/categories/4241548/posts/14644321', completed: false },
        { id: 'lb-5-3', title: '5.3 - New Beliefs Sharing + Q&A', url: 'https://coaching.miteshkhatri.com/products/lead-business/categories/4241548/posts/14644347', completed: false },
        { id: 'lb-6', title: '6. Values - A Compass to Guide a Team for a Common Culture', url: 'https://coaching.miteshkhatri.com/products/lead-business/categories/4241548/posts/14838778', completed: false },
        { id: 'lb-6-1', title: '6.1 - Values Examples + Q&A', url: 'https://coaching.miteshkhatri.com/products/lead-business/categories/4241548/posts/14838795', completed: false },
        { id: 'lb-7', title: '7. Creating Business System for Growth & Profits', url: 'https://coaching.miteshkhatri.com/products/lead-business/categories/4479879', completed: false },
        { id: 'lb-7-1', title: '1. Creating 4DX System for All Business Functions', url: 'https://coaching.miteshkhatri.com/products/lead-business/categories/4479879/posts/15034807', completed: false },
        { id: 'lb-7-2', title: '2. Store 334 4DX Example', url: 'https://coaching.miteshkhatri.com/products/lead-business/categories/4479879/posts/15034804', completed: false },
        { id: 'lb-7-2a', title: '2. 4DX Q A', url: 'https://coaching.miteshkhatri.com/products/lead-business/categories/4479879/posts/15034806', completed: false },
        { id: 'lb-7-3', title: '3. 4DX Implementation Questions', url: 'https://coaching.miteshkhatri.com/products/lead-business/categories/4479879/posts/15034807', completed: false },
        { id: 'lb-7-4', title: '4. How to Create Hiring Systems Part 1', url: 'https://coaching.miteshkhatri.com/products/lead-business/categories/4479879/posts/15230088', completed: false },
        { id: 'lb-7-4b', title: '4. How to Create Hiring Systems Part 2', url: 'https://coaching.miteshkhatri.com/products/lead-business/categories/4479879/posts/15230092', completed: false },
      ]
    },
    {
      id: 'lead-self',
      title: 'Lead Self',
      url: 'https://coaching.miteshkhatri.com/products/lead-self',
      tags: ['Leadership', 'Self-Development'],
      source: 'Mitesh Khatri',
      estimatedHours: 20,
      status: 'not_started',
      progressPercent: 0,
      category: 'Career',
      lessons: [
        { id: 'ls-1', title: '1. What is Leadership?', url: 'https://coaching.miteshkhatri.com/products/lead-self/categories/3050135/posts/10369559', completed: false },
        { id: 'ls-2', title: '2. Managing Your Emotional Energy', url: 'https://coaching.miteshkhatri.com/products/lead-self/categories/3050135/posts/10512984', completed: false },
        { id: 'ls-2-1', title: '2.1 Emotional Patterns Exercise', url: 'https://coaching.miteshkhatri.com/products/lead-self/categories/3050135/posts/10668058', completed: false },
        { id: 'ls-2-2', title: '2.2 Control your Focus & Meanings', url: 'https://coaching.miteshkhatri.com/products/lead-self/categories/3050135/posts/10962361', completed: false },
        { id: 'ls-2-3', title: '2.3 Conditioning Exercise P+F', url: 'https://coaching.miteshkhatri.com/products/lead-self/categories/3050135/posts/10963518', completed: false },
        { id: 'ls-2-4', title: '2.4 Creating Emotions at Will - Anchoring Exercise', url: 'https://coaching.miteshkhatri.com/products/lead-self/categories/3050135/posts/11127413', completed: false },
        { id: 'ls-3', title: '3. Creating Vision with Standards & Purpose', url: 'https://coaching.miteshkhatri.com/products/lead-self/categories/3050135/posts/11262538', completed: false },
        { id: 'ls-4', title: '4. Clarity of Values - The Foundation of Unlimited Power', url: 'https://coaching.miteshkhatri.com/products/lead-self/categories/3050135/posts/11427352', completed: false },
        { id: 'ls-5', title: '5. Creating Beliefs to Support Your Values', url: 'https://coaching.miteshkhatri.com/products/lead-self/categories/3050135/posts/11562234', completed: false },
        { id: 'ls-6', title: '6. Recognising & Changing Beliefs', url: 'https://coaching.miteshkhatri.com/products/lead-self/categories/3050135/posts/11683127', completed: false },
        { id: 'ls-7', title: '7. Understanding & Rewiring Your Needs', url: 'https://coaching.miteshkhatri.com/products/lead-self/categories/3050135/posts/11878114', completed: false },
        { id: 'ls-8', title: '8. Integration of Complete Psychology', url: 'https://coaching.miteshkhatri.com/products/lead-self/categories/3050135/posts/12035103', completed: false },
        { id: 'ls-9', title: '9. Managing Conflicts like a Leader', url: 'https://coaching.miteshkhatri.com/products/lead-self/categories/3050135/posts/12198556', completed: false },
        { id: 'ls-10', title: '10 - Balancing your Yin-Yang Energy', url: 'https://coaching.miteshkhatri.com/products/lead-self/categories/3050135/posts/12367473', completed: false },
        { id: 'ls-11', title: '11. Managing Time Like a Leader', url: 'https://coaching.miteshkhatri.com/products/lead-self/categories/3050135/posts/12544867', completed: false },
        { id: 'ls-12', title: '12 - Recap of all Lead Self Modules', url: 'https://coaching.miteshkhatri.com/products/lead-self/categories/3050135/posts/12712244', completed: false },
        { id: 'ls-fd-1', title: 'Live Full Day - 1. What is Leadership', url: 'https://coaching.miteshkhatri.com/products/lead-self/categories/3163917/posts/12881863', completed: false },
        { id: 'ls-fd-2', title: 'Live Full Day - 2. Emotional Intelligence', url: 'https://coaching.miteshkhatri.com/products/lead-self/categories/3163917/posts/12881865', completed: false },
        { id: 'ls-fd-3', title: 'Live Full Day - 3. Values', url: 'https://coaching.miteshkhatri.com/products/lead-self/categories/3163917/posts/12881859', completed: false },
        { id: 'ls-fd-4', title: 'Live Full Day - 4. Standards', url: 'https://coaching.miteshkhatri.com/products/lead-self/categories/3163917/posts/12881861', completed: false },
        { id: 'ls-fd-5', title: 'Live Full Day - 5. Beliefs', url: 'https://coaching.miteshkhatri.com/products/lead-self/categories/3163917/posts/12881862', completed: false },
        { id: 'ls-fd-6', title: 'Live Full Day - 6. Needs', url: 'https://coaching.miteshkhatri.com/products/lead-self/categories/3163917/posts/12881864', completed: false },
      ]
    },
    {
      id: 'lead-people',
      title: 'Lead People - Relationship Mastery',
      url: 'https://coaching.miteshkhatri.com/products/lead-people',
      tags: ['Leadership', 'Relationship'],
      source: 'Mitesh Khatri',
      estimatedHours: 18,
      status: 'not_started',
      progressPercent: 0,
      category: 'Relationship',
      lessons: [
        { id: 'lp-transition', title: '1. Leadership Transition', url: 'https://coaching.miteshkhatri.com/products/lead-people/categories/4175217/posts/14020165', completed: false },
        { id: 'lp-1', title: '1. What is Leadership', url: 'https://coaching.miteshkhatri.com/products/lead-people/categories/4175217/posts/14020157', completed: false },
        { id: 'lp-2', title: '2. Rapport Building', url: 'https://coaching.miteshkhatri.com/products/lead-people/categories/4175217/posts/14020166', completed: false },
        { id: 'lp-2-qa', title: 'Q&A for Rapport Building', url: 'https://coaching.miteshkhatri.com/products/lead-people/categories/4175217/posts/14020167', completed: false },
        { id: 'lp-3', title: '3. Perception Management', url: 'https://coaching.miteshkhatri.com/products/lead-people/categories/4175217/posts/14020168', completed: false },
        { id: 'lp-3-qa', title: 'Q&A Perception Management', url: 'https://coaching.miteshkhatri.com/products/lead-people/categories/4175217/posts/14020169', completed: false },
        { id: 'lp-4', title: '4. Firo-B', url: 'https://coaching.miteshkhatri.com/products/lead-people/categories/4175217/posts/14020170', completed: false },
        { id: 'lp-4-qa', title: 'Q&A for FIRO-B', url: 'https://coaching.miteshkhatri.com/products/lead-people/categories/4175217/posts/14020171', completed: false },
        { id: 'lp-5', title: '5. Building Trust Bank Account', url: 'https://coaching.miteshkhatri.com/products/lead-people/categories/4175217/posts/14020172', completed: false },
        { id: 'lp-6', title: '6. Situational Leadership Styles', url: 'https://coaching.miteshkhatri.com/products/lead-people/categories/4175217/posts/14020173', completed: false },
        { id: 'lp-7', title: '7. Balanced Perspective', url: 'https://coaching.miteshkhatri.com/products/lead-people/categories/4175217/posts/14020174', completed: false },
        { id: 'lp-8', title: '8. How to Give Feedback Effectively', url: 'https://coaching.miteshkhatri.com/products/lead-people/categories/4175217/posts/14020175', completed: false },
        { id: 'lp-9', title: '9. Category of Relationships', url: 'https://coaching.miteshkhatri.com/products/lead-people/categories/4175217/posts/14020176', completed: false },
        { id: 'lp-9-qa', title: 'Q&A for Category of Relationships', url: 'https://coaching.miteshkhatri.com/products/lead-people/categories/4175217/posts/14020177', completed: false },
        { id: 'lp-10', title: '10. Decision Making', url: 'https://coaching.miteshkhatri.com/products/lead-people/categories/4175217/posts/14020178', completed: false },
        { id: 'lp-10-qa', title: 'Q&A Decision Making', url: 'https://coaching.miteshkhatri.com/products/lead-people/categories/4175217/posts/14020179', completed: false },
        { id: 'lp-11', title: '11. Training, Coaching & Changing People', url: 'https://coaching.miteshkhatri.com/products/lead-people/categories/4175217/posts/14020180', completed: false },
        { id: 'lp-12', title: '12. Appraisal Skills', url: 'https://coaching.miteshkhatri.com/products/lead-people/categories/4175217/posts/14020181', completed: false },
      ]
    },
    {
      id: 'handwriting-frequency',
      title: 'Handwriting Frequency Course',
      url: 'https://coaching.miteshkhatri.com/products/handwriting-frequency-course',
      tags: ['Handwriting', 'Analysis'],
      source: 'Mitesh Khatri',
      estimatedHours: 8,
      status: 'not_started',
      progressPercent: 0,
      category: 'default',
      lessons: [
        { id: 'hw-1', title: 'Day 1 01 - Welcome Coming From Future', url: 'https://coaching.miteshkhatri.com/products/handwriting-frequency-course/categories/2155984531/posts/2180553157', completed: false },
        { id: 'hw-2', title: 'Day1 02 - Strokes Zones', url: 'https://coaching.miteshkhatri.com/products/handwriting-frequency-course/categories/2155984531/posts/2180553162', completed: false },
        { id: 'hw-3', title: 'Day1 03 - Areas of Improvement 01', url: 'https://coaching.miteshkhatri.com/products/handwriting-frequency-course/categories/2155984531/posts/2180553164', completed: false },
        { id: 'hw-4', title: 'Day1 04 - Areas', url: 'https://coaching.miteshkhatri.com/products/handwriting-frequency-course/categories/2155984531/posts/2180553161', completed: false },
        { id: 'hw-5', title: 'Day1 05 - Online Access', url: 'https://coaching.miteshkhatri.com/products/handwriting-frequency-course/categories/2155984531/posts/2180553160', completed: false },
        { id: 'hw-6', title: 'Day1 06 - Macro Analysis', url: 'https://coaching.miteshkhatri.com/products/handwriting-frequency-course/categories/2155984531/posts/2180553159', completed: false },
        { id: 'hw-7', title: 'Day1 07 - Size and Slant', url: 'https://coaching.miteshkhatri.com/products/handwriting-frequency-course/categories/2155984531/posts/2180553163', completed: false },
        { id: 'hw-8', title: 'Day1 08 - Macro Analysis Explanation', url: 'https://coaching.miteshkhatri.com/products/handwriting-frequency-course/categories/2155984531/posts/2180553158', completed: false },
      ]
    },
    {
      id: 'investing-saving',
      title: 'Investing & Saving',
      url: 'https://coaching.miteshkhatri.com/products/investing-saving',
      tags: ['Finance', 'Investing'],
      source: 'Modit Massey',
      estimatedHours: 12,
      status: 'not_started',
      progressPercent: 0,
      category: 'Money',
      lessons: [
        { id: 'is-1', title: 'Financial Freedom Session By Modit Massey', url: 'https://coaching.miteshkhatri.com/products/investing-saving/categories/2153151407/posts/2168779607', completed: false },
        { id: 'is-2', title: '19th April - Financial Freedom Session By Modit Massey', url: 'https://coaching.miteshkhatri.com/products/investing-saving/categories/2153151407/posts/2177109154', completed: false },
        { id: 'is-3', title: 'Basic Financial Planning by Modit Massey', url: 'https://coaching.miteshkhatri.com/products/investing-saving/categories/2153151407/posts/2179122949', completed: false },
        { id: 'is-4', title: '26th July - Systematic Approach to Investing For Achieving Financial Goals By Modit Massey', url: 'https://coaching.miteshkhatri.com/products/investing-saving/categories/2153151407/posts/2179833131', completed: false },
        { id: 'is-5', title: '26th Sep - Retirement Planning', url: 'https://coaching.miteshkhatri.com/products/investing-saving/categories/2153151407/posts/2181565148', completed: false },
        { id: 'is-6', title: '15th Nov - Build Your Long-Term Equity Portfolio!', url: 'https://coaching.miteshkhatri.com/products/investing-saving/categories/2153151407/posts/2182831105', completed: false },
        { id: 'is-7', title: '29th Nov - Make Investing Easy and Profitable Body', url: 'https://coaching.miteshkhatri.com/products/investing-saving/categories/2153151407/posts/2183181791', completed: false },
      ]
    },
    {
      id: 'imk-bonuses',
      title: 'IMK Bonuses',
      url: 'https://coaching.miteshkhatri.com/products/imk-bonuses',
      tags: ['Bonus', 'Free Lessons'],
      source: 'Mitesh Khatri',
      estimatedHours: 8,
      status: 'not_started',
      progressPercent: 0,
      category: 'default',
      lessons: [
        { id: 'imk-1', title: 'Bonus Lessons', url: 'https://coaching.miteshkhatri.com/products/imk-bonuses/categories/2155326213/posts/2177658710', completed: false },
        { id: 'imk-2', title: 'Advance LOA Lesson 1 Free', url: 'https://coaching.miteshkhatri.com/products/imk-bonuses/categories/2155326213/posts/2177658707', completed: false },
        { id: 'imk-3', title: 'Ho Oponopono Healer Lesson 1 Free', url: 'https://coaching.miteshkhatri.com/products/imk-bonuses/categories/2155326213/posts/2177658712', completed: false },
        { id: 'imk-4', title: 'Wealth Mastery Lesson 1 Free', url: 'https://coaching.miteshkhatri.com/products/imk-bonuses/categories/2155326213/posts/2177658712', completed: false },
        { id: 'imk-5', title: 'Handwriting Frequency Lesson 1 Free', url: 'https://coaching.miteshkhatri.com/products/imk-bonuses/categories/2155326213/posts/2177658708', completed: false },
        { id: 'imk-6', title: 'Health Mastery Lesson 1 Free', url: 'https://coaching.miteshkhatri.com/products/imk-bonuses/categories/2155326213/posts/2177658706', completed: false },
        { id: 'imk-7', title: 'Relationship Mastery Lesson 1 Free', url: 'https://coaching.miteshkhatri.com/products/imk-bonuses/categories/2155326213/posts/2177658711', completed: false },
        { id: 'imk-8', title: 'Practical Spirituality Lesson 1', url: 'https://coaching.miteshkhatri.com/products/imk-bonuses/categories/2155326213/posts/2177658709', completed: false },
      ]
    },
    {
      id: 'platinum-membership-challenge',
      title: 'Platinum Membership 5 Days Challenge',
      url: 'https://www.miteshkhatri.com/5DC',
      tags: ['Challenge', 'Membership'],
      source: 'Mitesh Khatri',
      estimatedHours: 10,
      status: 'not_started',
      progressPercent: 0,
      category: 'default',
      lessons: [
        { id: 'pmc-1', title: "26th May'25 - Platinum Membership Challenge Day 1", url: 'https://coaching.miteshkhatri.com/products/platinum-membership/categories/2157735064/posts/2187995018', completed: false },
        { id: 'pmc-2', title: "27th May'25 - Platinum Membership Challenge - Day 2", url: 'https://coaching.miteshkhatri.com/products/platinum-membership/categories/2157735064/posts/2188112579', completed: false },
        { id: 'pmc-3', title: '28th May 25 - Platinum Membership Challenge - Day 3', url: 'https://coaching.miteshkhatri.com/products/platinum-membership/categories/2157735064/posts/2188112677', completed: false },
        { id: 'pmc-4', title: '29th May 25 - Platinum Membership Challenge - Day 4', url: 'https://coaching.miteshkhatri.com/products/platinum-membership/categories/2157735064/posts/2188112679', completed: false },
        { id: 'pmc-5', title: '30th May 25 - Platinum Membership Challenge - Day 5', url: 'https://coaching.miteshkhatri.com/products/platinum-membership/categories/2157735064/posts/2188112678', completed: false },
        { id: 'pmc-6', title: "23rd June'25 - Platinum Membership Challenge Day 1", url: 'https://coaching.miteshkhatri.com/products/platinum-membership/categories/2157735064/posts/2188743923', completed: false },
        { id: 'pmc-7', title: "24th June'25 - Platinum Membership Challenge - Day 2", url: 'https://coaching.miteshkhatri.com/products/platinum-membership/categories/2157735064/posts/2188811431', completed: false },
        { id: 'pmc-8', title: '25th June - Platinum Membership Challenge - Day 3', url: 'https://coaching.miteshkhatri.com/products/platinum-membership/categories/2157735064/posts/2188811366', completed: false },
        { id: 'pmc-9', title: '26th June - Platinum Membership Challenge - Day 4', url: 'https://coaching.miteshkhatri.com/products/platinum-membership/categories/2157735064/posts/2188849619', completed: false },
      ]
    },
    {
      id: 'jack-canfield-special',
      title: 'Jack Canfield Special Sessions',
      url: 'https://www.miteshkhatri.com/JackCanfield',
      tags: ['Special', 'Workshop'],
      source: 'Jack Canfield',
      estimatedHours: 3,
      status: 'not_started',
      progressPercent: 0,
      category: 'default',
      lessons: [
        { id: 'jc-1', title: '24th Mar - Jack Canfield Special Workshop', url: 'https://coaching.miteshkhatri.com/products/platinum-membership/categories/2157325541/posts/2186230401', completed: false },
      ]
    },
    {
      id: 'pineal-gland-meditations',
      title: 'Pineal Gland Meditations',
      url: 'https://www.miteshkhatri.com/5DC',
      tags: ['Meditation', 'Healing'],
      source: 'Mitesh Khatri',
      estimatedHours: 20,
      status: 'not_started',
      progressPercent: 0,
      category: 'Health',
      lessons: [
        { id: 'pgm-1', title: '23rd July - Coherence Breathing Meditation', url: 'https://coaching.miteshkhatri.com/products/platinum-membership/categories/2155800332/posts/2179666241', completed: false },
        { id: 'pgm-2', title: '24th July - Miracle Meditation', url: 'https://coaching.miteshkhatri.com/products/platinum-membership/categories/2155800332/posts/2179699209', completed: false },
        { id: 'pgm-3', title: '26th Aug - Day 1 of Pineal Gland Meditation', url: 'https://coaching.miteshkhatri.com/products/platinum-membership/categories/2155800332/posts/2180640162', completed: false },
        { id: 'pgm-4', title: '27th Aug - Pineal Gland Meditation Day 2', url: 'https://coaching.miteshkhatri.com/products/platinum-membership/categories/2155800332/posts/2180677181', completed: false },
        { id: 'pgm-5', title: '9th Sep - Miracle Meditation Preparation Part 1', url: 'https://coaching.miteshkhatri.com/products/platinum-membership/categories/2155800332/posts/2181050377', completed: false },
        { id: 'pgm-6', title: '9th Sep - Miracle Meditation on Unlimited Love Part 2 - Meditation', url: 'https://coaching.miteshkhatri.com/products/platinum-membership/categories/2155800332/posts/2181049310', completed: false },
        { id: 'pgm-7', title: '12th Sep - Miracle Healing Day 1', url: 'https://coaching.miteshkhatri.com/products/platinum-membership/categories/2155800332/posts/2181156259', completed: false },
        { id: 'pgm-8', title: '13th Sep - Manifestation & Kaleidoscope Meditation', url: 'https://coaching.miteshkhatri.com/products/platinum-membership/categories/2155800332/posts/2181186679', completed: false },
        { id: 'pgm-9', title: '20th Sep - Miracle Meditation & Healing Day 2', url: 'https://coaching.miteshkhatri.com/products/platinum-membership/categories/2155800332/posts/2181381892', completed: false },
        { id: 'pgm-10', title: '26th Sep - Penial Gland Meditation & Healing with Manifestation', url: 'https://coaching.miteshkhatri.com/products/platinum-membership/categories/2155800332/posts/2181527915', completed: false },
        { id: 'pgm-11', title: '3rd Oct - Part 1 Abundance Meditation Explained', url: 'https://coaching.miteshkhatri.com/products/platinum-membership/categories/2155800332/posts/2181703495', completed: false },
        { id: 'pgm-12', title: '3rd Oct - Part 2 Abundance Meditation Experience', url: 'https://coaching.miteshkhatri.com/products/platinum-membership/categories/2155800332/posts/2181703505', completed: false },
        { id: 'pgm-13', title: '4th Oct - Surrender Meditation while Lying Down', url: 'https://coaching.miteshkhatri.com/products/platinum-membership/categories/2155800332/posts/2181728350', completed: false },
        { id: 'pgm-14', title: '16th Nov - Pineal Gland Meditation', url: 'https://coaching.miteshkhatri.com/products/platinum-membership/categories/2155800332/posts/2182831114', completed: false },
        { id: 'pgm-15', title: '22nd Nov - The Sleeping Meditation', url: 'https://coaching.miteshkhatri.com/products/platinum-membership/categories/2155800332/posts/2183020259', completed: false },
        { id: 'pgm-16', title: '29th Nov - Pineal Gland Meditation - Part 1', url: 'https://coaching.miteshkhatri.com/products/platinum-membership/categories/2155800332/posts/2183203920', completed: false },
        { id: 'pgm-17', title: '29th Nov - Pineal Gland Meditation - Part 2', url: 'https://coaching.miteshkhatri.com/products/platinum-membership/categories/2155800332/posts/2183203968', completed: false },
        { id: 'pgm-18', title: '27th Dec - Penial Gland Meditation & Manifestation', url: 'https://coaching.miteshkhatri.com/products/platinum-membership/categories/2155800332/posts/2183837562', completed: false },
        { id: 'pgm-19', title: '17th Jan - Walking Meditation 1st Session', url: 'https://coaching.miteshkhatri.com/products/platinum-membership/categories/2155800332/posts/2183837562', completed: false },
      ]
    },
    {
      id: 'platinum-healing-sessions',
      title: 'Platinum Healing Sessions',
      url: 'https://coaching.miteshkhatri.com/products/platinum-membership/categories/2152549237',
      tags: ['Healing', 'Breakthrough'],
      source: 'Mitesh Khatri',
      estimatedHours: 10,
      status: 'not_started',
      progressPercent: 0,
      category: 'Health',
      lessons: [
        { id: 'phs-1', title: '16th March - Platinum Healing', url: 'https://coaching.miteshkhatri.com/products/platinum-membership/categories/2152549237/posts/2166391299', completed: false },
        { id: 'phs-2', title: '15th March - Platinum Healing', url: 'https://coaching.miteshkhatri.com/products/platinum-membership/categories/2152549237/posts/2166391313', completed: false },
        { id: 'phs-3', title: 'Platinum Special Q&A', url: 'https://coaching.miteshkhatri.com/products/platinum-membership/categories/2152549237/posts/2166599553', completed: false },
        { id: 'phs-4', title: 'Inspiration With Disha - Platinum Member Interview', url: 'https://coaching.miteshkhatri.com/products/platinum-membership/categories/2152549237/posts/2166708935', completed: false },
        { id: 'phs-5', title: '5th April Breakthrough Session with Siddhesh', url: 'https://coaching.miteshkhatri.com/products/platinum-membership/categories/2152549237/posts/2166932642', completed: false },
        { id: 'phs-6', title: '27th April - Platinum Healing', url: 'https://coaching.miteshkhatri.com/products/platinum-membership/categories/2152549237/posts/2167596909', completed: false },
        { id: 'phs-7', title: 'Money Management Session with Indu Khatri', url: 'https://coaching.miteshkhatri.com/products/platinum-membership/categories/2153196828/posts/2169413312', completed: false },
      ]
    },
    {
      id: 'dmp-recording',
      title: 'DMP Recording - Daily Mindful Practice',
      url: 'https://coaching.miteshkhatri.com/products/platinum-dmp',
      tags: ['Mindfulness', 'Daily Practice', 'Affirmations'],
      source: 'Mitesh Khatri',
      estimatedHours: 150,
      status: 'not_started',
      progressPercent: 0,
      category: 'default',
      lessons: [
        { id: 'dmp-jun25-1', title: 'Jun 2 - I Deserve It', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157831026/posts/2188358735', completed: false },
        { id: 'dmp-jun25-2', title: 'Jun 3 - Take a Chill Pill', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157831026/posts/2188358737', completed: false },
        { id: 'dmp-jun25-3', title: 'Jun 4 - Depressed people are arrogant people', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157831026/posts/2188358740', completed: false },
        { id: 'dmp-jun25-4', title: 'Jun 5 - I Am Unconditionally Happy', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157831026/posts/2188358743', completed: false },
        { id: 'dmp-jun25-5', title: 'Jun 6 - I am Responsible for My Feelings', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157831026/posts/2188358746', completed: false },
        { id: 'dmp-jun25-6', title: 'Jun 7 - I Am Ready for Divine Energy', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157831026/posts/2188358747', completed: false },
        { id: 'dmp-jun25-7', title: 'Jun 9 - Unlimited Action Unlimited Fun', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157831026/posts/2188358751', completed: false },
        { id: 'dmp-jun25-8', title: 'Jun 10 - All i Need is Within Me Now', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157831026/posts/2188426269', completed: false },
        { id: 'dmp-jun25-9', title: 'Jun 11 - The Universe is With Me', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157831026/posts/2188426271', completed: false },
        { id: 'dmp-jun25-10', title: 'Jun 12 - Prayers for the Plane Crash Passengers', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157831026/posts/2188426271', completed: false },
        { id: 'dmp-jun25-11', title: 'Jun 13 - Making Money is Very Easy', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157831026/posts/2188624299', completed: false },
        { id: 'dmp-jun25-12', title: 'Jun 14 - I am already Financially Free', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157831026/posts/2188624303', completed: false },
        { id: 'dmp-jun25-13', title: 'Jun 16 - I Deserve it', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157831026/posts/2188624307', completed: false },
        { id: 'dmp-jun25-14', title: 'Jun 17 - I Love My Life', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157831026/posts/2188624309', completed: false },
        { id: 'dmp-jun25-15', title: 'Jun 18 - Manifestation with Handwriting by Imran Sir', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157831026/posts/2188624312', completed: false },
        { id: 'dmp-jun25-16', title: 'Jun 19 - I Love Moving', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157831026/posts/2188850257', completed: false },
        { id: 'dmp-jun25-17', title: 'Jun 21 - I Have Self Esteem Not Money Esteem', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157831026/posts/2188850266', completed: false },
        { id: 'dmp-jun25-18', title: 'Jun 23 - Being Happy is So Easy', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157831026/posts/2188850271', completed: false },
        { id: 'dmp-jun25-19', title: 'Jun 24 - I Can Handle It', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157831026/posts/2188850275', completed: false },
        { id: 'dmp-jun25-20', title: 'Jun 25 - Thank You', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157831026/posts/2188850278', completed: false },
        { id: 'dmp-jun25-21', title: 'Jun 26 - Affirmation Practice', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157831026/posts/2188850284', completed: false },
        { id: 'dmp-jun25-22', title: 'Jun 26 - Emotional Freedom Technique(EFT)', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157831026/posts/2188850300', completed: false },
        { id: 'dmp-may25-1', title: 'May 1 - Ho\'Oponopono for Money', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157570334/posts/2187328467', completed: false },
        { id: 'dmp-may25-2', title: 'May 2 - I Am Ready to Evolve', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157570334/posts/2187413851', completed: false },
        { id: 'dmp-may25-3', title: 'May 3 - I AM Ready to Upgrade My Standards', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157570334/posts/2187413854', completed: false },
        { id: 'dmp-may25-4', title: 'May 5 - I Am Hopeful', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157570334/posts/2187546030', completed: false },
        { id: 'dmp-may25-5', title: 'May 6 - I Ignore Reality because I Create Reality', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157570334/posts/2187546032', completed: false },
        { id: 'dmp-may25-6', title: 'May 7 - Thinking Good about Yourself - Imran Sir', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157570334/posts/2187546035', completed: false },
        { id: 'dmp-may25-7', title: 'May 8 - India Pak Peace Prayer', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157570334/posts/2187546037', completed: false },
        { id: 'dmp-may25-8', title: 'May 9 - I can Restart', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157570334/posts/2187598230', completed: false },
        { id: 'dmp-may25-9', title: 'May 10 - I am Enough I believe in my self', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157570334/posts/2187598231', completed: false },
        { id: 'dmp-may25-10', title: 'May 12 - I Am Ready to Let Go of My Past', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157570334/posts/2187689279', completed: false },
        { id: 'dmp-may25-11', title: 'May 13 - Thank You', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157570334/posts/2187689282', completed: false },
        { id: 'dmp-may25-12', title: 'May 14 - Is handwriting Pseudo or Occult with Imran Baig', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157570334/posts/2187729547', completed: false },
        { id: 'dmp-may25-13', title: 'May 15 - When Nothing is Working The Universe is Working', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157570334/posts/2187729551', completed: false },
        { id: 'dmp-may25-14', title: 'May 16 - I Am Comfortable Being a Millionaire', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157570334/posts/2187814737', completed: false },
        { id: 'dmp-may25-15', title: 'May 17 - I Am Healed, I Leave the Past Behind', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157570334/posts/2187814741', completed: false },
        { id: 'dmp-may25-16', title: 'May 19 - 21 Days Visualization Challenge', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157570334/posts/2187814771', completed: false },
        { id: 'dmp-may25-17', title: 'May 20 - I Am Ready to Think BIG', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157570334/posts/2187883352', completed: false },
        { id: 'dmp-may25-18', title: 'May 21 - Live Signature Analysis with Imran Baig', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157570334/posts/2187883348', completed: false },
        { id: 'dmp-may25-19', title: 'May 22 - I Am ready to Raise My Standards', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157570334/posts/2187952296', completed: false },
        { id: 'dmp-may25-20', title: 'May 23 - I Am Ready to Surrender', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157570334/posts/2187952299', completed: false },
        { id: 'dmp-may25-21', title: 'May 24 - I Have Self Esteem Not Money Esteem', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157570334/posts/2188058779', completed: false },
        { id: 'dmp-may25-22', title: 'May 26 - Ready to Live Life Platinum Standards', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157570334/posts/2188058780', completed: false },
        { id: 'dmp-may25-23', title: 'May 27 - Enough Of Blaming Enough oF Complaining', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157570334/posts/2188058781', completed: false },
        { id: 'dmp-may25-24', title: 'May 28 - I am ready to live Infinity Goal', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157570334/posts/2188058782', completed: false },
        { id: 'dmp-may25-25', title: 'May 29 - My Life is Whole & Complete', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157570334/posts/2188089211', completed: false },
        { id: 'dmp-may25-26', title: 'May 30 - I Replace Desperation with Satisfaction', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157570334/posts/2188358729', completed: false },
        { id: 'dmp-may25-27', title: 'May 31 - I Am A Peaceful Achiever', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157570334/posts/2188358731', completed: false },
        { id: 'dmp-apr25-1', title: 'Apr 1 - I will have fun with my family', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157386774/posts/2186520656', completed: false },
        { id: 'dmp-apr25-2', title: 'Apr 2 - I have two mind conscious mind and Subconscious', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157386774/posts/2186520657', completed: false },
        { id: 'dmp-apr25-3', title: 'Apr 3 - I take 100% responsibilities whatever happen in Thailand & Myanmar', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157386774/posts/2186668770', completed: false },
        { id: 'dmp-apr25-4', title: 'Apr 4 - I Am 100 Percent Responsible for My Feelings', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157386774/posts/2186668772', completed: false },
        { id: 'dmp-apr25-5', title: 'Apr 5 - Unlimited Action Unlimited Fun', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157386774/posts/2186668773', completed: false },
        { id: 'dmp-apr25-6', title: 'Apr 7 - I am Balanced', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157386774/posts/2186668774', completed: false },
        { id: 'dmp-apr25-7', title: 'Apr 8 - I Love Myself, I am Enough', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157386774/posts/2186700322', completed: false },
        { id: 'dmp-apr25-8', title: 'Apr 9 - I Have An Excellent Relationship with Money', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157386774/posts/2186800209', completed: false },
        { id: 'dmp-apr25-9', title: 'Apr 10 - I Am Enough I Believe in Myself', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157386774/posts/2186800214', completed: false },
        { id: 'dmp-apr25-10', title: 'Apr 11 - I Am Healed, I Leave the Past Behind', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157386774/posts/2186800217', completed: false },
        { id: 'dmp-apr25-11', title: 'Apr 12 - I Am A Peaceful Achiever', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157386774/posts/2186800222', completed: false },
        { id: 'dmp-apr25-12', title: 'Apr 14 - I can restart', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157386774/posts/2186881580', completed: false },
        { id: 'dmp-apr25-13', title: 'Apr 15 - I Am Ready for Divine Energy', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157386774/posts/2186978629', completed: false },
        { id: 'dmp-apr25-14', title: 'Apr 16 - Take a Chill Pill', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157386774/posts/2186978632', completed: false },
        { id: 'dmp-apr25-15', title: 'Apr 17 - I Replace Desperation with Satisfaction', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157386774/posts/2186978633', completed: false },
        { id: 'dmp-apr25-16', title: 'Apr 18 - I am already Financially Free', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157386774/posts/2187020318', completed: false },
        { id: 'dmp-apr25-17', title: 'Apr 19 - This Weekend My Life is Perfect', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157386774/posts/2187020321', completed: false },
        { id: 'dmp-apr25-18', title: 'Apr 21 - I Am Honest with Myself', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157386774/posts/2187164192', completed: false },
        { id: 'dmp-apr25-19', title: 'Apr 22 - My Magic is in My Words', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157386774/posts/2187164195', completed: false },
        { id: 'dmp-apr25-20', title: 'Apr 23 - My Happiness is More Imp Than My Goals', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157386774/posts/2187164199', completed: false },
        { id: 'dmp-apr25-21', title: 'Apr 24 - Healing for Kashmir', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157386774/posts/2187164212', completed: false },
        { id: 'dmp-apr25-22', title: 'Apr 25 - Making Money is Very Easy', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157386774/posts/2187164214', completed: false },
        { id: 'dmp-apr25-23', title: 'Apr 26 - My Emotions are My Habits', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157386774/posts/2187228760', completed: false },
        { id: 'dmp-apr25-24', title: 'Apr 28 - I Have SO Much in Life', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157386774/posts/2187228764', completed: false },
        { id: 'dmp-apr25-25', title: 'Apr 29 - Ho\'Oponopono for Health', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157386774/posts/2187328407', completed: false },
        { id: 'dmp-apr25-26', title: 'Apr 30 - Ho\'Oponopono for Relationship', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157386774/posts/2187328411', completed: false },
        { id: 'dmp-mar25-1', title: 'Mar 1 - I Love Myself The Way I Am', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157202884/posts/2185698847', completed: false },
        { id: 'dmp-mar25-2', title: 'Mar 3 - YES I CAN!', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157202884/posts/2185698849', completed: false },
        { id: 'dmp-mar25-3', title: 'Mar 4 - My Life is Complete', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157202884/posts/2185698850', completed: false },
        { id: 'dmp-mar25-4', title: 'Mar 5 - Interview of Jack Canfield', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157202884/posts/2185762408', completed: false },
        { id: 'dmp-mar25-5', title: 'Mar 6 - Everybody has something good and something bad', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157202884/posts/2185762411', completed: false },
        { id: 'dmp-mar25-6', title: 'Mar 7 - I Don\'t Know How, Its DONE!', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157202884/posts/2185798603', completed: false },
        { id: 'dmp-mar25-7', title: 'Mar 8 - My Life is Perfect', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157202884/posts/2185798604', completed: false },
        { id: 'dmp-mar25-8', title: 'Mar 10 - Unlimited Action Unlimited Fun', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157202884/posts/2185962456', completed: false },
        { id: 'dmp-mar25-9', title: 'Mar 11 - I am a Giver', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157202884/posts/2185962457', completed: false },
        { id: 'dmp-mar25-10', title: 'Mar 12 - I Am Comfortable as a Habit', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157202884/posts/2185962458', completed: false },
        { id: 'dmp-mar25-11', title: 'Mar 13 - I Am Happy Unconditionally', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157202884/posts/2185962475', completed: false },
        { id: 'dmp-mar25-12', title: 'Mar 14 - I am who I say', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157202884/posts/2185962486', completed: false },
        { id: 'dmp-mar25-13', title: 'Mar 15 - Say NO to Low Quality Emotions', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157202884/posts/2186043457', completed: false },
        { id: 'dmp-mar25-14', title: 'Mar 17 - I Have Self Esteem Not Money Esteem', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157202884/posts/2186043494', completed: false },
        { id: 'dmp-mar25-15', title: 'Mar 18 - I am a Gratitude King/Queen', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157202884/posts/2186196766', completed: false },
        { id: 'dmp-mar25-16', title: 'Mar 19 - I Invite Successful Energy', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157202884/posts/2186196770', completed: false },
        { id: 'dmp-mar25-17', title: 'Mar 20 - I Live Life Platinum Standards', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157202884/posts/2186196773', completed: false },
        { id: 'dmp-mar25-18', title: 'Mar 21 - Making Money is Very Easy', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157202884/posts/2186196795', completed: false },
        { id: 'dmp-mar25-19', title: 'Mar 24 - I Am Ready for Blessings', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157202884/posts/2186228072', completed: false },
        { id: 'dmp-mar25-20', title: 'Mar 25 - I Have SO Much in Life', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157202884/posts/2186330221', completed: false },
        { id: 'dmp-mar25-21', title: 'Mar 26 - To be Consistent', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157202884/posts/2186330223', completed: false },
        { id: 'dmp-mar25-22', title: 'Mar 27 - I have No Limits', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157202884/posts/2186330224', completed: false },
        { id: 'dmp-mar25-23', title: 'Mar 28 - I Am Emotionally Independent', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157202884/posts/2186450561', completed: false },
        { id: 'dmp-mar25-24', title: 'Mar 29 - Take a Chill Pill', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157202884/posts/2186450563', completed: false },
        { id: 'dmp-mar25-25', title: 'Mar 31 - I am Bigger Than My Problems', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157202884/posts/2186450564', completed: false },
        { id: 'dmp-feb25-1', title: 'Feb 1 - Feeling Relaxed is Very Easy for Me', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157010647/posts/2184892929', completed: false },
        { id: 'dmp-feb25-2', title: 'Feb 3 - The Universe is Inside Me', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157010647/posts/2184892931', completed: false },
        { id: 'dmp-feb25-3', title: 'Feb 4 - My Emotions are My Habits', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157010647/posts/2184973695', completed: false },
        { id: 'dmp-feb25-4', title: 'Feb 5 - I Am Not My Personality', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157010647/posts/2184973734', completed: false },
        { id: 'dmp-feb25-5', title: 'Feb 6 - Life is a Beautiful Balance', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157010647/posts/2185035175', completed: false },
        { id: 'dmp-feb25-6', title: 'Feb 7 - I Release All My Guilt', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157010647/posts/2185035178', completed: false },
        { id: 'dmp-feb25-7', title: 'Feb 8 - My Life is Perfect', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157010647/posts/2185200478', completed: false },
        { id: 'dmp-feb25-8', title: 'Feb 10 - I AM Ready to Upgrade My Standards', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157010647/posts/2185200483', completed: false },
        { id: 'dmp-feb25-9', title: 'Feb 11 - All My Problem Bring It ON', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157010647/posts/2185200488', completed: false },
        { id: 'dmp-feb25-10', title: 'Feb 12 - Spread Love & Healing', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157010647/posts/2185200489', completed: false },
        { id: 'dmp-feb25-11', title: 'Feb 13 - I Am ready to Let Go of Hurt', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157010647/posts/2185200490', completed: false },
        { id: 'dmp-feb25-12', title: 'Feb 14 - Happy Valentine Day Special DMP', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157010647/posts/2185234200', completed: false },
        { id: 'dmp-feb25-13', title: 'Feb 15 - I Am Unconditionally Happy', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157010647/posts/2185288989', completed: false },
        { id: 'dmp-feb25-14', title: 'Feb 17 - Unlimited Action Unlimited Fun', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157010647/posts/2185289026', completed: false },
        { id: 'dmp-feb25-15', title: 'Feb 18 - I Promise to Share My Gift', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157010647/posts/2185318378', completed: false },
        { id: 'dmp-feb25-16', title: 'Feb 19 - I Have Decided', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157010647/posts/2185698766', completed: false },
        { id: 'dmp-feb25-17', title: 'Feb 20 - I Forgive Myself, I Start a New Life', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157010647/posts/2185698771', completed: false },
        { id: 'dmp-feb25-18', title: 'Feb 21 - Yes I Have SO What I can Start Again', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157010647/posts/2185698771', completed: false },
        { id: 'dmp-feb25-19', title: 'Feb 22 - I Am Happy I Have Everything I Need', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157010647/posts/2185698786', completed: false },
        { id: 'dmp-feb25-20', title: 'Feb 24 - I Am Ready To Upgrade My Life', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157010647/posts/2185698792', completed: false },
        { id: 'dmp-feb25-21', title: 'Feb 25 - I Have No Limits', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157010647/posts/2185698788', completed: false },
        { id: 'dmp-feb25-22', title: 'Feb 26 - Special Maha Shivratri OM Meditation', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157010647/posts/2185698802', completed: false },
        { id: 'dmp-feb25-23', title: 'Feb 27 - Universe is my Partner', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157010647/posts/2185698817', completed: false },
        { id: 'dmp-feb25-24', title: 'Feb 28 - Ho\'Oponopono Practice', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2157010647/posts/2185698833', completed: false },
        { id: 'dmp-jan25-1', title: 'Jan 1 - Happy New Me', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156797996/posts/2183958095', completed: false },
        { id: 'dmp-jan25-2', title: 'Jan 2 - I am ready to release my negative energy', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156797996/posts/2183958098', completed: false },
        { id: 'dmp-jan25-3', title: 'Jan 3 - Its easy to be Happy', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156797996/posts/2184047988', completed: false },
        { id: 'dmp-jan25-4', title: 'Jan 4 - I Am Happy I Have Everything I Need', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156797996/posts/2184047990', completed: false },
        { id: 'dmp-jan25-5', title: 'Jan 6 - I believe in Myself', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156797996/posts/2184048020', completed: false },
        { id: 'dmp-jan25-6', title: 'Jan 7 - I Dont Feel, I Create Feelings', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156797996/posts/2184086931', completed: false },
        { id: 'dmp-jan25-7', title: 'Jan 8 - When Nothing is Working, My Universe is Working', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156797996/posts/2184167716', completed: false },
        { id: 'dmp-jan25-8', title: 'Jan 9 - Thank You to Everyone Everything', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156797996/posts/2184167719', completed: false },
        { id: 'dmp-jan25-9', title: 'Jan 10 - Ho\'Oponopono', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156797996/posts/2184356073', completed: false },
        { id: 'dmp-jan25-10', title: 'Jan 13 - I am Emotionally RICH', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156797996/posts/2184356077', completed: false },
        { id: 'dmp-jan25-11', title: 'Jan 14 - What I Don\'t Have, I Give', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156797996/posts/2184356079', completed: false },
        { id: 'dmp-jan25-12', title: 'Jan 15 - Yes I have the Energy', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156797996/posts/2184356081', completed: false },
        { id: 'dmp-jan25-13', title: 'Jan 16 - I Am Unconditionally Happy', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156797996/posts/2184456740', completed: false },
        { id: 'dmp-jan25-14', title: 'Jan 17 - I Am The Universe', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156797996/posts/2184456742', completed: false },
        { id: 'dmp-jan25-15', title: 'Jan 18 - My Life is Complete', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156797996/posts/2184456745', completed: false },
        { id: 'dmp-jan25-16', title: 'Jan 20 - I Am Always Taken Care of', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156797996/posts/2184495883', completed: false },
        { id: 'dmp-jan25-17', title: 'Jan 21 - Say NO to Low Quality Emotions', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156797996/posts/2184602417', completed: false },
        { id: 'dmp-jan25-18', title: 'Jan 22 - What I Remember The Most, I Feel The Most', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156797996/posts/2184602425', completed: false },
        { id: 'dmp-jan25-19', title: 'Jan 23 - Feeling Relaxed is Very Easy', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156797996/posts/2184602431', completed: false },
        { id: 'dmp-jan25-20', title: 'Jan 24 - All Type of People are Acceptable', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156797996/posts/2184689543', completed: false },
        { id: 'dmp-jan25-21', title: 'Jan 25 - This Weekend My Life is Perfect', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156797996/posts/2184689549', completed: false },
        { id: 'dmp-jan25-22', title: 'Jan 27 - I Love Myself the Way I Am', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156797996/posts/2184689552', completed: false },
        { id: 'dmp-jan25-23', title: 'Jan 28 - My Life is What i Say it is', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156797996/posts/2184751958', completed: false },
        { id: 'dmp-jan25-24', title: 'Jan 29 - The Way we Deal with Ourself', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156797996/posts/2184751959', completed: false },
        { id: 'dmp-jan25-25', title: 'Jan 30 - Thank You Jan, Welcome Feb', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156797996/posts/2184781414', completed: false },
        { id: 'dmp-jan25-26', title: 'Jan 31 - I Take 100% Responsibility for my Life', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156797996/posts/2184819237', completed: false },
        { id: 'dmp-dec24-1', title: 'Dec 2 - My Emotions are My Habits', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156639129/posts/2183295239', completed: false },
        { id: 'dmp-dec24-2', title: 'Dec 3 - I am willing to believe miracle are possible', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156639129/posts/2183295242', completed: false },
        { id: 'dmp-dec24-3', title: 'Dec 4 - Root Cause of my emotion are imbalance', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156639129/posts/2183355407', completed: false },
        { id: 'dmp-dec24-4', title: 'Dec 5 - I Am Unconditionally Happy', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156639129/posts/2183355410', completed: false },
        { id: 'dmp-dec24-5', title: 'Dec 6 - The Universe is Inside Me I Can Do Anything', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156639129/posts/2183383686', completed: false },
        { id: 'dmp-dec24-6', title: 'Dec 7 - All I Need is Within Me Now', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156639129/posts/2183479260', completed: false },
        { id: 'dmp-dec24-7', title: 'Dec 9 - I am Unconditionally Happy', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156639129/posts/2183479262', completed: false },
        { id: 'dmp-dec24-8', title: 'Dec 10 - I See Myself in Everyone', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156639129/posts/2183479265', completed: false },
        { id: 'dmp-dec24-9', title: 'Dec 11 - I Am a Magician, I Keep Learning and Growing', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156639129/posts/2183545793', completed: false },
        { id: 'dmp-dec24-10', title: 'Dec 12 - Bring it ON, I Can Handle It', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156639129/posts/2183545796', completed: false },
        { id: 'dmp-dec24-11', title: 'Dec 14 - I Create My Own Reality', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156639129/posts/2183750554', completed: false },
        { id: 'dmp-dec24-12', title: 'Dec 16 - I Can Change My Emotions FAST', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156639129/posts/2183750662', completed: false },
        { id: 'dmp-dec24-13', title: 'Dec 17 - Yes i have the Energy', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156639129/posts/2183750664', completed: false },
        { id: 'dmp-dec24-14', title: 'Dec 18 - The Best Year of Your Life Day 1', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156639129/posts/2183750665', completed: false },
        { id: 'dmp-dec24-15', title: 'Dec 19 - The Best Year of Your Life Day 2', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156639129/posts/2183750666', completed: false },
        { id: 'dmp-dec24-16', title: 'Dec 20 - The Best Year of Your Life Day 3', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156639129/posts/2183750667', completed: false },
        { id: 'dmp-dec24-17', title: 'Dec 21 - I AM Ready for Success & Failure Both', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156639129/posts/2183794922', completed: false },
        { id: 'dmp-dec24-18', title: 'Dec 23 - I Am Ready for Blessings', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156639129/posts/2183794993', completed: false },
        { id: 'dmp-dec24-19', title: 'Dec 24 - All I Need is Within Me Now', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156639129/posts/2183804605', completed: false },
        { id: 'dmp-dec24-20', title: 'Dec 25 - I Live My Future NOW', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156639129/posts/2183844689', completed: false },
        { id: 'dmp-dec24-21', title: 'Dec 26 - I Fall Fast I Move ON Fast', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156639129/posts/2183844691', completed: false },
        { id: 'dmp-dec24-22', title: 'Dec 27 - Love is Easy if i Make it Easy', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156639129/posts/2183844692', completed: false },
        { id: 'dmp-dec24-23', title: 'Dec 28 - I Am Ready to Release all my Negative Energy', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156639129/posts/2183958073', completed: false },
        { id: 'dmp-dec24-24', title: 'Dec 30 - My Words Have Magic', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156639129/posts/2183958077', completed: false },
        { id: 'dmp-dec24-25', title: 'Dec 31 - Happy New Year', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156639129/posts/2183958086', completed: false },
        { id: 'dmp-nov24-1', title: 'Nov 1 - Emotional Prosperity', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156444981/posts/2182501682', completed: false },
        { id: 'dmp-nov24-2', title: 'Nov 2 - I Give Time To My Family', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156444981/posts/2182501692', completed: false },
        { id: 'dmp-nov24-3', title: 'Nov 4 - I am Born Committed', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156444981/posts/2182501695', completed: false },
        { id: 'dmp-nov24-4', title: 'Nov 5 - I Love Myself The Way I am Unconditionally', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156444981/posts/2182677596', completed: false },
        { id: 'dmp-nov24-5', title: 'Nov 7 - I Surrender', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156444981/posts/2182677613', completed: false },
        { id: 'dmp-nov24-6', title: 'Nov 8 - My FTBA is Aligned with My Goals', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156444981/posts/2182702005', completed: false },
        { id: 'dmp-nov24-7', title: 'Nov 9 - This Weekend My Life is Perfect', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156444981/posts/2182702034', completed: false },
        { id: 'dmp-nov24-8', title: 'Nov 11 - I Am a Balanced Magician', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156444981/posts/2182702043', completed: false },
        { id: 'dmp-nov24-9', title: 'Nov 12 - I AM Responsible for the way i Feel', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156444981/posts/2182892018', completed: false },
        { id: 'dmp-nov24-10', title: 'Nov 13 - I am a warrior', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156444981/posts/2182892019', completed: false },
        { id: 'dmp-nov24-11', title: 'Nov 14 - Health HoOponopono', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156444981/posts/2182892020', completed: false },
        { id: 'dmp-nov24-12', title: 'Nov 15 - Relationship HoOponopono', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156444981/posts/2182892043', completed: false },
        { id: 'dmp-nov24-13', title: 'Nov 16 - I am 100% Sure', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156444981/posts/2182892036', completed: false },
        { id: 'dmp-nov24-14', title: 'Nov 18 - HoOponopono for Career', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156444981/posts/2182892050', completed: false },
        { id: 'dmp-nov24-15', title: 'Nov 19 - I Love Money', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156444981/posts/2182959720', completed: false },
        { id: 'dmp-nov24-16', title: 'Nov 20 - I Am Ready for Greatness', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156444981/posts/2182992686', completed: false },
        { id: 'dmp-nov24-17', title: 'Nov 21 - I Am Peaceful', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156444981/posts/2182992688', completed: false },
        { id: 'dmp-nov24-18', title: 'Nov 22 - I Am a Magician', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156444981/posts/2183020443', completed: false },
        { id: 'dmp-nov24-19', title: 'Nov 23 - I Love Myself The Way I Am', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156444981/posts/2183050737', completed: false },
        { id: 'dmp-nov24-20', title: 'Nov 25 - I Have Unlimited Chances', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156444981/posts/2183087272', completed: false },
        { id: 'dmp-nov24-21', title: 'Nov 26 - Ho\'Oponopono', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156444981/posts/2183122756', completed: false },
        { id: 'dmp-nov24-22', title: 'Nov 27 - Small Changes Can Make Big Changes', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156444981/posts/2183153225', completed: false },
        { id: 'dmp-nov24-23', title: 'Nov 28 - I Am Satisfied Not Desperate', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156444981/posts/2183216634', completed: false },
        { id: 'dmp-nov24-24', title: 'Nov 29 - I Live Life Platinum Standards', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156444981/posts/2183216638', completed: false },
        { id: 'dmp-nov24-25', title: 'Nov 30 - I Am Enough I Believe in Myself', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156444981/posts/2183216640', completed: false },
        { id: 'dmp-oct24-1', title: 'Oct 1 - It is Easy to Smile', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156248499/posts/2181683289', completed: false },
        { id: 'dmp-oct24-2', title: 'Oct 2 - Focus all your Energy in Third Eye', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156248499/posts/2181683300', completed: false },
        { id: 'dmp-oct24-3', title: 'Oct 3 - 9 Days of Navratri Fasting', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156248499/posts/2181754575', completed: false },
        { id: 'dmp-oct24-4', title: 'Oct 4 - I Am Responsible for Everything in My Life', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156248499/posts/2181754577', completed: false },
        { id: 'dmp-oct24-5', title: 'Oct 5 - I Am Unconditionally Happy', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156248499/posts/2181900290', completed: false },
        { id: 'dmp-oct24-6', title: 'Oct 7 - Say NO to Low Quality Emotions', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156248499/posts/2181900296', completed: false },
        { id: 'dmp-oct24-7', title: 'Oct 10 - I Have Unlimited Options, Unlimited Chances', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156248499/posts/2181900311', completed: false },
        { id: 'dmp-oct24-8', title: 'Oct 11 - I AM Happy Unconditionally', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156248499/posts/2181900318', completed: false },
        { id: 'dmp-oct24-9', title: 'Oct 12 - I surrender', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156248499/posts/2181970744', completed: false },
        { id: 'dmp-oct24-10', title: 'Oct 14 - I Love Myself The Way I Am', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156248499/posts/2181970746', completed: false },
        { id: 'dmp-oct24-11', title: 'Oct 15 - Ho\'Oponopono', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156248499/posts/2181984831', completed: false },
        { id: 'dmp-oct24-12', title: 'Oct 16 - Enough Solving Time for Evolving', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156248499/posts/2182066190', completed: false },
        { id: 'dmp-oct24-13', title: 'Oct 17 - I Say Who I Say I Am', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156248499/posts/2182066194', completed: false },
        { id: 'dmp-oct24-14', title: 'Oct 18 - I Am Ready to Be Imperfect', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156248499/posts/2182101113', completed: false },
        { id: 'dmp-oct24-15', title: 'Oct 19 - Nothing is a Curse Everything Is a Blessing', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156248499/posts/2182147449', completed: false },
        { id: 'dmp-oct24-16', title: 'Oct 21 - I love myself', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156248499/posts/2182147452', completed: false },
        { id: 'dmp-oct24-17', title: 'Oct 22 - Take a Chill Pill', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156248499/posts/2182176178', completed: false },
        { id: 'dmp-oct24-18', title: 'Oct 23 - I Live this Moment Fully', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156248499/posts/2182259736', completed: false },
        { id: 'dmp-oct24-19', title: 'Oct 24 - At Energy level we are all One', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156248499/posts/2182259737', completed: false },
        { id: 'dmp-oct24-20', title: 'Oct 25 - HoOponopono', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156248499/posts/2182259739', completed: false },
        { id: 'dmp-oct24-21', title: 'Oct 26 - Feeling Relaxed is Very Easy for Me', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156248499/posts/2182501653', completed: false },
        { id: 'dmp-oct24-22', title: 'Oct 28 - My Birthday Celebration', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156248499/posts/2182501662', completed: false },
        { id: 'dmp-oct24-23', title: 'Oct 29 - I AM', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156248499/posts/2182501668', completed: false },
        { id: 'dmp-oct24-24', title: 'Oct 30 - A heart full of love', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156248499/posts/2182501673', completed: false },
        { id: 'dmp-oct24-25', title: 'Oct 31 - Daily Dance', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156248499/posts/2182416527', completed: false },
        { id: 'dmp-sep24-1', title: 'Sep 2 - I Am Ready to Be Imperfect', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156102824/posts/2181064204', completed: false },
        { id: 'dmp-sep24-2', title: 'Sep 3 - I AM Ready for Success & Failure Both', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156102824/posts/2181064205', completed: false },
        { id: 'dmp-sep24-3', title: 'Sep 4 - My Frequency is more Important', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156102824/posts/2181064208', completed: false },
        { id: 'dmp-sep24-4', title: 'Sep 5 - I am Ready to Open My Heart', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156102824/posts/2181064213', completed: false },
        { id: 'dmp-sep24-5', title: 'Sep 6 - I am A magician', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156102824/posts/2181064217', completed: false },
        { id: 'dmp-sep24-6', title: 'Sep 7 - I Create My Own Reality', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156102824/posts/2181064215', completed: false },
        { id: 'dmp-sep24-7', title: 'Sep 9 - I Am Ready for Blessings', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156102824/posts/2181064220', completed: false },
        { id: 'dmp-sep24-8', title: 'Sep 10 - LIVE Coaching to Help Suicidal People to Live Inspired Life', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156102824/posts/2181220654', completed: false },
        { id: 'dmp-sep24-9', title: 'Sep 11 - Yes I Am Ready to Grow', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156102824/posts/2181220660', completed: false },
        { id: 'dmp-sep24-10', title: 'Sep 12 - I Am Healed, I Leave the Past Behind', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156102824/posts/2181220665', completed: false },
        { id: 'dmp-sep24-11', title: 'Sep 13 - I Love Being Happy', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156102824/posts/2181220670', completed: false },
        { id: 'dmp-sep24-12', title: 'Sep 14 - Feeling Relaxed is Very Easy for Me', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156102824/posts/2181220672', completed: false },
        { id: 'dmp-sep24-13', title: 'Sep 16 - I am taken care of', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156102824/posts/2181288460', completed: false },
        { id: 'dmp-sep24-14', title: 'Sep 17 - I Am Satisfied', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156102824/posts/2181288462', completed: false },
        { id: 'dmp-sep24-15', title: 'Sep 18 - Complete Basic Law of Attraction Course', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156102824/posts/2181410368', completed: false },
        { id: 'dmp-sep24-16', title: 'Sep 19 - I Am ready to THINK BIG', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156102824/posts/2181410373', completed: false },
        { id: 'dmp-sep24-17', title: 'Sep 20 - Life is What i Say It Is', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156102824/posts/2181410379', completed: false },
        { id: 'dmp-sep24-18', title: 'Sep 23 - Love\'ponopono', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156102824/posts/2181540219', completed: false },
        { id: 'dmp-sep24-19', title: 'Sep 24 - I Let go if these Attachments', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156102824/posts/2181540292', completed: false },
        { id: 'dmp-sep24-20', title: 'Sep 25 - Ho\'Oponopono', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156102824/posts/2181540294', completed: false },
        { id: 'dmp-sep24-21', title: 'Sep 26 - I Am Ready to Feel, Ready to Live', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2156102824/posts/2181540295', completed: false },
        { id: 'dmp-aug24-1', title: 'Aug 1 - Being Happy is Easy', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2155912872/posts/2180221976', completed: false },
        { id: 'dmp-aug24-2', title: 'Aug 2 - Changing Emotions is Easy', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2155912872/posts/2180221977', completed: false },
        { id: 'dmp-aug24-3', title: 'Aug 5 - I Replace Desperation with Satisfaction', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2155912872/posts/2180221978', completed: false },
        { id: 'dmp-aug24-4', title: 'Aug 6 - Anniversary Special Sharing', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2155912872/posts/2180221979', completed: false },
        { id: 'dmp-aug24-5', title: 'Aug 7 - I Can Restart', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2155912872/posts/2180221980', completed: false },
        { id: 'dmp-aug24-6', title: 'Aug 8 - My Emotions are More Important Than My Goals', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2155912872/posts/2180221981', completed: false },
        { id: 'dmp-aug24-7', title: 'Aug 9 - I AM Ready to Upgrade My Standards', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2155912872/posts/2180221982', completed: false },
        { id: 'dmp-aug24-8', title: 'Aug 10 - Feeling Relaxed is Very Easy for Me', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2155912872/posts/2180480837', completed: false },
        { id: 'dmp-aug24-9', title: 'Aug 12 - I Am Balanced', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2155912872/posts/2180480840', completed: false },
        { id: 'dmp-aug24-10', title: 'Aug 13 - I Love Myself, I Love My Life', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2155912872/posts/2180480843', completed: false },
        { id: 'dmp-aug24-11', title: 'Aug 14 - Feeling Relaxed is Very Easy for Me', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2155912872/posts/2180480845', completed: false },
        { id: 'dmp-aug24-12', title: 'Aug 15 - I Surrender', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2155912872/posts/2180480848', completed: false },
        { id: 'dmp-aug24-13', title: 'Aug 16 - I Can Change My Emotions FAST', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2155912872/posts/2180480853', completed: false },
        { id: 'dmp-aug24-14', title: 'Aug 17 - Nothing is a Curse Everything is a Blessing', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2155912872/posts/2180480857', completed: false },
        { id: 'dmp-aug24-15', title: 'Aug 19 - All I Need is Within Me Now', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2155912872/posts/2180480870', completed: false },
        { id: 'dmp-aug24-16', title: 'Aug 20 - I Am A Peaceful Achiever', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2155912872/posts/2180747531', completed: false },
        { id: 'dmp-aug24-17', title: 'Aug 21 - Being Happy is More Important Than Being Right', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2155912872/posts/2180747562', completed: false },
        { id: 'dmp-aug24-18', title: 'Aug 22 - I Am Ready to Accept I Am a Magician', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2155912872/posts/2180747583', completed: false },
        { id: 'dmp-aug24-19', title: 'Aug 22 - My Experience with Dr Joe Dispenza Workshop in Texas', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2155912872/posts/2180747691', completed: false },
        { id: 'dmp-aug24-20', title: 'Aug 23 - Feeling Relaxed is very Easy', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2155912872/posts/2180747704', completed: false },
        { id: 'dmp-aug24-21', title: 'Aug 24 - I Am Reaady to Release all my Negative Energy', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2155912872/posts/2180747711', completed: false },
        { id: 'dmp-aug24-22', title: 'Aug 26 - Bring it ON!', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2155912872/posts/2180747727', completed: false },
        { id: 'dmp-aug24-23', title: 'Aug 27 - I Dont Know How', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2155912872/posts/2180747844', completed: false },
        { id: 'dmp-aug24-24', title: 'Aug 28 - I Am Ready for Divine Energy', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2155912872/posts/2180747848', completed: false },
        { id: 'dmp-jul24-1', title: 'Jul 1 - I have Limitation,How much i can Achieve', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2155912873/posts/2180221983', completed: false },
        { id: 'dmp-jul24-2', title: 'Jul 2 - I Surrender to You Universe', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2155912873/posts/2180221984', completed: false },
        { id: 'dmp-jul24-3', title: 'Jul 3 - My Emotions are Habit, I Control Them', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2155912873/posts/2180221985', completed: false },
        { id: 'dmp-jul24-4', title: 'Jul 4 - I Am Unconditionally Happy', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2155912873/posts/2180221986', completed: false },
        { id: 'dmp-jul24-5', title: 'Jul 5 - Anger is Silly', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2155912873/posts/2180221987', completed: false },
        { id: 'dmp-jul24-6', title: 'Jul 6 - Feeling Relaxed is Very Easy for Me', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2155912873/posts/2180221988', completed: false },
        { id: 'dmp-jul24-7', title: 'Jul 8 - 7 Days Challenge to Stop Evolving', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2155912873/posts/2180221989', completed: false },
        { id: 'dmp-jul24-8', title: 'Jul 9 - I take 100% Responsibility For Everything Happening in My Life', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2155912873/posts/2180221990', completed: false },
        { id: 'dmp-jul24-9', title: 'Jul 10 - I Am Ready to Create My Future', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2155912873/posts/2180221991', completed: false },
        { id: 'dmp-jul24-10', title: 'Jul 11 - I Attract What I Feel', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2155912873/posts/2180221992', completed: false },
        { id: 'dmp-jul24-11', title: 'Jul 12 - I Can Restart Unlimited times', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2155912873/posts/2180221993', completed: false },
        { id: 'dmp-jul24-12', title: 'Jul 13 - Hooponopono Healing', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2155912873/posts/2180221994', completed: false },
        { id: 'dmp-jul24-13', title: 'Jul 15 - I Can Change My Emotions FAST', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2155912873/posts/2180221995', completed: false },
        { id: 'dmp-jul24-14', title: 'Jul 16 - I am Ready to Be a Totally Different Person', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2155912873/posts/2180221996', completed: false },
        { id: 'dmp-jul24-15', title: 'Jul 17 - I am a Giver', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2155912873/posts/2180221997', completed: false },
        { id: 'dmp-jul24-16', title: 'Jul 18 - The Smaller the person inside me Bigger the result Outside me', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2155912873/posts/2180221998', completed: false },
        { id: 'dmp-jul24-17', title: 'Jul 19 - I Am Responsible for Everything in My Life', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2155912873/posts/2180221999', completed: false },
        { id: 'dmp-jul24-18', title: 'Jul 20 - This Weekend My Life is Perfect', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2155912873/posts/2180222000', completed: false },
        { id: 'dmp-jul24-19', title: 'Jul 22 - I am Ready to Except I am a Magician', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2155912873/posts/2180222001', completed: false },
        { id: 'dmp-jul24-20', title: 'Jul 23 - I AM I HAVE', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2155912873/posts/2180222002', completed: false },
        { id: 'dmp-jul24-21', title: 'Jul 24 - Making Money is Very Easy', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2155912873/posts/2180222003', completed: false },
        { id: 'dmp-jul24-22', title: 'Jul 25 - Love is Easy', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2155912873/posts/2180222004', completed: false },
        { id: 'dmp-jul24-23', title: 'Jul 26 - The Universe is My Partner', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2155912873/posts/2180222005', completed: false },
        { id: 'dmp-jul24-24', title: 'Jul 27 - I Am Reaady to Release all my Negative Energy', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2155912873/posts/2180222006', completed: false },
        { id: 'dmp-jul24-25', title: 'Jul 29 - All I Need is Within Me Now', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2155912873/posts/2180222007', completed: false },
        { id: 'dmp-jul24-26', title: 'Jul 30 - YES I Have The Energy to Take Care of My Health', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2155912873/posts/2180222008', completed: false },
        { id: 'dmp-jul24-27', title: 'Jul 31 - My Life is Perfect', url: 'https://coaching.miteshkhatri.com/products/platinum-dmp/categories/2155912873/posts/2180222009', completed: false },
      ]
    }
  ]);

  // Load lesson completions from database on mount
  useEffect(() => {
    const loadCompletions = async () => {
      if (!currentUser || courses.length === 0) return;
      
      try {
        console.log('[Course Tracker] Loading completions for user:', currentUser.id);
        // Fetch completions for all courses
        const allCompletions: Record<string, string[]> = {};
        
        for (const course of courses) {
          try {
            const response = await fetch(`/api/course-video-completions/${course.id}`);
            if (response.ok) {
              const completions = await response.json();
              // Store video IDs that are completed
              allCompletions[course.id] = completions.map((c: any) => c.videoId);
              console.log(`[Course Tracker] ${course.id}:`, allCompletions[course.id].length, 'completions loaded');
            }
          } catch (error) {
            console.error(`Failed to fetch completions for ${course.id}:`, error);
          }
        }
        
        console.log('[Course Tracker] All completions loaded:', allCompletions);
        
        // Update courses state with completion status
        setCourses(prevCourses => 
          prevCourses.map(course => ({
            ...course,
            lessons: course.lessons.map(lesson => {
              const isCompleted = allCompletions[course.id]?.includes(`${course.id}-${lesson.id}`) || false;
              if (isCompleted) {
                console.log(`[Course Tracker] Marking ${course.id}-${lesson.id} as completed`);
              }
              return {
                ...lesson,
                completed: isCompleted
              };
            })
          }))
        );
      } catch (error) {
        console.error('Error loading lesson completions:', error);
      }
    };
    
    loadCompletions();
  }, [currentUser]); // Only run when user is loaded

  // Fetch ALL-TIME cumulative points (all ritual completions + all course lessons)
  const { data: totalPointsData } = useQuery<{
    totalPoints: number;
    ritualPoints: number;
    lessonPoints: number;
    ritualCount: number;
    lessonCount: number;
  }>({
    queryKey: ['/api/user/total-points'],
    enabled: !!currentUser,
  });

  // Update totalPoints when data is fetched
  useEffect(() => {
    if (totalPointsData) {
      setTotalPoints(totalPointsData.totalPoints);
    }
  }, [totalPointsData]);

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

  // Redirect to login if not authenticated (but not while loading or if there's an error with retry disabled)
  useEffect(() => {
    if (!userLoading && userError && !currentUser) {
      setLocation('/');
    }
  }, [currentUser, userLoading, userError, setLocation]);
  
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
        {/* Course Recommendations */}
        <CourseRecommendations currentWeek={currentWeek} />
        
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
                            
                            <Badge className="gap-1 bg-gradient-to-r from-primary to-accent text-white border-0 smooth-transition">
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

        <section ref={coursesRef} id="courses" className="scroll-mt-20 bg-blue-50 dark:bg-blue-950/40 p-6 rounded-lg border-2 border-blue-200 dark:border-blue-800">
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
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-green to-golden-yellow smooth-transition emerald-glow"
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
                                <Badge className="text-[10px] px-1.5 py-0 h-4 bg-gradient-to-r from-primary to-accent text-white border-0">
                                  {completedLessons}/{totalLessons}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{course.source}</p>
                            {totalLessons > 0 && (
                              <div className="mt-1.5 flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-teal-400 transition-all duration-300"
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
                                    onCheckedChange={async (checked) => {
                                      // Update local state first for immediate UI feedback
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
                                      
                                      try {
                                        console.log(`[Lesson Toggle] Toggling ${course.id}-${lesson.id}, checked:`, checked);
                                        
                                        // Toggle completion in database
                                        const toggleResponse = await apiRequest('POST', '/api/course-video-completions/toggle', {
                                          videoId: `${course.id}-${lesson.id}`,
                                          courseId: course.id
                                        });
                                        
                                        const toggleData = await toggleResponse.json();
                                        console.log('[Lesson Toggle] API Response:', toggleData);
                                        
                                        if (!toggleResponse.ok) {
                                          console.error('[Lesson Toggle] API failed:', toggleData);
                                          throw new Error('Failed to toggle lesson completion');
                                        }
                                        
                                        console.log('[Lesson Toggle] Successfully saved to database');
                                        
                                        // If checked, add to category assignment; if unchecked, remove from assignment
                                        if (checked) {
                                          const assignmentResponse = await apiRequest('POST', '/api/unified-assignment/add-lesson', {
                                            weekNumber: currentWeek,
                                            category: course.category, // Pass course category (Health, Money, etc.)
                                            lesson: {
                                              id: `${course.id}-${lesson.id}`,
                                              courseId: course.id,
                                              courseName: course.title,
                                              lessonName: lesson.title,
                                              url: lesson.url || '',
                                              completed: false
                                            }
                                          });
                                          
                                          if (assignmentResponse.ok) {
                                            // Invalidate queries to refresh assignment data
                                            queryClient.invalidateQueries({ queryKey: ['/api/hercm/week', currentWeek] });
                                            
                                            toast({
                                              title: 'Lesson Completed!',
                                              description: `${lesson.title} added to ${course.category} Assignment`,
                                            });
                                          }
                                        } else {
                                          // Remove from assignment when unchecked
                                          const removeResponse = await apiRequest('POST', '/api/unified-assignment/remove-lesson', {
                                            weekNumber: currentWeek,
                                            category: course.category, // Pass course category
                                            lessonId: `${course.id}-${lesson.id}`
                                          });
                                          
                                          if (removeResponse.ok) {
                                            // Invalidate queries to refresh assignment data
                                            queryClient.invalidateQueries({ queryKey: ['/api/hercm/week', currentWeek] });
                                            
                                            toast({
                                              title: 'Lesson Unchecked',
                                              description: `${lesson.title} removed from Assignment column`,
                                            });
                                          } else {
                                            toast({
                                              title: 'Lesson Unchecked',
                                              description: 'Marked as incomplete',
                                            });
                                          }
                                        }
                                      } catch (error) {
                                        console.error('Error updating lesson:', error);
                                        // Revert local state on error
                                        setCourses(prev => prev.map(c => 
                                          c.id === course.id
                                            ? {
                                                ...c,
                                                lessons: c.lessons.map(l =>
                                                  l.id === lesson.id
                                                    ? { ...l, completed: !checked }
                                                    : l
                                                )
                                              }
                                            : c
                                        ));
                                        toast({
                                          title: 'Error',
                                          description: 'Failed to update lesson status',
                                          variant: 'destructive'
                                        });
                                      }
                                    }}
                                    className="mt-0.5"
                                    data-testid={`checkbox-lesson-${lesson.id}`}
                                  />
                                  <div className="flex-1 flex items-center justify-between gap-2">
                                    {lesson.url ? (
                                      <a
                                        href={lesson.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs cursor-pointer flex-1 hover:underline text-primary hover:text-primary/80"
                                        data-testid={`link-lesson-${lesson.id}`}
                                      >
                                        {lesson.title}
                                      </a>
                                    ) : (
                                      <span className="text-xs flex-1">
                                        {lesson.title}
                                      </span>
                                    )}
                                    <Badge 
                                      className="text-[10px] px-1.5 py-0 h-5 bg-gradient-to-r from-primary to-accent text-white border-0 golden-glow smooth-transition"
                                      data-testid={`badge-points-${lesson.id}`}
                                    >
                                      +{lesson.points || 10} pts
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="bg-white/5 rounded-lg p-3 mt-2">
                              <p className="text-xs text-white/60">No lessons available yet</p>
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

        {/* Emotional Tracker Section */}
        <section className="scroll-mt-20">
          <EmotionalTracker />
        </section>

        {/* Achievements, Badges & Leaderboard Section */}
        <section ref={achievementsRef} id="achievements" className="scroll-mt-20 bg-blue-50 dark:bg-blue-950/40 p-6 rounded-lg border-2 border-blue-200 dark:border-blue-800">
          <BadgeDisplayCard 
            leaderboardEntries={leaderboardEntries} 
            currentUserId={currentUser?.id}
          />
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

      {/* Assignment Category Selection Dialog */}
      <Dialog open={assignmentDialogOpen} onOpenChange={setAssignmentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select HRCM Category</DialogTitle>
            <DialogDescription>
              Choose which category to add these {pendingAssignmentLessons.length} lessons to in the Assignment column
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {['Health', 'Relationship', 'Career', 'Money'].map((category) => (
              <Button
                key={category}
                variant="outline"
                className="h-20 text-lg font-semibold hover-elevate"
                onClick={async () => {
                  try {
                    const response = await apiRequest('POST', '/api/assignment/add-lessons', {
                      weekNumber: currentWeek,
                      category,
                      lessons: pendingAssignmentLessons,
                    });

                    if (response.ok) {
                      // Invalidate the HRCM query to refresh the data
                      queryClient.invalidateQueries({ queryKey: ['/api/hercm', currentWeek] });
                      
                      toast({
                        title: 'Lessons Added!',
                        description: `${pendingAssignmentLessons.length} lessons added to ${category} Assignment`,
                      });
                      
                      setAssignmentDialogOpen(false);
                      setPendingAssignmentLessons([]);
                    }
                  } catch (error) {
                    console.error('Error adding lessons:', error);
                    toast({
                      title: 'Error',
                      description: 'Failed to add lessons. Please try again.',
                      variant: 'destructive',
                    });
                  }
                }}
                data-testid={`button-category-${category.toLowerCase()}`}
              >
                {category}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
