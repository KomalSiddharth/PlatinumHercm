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
import UserDashboardSearch from '@/components/UserDashboardSearch';
import EmotionalTracker from '@/components/EmotionalTracker';
import { CourseRecommendations } from '@/components/CourseRecommendations';
import { CourseRecommendationNotification } from '@/components/CourseRecommendationNotification';
import FeedbackButton from '@/components/FeedbackButton';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Trophy, Pause, History as HistoryIcon, Trash2, ChevronDown, Book, RefreshCw, Map, ChevronRight, Folder, FolderOpen, FileText, CheckCircle2 } from 'lucide-react';
import type { Ritual as DbRitual, RitualCompletion } from '@shared/schema';

interface Ritual {
  id: string;
  title: string;
  recurrence: 'daily' | 'mon-fri' | 'custom';
  points: number;
  active: boolean;
  completed: boolean;
}

// Helper function to get today's date in YYYY-MM-DD format (LOCAL timezone, NOT UTC)
const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;  // IST local date
};

// Helper function to get current week's start date (Monday) in YYYY-MM-DD format (LOCAL timezone)
const getWeekStartDate = () => {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day; // If Sunday (0), go back 6 days, else go to Monday
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, '0');
  const dayOfMonth = String(monday.getDate()).padStart(2, '0');
  return `${year}-${month}-${dayOfMonth}`;
};

// Helper function to get current week's end date (Sunday) in YYYY-MM-DD format (LOCAL timezone)
const getWeekEndDate = () => {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? 0 : 7 - day; // If Sunday, stay same, else go to next Sunday
  const sunday = new Date(today);
  sunday.setDate(today.getDate() + diff);
  const year = sunday.getFullYear();
  const month = String(sunday.getMonth() + 1).padStart(2, '0');
  const dayOfMonth = String(sunday.getDate()).padStart(2, '0');
  return `${year}-${month}-${dayOfMonth}`;
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
  const [openCourses, setOpenCourses] = useState<Record<string, boolean>>({});
  const [openCourseSubcategories, setOpenCourseSubcategories] = useState<Record<string, boolean>>({});
  
  const [userName, setUserName] = useState('User');
  const [userEmail, setUserEmail] = useState('');
  const [totalPoints, setTotalPoints] = useState(0);
  
  // Use useState instead of useMemo so it can be updated when date changes at midnight
  const [todayDate, setTodayDate] = useState(getTodayDate());
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

  // Fetch ALL ritual completions (for history navigation across months)
  const { data: allRitualCompletions = [] } = useQuery<RitualCompletion[]>({
    queryKey: ['/api/ritual-completions'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/ritual-completions');
      return response.json();
    },
    enabled: !!currentUser,
  });


  // Fetch user's HRCM weeks to check 7-day restriction
  const { data: userWeeks = [], isLoading: loadingWeeks, isError: weeksError } = useQuery<any[]>({
    queryKey: ['/api/hercm/weeks'],
    enabled: !!currentUser,
  });
  
  // 🌙 AUTOMATIC MIDNIGHT RESET - Check every minute for date change (IST timezone)
  useEffect(() => {
    const checkDateChange = () => {
      const newDate = getTodayDate();
      if (newDate !== todayDate) {
        console.log(`[MIDNIGHT RESET] Date changed from ${todayDate} to ${newDate} - Resetting daily rituals...`);
        setTodayDate(newDate);
        // Invalidate ritual completions to refetch for new day (checkboxes will auto-uncheck)
        queryClient.invalidateQueries({ queryKey: ['/api/ritual-completions'] });
        toast({
          title: '🌅 New Day Started!',
          description: `Daily rituals reset for ${newDate}`,
          duration: 5000,
        });
      }
    };

    // Check immediately on mount
    checkDateChange();
    
    // Check every 60 seconds (1 minute) for date change
    const intervalId = setInterval(checkDateChange, 60000);
    
    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, [todayDate, toast]);
  
  // Map database rituals to Dashboard Ritual interface
  const rituals: Ritual[] = useMemo(() => {
    return dbRituals.map(dbRitual => {
      // Use points from database instead of calculating
      const points = dbRitual.points || calculatePoints(dbRitual.frequency);
      const isCompleted = todayCompletions.some(c => c.ritualId === dbRitual.id);
      
      return {
        id: dbRitual.id,
        title: dbRitual.title,
        recurrence: mapFrequencyToRecurrence(dbRitual.frequency),
        points,
        active: dbRitual.isActive,
        completed: isCompleted
      };
    });
  }, [dbRituals, todayCompletions]);

  const hrcmRef = useRef<HTMLDivElement>(null);
  const ritualsRef = useRef<HTMLDivElement>(null);
  const emotionalRef = useRef<HTMLDivElement>(null);
  const coursesRef = useRef<HTMLDivElement>(null);
  const achievementsRef = useRef<HTMLDivElement>(null);
  const teamRef = useRef<HTMLDivElement>(null);

  const [currentWeek, setCurrentWeek] = useState(1);

  const scrollToSection = (section: string) => {
    const refs = {
      hrcm: hrcmRef,
      rituals: ritualsRef,
      emotional: emotionalRef,
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
      // Invalidate all ritual completion queries
      queryClient.invalidateQueries({ queryKey: ['/api/ritual-completions', todayDate] });
      queryClient.invalidateQueries({ queryKey: ['/api/ritual-completions/month', currentYear, currentMonth] });
      queryClient.invalidateQueries({ queryKey: ['/api/ritual-completions/week', weekStartDate, weekEndDate] });
      
      // INSTANT REAL-TIME HEADER UPDATE: Invalidate total points query
      queryClient.invalidateQueries({ queryKey: ['/api/user/total-points'] });
      
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
      
      // SYNC existing checked lessons to Assignment column (one-time on page load)
      try {
        await apiRequest('POST', '/api/course-video-completions/sync-to-assignment', {
          coursesData: courses,
          weekNumber: currentWeek
        });
        console.log('[SYNC] Successfully synced checked lessons to Assignment column');
        // Refresh HRCM data to show updated Assignment column
        queryClient.invalidateQueries({ queryKey: ['/api/hercm'] });
      } catch (error) {
        console.error('[SYNC] Failed to sync lessons:', error);
      }
    };
    
    loadCompletedVideos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount - courses array is static

  // Mutation to persist course video completions to database
  const toggleVideoCompletionMutation = useMutation({
    mutationFn: async ({ videoId, courseId, courseName, lessonName, lessonUrl, completed, currentWeekNumber }: { 
      videoId: string; 
      courseId: string;
      courseName: string;
      lessonName: string;
      lessonUrl?: string;
      completed: boolean;
      currentWeekNumber: number;
    }) => {
      return await apiRequest('POST', '/api/course-video-completions/toggle', { 
        videoId, 
        courseId,
        courseName,
        lessonName,
        lessonUrl,
        completed,
        weekNumber: currentWeekNumber
      });
    },
  });

  const handleModuleToggle = async (courseId: string, moduleId: string, completed: boolean) => {
    // Get course and lesson details
    const course = courses.find(c => c.id === courseId);
    const lesson = course?.lessons.find(l => l.id === moduleId);
    
    if (!course || !lesson) {
      console.error('Course or lesson not found');
      return;
    }
    
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

    // Persist to database AND add to Assignment column
    const videoId = `${courseId}-${moduleId}`;
    try {
      await toggleVideoCompletionMutation.mutateAsync({ 
        videoId, 
        courseId,
        courseName: course.title,
        lessonName: lesson.title,
        lessonUrl: lesson.url,
        completed,
        currentWeekNumber: currentWeek
      });
      
      // Invalidate HRCM data to refresh Assignment column
      queryClient.invalidateQueries({ queryKey: ['/api/hercm'] });
      
      // Auto-save toast
      toast({
        title: completed ? 'Module Completed!' : 'Module Unmarked',
        description: completed ? 'Added to Assignment column' : 'Removed from Assignment column',
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

  // Courses state - initially empty, populated from Google Sheets API
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
  }>>([]);

  // Fetch courses from Google Sheets
  const { data: googleSheetsCourses, isLoading: coursesLoading, error: coursesError } = useQuery<Array<{
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
  }>>({
    queryKey: ['/api/courses/tracking'],
    enabled: !!currentUser,
    staleTime: 10 * 60 * 1000, // 10 minutes - matches backend cache
  });

  // Initialize courses from Google Sheets data
  useEffect(() => {
    if (googleSheetsCourses && googleSheetsCourses.length > 0) {
      console.log('[Course Tracker] Loaded', googleSheetsCourses.length, 'courses from Google Sheets');
      setCourses(googleSheetsCourses);
    }
  }, [googleSheetsCourses]);

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
      console.log('[DASHBOARD DEBUG] currentUser object:', currentUser);
      console.log('[DASHBOARD DEBUG] firstName:', currentUser.firstName);
      console.log('[DASHBOARD DEBUG] lastName:', currentUser.lastName);
      const fullName = currentUser.firstName && currentUser.lastName 
        ? `${currentUser.firstName} ${currentUser.lastName}`
        : currentUser.firstName || currentUser.lastName || currentUser.email || 'User';
      console.log('[DASHBOARD DEBUG] fullName:', fullName);
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
      
      {/* Real-time notification for course recommendations */}
      <CourseRecommendationNotification userId={currentUser?.id} />

      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 space-y-6 sm:space-y-8 md:space-y-12">
        {/* Course Recommendations */}
        <CourseRecommendations currentWeek={currentWeek} />
        
        <section ref={hrcmRef} id="hrcm" className="scroll-mt-20 bg-blue-50 dark:bg-blue-950/40 p-3 sm:p-4 md:p-6 rounded-lg border-2 border-blue-200 dark:border-blue-800">
          <UnifiedHRCMTable 
            weekNumber={currentWeek}
            onWeekChange={handleWeekChange}
          />
        </section>

        <section ref={ritualsRef} id="rituals" className="scroll-mt-20 p-3 sm:p-4 md:p-6 rounded-lg border-2" style={{ backgroundColor: '#00008c', borderColor: '#0000cc' }}>
          <div className="space-y-4 sm:space-y-6">
            <div>
              <h2 className="text-2xl sm:text-2xl md:text-3xl font-bold text-white">
                Daily Rituals
              </h2>
              <p className="text-sm sm:text-base text-white/80 mt-1">Build consistent habits and earn points</p>
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
                          className={`flex items-center gap-2 sm:gap-3 md:gap-4 p-2 sm:p-3 md:p-4 hover:bg-muted/30 transition-colors ${!ritual.active ? 'opacity-40' : ''}`}
                          data-testid={`ritual-row-${ritual.id}`}
                        >
                          <Checkbox
                            checked={ritual.completed}
                            onCheckedChange={() => handleToggleComplete(ritual.id)}
                            disabled={!ritual.active}
                            className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0"
                            data-testid={`checkbox-ritual-${ritual.id}`}
                          />
                          
                          <div className="flex-1 min-w-0">
                            <h3 className={`text-sm sm:text-base font-medium ${ritual.completed ? 'text-muted-foreground' : 'text-foreground'}`}>
                              {ritual.title}
                            </h3>
                          </div>
                          
                          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                            {!ritual.active && (
                              <Badge variant="secondary" className="text-[10px] sm:text-xs gap-0.5 sm:gap-1 px-1 sm:px-2">
                                <Pause className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                <span className="hidden sm:inline">Paused</span>
                              </Badge>
                            )}
                            
                            <Badge className="gap-0.5 sm:gap-1 bg-gradient-to-r from-primary to-accent text-white border-0 smooth-transition text-xs px-1.5 sm:px-2">
                              <Trophy className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              <span className="text-[10px] sm:text-xs">{ritual.points}</span>
                            </Badge>
                            
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleViewHistory(ritual.id)}
                                    data-testid={`button-history-${ritual.id}`}
                                    className="w-7 h-7 sm:w-8 sm:h-8"
                                  >
                                    <HistoryIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
                                    className="w-7 h-7 sm:w-8 sm:h-8"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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

        {/* Emotional Tracker Section */}
        <section ref={emotionalRef} id="emotional" className="scroll-mt-20">
          <EmotionalTracker />
        </section>

        <section ref={coursesRef} id="courses" className="scroll-mt-20 bg-blue-50 dark:bg-blue-950/40 p-3 sm:p-4 md:p-6 rounded-lg border-2 border-blue-200 dark:border-blue-800">
          <div className="space-y-4 sm:space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-2xl sm:text-2xl md:text-3xl font-bold">Course Tracker</h2>
                <p className="text-sm sm:text-base text-muted-foreground mt-1">Manage your learning journey and skill development</p>
              </div>
              <Button
                onClick={() => {
                  window.open('https://docs.google.com/spreadsheets/d/1BDeCzNYBU1HybnaOtytH7aeKZDj-f6nQJxHwgVKqxQ0/edit?usp=sharing', '_blank');
                }}
                variant="default"
                size="sm"
                className="gap-2 shrink-0 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white border-0"
                data-testid="button-skill-map"
              >
                <Map className="w-4 h-4" />
                Skill Map
              </Button>
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
                {/* Loading State */}
                {coursesLoading && (
                  <div className="space-y-4" data-testid="courses-loading">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span>Loading courses from Google Sheets...</span>
                    </div>
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                )}

                {/* Error State */}
                {coursesError && (
                  <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg" data-testid="courses-error">
                    <p className="text-sm text-red-600 dark:text-red-400">
                      Failed to load courses. Please refresh the page or contact support.
                    </p>
                  </div>
                )}

                {/* Empty State */}
                {!coursesLoading && !coursesError && courses.length === 0 && (
                  <div className="p-4 text-center text-sm text-muted-foreground" data-testid="courses-empty">
                    No courses available at the moment.
                  </div>
                )}

                {/* Courses List */}
                {!coursesLoading && !coursesError && courses.length > 0 && (
                  <div className="space-y-3">
                    {courses.map((course, index) => {
                    // Calculate total lessons including subcategories and nested subcategories
                    const directLessons = course.lessons || [];
                    const subcategoryLessons = ((course as any).subcategories || []).flatMap((sub: any) => {
                      const subLessons = sub.lessons || [];
                      const nestedLessons = (sub.subcategories || []).flatMap((nested: any) => nested.lessons || []);
                      return [...subLessons, ...nestedLessons];
                    });
                    const allLessons = [...directLessons, ...subcategoryLessons];
                    
                    const completedLessons = allLessons.filter(l => l.completed).length;
                    const totalLessons = allLessons.length;
                    const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

                    return (
                      <Collapsible key={course.id}>
                        <div className={`flex items-center gap-3 p-3 rounded-lg hover-elevate bg-primary/5 dark:bg-primary/10 ${index !== courses.length - 1 ? 'border-b' : ''}`}>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-sm text-primary dark:text-primary/90">{course.title}</h3>
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
                                        
                                        // If checked, add to persistent assignment; if unchecked, remove from assignment
                                        if (checked) {
                                          const assignmentResponse = await apiRequest('POST', '/api/persistent-assignments', {
                                            hrcmArea: course.category.toLowerCase(), // health, relationship, career, money
                                            courseId: course.id,
                                            courseName: course.title,
                                            lessonName: lesson.title,
                                            lessonUrl: lesson.url || '',
                                            source: 'user',
                                            completed: false
                                          });
                                          
                                          if (assignmentResponse.ok) {
                                            // Invalidate queries to refresh assignment data
                                            queryClient.invalidateQueries({ queryKey: ['/api/persistent-assignments'] });
                                            queryClient.invalidateQueries({ queryKey: ['/api/hercm'] });
                                            
                                            toast({
                                              title: 'Lesson Completed!',
                                              description: `${lesson.title} added to Assignment column`,
                                            });
                                          }
                                        } else {
                                          // When unchecking, we need to find and delete the assignment
                                          // This requires fetching current assignments first
                                          const assignmentsResponse = await apiRequest('GET', '/api/persistent-assignments');
                                          if (assignmentsResponse.ok) {
                                            const assignments = await assignmentsResponse.json();
                                            const matchingAssignment = assignments.find((a: any) => 
                                              a.courseId === course.id && a.lessonName === lesson.title
                                            );
                                            
                                            if (matchingAssignment) {
                                              const deleteResponse = await apiRequest('DELETE', `/api/persistent-assignments/${matchingAssignment.id}`);
                                              if (deleteResponse.ok) {
                                                // Invalidate queries to refresh assignment data
                                                queryClient.invalidateQueries({ queryKey: ['/api/persistent-assignments'] });
                                                queryClient.invalidateQueries({ queryKey: ['/api/hercm'] });
                                                
                                                toast({
                                                  title: 'Lesson Unchecked',
                                                  description: `${lesson.title} removed from Assignment column`,
                                                });
                                              }
                                            }
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
                              
                              {/* Render subcategories if they exist */}
                              {(course as any).subcategories && (course as any).subcategories.length > 0 && (course as any).subcategories.map((subcategory: any) => (
                                <Collapsible key={subcategory.id} className="mt-3">
                                  <div className="border-l-2 border-primary/30 pl-3">
                                    <CollapsibleTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full justify-between hover:bg-muted/50 mb-2 bg-accent/5 dark:bg-accent/10"
                                        data-testid={`button-subcategory-${subcategory.id}`}
                                      >
                                        <span className="font-medium text-xs text-accent dark:text-accent/90">{subcategory.title}</span>
                                        <ChevronDown className="w-3 h-3" />
                                      </Button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="space-y-2 mt-2">
                                      {subcategory.lessons && subcategory.lessons.map((lesson: any) => (
                                        <div key={lesson.id} className="flex items-start gap-2">
                                          <Checkbox
                                            checked={lesson.completed}
                                            onCheckedChange={async (checked) => {
                                              // Update local state for subcategory lesson
                                              setCourses(prev => prev.map(c => 
                                                c.id === course.id
                                                  ? {
                                                      ...c,
                                                      subcategories: (c as any).subcategories?.map((sub: any) =>
                                                        sub.id === subcategory.id
                                                          ? {
                                                              ...sub,
                                                              lessons: sub.lessons.map((l: any) =>
                                                                l.id === lesson.id
                                                                  ? { ...l, completed: checked as boolean }
                                                                  : l
                                                              )
                                                            }
                                                          : sub
                                                      )
                                                    }
                                                  : c
                                              ));
                                              
                                              try {
                                                const toggleResponse = await apiRequest('POST', '/api/course-video-completions/toggle', {
                                                  videoId: `${course.id}-${lesson.id}`,
                                                  courseId: course.id
                                                });
                                                
                                                if (!toggleResponse.ok) throw new Error('Failed to toggle lesson');
                                                
                                                if (checked) {
                                                  await apiRequest('POST', '/api/persistent-assignments', {
                                                    hrcmArea: course.category.toLowerCase(),
                                                    courseId: course.id,
                                                    courseName: course.title,
                                                    lessonName: lesson.title,
                                                    lessonUrl: lesson.url || '',
                                                    source: 'user',
                                                    completed: false
                                                  });
                                                  queryClient.invalidateQueries({ queryKey: ['/api/persistent-assignments'] });
                                                  queryClient.invalidateQueries({ queryKey: ['/api/hercm'] });
                                                  toast({
                                                    title: 'Lesson Completed!',
                                                    description: `${lesson.title} added to Assignment column`,
                                                  });
                                                }
                                              } catch (error) {
                                                console.error('Error updating lesson:', error);
                                                setCourses(prev => prev.map(c => 
                                                  c.id === course.id
                                                    ? {
                                                        ...c,
                                                        subcategories: (c as any).subcategories?.map((sub: any) =>
                                                          sub.id === subcategory.id
                                                            ? {
                                                                ...sub,
                                                                lessons: sub.lessons.map((l: any) =>
                                                                  l.id === lesson.id
                                                                    ? { ...l, completed: !checked }
                                                                    : l
                                                                )
                                                              }
                                                            : sub
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
                                            data-testid={`checkbox-subcategory-lesson-${lesson.id}`}
                                          />
                                          <div className="flex-1 flex items-center justify-between gap-2">
                                            {lesson.url ? (
                                              <a
                                                href={lesson.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs cursor-pointer flex-1 hover:underline text-primary hover:text-primary/80"
                                                data-testid={`link-subcategory-lesson-${lesson.id}`}
                                              >
                                                {lesson.title}
                                              </a>
                                            ) : (
                                              <span className="text-xs flex-1">{lesson.title}</span>
                                            )}
                                            <Badge 
                                              className="text-[10px] px-1.5 py-0 h-5 bg-gradient-to-r from-primary to-accent text-white border-0 golden-glow smooth-transition"
                                              data-testid={`badge-subcategory-points-${lesson.id}`}
                                            >
                                              +{lesson.points || 10} pts
                                            </Badge>
                                          </div>
                                        </div>
                                      ))}
                                      
                                      {/* Render nested subcategories (e.g., within Career Mastery) */}
                                      {subcategory.subcategories && subcategory.subcategories.length > 0 && subcategory.subcategories.map((nestedSubcat: any) => (
                                        <Collapsible key={nestedSubcat.id} className="mt-3">
                                          <div className="border-l-2 border-accent/30 pl-3">
                                            <CollapsibleTrigger asChild>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="w-full justify-between hover:bg-muted/50 mb-2 bg-purple-500/5 dark:bg-purple-500/10"
                                                data-testid={`button-nested-subcategory-${nestedSubcat.id}`}
                                              >
                                                <span className="font-medium text-xs text-purple-600 dark:text-purple-400">{nestedSubcat.title}</span>
                                                <ChevronDown className="w-3 h-3" />
                                              </Button>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent className="space-y-2 mt-2">
                                              {nestedSubcat.lessons && nestedSubcat.lessons.map((nestedLesson: any) => (
                                                <div key={nestedLesson.id} className="flex items-start gap-2">
                                                  <Checkbox
                                                    checked={nestedLesson.completed}
                                                    onCheckedChange={async (checked) => {
                                                      // Update local state for nested subcategory lesson
                                                      setCourses(prev => prev.map(c => 
                                                        c.id === course.id
                                                          ? {
                                                              ...c,
                                                              subcategories: (c as any).subcategories?.map((sub: any) =>
                                                                sub.id === subcategory.id
                                                                  ? {
                                                                      ...sub,
                                                                      subcategories: sub.subcategories?.map((nested: any) =>
                                                                        nested.id === nestedSubcat.id
                                                                          ? {
                                                                              ...nested,
                                                                              lessons: nested.lessons.map((l: any) =>
                                                                                l.id === nestedLesson.id
                                                                                  ? { ...l, completed: checked as boolean }
                                                                                  : l
                                                                              )
                                                                            }
                                                                          : nested
                                                                      )
                                                                    }
                                                                  : sub
                                                              )
                                                            }
                                                          : c
                                                      ));
                                                      
                                                      try {
                                                        const toggleResponse = await apiRequest('POST', '/api/course-video-completions/toggle', {
                                                          videoId: `${course.id}-${nestedLesson.id}`,
                                                          courseId: course.id
                                                        });
                                                        
                                                        if (!toggleResponse.ok) throw new Error('Failed to toggle lesson');
                                                        
                                                        if (checked) {
                                                          await apiRequest('POST', '/api/persistent-assignments', {
                                                            hrcmArea: course.category.toLowerCase(),
                                                            courseId: course.id,
                                                            courseName: `${subcategory.title} - ${nestedSubcat.title}`,
                                                            lessonName: nestedLesson.title,
                                                            lessonUrl: nestedLesson.url || '',
                                                            source: 'user',
                                                            completed: false
                                                          });
                                                          queryClient.invalidateQueries({ queryKey: ['/api/persistent-assignments'] });
                                                          queryClient.invalidateQueries({ queryKey: ['/api/hercm'] });
                                                          toast({
                                                            title: 'Lesson Completed!',
                                                            description: `${nestedLesson.title} added to Assignment column`,
                                                          });
                                                        }
                                                      } catch (error) {
                                                        console.error('Error updating nested lesson:', error);
                                                        setCourses(prev => prev.map(c => 
                                                          c.id === course.id
                                                            ? {
                                                                ...c,
                                                                subcategories: (c as any).subcategories?.map((sub: any) =>
                                                                  sub.id === subcategory.id
                                                                    ? {
                                                                        ...sub,
                                                                        subcategories: sub.subcategories?.map((nested: any) =>
                                                                          nested.id === nestedSubcat.id
                                                                            ? {
                                                                                ...nested,
                                                                                lessons: nested.lessons.map((l: any) =>
                                                                                  l.id === nestedLesson.id
                                                                                    ? { ...l, completed: !checked }
                                                                                    : l
                                                                                )
                                                                              }
                                                                            : nested
                                                                        )
                                                                      }
                                                                    : sub
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
                                                    data-testid={`checkbox-nested-lesson-${nestedLesson.id}`}
                                                  />
                                                  <div className="flex-1 flex items-center justify-between gap-2">
                                                    {nestedLesson.url ? (
                                                      <a
                                                        href={nestedLesson.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs cursor-pointer flex-1 hover:underline text-primary hover:text-primary/80"
                                                        data-testid={`link-nested-lesson-${nestedLesson.id}`}
                                                      >
                                                        {nestedLesson.title}
                                                      </a>
                                                    ) : (
                                                      <span className="text-xs flex-1">{nestedLesson.title}</span>
                                                    )}
                                                    <Badge 
                                                      className="text-[10px] px-1.5 py-0 h-5 bg-gradient-to-r from-primary to-accent text-white border-0 golden-glow smooth-transition"
                                                      data-testid={`badge-nested-points-${nestedLesson.id}`}
                                                    >
                                                      +{nestedLesson.points || 10} pts
                                                    </Badge>
                                                  </div>
                                                </div>
                                              ))}
                                            </CollapsibleContent>
                                          </div>
                                        </Collapsible>
                                      ))}
                                    </CollapsibleContent>
                                  </div>
                                </Collapsible>
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
                )}
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
        <section ref={achievementsRef} id="achievements" className="scroll-mt-20 bg-blue-50 dark:bg-blue-950/40 p-6 rounded-lg border-2 border-blue-200 dark:border-blue-800">
          <BadgeDisplayCard 
            leaderboardEntries={leaderboardEntries} 
            currentUserId={currentUser?.id}
          />
        </section>

        {/* Platinum User Progress Section */}
        <section className="scroll-mt-20 bg-purple-50 dark:bg-purple-950/40 p-6 rounded-lg border-2 border-purple-200 dark:border-purple-800">
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold">Platinum User Progress</h2>
              <p className="text-muted-foreground mt-1">Search and view team members' complete dashboards</p>
            </div>

            <UserDashboardSearch />
          </div>
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
          ritualId={selectedRitual.id}
          allCompletions={allRitualCompletions}
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

      <FeedbackButton />
    </div>
  );
}
