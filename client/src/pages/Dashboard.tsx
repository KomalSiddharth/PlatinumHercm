import { useState, useRef, useEffect } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import HERCMCard from '@/components/HERCMCard';
import ChecklistModal from '@/components/ChecklistModal';
import WeeklySummary from '@/components/WeeklySummary';
import AddRitualForm from '@/components/AddRitualForm';
import RitualCard from '@/components/RitualCard';
import CourseCard from '@/components/CourseCard';
import PlatinumProgress from '@/components/PlatinumProgress';
import Leaderboard from '@/components/Leaderboard';
import ProfileModal from '@/components/ProfileModal';
import RitualHistoryModal from '@/components/RitualHistoryModal';
import EditRitualModal from '@/components/EditRitualModal';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'health' | 'relationship' | 'career' | 'money'>('health');
  const [selectedRitual, setSelectedRitual] = useState<Ritual | null>(null);
  
  const [userName, setUserName] = useState('John Doe');
  const [userEmail, setUserEmail] = useState('john@example.com');
  const [totalPoints, setTotalPoints] = useState(0);
  
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
      title: 'Logged Out',
      description: 'You have been successfully logged out.'
    });
  };

  const hercmData = {
    health: { current: 7, target: 8 },
    relationship: { current: 6, target: 7 },
    career: { current: 8, target: 9 },
    money: { current: 5, target: 6 }
  };

  const checklistItems = [
    { id: 1, text: 'Exercise for 30 minutes', completed: false },
    { id: 2, text: 'Drink 8 glasses of water', completed: true, completedAt: '2025-02-05 14:30' },
    { id: 3, text: 'Get 7-8 hours of sleep', completed: false },
    { id: 4, text: 'Eat at least 3 servings of vegetables', completed: false },
    { id: 5, text: 'Practice meditation or mindfulness', completed: true, completedAt: '2025-02-05 08:15' }
  ];

  const [courses, setCourses] = useState([
    {
      id: 'health-mastery',
      title: 'Health Mastery Course',
      url: '',
      tags: ['Health', 'Wellness', 'Fitness'],
      source: 'Platinum HERCM',
      estimatedHours: 20,
      status: 'not_started' as const,
      progressPercent: 0
    },
    {
      id: 'wealth-mastery',
      title: 'Wealth Mastery Course',
      url: '',
      tags: ['Finance', 'Money', 'Investment'],
      source: 'Platinum HERCM',
      estimatedHours: 25,
      status: 'not_started' as const,
      progressPercent: 0
    },
    {
      id: 'relationship-mastery',
      title: 'Relationship Mastery Course',
      url: '',
      tags: ['Relationships', 'Communication', 'Connection'],
      source: 'Platinum HERCM',
      estimatedHours: 18,
      status: 'not_started' as const,
      progressPercent: 0
    },
    {
      id: 'career-mastery',
      title: 'Career Mastery Course',
      url: '',
      tags: ['Career', 'Growth', 'Success'],
      source: 'Platinum HERCM',
      estimatedHours: 22,
      status: 'not_started' as const,
      progressPercent: 0
    }
  ]);

  const leaderboardEntries = [
    { rank: 1, userId: '2', name: userName, points: totalPoints, isCurrentUser: true }
  ];

  const weekStatuses = [
    { week: 1, hercmCompleted: true, checklistCompleted: true, ritualRate: 85 },
    { week: 2, hercmCompleted: true, checklistCompleted: true, ritualRate: 90 },
    { week: 3, hercmCompleted: true, checklistCompleted: false, ritualRate: 75 },
    { week: 4, hercmCompleted: false, checklistCompleted: false, ritualRate: 0 }
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
        <section ref={hercmRef} id="hercm" className="scroll-mt-20">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold">HERCM Tracker</h2>
                <p className="text-muted-foreground mt-1">Track your weekly progress across all life areas</p>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="border-primary/30 hover:bg-gradient-to-r hover:from-primary/10 hover:to-accent/10"
                  data-testid="button-prev-week"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="border-primary/30 hover:bg-gradient-to-r hover:from-primary/10 hover:to-accent/10"
                  data-testid="button-next-week"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <WeeklySummary
              weekStart="Feb 3"
              weekEnd="Feb 9"
              completionPercent={75}
              areasCompleted={3}
              totalAreas={4}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(Object.keys(hercmData) as Array<keyof typeof hercmData>).map((category) => (
                <HERCMCard
                  key={category}
                  category={category}
                  current={hercmData[category].current}
                  target={hercmData[category].target}
                  onViewChecklist={() => {
                    setSelectedCategory(category);
                    setChecklistOpen(true);
                  }}
                />
              ))}
            </div>

            <PlatinumProgress currentWeek={3} weekStatuses={weekStatuses} />
          </div>
        </section>

        <section ref={ritualsRef} id="rituals" className="scroll-mt-20">
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

        <section ref={coursesRef} id="courses" className="scroll-mt-20">
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold">Course Tracker</h2>
              <p className="text-muted-foreground mt-1">Manage your learning journey and skill development</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {courses.map((course) => (
                <CourseCard key={course.id} {...course} />
              ))}
            </div>
          </div>
        </section>
      </main>

      <ChecklistModal
        open={checklistOpen}
        onOpenChange={setChecklistOpen}
        title={`${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Improvement Checklist`}
        description={`Complete these items to improve your ${selectedCategory} score this week`}
        items={checklistItems}
        onComplete={() => setChecklistOpen(false)}
      />

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
    </div>
  );
}
