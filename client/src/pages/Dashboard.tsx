import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import DashboardHeader from '@/components/DashboardHeader';
import UnifiedHRCMTable from '@/components/UnifiedHRCMTable';
import AddRitualForm from '@/components/AddRitualForm';
import RitualCard from '@/components/RitualCard';
import CourseCard from '@/components/CourseCard';
import Leaderboard from '@/components/Leaderboard';
import ProfileModal from '@/components/ProfileModal';
import RitualHistoryModal from '@/components/RitualHistoryModal';
import EditRitualModal from '@/components/EditRitualModal';
import UpdateProgressModal from '@/components/UpdateProgressModal';
import HRCMHistoryModal from '@/components/HRCMHistoryModal';
import BadgeDisplayCard from '@/components/BadgeDisplayCard';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
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

// Calculate points based on frequency
const calculatePoints = (frequency: string): number => {
  return frequency === 'daily' ? 50 : 75;
};

export default function Dashboard() {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState('hrcm');
  const [profileOpen, setProfileOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [hrcmHistoryOpen, setHrcmHistoryOpen] = useState(false);
  const [selectedRitual, setSelectedRitual] = useState<Ritual | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  
  const [userName, setUserName] = useState('John Doe');
  const [userEmail, setUserEmail] = useState('john@example.com');
  const [totalPoints, setTotalPoints] = useState(0);
  
  const todayDate = useMemo(() => getTodayDate(), []);
  
  // Fetch rituals from database
  const { data: dbRituals = [], isLoading: ritualsLoading } = useQuery<DbRitual[]>({
    queryKey: ['/api/rituals'],
  });
  
  // Fetch today's ritual completions
  const { data: todayCompletions = [] } = useQuery<RitualCompletion[]>({
    queryKey: ['/api/ritual-completions', todayDate],
  });
  
  // Map database rituals to Dashboard Ritual interface
  const rituals: Ritual[] = useMemo(() => {
    return dbRituals.map(dbRitual => {
      const points = calculatePoints(dbRitual.frequency);
      const isCompleted = todayCompletions.some(c => c.ritualId === dbRitual.id);
      // For now, history only shows today's completion
      // TODO: Fetch all completions for the month when viewing history
      const ritualCompletions = todayCompletions.filter(c => c.ritualId === dbRitual.id);
      
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
  }, [dbRituals, todayCompletions]);

  const hrcmRef = useRef<HTMLDivElement>(null);
  const ritualsRef = useRef<HTMLDivElement>(null);
  const coursesRef = useRef<HTMLDivElement>(null);

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
      courses: coursesRef
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

  // Mutation: Toggle ritual active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await apiRequest('PATCH', `/api/rituals/${id}`, {
        isActive: !isActive,
      });
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/rituals'] });
      
      const ritual = rituals.find(r => r.id === variables.id);
      toast({
        title: variables.isActive ? 'Ritual Paused' : 'Ritual Resumed',
        description: variables.isActive 
          ? `${ritual?.title} has been paused.`
          : `${ritual?.title} is now active again.`
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update ritual',
        variant: 'destructive'
      });
    }
  });
  
  const handleToggleActive = (id: string) => {
    const ritual = rituals.find(r => r.id === id);
    if (ritual) {
      toggleActiveMutation.mutate({ id, isActive: ritual.active });
    }
  };

  const handleViewHistory = (id: string) => {
    const ritual = rituals.find(r => r.id === id);
    if (ritual) {
      setSelectedRitual(ritual);
      setHistoryOpen(true);
    }
  };

  const handleEditRitual = (id: string) => {
    const ritual = rituals.find(r => r.id === id);
    if (ritual) {
      setSelectedRitual(ritual);
      setEditOpen(true);
    }
  };

  // Mutation: Update ritual
  const updateRitualMutation = useMutation({
    mutationFn: async (updatedRitual: { id: string; title: string; recurrence: string; points: number }) => {
      const frequency = updatedRitual.recurrence === 'mon-fri' ? 'weekly' : 'daily';
      const response = await apiRequest('PATCH', `/api/rituals/${updatedRitual.id}`, {
        title: updatedRitual.title,
        frequency,
      });
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/rituals'] });
      toast({
        title: 'Ritual Updated',
        description: `${variables.title} has been updated.`
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update ritual',
        variant: 'destructive'
      });
    }
  });
  
  const handleSaveEdit = (updatedRitual: { id: string; title: string; recurrence: string; points: number }) => {
    updateRitualMutation.mutate(updatedRitual);
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

  const handleGenerateNextWeek = () => {
    // In Phase 3, this will connect to OpenAI to analyze progress and generate intelligent next week targets
    // For now, it increments the week and shows progression
    
    toast({
      title: 'Generating Next Week',
      description: `Analyzing Week ${currentWeek} progress and creating Week ${currentWeek + 1} targets...`,
    });

    // Simulate AI processing time
    setTimeout(() => {
      setCurrentWeek(prev => prev + 1);
      toast({
        title: `Week ${currentWeek + 1} Generated!`,
        description: 'Your next week beliefs and targets are ready. Keep growing!',
      });
    }, 1500);
  };

  const handleViewHRCMHistory = () => {
    setHrcmHistoryOpen(true);
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

  const [courses, setCourses] = useState<Array<{
    id: string;
    title: string;
    url: string;
    tags: string[];
    source: string;
    estimatedHours: number;
    status: 'not_started' | 'in_progress' | 'completed';
    progressPercent: number;
  }>>([
    {
      id: 'health-mastery',
      title: 'Health Mastery Course',
      url: 'https://coaching.miteshkhatri.com/products/health-mastery-happy-gym',
      tags: ['Health', 'Wellness', 'Fitness'],
      source: 'Mitesh Khatri Coaching',
      estimatedHours: 20,
      status: 'not_started',
      progressPercent: 0
    },
    {
      id: 'wealth-mastery',
      title: 'Wealth Mastery Course',
      url: 'https://www.miteshkhatri.com/MoneyAssessment',
      tags: ['Finance', 'Money', 'Investment'],
      source: 'Mitesh Khatri Coaching',
      estimatedHours: 25,
      status: 'not_started',
      progressPercent: 0
    },
    {
      id: 'relationship-mastery',
      title: 'Relationship Mastery Course',
      url: 'https://coaching.miteshkhatri.com/products/relationship-mastery-with-mitesh-khatri',
      tags: ['Relationships', 'Communication', 'Connection'],
      source: 'Mitesh Khatri Coaching',
      estimatedHours: 18,
      status: 'not_started',
      progressPercent: 0
    },
    {
      id: 'career-mastery',
      title: 'Career Mastery Course',
      url: 'https://coaching.miteshkhatri.com/products/lead-business',
      tags: ['Career', 'Growth', 'Success'],
      source: 'Mitesh Khatri Coaching',
      estimatedHours: 22,
      status: 'not_started',
      progressPercent: 0
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
            onGenerateNextWeek={handleGenerateNextWeek}
            onViewHistory={handleViewHRCMHistory}
          />
        </section>

        {/* Achievements & Badges Section */}
        <section className="scroll-mt-20">
          <BadgeDisplayCard />
        </section>

        <section ref={ritualsRef} id="rituals" className="scroll-mt-20 bg-purple-50 dark:bg-purple-950/40 p-6 rounded-lg border-2 border-purple-200 dark:border-purple-800">
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Daily Rituals
              </h2>
              <p className="text-muted-foreground mt-1">Build consistent habits and earn points</p>
            </div>

            <AddRitualForm onAdd={handleAddRitual} />

            {ritualsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2].map((i) => (
                  <Card key={i} className="p-4">
                    <Skeleton className="h-6 w-3/4 mb-3" />
                    <Skeleton className="h-4 w-1/2 mb-4" />
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-20" />
                      <Skeleton className="h-8 w-20" />
                      <Skeleton className="h-8 w-20" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rituals.map((ritual) => (
                    <RitualCard
                      key={ritual.id}
                      {...ritual}
                      onToggleComplete={handleToggleComplete}
                      onToggleActive={handleToggleActive}
                      onViewHistory={handleViewHistory}
                      onEdit={handleEditRitual}
                      onDelete={handleDeleteRitual}
                    />
                  ))}
                </div>

                {rituals.length === 0 && (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">No rituals yet. Add your first ritual above!</p>
                  </div>
                )}
              </>
            )}

            <Leaderboard entries={leaderboardEntries} period="week" currentUserId="2" />
          </div>
        </section>

        <section ref={coursesRef} id="courses" className="scroll-mt-20 bg-emerald-50 dark:bg-emerald-950/40 p-6 rounded-lg border-2 border-emerald-200 dark:border-emerald-800">
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold">Course Tracker</h2>
              <p className="text-muted-foreground mt-1">Manage your learning journey and skill development</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {courses.map((course) => (
                <CourseCard 
                  key={course.id} 
                  {...course}
                  onUpdateProgress={handleUpdateCourseProgress}
                  onVisit={handleVisitCourse}
                />
              ))}
            </div>
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

      <HRCMHistoryModal
        open={hrcmHistoryOpen}
        onOpenChange={setHrcmHistoryOpen}
        currentWeek={currentWeek}
      />

      {selectedRitual && (
        <>
          <RitualHistoryModal
            open={historyOpen}
            onOpenChange={setHistoryOpen}
            ritualTitle={selectedRitual.title}
            history={selectedRitual.history}
          />

          <EditRitualModal
            open={editOpen}
            onOpenChange={setEditOpen}
            ritual={selectedRitual}
            onSave={handleSaveEdit}
          />
        </>
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
