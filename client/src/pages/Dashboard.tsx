import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
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
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Trophy, Pause, History as HistoryIcon, Trash2 } from 'lucide-react';
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
    const date = new Date(year, month, day);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const isoDate = date.toISOString().split('T')[0];
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
  const { data: currentUser } = useQuery<{ id: string; email: string; firstName?: string; lastName?: string; isAdmin?: boolean }>({
    queryKey: ['/api/auth/user'],
  });
  
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
  
  // Fetch rituals from database
  const { data: dbRituals = [], isLoading: ritualsLoading } = useQuery<DbRitual[]>({
    queryKey: ['/api/rituals'],
  });
  
  // Fetch today's ritual completions (for today's status)
  const { data: todayCompletions = [] } = useQuery<RitualCompletion[]>({
    queryKey: ['/api/ritual-completions', todayDate],
  });

  // Fetch monthly ritual completions (for history)
  const { data: monthlyCompletions = [] } = useQuery<RitualCompletion[]>({
    queryKey: ['/api/ritual-completions/month', currentYear, currentMonth],
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
  
  // Fetch user's HRCM weeks to check 7-day restriction
  const { data: userWeeks = [], isLoading: loadingWeeks, isError: weeksError } = useQuery<any[]>({
    queryKey: ['/api/hercm/weeks'],
  });
  
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

  // Fetch Health Mastery modules
  const { data: healthMasteryModules = [] } = useQuery<Array<{
    id: string;
    title: string;
    url?: string;
  }>>({
    queryKey: ['/api/courses/health-mastery-modules'],
    select: (data: any) => data.modules || []
  });

  // Fetch Wealth Mastery modules
  const { data: wealthMasteryModules = [] } = useQuery<Array<{
    id: string;
    title: string;
    url?: string;
  }>>({
    queryKey: ['/api/courses/wealth-mastery-modules'],
    select: (data: any) => data.modules || []
  });

  // Fetch Relationship Mastery modules
  const { data: relationshipMasteryModules = [] } = useQuery<Array<{
    id: string;
    title: string;
    url?: string;
  }>>({
    queryKey: ['/api/courses/relationship-mastery-modules'],
    select: (data: any) => data.modules || []
  });

  // Track completed modules for each course
  const [completedModules, setCompletedModules] = useState<Record<string, string[]>>({
    'health-mastery': []
  });

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
  }>>([
    {
      id: 'health-mastery',
      title: 'Health Mastery Course',
      url: 'https://coaching.miteshkhatri.com/products/health-mastery-happy-gym',
      tags: ['Health', 'Wellness'],
      source: 'Mitesh Khatri Coaching',
      estimatedHours: 20,
      status: 'not_started',
      progressPercent: 0,
      category: 'Health'
    },
    {
      id: 'wealth-mastery',
      title: 'Wealth Mastery Course',
      url: 'https://www.miteshkhatri.com/MoneyAssessment',
      tags: ['Finance', 'Money', 'Investment'],
      source: 'Mitesh Khatri Coaching',
      estimatedHours: 25,
      status: 'not_started',
      progressPercent: 0,
      category: 'Money'
    },
    {
      id: 'relationship-mastery',
      title: 'Relationship Mastery Course',
      url: 'https://coaching.miteshkhatri.com/products/relationship-mastery-with-mitesh-khatri',
      tags: ['Relationships', 'Communication', 'Connection'],
      source: 'Mitesh Khatri Coaching',
      estimatedHours: 18,
      status: 'not_started',
      progressPercent: 0,
      category: 'Relationship'
    },
    {
      id: 'career-mastery',
      title: 'Career Mastery Course',
      url: 'https://coaching.miteshkhatri.com/products/lead-business',
      tags: ['Career', 'Growth', 'Success'],
      source: 'Mitesh Khatri Coaching',
      estimatedHours: 22,
      status: 'not_started',
      progressPercent: 0,
      category: 'Career'
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

            <div className="space-y-4">
              {courses.map((course) => (
                <CourseCard 
                  key={course.id} 
                  {...course}
                  modules={course.id === 'health-mastery' ? healthMasteryModules : []}
                  completedModules={completedModules[course.id] || []}
                  onUpdateProgress={handleUpdateCourseProgress}
                  onVisit={handleVisitCourse}
                  onModuleToggle={handleModuleToggle}
                />
              ))}
            </div>
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
