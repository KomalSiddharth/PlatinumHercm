import { useState, useRef, useEffect } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import UnifiedHERCMTable from '@/components/UnifiedHERCMTable';
import AddRitualForm from '@/components/AddRitualForm';
import RitualCard from '@/components/RitualCard';
import CourseCard from '@/components/CourseCard';
import PlatinumProgress from '@/components/PlatinumProgress';
import Leaderboard from '@/components/Leaderboard';
import ProfileModal from '@/components/ProfileModal';
import RitualHistoryModal from '@/components/RitualHistoryModal';
import EditRitualModal from '@/components/EditRitualModal';
import UpdateProgressModal from '@/components/UpdateProgressModal';
import HERCMHistoryModal from '@/components/HERCMHistoryModal';
import { useToast } from '@/hooks/use-toast';

interface Ritual {
  id: string;
  title: string;
  recurrence: 'daily' | 'mon-fri' | 'custom';
  points: number;
  active: boolean;
  completed: boolean;
  history: { date: string; completed: boolean }[];
}

export default function Dashboard() {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState('rituals');
  const [profileOpen, setProfileOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [hercmHistoryOpen, setHercmHistoryOpen] = useState(false);
  const [selectedRitual, setSelectedRitual] = useState<Ritual | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  
  const [userName, setUserName] = useState('John Doe');
  const [userEmail, setUserEmail] = useState('john@example.com');
  const [totalPoints, setTotalPoints] = useState(0);
  
  const [weeklyData, setWeeklyData] = useState([
    { week: 1, hercmFilled: false, ritualRate: 0 },
    { week: 2, hercmFilled: false, ritualRate: 0 },
    { week: 3, hercmFilled: false, ritualRate: 0 },
    { week: 4, hercmFilled: false, ritualRate: 0 }
  ]);
  
  const generateCurrentMonthHistory = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const today = now.getDate();
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const history = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      history.push({
        date: dateStr,
        completed: false
      });
    }
    
    return history;
  };

  const [rituals, setRituals] = useState<Ritual[]>([
    {
      id: '1',
      title: 'Morning meditation',
      recurrence: 'daily',
      points: 50,
      active: true,
      completed: false,
      history: generateCurrentMonthHistory()
    },
    {
      id: '2',
      title: 'Read for 30 minutes',
      recurrence: 'daily',
      points: 75,
      active: true,
      completed: false,
      history: generateCurrentMonthHistory()
    }
  ]);

  const hercmRef = useRef<HTMLDivElement>(null);
  const ritualsRef = useRef<HTMLDivElement>(null);
  const coursesRef = useRef<HTMLDivElement>(null);

  const [currentWeek, setCurrentWeek] = useState(1);

  useEffect(() => {
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    setRituals(prevRituals => prevRituals.map(ritual => {
      const todayHistory = ritual.history.find(h => h.date === today);
      return {
        ...ritual,
        completed: todayHistory?.completed || false
      };
    }));
  }, []);

  useEffect(() => {
    const ritualRate = rituals.length > 0 ? (rituals.filter(r => r.completed).length / rituals.length) * 100 : 0;
    setWeeklyData(prev => prev.map(w => 
      w.week === currentWeek ? { ...w, ritualRate } : w
    ));
  }, [rituals, currentWeek]);

  const scrollToSection = (section: string) => {
    const refs = {
      hercm: hercmRef,
      rituals: ritualsRef,
      courses: coursesRef
    };

    refs[section as keyof typeof refs]?.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
    setActiveSection(section);
  };

  const handleAddRitual = (newRitual: { title: string; recurrence: string; points: number }) => {
    const ritual: Ritual = {
      id: Date.now().toString(),
      title: newRitual.title,
      recurrence: newRitual.recurrence as 'daily' | 'mon-fri' | 'custom',
      points: newRitual.points,
      active: true,
      completed: false,
      history: generateCurrentMonthHistory()
    };
    
    setRituals([...rituals, ritual]);
    toast({
      title: 'Ritual Added',
      description: `${newRitual.title} has been added to your daily rituals.`
    });
  };

  const handleToggleComplete = (id: string) => {
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    setRituals(rituals.map(ritual => {
      if (ritual.id === id && ritual.active) {
        const newCompleted = !ritual.completed;
        
        const updatedHistory = ritual.history.map(h => 
          h.date === today ? { ...h, completed: newCompleted } : h
        );
        
        if (newCompleted) {
          setTotalPoints(prev => prev + ritual.points);
          toast({
            title: 'Points Earned!',
            description: `+${ritual.points} points for completing ${ritual.title}`,
          });
        } else {
          setTotalPoints(prev => Math.max(0, prev - ritual.points));
        }
        return { ...ritual, completed: newCompleted, history: updatedHistory };
      }
      return ritual;
    }));
  };

  const handleToggleActive = (id: string) => {
    setRituals(rituals.map(ritual =>
      ritual.id === id ? { ...ritual, active: !ritual.active } : ritual
    ));
    const ritual = rituals.find(r => r.id === id);
    toast({
      title: ritual?.active ? 'Ritual Paused' : 'Ritual Resumed',
      description: ritual?.active 
        ? `${ritual.title} has been paused.`
        : `${ritual?.title} is now active again.`
    });
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

  const handleSaveEdit = (updatedRitual: { id: string; title: string; recurrence: string; points: number }) => {
    setRituals(rituals.map(ritual =>
      ritual.id === updatedRitual.id
        ? { ...ritual, ...updatedRitual, recurrence: updatedRitual.recurrence as 'daily' | 'mon-fri' | 'custom' }
        : ritual
    ));
    toast({
      title: 'Ritual Updated',
      description: `${updatedRitual.title} has been updated.`
    });
  };

  const handleDeleteRitual = (id: string) => {
    const ritual = rituals.find(r => r.id === id);
    if (ritual) {
      setRituals(rituals.filter(r => r.id !== id));
      toast({
        title: 'Ritual Deleted',
        description: `${ritual.title} has been removed.`,
        variant: 'destructive'
      });
    }
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

  const handleViewHERCMHistory = () => {
    setHercmHistoryOpen(true);
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
      url: 'https://coaching.miteshkhatri.com/library?page=1',
      tags: ['Health', 'Wellness', 'Fitness'],
      source: 'Mitesh Khatri Coaching',
      estimatedHours: 20,
      status: 'not_started',
      progressPercent: 0
    },
    {
      id: 'wealth-mastery',
      title: 'Wealth Mastery Course',
      url: 'https://coaching.miteshkhatri.com/library?page=1',
      tags: ['Finance', 'Money', 'Investment'],
      source: 'Mitesh Khatri Coaching',
      estimatedHours: 25,
      status: 'not_started',
      progressPercent: 0
    },
    {
      id: 'relationship-mastery',
      title: 'Relationship Mastery Course',
      url: 'https://coaching.miteshkhatri.com/library?page=1',
      tags: ['Relationships', 'Communication', 'Connection'],
      source: 'Mitesh Khatri Coaching',
      estimatedHours: 18,
      status: 'not_started',
      progressPercent: 0
    },
    {
      id: 'career-mastery',
      title: 'Career Mastery Course',
      url: 'https://coaching.miteshkhatri.com/library?page=1',
      tags: ['Career', 'Growth', 'Success'],
      source: 'Mitesh Khatri Coaching',
      estimatedHours: 22,
      status: 'not_started',
      progressPercent: 0
    }
  ]);

  const leaderboardEntries = [
    { rank: 1, userId: '2', name: userName, points: totalPoints, isCurrentUser: true }
  ];

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
        <section ref={hercmRef} id="hercm" className="scroll-mt-20 bg-blue-50 dark:bg-blue-950/40 p-6 rounded-lg border-2 border-blue-200 dark:border-blue-800">
          <UnifiedHERCMTable 
            weekNumber={currentWeek}
            onGenerateNextWeek={handleGenerateNextWeek}
            onViewHistory={handleViewHERCMHistory}
          />

          <div className="mt-8">
            <PlatinumProgress 
              currentWeek={currentWeek} 
              weeklyData={weeklyData}
            />
          </div>
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

      <HERCMHistoryModal
        open={hercmHistoryOpen}
        onOpenChange={setHercmHistoryOpen}
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
