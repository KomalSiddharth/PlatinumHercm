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
        { id: 'bloa-1', title: 'What are the 4 Levels of LOA', url: '', completed: false },
        { id: 'bloa-2', title: 'What is Law of Attraction', url: '', completed: false },
        { id: 'bloa-3', title: 'Why LOA Works', url: '', completed: false },
        { id: 'bloa-4', title: 'What is The FORMULA of LOA', url: '', completed: false },
        { id: 'bloa-5', title: 'Four Rules of Tuning Perfect Affirmations', url: '', completed: false },
        { id: 'bloa-6', title: 'Four Areas of Tuning Affirmations', url: '', completed: false },
        { id: 'bloa-7', title: 'Three Type of Affirmations for Success', url: '', completed: false },
        { id: 'bloa-8', title: 'How to Prepare Your Affirmations', url: '', completed: false },
        { id: 'bloa-9', title: 'How to Practice Affirmations in the Right Way', url: '', completed: false },
        { id: 'bloa-10', title: 'How to Clear Negative Energy with HO OPONO OPONO', url: '', completed: false },
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
      id: 'manifest-chakra',
      title: 'Manifest With Chakra by Mitesh Khatri',
      url: '#',
      tags: ['Chakra', 'Energy'],
      source: 'Mitesh Khatri',
      estimatedHours: 16,
      status: 'not_started',
      progressPercent: 0,
      category: 'default',
      lessons: []
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
        { id: 'ps-1', title: 'What is Practical Spirituality', url: '', completed: false },
        { id: 'ps-2', title: 'The Oneness Meditation Experience', url: '', completed: false },
        { id: 'ps-3', title: 'Meditation Experience Sharing', url: '', completed: false },
        { id: 'ps-4', title: 'Loving Accepting Your Dark Side', url: '', completed: false },
        { id: 'ps-5', title: 'If I Am Energy Then', url: '', completed: false },
        { id: 'ps-6', title: 'How to Create Balance in your Life', url: '', completed: false },
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
        { id: 'lc-1', title: 'Demo of Life Coaching Framework', url: 'https://www.miteshkhatri.com/CoachingDemo', completed: false },
        { id: 'lc-2', title: 'Understanding the Life Coaching Framework', url: 'https://www.miteshkhatri.com/CoachingFramework', completed: false },
        { id: 'lc-3', title: 'Health Coaching Blueprint', url: 'https://www.miteshkhatri.com/HealthCoaching', completed: false },
        { id: 'lc-4', title: 'Relationship Coaching Blueprint', url: 'https://www.miteshkhatri.com/RelationshipCoaching', completed: false },
        { id: 'lc-5', title: 'Career Coaching Blueprint', url: 'https://www.miteshkhatri.com/CareerCoaching', completed: false },
        { id: 'lc-6', title: 'Webinar Selling Formula Explained', url: 'https://www.miteshkhatri.com/WebinarSelling', completed: false },
        { id: 'lc-7', title: 'Discovery call Method to Convert Client', url: 'https://www.miteshkhatri.com/ClarityCall', completed: false },
        { id: 'lc-8', title: 'How to Create 3 Levels of Sales Funnel', url: 'https://www.miteshkhatri.com/SalesFunnel', completed: false },
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
        { id: 'ct-1', title: 'Manifest your Corporate Training Career', url: 'https://www.miteshkhatri.com/CoporateTraining', completed: false },
        { id: 'ct-2', title: 'How to Prove Your Results after Every Module', url: '', completed: false },
        { id: 'ct-3', title: 'How to Design Content Part 1', url: '', completed: false },
        { id: 'ct-4', title: 'How to Design Content Part 2', url: '', completed: false },
        { id: 'ct-5', title: 'Business Communication Skills Demo', url: '', completed: false },
        { id: 'ct-6', title: 'Experience Team Building with Ready Design', url: '', completed: false },
      ]
    },
    {
      id: 'loa-certification',
      title: 'Law Of Attraction Certification',
      url: 'https://www.miteshkhatri.com/LOACoach',
      tags: ['LOA', 'Certification'],
      source: 'Mitesh Khatri',
      estimatedHours: 28,
      status: 'not_started',
      progressPercent: 0,
      category: 'default',
      lessons: [
        { id: 'loac-1', title: 'LOA Certification Lesson 1', url: 'https://www.miteshkhatri.com/LOACoach', completed: false },
        { id: 'loac-2', title: 'What Content to Teach for Free', url: '', completed: false },
        { id: 'loac-3', title: 'How to Invite People for Paid Sessions', url: '', completed: false },
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
        { id: 'dmp-1', title: 'The Power & Potential of DMP', url: '', completed: false },
        { id: 'dmp-2', title: 'Technical Equipments Required for DMP', url: '', completed: false },
        { id: 'dmp-3', title: 'Visible Framework on DMP - The Iron Man Suite', url: '', completed: false },
        { id: 'dmp-4', title: 'How Much Money You Can Make with DMP', url: '', completed: false },
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
        { id: 'vastu-1', title: 'Science of Directions Elements & Impact', url: 'https://www.miteshkhatri.com/VastuCourse', completed: false },
        { id: 'vastu-2', title: 'Importance of 7 Chakras and Impact on Vastu', url: '', completed: false },
        { id: 'vastu-3', title: 'Alternatives for All Vastu Rooms', url: '', completed: false },
        { id: 'vastu-4', title: 'Understanding Plot Shapes & Extensions', url: '', completed: false },
        { id: 'vastu-5', title: 'Vastu Remedies with Crystals', url: '', completed: false },
        { id: 'vastu-6', title: 'LOA Remedies For Vastu', url: '', completed: false },
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
        { id: 'hm-1', title: 'What is Health - An Eye Opening Session', url: '', completed: false },
        { id: 'hm-2', title: 'Breaking Health Limiting Beliefs', url: '', completed: false },
        { id: 'hm-3', title: 'Creating a Lifestyle Diet Plan', url: '', completed: false },
        { id: 'hm-4', title: 'Transforming your Health Habits Part 1', url: '', completed: false },
        { id: 'hm-5', title: 'Transforming Habits Part 2', url: '', completed: false },
        { id: 'hm-6', title: 'Integrating 7 Master Steps', url: '', completed: false },
        { id: 'hm-7', title: 'Raise your Health Standards', url: '', completed: false },
        { id: 'hm-8', title: 'How to Design Workout', url: '', completed: false },
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
        { id: 'dc-1', title: 'Depression To Celebration Lesson 1', url: '', completed: false },
        { id: 'dc-2', title: 'Depression To Celebration Lesson 2', url: '', completed: false },
      ]
    },
    {
      id: 'handwriting-frequency',
      title: 'Handwriting Frequency Course',
      url: '#',
      tags: ['Handwriting', 'Frequency'],
      source: 'Mitesh Khatri',
      estimatedHours: 12,
      status: 'not_started',
      progressPercent: 0,
      category: 'default',
      lessons: []
    },
    {
      id: 'investing-saving',
      title: 'Investing & Saving',
      url: '#',
      tags: ['Finance', 'Investment'],
      source: 'Mitesh Khatri',
      estimatedHours: 18,
      status: 'not_started',
      progressPercent: 0,
      category: 'Money',
      lessons: []
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
        { id: 'db-1', title: 'Demartini Method Part 1', url: 'https://www.miteshkhatri.com/DemartiniMethod', completed: false },
        { id: 'db-2', title: 'Demartini Method Part 2', url: '', completed: false },
        { id: 'db-3', title: 'Demartini Method Part 3', url: '', completed: false },
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
        { id: 'dv-1', title: 'Importance Of Values', url: '', completed: false },
        { id: 'dv-2', title: 'Impact of Values', url: '', completed: false },
        { id: 'dv-3', title: 'Dr. Demartini Values Recognition Method', url: '', completed: false },
        { id: 'dv-4', title: 'How to Change Your Values', url: '', completed: false },
        { id: 'dv-5', title: 'How to Associate with Values', url: '', completed: false },
        { id: 'dv-6', title: 'How To Understand Someone Values', url: '', completed: false },
        { id: 'dv-7', title: 'How To Sell By Values', url: '', completed: false },
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

        <section ref={coursesRef} id="courses" className="scroll-mt-20 bg-emerald-50 dark:bg-emerald-950/40 p-6 rounded-lg border-2 border-emerald-200 dark:border-emerald-800">
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
                                  <label className={`text-xs cursor-pointer flex-1 ${lesson.completed ? 'line-through text-muted-foreground' : ''}`}>
                                    {lesson.title}
                                  </label>
                                  {lesson.url && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5"
                                      onClick={() => window.open(lesson.url, '_blank')}
                                      data-testid={`button-lesson-link-${lesson.id}`}
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                      </svg>
                                    </Button>
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
