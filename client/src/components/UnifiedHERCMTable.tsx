import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkles, Check, X, TrendingUp, History, Edit2, Save, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { apiRequest } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import WeekComparison from './WeekComparison';

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

interface HERCMBelief {
  category: 'Health' | 'Relationship' | 'Career' | 'Money';
  // Current Week Data
  currentRating: number;
  problems: string;
  currentFeelings: string;
  currentBelief: string;
  currentActions: string;
  // Next Week Data
  targetRating: number;
  result: string;
  nextFeelings: string;
  nextWeekTarget: string;
  nextActions: string;
  // AI Suggestions & Checklist
  checklist: ChecklistItem[];
  courseSuggestion: string;
  affirmationSuggestion: string;
}

interface UnifiedHERCMTableProps {
  weekNumber: number;
  onGenerateNextWeek: () => void;
  onViewHistory: () => void;
}

// Generate blank beliefs for a new week
const getBlankBeliefs = (): HERCMBelief[] => {
  return [
    {
      category: 'Health',
      currentRating: 1,
      problems: '',
      currentFeelings: '',
      currentBelief: '',
      currentActions: '',
      targetRating: 2,
      result: '',
      nextFeelings: '',
      nextWeekTarget: '',
      nextActions: '',
      checklist: [
        { id: 'h1', text: 'Exercise/Walk daily', checked: false },
        { id: 'h2', text: 'Healthy eating habit', checked: false },
        { id: 'h3', text: 'Stress management practice', checked: false }
      ],
      courseSuggestion: '',
      affirmationSuggestion: ''
    },
    {
      category: 'Relationship',
      currentRating: 1,
      problems: '',
      currentFeelings: '',
      currentBelief: '',
      currentActions: '',
      targetRating: 2,
      result: '',
      nextFeelings: '',
      nextWeekTarget: '',
      nextActions: '',
      checklist: [
        { id: 'e1', text: 'Daily gratitude practice', checked: false },
        { id: 'e2', text: 'Active listening session', checked: false },
        { id: 'e3', text: 'Quality time with loved ones', checked: false }
      ],
      courseSuggestion: '',
      affirmationSuggestion: ''
    },
    {
      category: 'Career',
      currentRating: 1,
      problems: '',
      currentFeelings: '',
      currentBelief: '',
      currentActions: '',
      targetRating: 2,
      result: '',
      nextFeelings: '',
      nextWeekTarget: '',
      nextActions: '',
      checklist: [
        { id: 'r1', text: 'Skill development activity', checked: false },
        { id: 'r2', text: 'Networking or job search', checked: false },
        { id: 'r3', text: 'Complete key task/project', checked: false }
      ],
      courseSuggestion: '',
      affirmationSuggestion: ''
    },
    {
      category: 'Money',
      currentRating: 1,
      problems: '',
      currentFeelings: '',
      currentBelief: '',
      currentActions: '',
      targetRating: 2,
      result: '',
      nextFeelings: '',
      nextWeekTarget: '',
      nextActions: '',
      checklist: [
        { id: 'c1', text: 'Track daily expenses', checked: false },
        { id: 'c2', text: 'Save/Invest percentage', checked: false },
        { id: 'c3', text: 'Review budget/finances', checked: false }
      ],
      courseSuggestion: '',
      affirmationSuggestion: ''
    }
  ];
};

// Week-specific belief data generator  
const getWeekBeliefs = (week: number): HERCMBelief[] => {
  // TODO: In production, fetch from database and check if data exists
  // For now, show demo data for week 1, blank for others to demonstrate concept
  
  if (week === 1) {
    // Demo week with sample data to show the system works
    return [
      {
        category: 'Health',
        currentRating: 4,
        problems: "Overweight 2kgs, Anxiety, Panick Attacks",
        currentFeelings: "Lazy, Tensed, Anxiety",
        currentBelief: "I have anxiety because of financial problems",
        currentActions: "I overeat, I don't exercise",
        targetRating: 5,
        result: "I will lose 200 gms, reduced anxiety attacks",
        nextFeelings: "Active, Relaxed, Calm",
        nextWeekTarget: "I create healthy habits that reduce my anxiety",
        nextActions: "Walk 2000 steps 3/week, Practice ALOA breathing",
        checklist: [
          { id: 'h1', text: "ALOA breathing 2x daily", checked: false },
          { id: 'h2', text: "Walk 2000 steps 3/week", checked: false },
          { id: 'h3', text: "Stop overeating", checked: false }
        ],
        courseSuggestion: "Health Foundations - Module 1",
        affirmationSuggestion: "I am disciplined and consistent"
      },
      {
        category: 'Relationship',
        currentRating: 5,
        problems: "Conflicts with Boss, Not getting along with Life partner",
        currentFeelings: "Lonely, Angry, Sad",
        currentBelief: "I get angry at my family. My boss is not supporting me",
        currentActions: "I get angry at my family, I shout a lot, I am not a good listener",
        targetRating: 6,
        result: "I am now getting along with my Boss, Better communication with partner",
        nextFeelings: "Happy, Peaceful, Connected",
        nextWeekTarget: "My boss and I have mutual respect. I communicate with love",
        nextActions: "Daily gratitude, Active listening 15min, Quality time with partner",
        checklist: [
          { id: 'e1', text: "Daily gratitude practice", checked: false },
          { id: 'e2', text: "Active listening 15 min", checked: false },
          { id: 'e3', text: "Quality time 30 min", checked: false }
        ],
        courseSuggestion: "Relationship Basics - Module 1",
        affirmationSuggestion: "I am worthy of love and connection"
      },
      {
        category: 'Career',
        currentRating: 4,
        problems: "No job, stuck in a unsatisfied job",
        currentFeelings: "Helpless, Failure",
        currentBelief: "I am not skilled enough for better opportunities",
        currentActions: "Not giving interviews, not making videos, procrastinating",
        targetRating: 5,
        result: "I got a job offer, I feel satisfied with my progress",
        nextFeelings: "Confident, Motivated",
        nextWeekTarget: "I am worthy of success and recognition",
        nextActions: "Apply to 5 jobs, Update resume, Practice interviews",
        checklist: [
          { id: 'r1', text: "Apply to 5 jobs", checked: false },
          { id: 'r2', text: "Update resume", checked: false },
          { id: 'r3', text: "Practice mock interview", checked: false }
        ],
        courseSuggestion: "Career Growth - Module 1",
        affirmationSuggestion: "I am capable of achieving my dreams"
      },
      {
        category: 'Money',
        currentRating: 3,
        problems: "Not able to Save money",
        currentFeelings: "Small, Poor",
        currentBelief: "I don't earn enough to save",
        currentActions: "Not tracking expenses, impulse buying, no budget",
        targetRating: 4,
        result: "I saved 10% of income successfully",
        nextFeelings: "Abundant, Secure",
        nextWeekTarget: "Money flows to me naturally",
        nextActions: "Track expenses daily, Save 10%, Cut unnecessary expenses",
        checklist: [
          { id: 'c1', text: "Track all expenses", checked: false },
          { id: 'c2', text: "Save 10% income", checked: false },
          { id: 'c3', text: "Review budget weekly", checked: false }
        ],
        courseSuggestion: "Financial Literacy - Module 1",
        affirmationSuggestion: "Money flows to me naturally"
      }
    ];
  } else if (week === 2) {
    return [
      {
        category: 'Health',
        currentRating: 5,
        problems: "Weight reduced by 200gms, Less anxiety",
        currentFeelings: "Active, Relaxed, Calm",
        currentBelief: "I am building healthy habits",
        currentActions: "Walking 2000 steps, practicing ALOA",
        targetRating: 6,
        result: "I will lose 500 gms, Anxiety under control",
        nextFeelings: "Energetic, Peaceful, Strong",
        nextWeekTarget: "I prioritize my health consistently",
        nextActions: "20 min morning walk, Meal prep Sunday",
        checklist: [
          { id: 'h1', text: "20 min morning walk", checked: false },
          { id: 'h2', text: "Meal prep Sunday", checked: false },
          { id: 'h3', text: "Yoga 3x per week", checked: false }
        ],
        courseSuggestion: "Health Mastery - Module 2",
        affirmationSuggestion: "My body is my temple"
      },
      {
        category: 'Relationship',
        currentRating: 6,
        problems: "Better communication with Boss",
        currentFeelings: "Happy, Peaceful, Connected",
        currentBelief: "I build meaningful connections",
        currentActions: "Daily gratitude, Active listening",
        targetRating: 7,
        result: "Strong bond with partner and boss",
        nextFeelings: "Loved, Appreciated, Joyful",
        nextWeekTarget: "I communicate with love and clarity",
        nextActions: "Plan date night, Express gratitude 5x",
        checklist: [
          { id: 'e1', text: "Daily gratitude practice", checked: false },
          { id: 'e2', text: "Plan date night", checked: false },
          { id: 'e3', text: "Active listening 15 min", checked: false }
        ],
        courseSuggestion: "Relationship Mastery - Communication",
        affirmationSuggestion: "I express love freely"
      },
      {
        category: 'Career',
        currentRating: 5,
        problems: "Got job interview calls",
        currentFeelings: "Confident, Motivated",
        currentBelief: "I take steps toward my goals",
        currentActions: "Applied to 5 jobs, Updated resume",
        targetRating: 6,
        result: "Received job offer",
        nextFeelings: "Successful, Fulfilled, Proud",
        nextWeekTarget: "I am worthy of success and recognition",
        nextActions: "Complete project milestone, Network actively",
        checklist: [
          { id: 'r1', text: "Complete project milestone", checked: false },
          { id: 'r2', text: "Speak up in meetings", checked: false },
          { id: 'r3', text: "Request feedback", checked: false }
        ],
        courseSuggestion: "Career Excellence - Leadership",
        affirmationSuggestion: "I deserve success"
      },
      {
        category: 'Money',
        currentRating: 4,
        problems: "Saved 10% of income successfully",
        currentFeelings: "Abundant, Secure",
        currentBelief: "I manage money wisely",
        currentActions: "Tracking expenses, Saving 10%",
        targetRating: 5,
        result: "Saved 15% of income, Created emergency fund",
        nextFeelings: "Wealthy, Grateful, Free",
        nextWeekTarget: "Money flows to me with ease",
        nextActions: "Increase savings, Explore investments",
        checklist: [
          { id: 'c1', text: "Automate savings", checked: false },
          { id: 'c2', text: "Research investments", checked: false },
          { id: 'c3', text: "Cut 2 unnecessary expenses", checked: false }
        ],
        courseSuggestion: "Wealth Building - Module 2",
        affirmationSuggestion: "I attract abundance"
      }
    ];
  } else if (week === 3) {
    return [
      {
        category: 'Health',
        currentRating: 6,
        problems: "Lost 500gms, Anxiety controlled",
        currentFeelings: "Energetic, Peaceful, Strong",
        currentBelief: "I prioritize my health consistently",
        currentActions: "Morning walks, Meal prepping, Yoga 3x",
        targetRating: 7,
        result: "Reached ideal weight, Completely anxiety-free",
        nextFeelings: "Vibrant, Balanced, Healthy",
        nextWeekTarget: "I love and care for my body",
        nextActions: "Gym 4x week, Healthy meal plan",
        checklist: [
          { id: 'h1', text: "Gym 4x per week", checked: false },
          { id: 'h2', text: "Follow meal plan", checked: false },
          { id: 'h3', text: "Sleep 8 hours daily", checked: false }
        ],
        courseSuggestion: "Advanced Health Optimization",
        affirmationSuggestion: "I am the healthiest version of myself"
      },
      {
        category: 'Relationship',
        currentRating: 7,
        problems: "Strong bond with all relationships",
        currentFeelings: "Loved, Appreciated, Joyful",
        currentBelief: "I communicate with love and clarity",
        currentActions: "Date nights, Gratitude practice, Active listening",
        targetRating: 8,
        result: "Deep connection with family and colleagues",
        nextFeelings: "Fulfilled, Cherished, Peaceful",
        nextWeekTarget: "I attract loving relationships",
        nextActions: "Family time 3x week, Resolve conflicts peacefully",
        checklist: [
          { id: 'e1', text: "Family bonding activities", checked: false },
          { id: 'e2', text: "Weekly date night", checked: false },
          { id: 'e3', text: "Practice empathy daily", checked: false }
        ],
        courseSuggestion: "Deep Connection Mastery",
        affirmationSuggestion: "I am surrounded by love"
      },
      {
        category: 'Career',
        currentRating: 6,
        problems: "Got promotion, recognized at work",
        currentFeelings: "Successful, Fulfilled, Proud",
        currentBelief: "I am worthy of success and recognition",
        currentActions: "Taking initiative, Networking, Upskilling",
        targetRating: 7,
        result: "Leading important projects, Becoming expert",
        nextFeelings: "Accomplished, Confident, Respected",
        nextWeekTarget: "I create value and impact",
        nextActions: "Lead team project, Mentor junior colleagues",
        checklist: [
          { id: 'r1', text: "Lead team meeting", checked: false },
          { id: 'r2', text: "Complete certification", checked: false },
          { id: 'r3', text: "Mentor 2 colleagues", checked: false }
        ],
        courseSuggestion: "Leadership Excellence",
        affirmationSuggestion: "I am a natural leader"
      },
      {
        category: 'Money',
        currentRating: 5,
        problems: "Saved 15%, Started emergency fund",
        currentFeelings: "Wealthy, Grateful, Free",
        currentBelief: "Money flows to me with ease",
        currentActions: "Automated savings, Researching investments",
        targetRating: 6,
        result: "Built 3-month emergency fund, First investment",
        nextFeelings: "Prosperous, Abundant, Secure",
        nextWeekTarget: "I build lasting wealth",
        nextActions: "Open investment account, Increase income",
        checklist: [
          { id: 'c1', text: "Start investment portfolio", checked: false },
          { id: 'c2', text: "Side income stream", checked: false },
          { id: 'c3', text: "Financial planning session", checked: false }
        ],
        courseSuggestion: "Investment Foundations",
        affirmationSuggestion: "Wealth flows to me effortlessly"
      }
    ];
  }
  
  // For all other weeks, return blank template (user fills data)
  return getBlankBeliefs();
};

const calculateProgress = (checklist: ChecklistItem[]): number => {
  if (checklist.length === 0) return 0;
  const completed = checklist.filter(item => item.checked).length;
  return Math.round((completed / checklist.length) * 100);
};

const getProgressColor = (progress: number) => {
  if (progress >= 80) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
  if (progress >= 50) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
};

export default function UnifiedHERCMTable({ weekNumber, onGenerateNextWeek, onViewHistory }: UnifiedHERCMTableProps) {
  const [beliefs, setBeliefs] = useState<HERCMBelief[]>([]);
  const [editingField, setEditingField] = useState<{ category: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [loadingCourses, setLoadingCourses] = useState<Set<string>>(new Set());
  const [autoFilling, setAutoFilling] = useState(false);
  const { toast } = useToast();

  // Fetch week data from database
  const { data: weekData, isLoading } = useQuery({
    queryKey: ['/api/hercm/week', weekNumber],
    enabled: weekNumber > 0,
  });

  useEffect(() => {
    // If we have saved data from database, use it
    // Otherwise, start with blank template for user to fill
    if (weekData) {
      // TODO: Transform database format to component format
      // For now, use blank beliefs as placeholder
      setBeliefs(getBlankBeliefs());
    } else {
      // New week - start with blank template
      setBeliefs(getBlankBeliefs());
    }
  }, [weekNumber, weekData]);

  // Fetch AI course recommendations
  const fetchCourseRecommendation = async (category: string, belief: HERCMBelief) => {
    setLoadingCourses(prev => new Set(prev).add(category));

    try {
      const response = await apiRequest('POST', '/api/courses/recommend', {
        category: category,
        currentRating: belief.currentRating,
        problems: belief.problems || '',
        feelings: belief.currentFeelings || '',
        beliefs: belief.currentBelief || '',
        actions: belief.currentActions || '',
      });

      const recommendations = await response.json();
      
      if (recommendations && recommendations.length > 0) {
        const topCourse = recommendations[0];
        setBeliefs(prev => prev.map(b => {
          if (b.category === category) {
            return { 
              ...b, 
              courseSuggestion: `${topCourse.course.courseName} (${topCourse.score}% match)` 
            };
          }
          return b;
        }));
      }
    } catch (error) {
      console.error('Failed to fetch course recommendation:', error);
    } finally {
      setLoadingCourses(prev => {
        const newSet = new Set(prev);
        newSet.delete(category);
        return newSet;
      });
    }
  };

  const weeklyProgress = beliefs.length > 0
    ? Math.round(beliefs.reduce((sum, b) => sum + calculateProgress(b.checklist), 0) / beliefs.length)
    : 0;

  const handleChecklistToggle = (category: string, itemId: string) => {
    setBeliefs(prev => prev.map(belief => {
      if (belief.category === category) {
        return {
          ...belief,
          checklist: belief.checklist.map(item =>
            item.id === itemId ? { ...item, checked: !item.checked } : item
          )
        };
      }
      return belief;
    }));
  };

  const handleRatingChange = (category: string, newRating: number) => {
    setBeliefs(prev => prev.map(belief => {
      if (belief.category === category) {
        return {
          ...belief,
          currentRating: newRating,
          targetRating: newRating + 1 // Auto-increment by 1
        };
      }
      return belief;
    }));
  };

  const startEdit = (category: string, field: string, currentValue: string) => {
    setEditingField({ category, field });
    setEditValue(currentValue);
  };

  const saveEdit = async () => {
    if (!editingField) return;
    
    // Save the editing info before clearing it
    const { category, field } = editingField;
    let updatedBelief: HERCMBelief | undefined = undefined;
    
    setBeliefs(prev => prev.map(belief => {
      if (belief.category === category) {
        const updated = { ...belief, [field]: editValue } as HERCMBelief;
        updatedBelief = updated;
        return updated;
      }
      return belief;
    }));
    
    setEditingField(null);
    setEditValue('');
    
    // Fetch AI course recommendation if current week field was edited
    if (updatedBelief && ['problems', 'currentFeelings', 'currentBelief', 'currentActions'].includes(field)) {
      await fetchCourseRecommendation(category, updatedBelief);
    }
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const isEditing = (category: string, field: string) => {
    return editingField?.category === category && editingField?.field === field;
  };

  // Auto-fill next week goals using AI
  const handleAutoFillNextWeek = async () => {
    setAutoFilling(true);
    try {
      // Call API for each category
      const updatedBeliefs = await Promise.all(
        beliefs.map(async (belief) => {
          try {
            const response = await apiRequest('POST', '/api/hercm/auto-fill-next-week', {
              category: belief.category,
              currentRating: belief.currentRating,
              problems: belief.problems,
              currentFeelings: belief.currentFeelings,
              currentBelief: belief.currentBelief,
              currentActions: belief.currentActions,
            });

            const aiSuggestion = await response.json();
            
            return {
              ...belief,
              targetRating: aiSuggestion.targetRating,
              result: aiSuggestion.expectedResult,
              nextFeelings: aiSuggestion.targetFeelings,
              nextWeekTarget: aiSuggestion.nextWeekTarget,
              nextActions: aiSuggestion.nextActions,
              affirmationSuggestion: aiSuggestion.affirmation,
            };
          } catch (error) {
            console.error(`Failed to auto-fill for ${belief.category}:`, error);
            return belief; // Return unchanged if API fails
          }
        })
      );
      
      setBeliefs(updatedBeliefs);
    } catch (error) {
      console.error('Auto-fill error:', error);
    } finally {
      setAutoFilling(false);
    }
  };

  // Calculate comparison data (previous week's target vs current week's actual)
  const calculateComparison = () => {
    if (weekNumber <= 1) return [];
    
    const previousWeek = getWeekBeliefs(weekNumber - 1);
    
    return beliefs.map((current, index) => {
      const previous = previousWeek[index];
      
      // Simple text similarity calculation (can be enhanced)
      const similarity = calculateTextSimilarity(
        previous.nextWeekTarget || '',
        current.currentBelief || ''
      );
      
      return {
        category: current.category,
        previousTarget: previous.nextWeekTarget || 'No target set',
        currentActual: current.currentBelief || 'Not filled yet',
        matchPercentage: similarity,
      };
    });
  };

  // Simple text similarity function (basic implementation)
  const calculateTextSimilarity = (text1: string, text2: string): number => {
    if (!text1 || !text2) return 0;
    
    const words1 = text1.toLowerCase().split(' ');
    const words2 = text2.toLowerCase().split(' ');
    
    const matchingWords = words1.filter(word => 
      words2.some(w => w.includes(word) || word.includes(w))
    ).length;
    
    const maxLength = Math.max(words1.length, words2.length);
    return Math.round((matchingWords / maxLength) * 100);
  };

  const comparisonData = calculateComparison();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Week {weekNumber} - HERCM Tracker
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Track all 4 life areas in one unified view
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={getProgressColor(weeklyProgress)} data-testid="badge-weekly-progress">
            {weeklyProgress}% Weekly Progress
          </Badge>
          <Button 
            variant="outline" 
            onClick={onViewHistory}
            data-testid="button-view-history"
          >
            <History className="w-4 h-4 mr-2" />
            View History
          </Button>
          <Button 
            onClick={handleAutoFillNextWeek}
            disabled={autoFilling}
            className="bg-gradient-to-r from-cyan-500 to-blue-500"
            data-testid="button-auto-fill"
          >
            {autoFilling ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                AI Filling...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                AI Auto-Fill Next Week
              </>
            )}
          </Button>
          <Button 
            onClick={onGenerateNextWeek}
            className="bg-gradient-to-r from-primary to-accent"
            data-testid="button-generate-next-week"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Generate Next Week
          </Button>
        </div>
      </div>

      {/* Week-over-Week Comparison (only show for week 2+) */}
      {weekNumber > 1 && comparisonData.length > 0 && (
        <WeekComparison comparisons={comparisonData} />
      )}

      {/* Current Week Table */}
      <div className="border-2 border-rose-300 dark:border-rose-700 rounded-lg overflow-x-auto shadow-lg">
        <div className="bg-gradient-to-r from-rose-400 to-pink-500 dark:from-rose-600 dark:to-pink-700 px-4 py-3 border-b-2 border-rose-300 dark:border-rose-800">
          <h3 className="font-bold text-white text-xl text-center drop-shadow-md flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5" />
            Current Week
          </h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30">
              <TableHead className="font-bold border-r">HERCM Area</TableHead>
              <TableHead className="w-[80px] bg-rose-100 dark:bg-rose-900/40 font-semibold">Rating</TableHead>
              <TableHead className="w-[180px] bg-rose-100 dark:bg-rose-900/40 font-semibold">Problems</TableHead>
              <TableHead className="w-[150px] bg-rose-100 dark:bg-rose-900/40 font-semibold">Feelings</TableHead>
              <TableHead className="w-[180px] bg-rose-100 dark:bg-rose-900/40 font-semibold">Beliefs/Reasons</TableHead>
              <TableHead className="w-[180px] bg-rose-100 dark:bg-rose-900/40 font-semibold border-r">Actions</TableHead>
              
              <TableHead className="w-[180px] bg-gradient-to-r from-cyan-100 to-blue-100 dark:from-cyan-900/40 dark:to-blue-900/40 font-semibold">
                <div className="flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  AI Course
                </div>
              </TableHead>
              <TableHead className="w-[200px] bg-gradient-to-r from-purple-100 to-violet-100 dark:from-purple-900/40 dark:to-violet-900/40 font-semibold">Checklist (3)</TableHead>
              <TableHead className="w-[100px] bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40 font-semibold text-center">Progress</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {beliefs.map((belief) => (
              <TableRow key={belief.category} className="border-b" data-testid={`row-${belief.category.toLowerCase()}`}>
                {/* Category Column */}
                <TableCell className="font-semibold border-r bg-muted/20" data-testid={`cell-category-${belief.category.toLowerCase()}`}>
                  <Badge variant="outline" className="font-semibold">
                    {belief.category}
                  </Badge>
                </TableCell>

                {/* Current Week - Rating */}
                <TableCell className="p-2 bg-red-50/30 dark:bg-red-950/10">
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={belief.currentRating}
                    onChange={(e) => handleRatingChange(belief.category, parseInt(e.target.value) || 1)}
                    className="w-16 text-center"
                    data-testid={`input-current-rating-${belief.category.toLowerCase()}`}
                  />
                </TableCell>

                {/* Current Week - Problems */}
                <TableCell className="p-2 bg-red-50/30 dark:bg-red-950/10">
                  {isEditing(belief.category, 'problems') ? (
                    <div className="space-y-1">
                      <Textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="min-h-[60px] text-xs"
                        placeholder="Enter your current problems..."
                        data-testid={`textarea-problems-${belief.category.toLowerCase()}`}
                      />
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={saveEdit} className="h-6 px-2" data-testid={`button-save-problems-${belief.category.toLowerCase()}`}>
                          <Save className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-6 px-2" data-testid={`button-cancel-problems-${belief.category.toLowerCase()}`}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="group relative">
                      <div className="text-xs" data-testid={`text-problems-${belief.category.toLowerCase()}`}>
                        {belief.problems || <span className="text-muted-foreground italic">Click to add problems...</span>}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(belief.category, 'problems', belief.problems)}
                        className="absolute top-0 right-0 h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                        data-testid={`button-edit-problems-${belief.category.toLowerCase()}`}
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </TableCell>

                {/* Current Week - Feelings */}
                <TableCell className="p-2 bg-red-50/30 dark:bg-red-950/10">
                  {isEditing(belief.category, 'currentFeelings') ? (
                    <div className="space-y-1">
                      <Textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="min-h-[60px] text-xs"
                        data-testid={`textarea-feelings-${belief.category.toLowerCase()}`}
                      />
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={saveEdit} className="h-6 px-2">
                          <Save className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-6 px-2">
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="group relative">
                      <div className="text-xs" data-testid={`text-feelings-${belief.category.toLowerCase()}`}>
                        {belief.currentFeelings || <span className="text-muted-foreground italic">Click to add feelings...</span>}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(belief.category, 'currentFeelings', belief.currentFeelings)}
                        className="absolute top-0 right-0 h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </TableCell>

                {/* Current Week - Beliefs */}
                <TableCell className="p-2 bg-red-50/30 dark:bg-red-950/10">
                  {isEditing(belief.category, 'currentBelief') ? (
                    <div className="space-y-1">
                      <Textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="min-h-[60px] text-xs"
                        data-testid={`textarea-beliefs-${belief.category.toLowerCase()}`}
                      />
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={saveEdit} className="h-6 px-2">
                          <Save className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-6 px-2">
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="group relative">
                      <div className="text-xs" data-testid={`text-beliefs-${belief.category.toLowerCase()}`}>
                        {belief.currentBelief || <span className="text-muted-foreground italic">Click to add beliefs...</span>}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(belief.category, 'currentBelief', belief.currentBelief)}
                        className="absolute top-0 right-0 h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </TableCell>

                {/* Current Week - Actions */}
                <TableCell className="p-2 bg-red-50/30 dark:bg-red-950/10 border-r">
                  {isEditing(belief.category, 'currentActions') ? (
                    <div className="space-y-1">
                      <Textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="min-h-[60px] text-xs"
                        data-testid={`textarea-actions-${belief.category.toLowerCase()}`}
                      />
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={saveEdit} className="h-6 px-2">
                          <Save className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-6 px-2">
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="group relative">
                      <div className="text-xs" data-testid={`text-actions-${belief.category.toLowerCase()}`}>
                        {belief.currentActions || <span className="text-muted-foreground italic">Click to add actions...</span>}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(belief.category, 'currentActions', belief.currentActions)}
                        className="absolute top-0 right-0 h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </TableCell>

                {/* AI Course Suggestion */}
                <TableCell className="p-2 bg-cyan-50/30 dark:bg-cyan-950/10">
                  {loadingCourses.has(belief.category) ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-cyan-600" />
                      <span className="text-xs text-muted-foreground">Loading...</span>
                    </div>
                  ) : (
                    <div className="text-xs text-cyan-700 dark:text-cyan-400 font-medium" data-testid={`text-course-${belief.category.toLowerCase()}`}>
                      {belief.courseSuggestion}
                    </div>
                  )}
                </TableCell>

                {/* Checklist */}
                <TableCell className="p-2 bg-purple-50/30 dark:bg-purple-950/10">
                  <div className="space-y-1">
                    {belief.checklist.map((item) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={item.checked}
                          onCheckedChange={() => handleChecklistToggle(belief.category, item.id)}
                          data-testid={`checkbox-${belief.category.toLowerCase()}-${item.id}`}
                        />
                        <span className={`text-xs ${item.checked ? 'line-through text-muted-foreground' : ''}`}>
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </TableCell>

                {/* Progress */}
                <TableCell className="p-2 text-center bg-emerald-50/30 dark:bg-emerald-950/10">
                  <Badge className={getProgressColor(calculateProgress(belief.checklist))} data-testid={`badge-progress-${belief.category.toLowerCase()}`}>
                    {calculateProgress(belief.checklist)}%
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Next Week Table */}
      <div className="border-2 border-blue-300 dark:border-blue-700 rounded-lg overflow-x-auto shadow-lg">
        <div className="bg-gradient-to-r from-blue-400 to-cyan-500 dark:from-blue-600 dark:to-cyan-700 px-4 py-3 border-b-2 border-blue-300 dark:border-blue-800">
          <h3 className="font-bold text-white text-xl text-center drop-shadow-md flex items-center justify-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Next Week Target
          </h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30">
              <TableHead className="font-bold border-r">HERCM Area</TableHead>
              <TableHead className="w-[80px] bg-blue-100 dark:bg-blue-900/40 font-semibold">Rating</TableHead>
              <TableHead className="w-[180px] bg-blue-100 dark:bg-blue-900/40 font-semibold">Problems</TableHead>
              <TableHead className="w-[150px] bg-blue-100 dark:bg-blue-900/40 font-semibold">Feelings</TableHead>
              <TableHead className="w-[180px] bg-blue-100 dark:bg-blue-900/40 font-semibold">Beliefs/Reasons</TableHead>
              <TableHead className="w-[180px] bg-blue-100 dark:bg-blue-900/40 font-semibold border-r">Actions</TableHead>
              
              <TableHead className="w-[180px] bg-gradient-to-r from-cyan-100 to-blue-100 dark:from-cyan-900/40 dark:to-blue-900/40 font-semibold">
                <div className="flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  AI Course
                </div>
              </TableHead>
              <TableHead className="w-[200px] bg-gradient-to-r from-purple-100 to-violet-100 dark:from-purple-900/40 dark:to-violet-900/40 font-semibold">Checklist (3)</TableHead>
              <TableHead className="w-[100px] bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40 font-semibold text-center">Progress</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {beliefs.map((belief) => (
              <TableRow key={belief.category} className="border-b" data-testid={`row-next-${belief.category.toLowerCase()}`}>
                {/* Category Column */}
                <TableCell className="font-semibold border-r bg-muted/20">
                  <Badge variant="outline" className="font-semibold">
                    {belief.category}
                  </Badge>
                </TableCell>

                {/* Next Week - Rating */}
                <TableCell className="p-2 bg-blue-50/30 dark:bg-blue-950/10">
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={belief.targetRating}
                    onChange={(e) => {
                      const newTarget = parseInt(e.target.value) || 1;
                      setBeliefs(prev => prev.map(b => 
                        b.category === belief.category ? { ...b, targetRating: newTarget } : b
                      ));
                    }}
                    className="w-16 text-center"
                    data-testid={`input-target-rating-${belief.category.toLowerCase()}`}
                  />
                </TableCell>

                {/* Next Week - Problems */}
                <TableCell className="p-2 bg-blue-50/30 dark:bg-blue-950/10">
                  {isEditing(belief.category, 'result') ? (
                    <div className="space-y-1">
                      <Textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="min-h-[60px] text-xs"
                        data-testid={`textarea-next-problems-${belief.category.toLowerCase()}`}
                      />
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={saveEdit} className="h-6 px-2" data-testid={`button-save-next-problems-${belief.category.toLowerCase()}`}>
                          <Save className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-6 px-2" data-testid={`button-cancel-next-problems-${belief.category.toLowerCase()}`}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="group relative">
                      <div className="text-xs" data-testid={`text-next-problems-${belief.category.toLowerCase()}`}>{belief.result}</div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(belief.category, 'result', belief.result)}
                        className="absolute top-0 right-0 h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                        data-testid={`button-edit-next-problems-${belief.category.toLowerCase()}`}
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </TableCell>

                {/* Next Week - Feelings */}
                <TableCell className="p-2 bg-blue-50/30 dark:bg-blue-950/10">
                  {isEditing(belief.category, 'nextFeelings') ? (
                    <div className="space-y-1">
                      <Textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="min-h-[60px] text-xs"
                        data-testid={`textarea-next-feelings-${belief.category.toLowerCase()}`}
                      />
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={saveEdit} className="h-6 px-2" data-testid={`button-save-next-feelings-${belief.category.toLowerCase()}`}>
                          <Save className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-6 px-2" data-testid={`button-cancel-next-feelings-${belief.category.toLowerCase()}`}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="group relative">
                      <div className="text-xs" data-testid={`text-next-feelings-${belief.category.toLowerCase()}`}>{belief.nextFeelings}</div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(belief.category, 'nextFeelings', belief.nextFeelings)}
                        className="absolute top-0 right-0 h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                        data-testid={`button-edit-next-feelings-${belief.category.toLowerCase()}`}
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </TableCell>

                {/* Next Week - Beliefs/Reasons */}
                <TableCell className="p-2 bg-blue-50/30 dark:bg-blue-950/10">
                  {isEditing(belief.category, 'nextWeekTarget') ? (
                    <div className="space-y-1">
                      <Textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="min-h-[60px] text-xs"
                        data-testid={`textarea-next-beliefs-${belief.category.toLowerCase()}`}
                      />
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={saveEdit} className="h-6 px-2" data-testid={`button-save-next-beliefs-${belief.category.toLowerCase()}`}>
                          <Save className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-6 px-2" data-testid={`button-cancel-next-beliefs-${belief.category.toLowerCase()}`}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="group relative">
                      <div className="text-xs" data-testid={`text-next-beliefs-${belief.category.toLowerCase()}`}>{belief.nextWeekTarget}</div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(belief.category, 'nextWeekTarget', belief.nextWeekTarget)}
                        className="absolute top-0 right-0 h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                        data-testid={`button-edit-next-beliefs-${belief.category.toLowerCase()}`}
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </TableCell>

                {/* Next Week - Actions */}
                <TableCell className="p-2 bg-blue-50/30 dark:bg-blue-950/10 border-r">
                  {isEditing(belief.category, 'nextActions') ? (
                    <div className="space-y-1">
                      <Textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="min-h-[60px] text-xs"
                        data-testid={`textarea-next-actions-${belief.category.toLowerCase()}`}
                      />
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={saveEdit} className="h-6 px-2" data-testid={`button-save-next-actions-${belief.category.toLowerCase()}`}>
                          <Save className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-6 px-2" data-testid={`button-cancel-next-actions-${belief.category.toLowerCase()}`}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="group relative">
                      <div className="text-xs" data-testid={`text-next-actions-${belief.category.toLowerCase()}`}>{belief.nextActions}</div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(belief.category, 'nextActions', belief.nextActions)}
                        className="absolute top-0 right-0 h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                        data-testid={`button-edit-next-actions-${belief.category.toLowerCase()}`}
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </TableCell>

                {/* AI Course */}
                <TableCell className="p-2 bg-cyan-50/30 dark:bg-cyan-950/10">
                  <div className="text-xs italic text-cyan-700 dark:text-cyan-400" data-testid={`text-next-course-${belief.category.toLowerCase()}`}>
                    {belief.affirmationSuggestion}
                  </div>
                </TableCell>

                {/* Checklist */}
                <TableCell className="p-2 bg-purple-50/30 dark:bg-purple-950/10">
                  <div className="space-y-1">
                    {belief.checklist.map((item) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={item.checked}
                          onCheckedChange={() => handleChecklistToggle(belief.category, item.id)}
                          data-testid={`checkbox-next-${belief.category.toLowerCase()}-${item.id}`}
                        />
                        <span className={`text-xs ${item.checked ? 'line-through text-muted-foreground' : ''}`}>
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </TableCell>

                {/* Progress */}
                <TableCell className="p-2 text-center bg-emerald-50/30 dark:bg-emerald-950/10">
                  <Badge className={getProgressColor(calculateProgress(belief.checklist))} data-testid={`badge-next-progress-${belief.category.toLowerCase()}`}>
                    {calculateProgress(belief.checklist)}%
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
