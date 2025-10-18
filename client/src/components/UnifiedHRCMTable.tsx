import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkles, Check, X, TrendingUp, Save, Loader2, ArrowUp, ArrowDown, Plus, MoreHorizontal, Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { format, isSameDay } from 'date-fns';
import WeekComparison from './WeekComparison';
import { RefinedHistoryModal } from './RefinedHistoryModal';
import { EnhancedAnalyticsDialog } from './EnhancedAnalyticsDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

interface AssignmentLesson {
  id: string;
  courseId: string;
  courseName: string;
  lessonName: string;
  url: string;
  completed: boolean;
  source?: 'user' | 'admin';  // Track if user-selected or admin-recommended
  recommendationId?: string;   // Original recommendation ID if admin-recommended
}

interface AssignmentCourse {
  id: string;
  courseName: string;
  link: string;
  completed: boolean;
}

interface Assignment {
  courses: AssignmentCourse[];
  lessons: AssignmentLesson[];
}

interface HRCMBelief {
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
  // Next Week Checklists
  resultChecklist?: ChecklistItem[];
  feelingsChecklist?: ChecklistItem[];
  beliefsChecklist?: ChecklistItem[];
  actionsChecklist?: ChecklistItem[];
  // Checklist & Assignment
  checklist: ChecklistItem[];
  assignment?: Assignment;
}

interface UnifiedHRCMTableProps {
  weekNumber?: number;
  onWeekChange?: (newWeek: number) => void;
  viewAsUserId?: string;
  isAdminView?: boolean;
}

// Generate completely blank beliefs for a new week - absolutely no pre-filled data
// Uses fallback hardcoded constants (will be replaced with dynamic data in component)
const getBlankBeliefs = (): HRCMBelief[] => {
  return [
    {
      category: 'Health',
      currentRating: 0,
      problems: '',
      currentFeelings: '',
      currentBelief: '',
      currentActions: '',
      targetRating: 0,
      result: '',
      nextFeelings: '',
      nextWeekTarget: '',
      nextActions: '',
      checklist: HEALTH_STANDARDS.map(std => ({ ...std })),
      assignment: { courses: [], lessons: [] }
    },
    {
      category: 'Relationship',
      currentRating: 0,
      problems: '',
      currentFeelings: '',
      currentBelief: '',
      currentActions: '',
      targetRating: 0,
      result: '',
      nextFeelings: '',
      nextWeekTarget: '',
      nextActions: '',
      checklist: RELATIONSHIP_STANDARDS.map(std => ({ ...std })),
      assignment: { courses: [], lessons: [] }
    },
    {
      category: 'Career',
      currentRating: 0,
      problems: '',
      currentFeelings: '',
      currentBelief: '',
      currentActions: '',
      targetRating: 0,
      result: '',
      nextFeelings: '',
      nextWeekTarget: '',
      nextActions: '',
      checklist: CAREER_STANDARDS.map(std => ({ ...std })),
      assignment: { courses: [], lessons: [] }
    },
    {
      category: 'Money',
      currentRating: 0,
      problems: '',
      currentFeelings: '',
      currentBelief: '',
      currentActions: '',
      targetRating: 0,
      result: '',
      nextFeelings: '',
      nextWeekTarget: '',
      nextActions: '',
      checklist: MONEY_STANDARDS.map(std => ({ ...std })),
      assignment: { courses: [], lessons: [] }
    }
  ];
};

// Week-specific belief data generator  
const getWeekBeliefs = (week: number): HRCMBelief[] => {
  // All weeks: Start with blank template
  // User can fill manually or use AI auto-fill
  return getBlankBeliefs();
};

const calculateProgress = (checklist: ChecklistItem[]): number => {
  // Calculate checklist progress only
  const checklistProgress = checklist.length > 0 
    ? (checklist.filter(item => item.checked).length / checklist.length) * 100
    : 0;
  
  // Cap progress at 70% maximum
  return Math.min(Math.round(checklistProgress), 70);
};

const getProgressColor = (progress: number) => {
  if (progress >= 80) return 'bg-gradient-to-r from-emerald-green to-golden-yellow text-white emerald-glow smooth-transition';
  if (progress >= 50) return 'bg-gradient-to-r from-golden-yellow to-coral-red text-white golden-glow smooth-transition';
  return 'bg-gradient-to-r from-coral-red to-coral-red/80 text-white coral-glow smooth-transition';
};

// Health Standards - Predefined checklist for Health category  
const HEALTH_STANDARDS: ChecklistItem[] = [
  { id: 'health-std-1', text: 'I started my Day with Magic Water', checked: false },
  { id: 'health-std-2', text: 'I started my Day with 10 Mins of Musical Workout for Squats & Pushups', checked: false },
  { id: 'health-std-3', text: 'I started my Day with Healthy Breakfast', checked: false },
  { id: 'health-std-4', text: 'I completed 100 Pushups & Squats today', checked: false },
  { id: 'health-std-5', text: 'I Promise to say Cancel-Cancel every time I say something Negative', checked: false },
  { id: 'health-std-6', text: 'I Promise to check my Emotional Frequency every 2 hours by Alarm', checked: false },
  { id: 'health-std-7', text: 'I Promise to say this Affirmation – "I Am Responsible for my Feelings" 10 times today', checked: false },
  { id: 'health-std-8', text: 'I Promise to Be Aware of my Emotional Rules and Make Positive Emotions Easy and Negative Emotions Difficult', checked: false },
  { id: 'health-std-9', text: 'I Promise to Believe in myself more than Anybody else', checked: false },
  { id: 'health-std-10', text: 'I Promise to Practice Walking-Talking Affirmations before doing any task today', checked: false },
];

// Relationship Standards - Predefined checklist for Relationship category
const RELATIONSHIP_STANDARDS: ChecklistItem[] = [
  { id: 'relationship-std-1', text: 'I Promise to talk to all my Relationships with Respect', checked: false },
  { id: 'relationship-std-2', text: 'I Promise to Practice Great Listening Skills today', checked: false },
  { id: 'relationship-std-3', text: 'I Promise to Practice Excellent Conflict Management Skills', checked: false },
  { id: 'relationship-std-4', text: 'I Promise to End my Day with lots of Fun, Laughter, Hugs & Kisses with all my Family Members', checked: false },
  { id: 'relationship-std-5', text: 'I Promise to Appreciate People Generously & regularly say Thank You', checked: false },
  { id: 'relationship-std-6', text: 'I Promise to Accept Mistakes today and Easily say "I Am Sorry, Please Forgive Me."', checked: false },
];

// Career Standards - Predefined checklist for Career category
const CAREER_STANDARDS: ChecklistItem[] = [
  { id: 'career-std-1', text: 'I Promise to Add 10x Value for any work I do today', checked: false },
  { id: 'career-std-2', text: 'I Promise to Love what I do, even if I don\'t like it', checked: false },
  { id: 'career-std-3', text: 'I Promise to focus on Serving & Adding Value rather than being Desperate for my Goals', checked: false },
  { id: 'career-std-4', text: 'I Promise to Practice Walking-Talking Affirmations before doing any task related to my Career', checked: false },
  { id: 'career-std-5', text: 'I Promise to End my work with this Affirmation – "My Career is Amazing, I Had a Great Day today."', checked: false },
];

// Money Standards - Predefined checklist for Money category
const MONEY_STANDARDS: ChecklistItem[] = [
  { id: 'money-std-1', text: 'I Promise to Be Generous while Spending Money today and Be Happy for others Making Money', checked: false },
  { id: 'money-std-2', text: 'I Promise to Be Comfortable to Ask for Money today', checked: false },
  { id: 'money-std-3', text: 'I Promise to invest at least 15 mins today to work on developing More Money-Making Skills', checked: false },
  { id: 'money-std-4', text: 'I Promise to Appreciate People Generously & Regularly say Thank You (to increase Money Flow Energy)', checked: false },
  { id: 'money-std-5', text: 'I Promise to Practice Saying "Time for Double Happiness" every time something Negative happens about Money', checked: false },
];

export default function UnifiedHRCMTable({ weekNumber = 1, onWeekChange, viewAsUserId, isAdminView = false }: UnifiedHRCMTableProps) {
  const [beliefs, setBeliefs] = useState<HRCMBelief[]>([]);
  const [editingField, setEditingField] = useState<{ category: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [loadingAssignments, setLoadingAssignments] = useState<Set<string>>(new Set());
  const [showStandardsDialog, setShowStandardsDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [collapsedCourses, setCollapsedCourses] = useState<Set<string>>(new Set());
  const [unifiedAssignment, setUnifiedAssignment] = useState<AssignmentLesson[]>([]);
  const [progressOpen, setProgressOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<Date | undefined>(undefined);
  const [viewingHistory, setViewingHistory] = useState(false);
  const lastFocusedButton = useRef<HTMLButtonElement | null>(null);
  const hasAutoProgressed = useRef<Set<number>>(new Set()); // Track which weeks have been auto-progressed
  const { toast} = useToast();

  // When in admin view mode, fetch data for the specific user
  // Build query key based on admin view or regular user view
  const weekQueryKey = isAdminView && viewAsUserId 
    ? [`/api/admin/user/${viewAsUserId}/hercm/week`, weekNumber] 
    : ['/api/hercm/week', weekNumber];

  // Fetch current week data from database
  const { data: weekData, isLoading } = useQuery<{ beliefs?: HRCMBelief[]; createdAt?: string }>({
    queryKey: weekQueryKey,
    enabled: weekNumber > 0,
  });

  // Fetch previous week data for comparison (only if week > 1)
  const { data: previousWeekData } = useQuery<{ beliefs?: HRCMBelief[] }>({
    queryKey: ['/api/hercm/week', weekNumber - 1],
    enabled: weekNumber > 1,
  });

  // Fetch all weeks data (needed for auto-progression and comparison)
  const { data: allWeeksData } = useQuery({
    queryKey: ['/api/hercm/weeks'],
  });

  // Fetch rating caps and progression status
  const { data: ratingCaps } = useQuery<{
    health: number;
    relationship: number;
    career: number;
    money: number;
  }>({
    queryKey: ['/api/rating-progression/caps'],
  });

  const { data: ratingProgression } = useQuery<{
    healthMaxRating: number;
    relationshipMaxRating: number;
    careerMaxRating: number;
    moneyMaxRating: number;
    healthWeeksAtMax: number;
    relationshipWeeksAtMax: number;
    careerWeeksAtMax: number;
    moneyWeeksAtMax: number;
  }>({
    queryKey: ['/api/rating-progression/status'],
  });

  // Fetch dynamic platinum standards from database
  const { data: platinumStandardsData = [] } = useQuery<any[]>({
    queryKey: ['/api/platinum-standards'],
  });

  // Transform platinum standards into ChecklistItem format
  const getPlatinumStandardsForCategory = (category: string): ChecklistItem[] => {
    const categoryLower = category.toLowerCase();
    const standards = platinumStandardsData.filter((s: any) => s.category === categoryLower && s.isActive);
    return standards
      .sort((a: any, b: any) => a.orderIndex - b.orderIndex)
      .map((s: any, index: number) => ({
        id: `${categoryLower}-std-${index + 1}`,
        text: s.standardText,
        checked: false
      }));
  };

  // Get the most recent snapshot for the selected date
  const getSnapshotForDate = () => {
    if (!allWeeksData || !selectedHistoryDate) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(selectedHistoryDate);
    selected.setHours(0, 0, 0, 0);

    // If selected date is in the future, return null (no data for future)
    if (selected > today) return null;

    // Filter snapshots for the selected date
    const snapshotsForDate = (allWeeksData as any[]).filter(snapshot => {
      const snapshotDate = new Date(snapshot.createdAt);
      return isSameDay(snapshotDate, selectedHistoryDate);
    });

    // Return the most recent snapshot for that date
    if (snapshotsForDate.length === 0) return null;
    
    return [...snapshotsForDate].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
  };

  const historicalSnapshot = getSnapshotForDate();

  useEffect(() => {
    // If viewing historical data
    if (viewingHistory) {
      // If snapshot exists, convert database fields to beliefs array format
      if (historicalSnapshot) {
        const convertedBeliefs: HRCMBelief[] = [
          {
            category: 'Health',
            currentRating: historicalSnapshot.currentH || 0,
            problems: historicalSnapshot.healthProblems || '',
            currentFeelings: historicalSnapshot.healthCurrentFeelings || '',
            currentBelief: historicalSnapshot.healthCurrentBelief || '',
            currentActions: historicalSnapshot.healthCurrentActions || '',
            targetRating: historicalSnapshot.targetH || 0,
            result: historicalSnapshot.healthResult || '',
            nextFeelings: historicalSnapshot.healthNextFeelings || '',
            nextWeekTarget: historicalSnapshot.healthNextWeekTarget || '',
            nextActions: historicalSnapshot.healthNextActions || '',
            resultChecklist: historicalSnapshot.healthResultChecklist || [],
            feelingsChecklist: historicalSnapshot.healthFeelingsChecklist || [],
            beliefsChecklist: historicalSnapshot.healthBeliefsChecklist || [],
            actionsChecklist: historicalSnapshot.healthActionsChecklist || [],
            checklist: historicalSnapshot.healthChecklist || [],
            assignment: historicalSnapshot.healthAssignment || { courses: [], lessons: [] }
          },
          {
            category: 'Relationship',
            currentRating: historicalSnapshot.currentE || 0,
            problems: historicalSnapshot.relationshipProblems || '',
            currentFeelings: historicalSnapshot.relationshipCurrentFeelings || '',
            currentBelief: historicalSnapshot.relationshipCurrentBelief || '',
            currentActions: historicalSnapshot.relationshipCurrentActions || '',
            targetRating: historicalSnapshot.targetE || 0,
            result: historicalSnapshot.relationshipResult || '',
            nextFeelings: historicalSnapshot.relationshipNextFeelings || '',
            nextWeekTarget: historicalSnapshot.relationshipNextWeekTarget || '',
            nextActions: historicalSnapshot.relationshipNextActions || '',
            resultChecklist: historicalSnapshot.relationshipResultChecklist || [],
            feelingsChecklist: historicalSnapshot.relationshipFeelingsChecklist || [],
            beliefsChecklist: historicalSnapshot.relationshipBeliefsChecklist || [],
            actionsChecklist: historicalSnapshot.relationshipActionsChecklist || [],
            checklist: historicalSnapshot.relationshipChecklist || [],
            assignment: historicalSnapshot.relationshipAssignment || { courses: [], lessons: [] }
          },
          {
            category: 'Career',
            currentRating: historicalSnapshot.currentR || 0,
            problems: historicalSnapshot.careerProblems || '',
            currentFeelings: historicalSnapshot.careerCurrentFeelings || '',
            currentBelief: historicalSnapshot.careerCurrentBelief || '',
            currentActions: historicalSnapshot.careerCurrentActions || '',
            targetRating: historicalSnapshot.targetR || 0,
            result: historicalSnapshot.careerResult || '',
            nextFeelings: historicalSnapshot.careerNextFeelings || '',
            nextWeekTarget: historicalSnapshot.careerNextWeekTarget || '',
            nextActions: historicalSnapshot.careerNextActions || '',
            resultChecklist: historicalSnapshot.careerResultChecklist || [],
            feelingsChecklist: historicalSnapshot.careerFeelingsChecklist || [],
            beliefsChecklist: historicalSnapshot.careerBeliefsChecklist || [],
            actionsChecklist: historicalSnapshot.careerActionsChecklist || [],
            checklist: historicalSnapshot.careerChecklist || [],
            assignment: historicalSnapshot.careerAssignment || { courses: [], lessons: [] }
          },
          {
            category: 'Money',
            currentRating: historicalSnapshot.currentC || 0,
            problems: historicalSnapshot.moneyProblems || '',
            currentFeelings: historicalSnapshot.moneyCurrentFeelings || '',
            currentBelief: historicalSnapshot.moneyCurrentBelief || '',
            currentActions: historicalSnapshot.moneyCurrentActions || '',
            targetRating: historicalSnapshot.targetC || 0,
            result: historicalSnapshot.moneyResult || '',
            nextFeelings: historicalSnapshot.moneyNextFeelings || '',
            nextWeekTarget: historicalSnapshot.moneyNextWeekTarget || '',
            nextActions: historicalSnapshot.moneyNextActions || '',
            resultChecklist: historicalSnapshot.moneyResultChecklist || [],
            feelingsChecklist: historicalSnapshot.moneyFeelingsChecklist || [],
            beliefsChecklist: historicalSnapshot.moneyBeliefsChecklist || [],
            actionsChecklist: historicalSnapshot.moneyActionsChecklist || [],
            checklist: historicalSnapshot.moneyChecklist || [],
            assignment: historicalSnapshot.moneyAssignment || { courses: [], lessons: [] }
          }
        ];
        
        setBeliefs(convertedBeliefs);
        setUnifiedAssignment((historicalSnapshot as any).unifiedAssignment || []);
      } else {
        // No snapshot found (future date or no data for this date) - show blank
        setBeliefs(getBlankBeliefs());
        setUnifiedAssignment([]);
      }
      return;
    }
  }, [viewingHistory, historicalSnapshot]);

  useEffect(() => {
    // Skip if viewing history
    if (viewingHistory) return;
    // Priority: Use actual database data if available, otherwise use demo/blank template
    if (weekData?.beliefs) {
      // FORCE UPDATE: Replace old checklists with dynamic platinum standards from database
      const updatedBeliefs = weekData.beliefs.map(belief => {
        const newChecklist = getPlatinumStandardsForCategory(belief.category);
        
        return {
          ...belief,
          checklist: newChecklist
        };
      });
      
      setBeliefs(updatedBeliefs);
      // Load unified assignment from week data
      setUnifiedAssignment((weekData as any).unifiedAssignment || []);
    } else {
      // No database data - use demo/blank template immediately (don't wait for loading)
      setBeliefs(getWeekBeliefs(weekNumber));
      setUnifiedAssignment([]);
    }
  }, [weekNumber, weekData, ratingCaps, platinumStandardsData]);

  const weeklyProgress = beliefs.length > 0
    ? Math.round(beliefs.reduce((sum, b) => sum + calculateProgress(b.checklist), 0) / beliefs.length)
    : 0;

  const handleChecklistToggle = (category: string, itemId: string) => {
    setBeliefs(prev => {
      const updated = prev.map(belief => {
        if (belief.category === category) {
          const updatedChecklist = belief.checklist.map(item =>
            item.id === itemId ? { ...item, checked: !item.checked } : item
          );
          
          // Only update checklist, DO NOT change rating
          return {
            ...belief,
            checklist: updatedChecklist
          };
        }
        return belief;
      });
      
      // Auto-save changes to database immediately
      saveWeekMutation.mutate({
        weekNumber,
        year: new Date().getFullYear(),
        beliefs: updated,
      });
      
      return updated;
    });
  };

  const handleRatingChange = (category: string, newRating: number) => {
    setBeliefs(prev => {
      const updated = prev.map(belief => {
        if (belief.category === category) {
          // Get category-specific max rating from API (defaults to 7 if not loaded)
          const categoryLower = category.toLowerCase();
          const maxRating = ratingCaps?.[categoryLower as keyof typeof ratingCaps] || 7;
          
          // Cap both current and target ratings at max allowed
          const cappedRating = Math.min(newRating, maxRating);
          
          return {
            ...belief,
            currentRating: cappedRating,
            targetRating: Math.min(cappedRating + 1, maxRating) // Auto-increment by 1, capped at user's max (which is capped at 8)
          };
        }
        return belief;
      });
      
      // Auto-save changes to database immediately
      saveWeekMutation.mutate({
        weekNumber,
        year: new Date().getFullYear(),
        beliefs: updated,
      });
      
      return updated;
    });
  };

  // Open standards dialog for a category
  const handleOpenStandardsDialog = (category: string) => {
    setSelectedCategory(category);
    
    // Force update to dynamic platinum standards for the selected category
    const updatedBeliefs = beliefs.map(b => {
      if (b.category === category) {
        const newChecklist = getPlatinumStandardsForCategory(category);
        
        // Preserve checked state from existing checklist
        const existingChecklist = b.checklist || [];
        const mergedChecklist = newChecklist.map(newItem => {
          const existing = existingChecklist.find(e => e.id === newItem.id);
          return existing ? { ...newItem, checked: existing.checked } : newItem;
        });
        
        return {
          ...b,
          checklist: mergedChecklist
        };
      }
      return b;
    });
    
    setBeliefs(updatedBeliefs);
    
    // Auto-save the updated standards
    saveWeekMutation.mutate({
      weekNumber,
      year: new Date().getFullYear(),
      beliefs: updatedBeliefs,
    });
    
    setShowStandardsDialog(true);
  };

  // Toggle a standard and recalculate rating (capped at user's max allowed)
  const handleStandardToggle = (category: string, itemId: string) => {
    setBeliefs(prev => {
      const updated = prev.map(belief => {
        if (belief.category === category) {
          const updatedChecklist = belief.checklist.map(item =>
            item.id === itemId ? { ...item, checked: !item.checked } : item
          );
          
          // Calculate scaled rating out of 10 based on percentage of standards checked
          const checkedCount = updatedChecklist.filter(item => item.checked).length;
          const totalStandards = updatedChecklist.length;
          const calculatedRating = Math.round((checkedCount / totalStandards) * 10);
          
          // Get category-specific max rating from API (defaults to 7 if not loaded)
          const categoryLower = category.toLowerCase();
          const maxRating = ratingCaps?.[categoryLower as keyof typeof ratingCaps] || 7;
          
          // Cap the rating at user's allowed max
          const newRating = Math.min(calculatedRating, maxRating);
          
          return {
            ...belief,
            checklist: updatedChecklist,
            currentRating: newRating,
            targetRating: Math.min(newRating + 1, maxRating) // Target is +1, capped at user's max (which is capped at 8)
          };
        }
        return belief;
      });
      
      // Auto-save changes to database immediately
      saveWeekMutation.mutate({
        weekNumber,
        year: new Date().getFullYear(),
        beliefs: updated,
      });
      
      return updated;
    });
  };

  // Mutation for saving week data to database
  const saveWeekMutation = useMutation({
    mutationFn: async (weekData: any) => {
      const response = await apiRequest('POST', '/api/hercm/save-with-comparison', weekData);
      return response.json();
    },
    onSuccess: async () => {
      // Invalidate and refetch to ensure UI updates immediately
      await queryClient.invalidateQueries({ queryKey: ['/api/hercm/weeks'] });
      await queryClient.refetchQueries({ queryKey: ['/api/hercm/weeks'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/rating-progression/caps'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/rating-progression/status'] });
      toast({
        title: 'Saved!',
        description: 'Your changes have been saved successfully.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to save changes. Please try again.',
        variant: 'destructive',
      });
    }
  });

  // Generate Next Week mutation
  const generateNextWeekMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/hercm/generate-next-week', {
        weekNumber,
        beliefs
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hercm/weeks'] });
      toast({
        title: 'Next Week Created!',
        description: `Week ${weekNumber + 1} has been generated.`,
      });
      if (onWeekChange) {
        onWeekChange(weekNumber + 1);
      }
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to generate next week.',
        variant: 'destructive',
      });
    }
  });

  // Handlers
  const handleGenerateNextWeek = () => {
    // Reset all data fields (Rating, Results, Feelings, Beliefs/Reasons, Actions) in both tables
    setBeliefs(prev => prev.map(belief => ({
      ...belief,
      // Current Week - Empty these fields
      currentRating: 0,
      problems: '',
      currentFeelings: '',
      currentBelief: '',
      currentActions: '',
      // Next Week Target - Empty these fields
      targetRating: 0,
      result: '',
      nextFeelings: '',
      nextWeekTarget: '',
      nextActions: '',
      // Clear checklists for next week target columns
      resultChecklist: [],
      feelingsChecklist: [],
      beliefsChecklist: [],
      actionsChecklist: [],
    })));
    
    // Call API to generate next week
    generateNextWeekMutation.mutate();
  };

  // Generate Next Week is always unlocked
  const canGenerateNextWeek = true;
  const nextWeekUnlockDate = '';

  // Get rating-based AI assignment course recommendations for Next Week
  const getAssignmentRecommendation = async (category: string) => {
    const belief = beliefs.find(b => b.category === category);
    if (!belief) return;

    setLoadingAssignments(prev => new Set(prev).add(category));

    try {
      const response = await apiRequest('POST', '/api/courses/recommend-assignment', {
        category: belief.category,
        currentRating: belief.currentRating,
        problems: belief.result,
        feelings: belief.nextFeelings,
        beliefs: belief.nextWeekTarget,
        actions: belief.nextActions,
      });

      const data = await response.json();

      setBeliefs(prev => {
        const updated = prev.map(b => 
          b.category === category 
            ? { 
                ...b, 
                assignment: {
                  courses: data.courses || [],
                  lessons: b.assignment?.lessons || []
                }
              }
            : b
        );
        
        saveWeekMutation.mutate({
          weekNumber,
          beliefs: updated
        });
        
        return updated;
      });

      const courseCount = data.courses?.length || 0;
      toast({
        title: "AI Assignment Courses Added",
        description: `Found ${courseCount} course${courseCount !== 1 ? 's' : ''} for next week`,
      });
    } catch (error: any) {
      console.error('Error getting assignment recommendation:', error);
      toast({
        title: "Failed to get assignment courses",
        description: error?.message || "Please try again",
        variant: "destructive"
      });
    } finally {
      setLoadingAssignments(prev => {
        const newSet = new Set(prev);
        newSet.delete(category);
        return newSet;
      });
    }
  };

  // Toggle assignment course completion checkbox
  const handleAssignmentCourseToggle = (category: string, courseId: string) => {
    setBeliefs(prev => {
      const updated = prev.map(belief => {
        if (belief.category === category && belief.assignment) {
          const updatedCourses = belief.assignment.courses?.map(course =>
            course.id === courseId ? { ...course, completed: !course.completed } : course
          );
          
          return {
            ...belief,
            assignment: {
              ...belief.assignment,
              courses: updatedCourses || []
            }
          };
        }
        return belief;
      });
      
      saveWeekMutation.mutate({
        weekNumber,
        beliefs: updated
      });
      
      return updated;
    });
  };

  // Toggle assignment lesson completion checkbox
  const handleAssignmentLessonToggle = (category: string, lessonId: string) => {
    setBeliefs(prev => {
      const updated = prev.map(belief => {
        if (belief.category === category && belief.assignment) {
          const updatedLessons = belief.assignment.lessons?.map(lesson =>
            lesson.id === lessonId ? { ...lesson, completed: !lesson.completed } : lesson
          );
          
          return {
            ...belief,
            assignment: {
              ...belief.assignment,
              lessons: updatedLessons || []
            }
          };
        }
        return belief;
      });
      
      saveWeekMutation.mutate({
        weekNumber,
        beliefs: updated
      });
      
      return updated;
    });
  };

  // Toggle unified assignment lesson completion
  const handleUnifiedAssignmentToggle = async (lessonId: string) => {
    try {
      const response = await apiRequest('POST', '/api/unified-assignment/toggle-lesson', {
        weekNumber,
        lessonId
      });
      
      if (response.ok) {
        const data = await response.json();
        setUnifiedAssignment(data.assignment || []);
      }
    } catch (error) {
      console.error('Error toggling unified assignment lesson:', error);
      toast({
        title: 'Error',
        description: 'Failed to update lesson',
        variant: 'destructive'
      });
    }
  };

  // Toggle result checklist item
  const handleResultChecklistToggle = (category: string, itemId: string) => {
    setBeliefs(prev => {
      const updated = prev.map(belief => {
        if (belief.category === category && belief.resultChecklist) {
          const updatedChecklist = belief.resultChecklist.map(item =>
            item.id === itemId ? { ...item, checked: !item.checked } : item
          );
          return { ...belief, resultChecklist: updatedChecklist };
        }
        return belief;
      });
      
      saveWeekMutation.mutate({ weekNumber, year: new Date().getFullYear(), beliefs: updated });
      return updated;
    });
  };

  // Toggle feelings checklist item
  const handleFeelingsChecklistToggle = (category: string, itemId: string) => {
    setBeliefs(prev => {
      const updated = prev.map(belief => {
        if (belief.category === category && belief.feelingsChecklist) {
          const updatedChecklist = belief.feelingsChecklist.map(item =>
            item.id === itemId ? { ...item, checked: !item.checked } : item
          );
          return { ...belief, feelingsChecklist: updatedChecklist };
        }
        return belief;
      });
      
      saveWeekMutation.mutate({ weekNumber, year: new Date().getFullYear(), beliefs: updated });
      return updated;
    });
  };

  // Toggle beliefs checklist item
  const handleBeliefsChecklistToggle = (category: string, itemId: string) => {
    setBeliefs(prev => {
      const updated = prev.map(belief => {
        if (belief.category === category && belief.beliefsChecklist) {
          const updatedChecklist = belief.beliefsChecklist.map(item =>
            item.id === itemId ? { ...item, checked: !item.checked } : item
          );
          return { ...belief, beliefsChecklist: updatedChecklist };
        }
        return belief;
      });
      
      saveWeekMutation.mutate({ weekNumber, year: new Date().getFullYear(), beliefs: updated });
      return updated;
    });
  };

  // Toggle actions checklist item
  const handleActionsChecklistToggle = (category: string, itemId: string) => {
    setBeliefs(prev => {
      const updated = prev.map(belief => {
        if (belief.category === category && belief.actionsChecklist) {
          const updatedChecklist = belief.actionsChecklist.map(item =>
            item.id === itemId ? { ...item, checked: !item.checked } : item
          );
          return { ...belief, actionsChecklist: updatedChecklist };
        }
        return belief;
      });
      
      saveWeekMutation.mutate({ weekNumber, year: new Date().getFullYear(), beliefs: updated });
      return updated;
    });
  };

  // Add new checkpoint to a checklist
  const handleAddCheckpoint = (category: string, checklistType: 'result' | 'feelings' | 'beliefs' | 'actions', text: string = '') => {
    setBeliefs(prev => {
      const updated = prev.map(belief => {
        if (belief.category === category) {
          const newItem: ChecklistItem = {
            id: `${category}-${checklistType}-${Date.now()}`,
            text: text,
            checked: false
          };
          
          if (checklistType === 'result') {
            return { ...belief, resultChecklist: [...(belief.resultChecklist || []), newItem] };
          } else if (checklistType === 'feelings') {
            return { ...belief, feelingsChecklist: [...(belief.feelingsChecklist || []), newItem] };
          } else if (checklistType === 'beliefs') {
            return { ...belief, beliefsChecklist: [...(belief.beliefsChecklist || []), newItem] };
          } else if (checklistType === 'actions') {
            return { ...belief, actionsChecklist: [...(belief.actionsChecklist || []), newItem] };
          }
        }
        return belief;
      });
      
      saveWeekMutation.mutate({ weekNumber, year: new Date().getFullYear(), beliefs: updated });
      return updated;
    });
  };

  // Update checkpoint text
  const handleUpdateCheckpointText = (category: string, itemId: string, text: string, checklistType: 'result' | 'feelings' | 'beliefs' | 'actions') => {
    setBeliefs(prev => {
      const updated = prev.map(belief => {
        if (belief.category === category) {
          if (checklistType === 'result' && belief.resultChecklist) {
            const updatedChecklist = belief.resultChecklist.map(item =>
              item.id === itemId ? { ...item, text } : item
            );
            return { ...belief, resultChecklist: updatedChecklist };
          } else if (checklistType === 'feelings' && belief.feelingsChecklist) {
            const updatedChecklist = belief.feelingsChecklist.map(item =>
              item.id === itemId ? { ...item, text } : item
            );
            return { ...belief, feelingsChecklist: updatedChecklist };
          } else if (checklistType === 'beliefs' && belief.beliefsChecklist) {
            const updatedChecklist = belief.beliefsChecklist.map(item =>
              item.id === itemId ? { ...item, text } : item
            );
            return { ...belief, beliefsChecklist: updatedChecklist };
          } else if (checklistType === 'actions' && belief.actionsChecklist) {
            const updatedChecklist = belief.actionsChecklist.map(item =>
              item.id === itemId ? { ...item, text } : item
            );
            return { ...belief, actionsChecklist: updatedChecklist };
          }
        }
        return belief;
      });
      
      saveWeekMutation.mutate({ weekNumber, year: new Date().getFullYear(), beliefs: updated });
      return updated;
    });
  };

  // Delete checkpoint
  const handleDeleteCheckpoint = (category: string, itemId: string, checklistType: 'result' | 'feelings' | 'beliefs' | 'actions') => {
    setBeliefs(prev => {
      const updated = prev.map(belief => {
        if (belief.category === category) {
          if (checklistType === 'result' && belief.resultChecklist) {
            const updatedChecklist = belief.resultChecklist.filter(item => item.id !== itemId);
            return { ...belief, resultChecklist: updatedChecklist };
          } else if (checklistType === 'feelings' && belief.feelingsChecklist) {
            const updatedChecklist = belief.feelingsChecklist.filter(item => item.id !== itemId);
            return { ...belief, feelingsChecklist: updatedChecklist };
          } else if (checklistType === 'beliefs' && belief.beliefsChecklist) {
            const updatedChecklist = belief.beliefsChecklist.filter(item => item.id !== itemId);
            return { ...belief, beliefsChecklist: updatedChecklist };
          } else if (checklistType === 'actions' && belief.actionsChecklist) {
            const updatedChecklist = belief.actionsChecklist.filter(item => item.id !== itemId);
            return { ...belief, actionsChecklist: updatedChecklist };
          }
        }
        return belief;
      });
      
      saveWeekMutation.mutate({ weekNumber, year: new Date().getFullYear(), beliefs: updated });
      return updated;
    });
  };

  // Compact Checklist View Component
  const CompactChecklistView = ({ 
    items, 
    onToggle, 
    onUpdateText,
    onAddCheckpoint,
    onDeleteCheckpoint,
    category,
    checklistType,
    disabled = false
  }: { 
    items: ChecklistItem[]; 
    onToggle: (itemId: string) => void;
    onUpdateText: (itemId: string, text: string) => void;
    onAddCheckpoint: (text?: string) => void;
    onDeleteCheckpoint: (itemId: string) => void;
    category: string;
    checklistType: string;
    disabled?: boolean;
  }) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [newCheckpointText, setNewCheckpointText] = useState('');
    const visibleItems = items.slice(0, 2);
    const hiddenCount = items.length - 2;
    
    // Get color scheme based on checklistType
    const getColorScheme = (type: string) => {
      switch(type) {
        case 'result':
          return {
            gradient: 'from-coral-red/10 via-white to-coral-red/5 dark:from-coral-red/20 dark:via-gray-900 dark:to-coral-red/10',
            border: 'border-coral-red/30',
            bar: 'bg-coral-red',
            text: 'text-coral-red',
            glow: 'coral-glow',
            label: 'Results'
          };
        case 'feelings':
          return {
            gradient: 'from-emerald-green/10 via-white to-emerald-green/5 dark:from-emerald-green/20 dark:via-gray-900 dark:to-emerald-green/10',
            border: 'border-emerald-green/30',
            bar: 'bg-emerald-green',
            text: 'text-emerald-green',
            glow: 'emerald-glow',
            label: 'Feelings'
          };
        case 'beliefs':
          return {
            gradient: 'from-golden-yellow/10 via-white to-golden-yellow/5 dark:from-golden-yellow/20 dark:via-gray-900 dark:to-golden-yellow/10',
            border: 'border-golden-yellow/30',
            bar: 'bg-golden-yellow',
            text: 'text-golden-yellow',
            glow: 'golden-glow',
            label: 'Beliefs/Reasons'
          };
        case 'actions':
          return {
            gradient: 'from-soft-lavender/20 via-white to-soft-lavender/10 dark:from-soft-lavender/30 dark:via-gray-900 dark:to-soft-lavender/15',
            border: 'border-soft-lavender/40',
            bar: 'bg-soft-lavender',
            text: 'text-soft-lavender',
            glow: 'lavender-glow',
            label: 'Actions'
          };
        default:
          return {
            gradient: 'from-primary/10 via-white to-accent/10 dark:from-primary/20 dark:via-gray-900 dark:to-accent/15',
            border: 'border-primary/30',
            bar: 'bg-gradient-to-b from-primary to-accent',
            text: 'bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent',
            glow: '',
            label: 'Checkpoint'
          };
      }
    };

    const colorScheme = getColorScheme(checklistType);

    const handleAddCheckpointClick = () => {
      setNewCheckpointText('');
      setShowAddDialog(true);
    };

    const handleSaveNewCheckpoint = () => {
      if (newCheckpointText.trim()) {
        onAddCheckpoint(newCheckpointText.trim());
        setShowAddDialog(false);
        setNewCheckpointText('');
      }
    };
    
    return (
      <>
        <div className="space-y-1.5">
          {visibleItems.map((item) => (
            <div key={item.id} className="flex items-start gap-2 group">
              <Checkbox
                checked={item.checked}
                onCheckedChange={() => !disabled && onToggle(item.id)}
                disabled={disabled}
                className="h-3 w-3 mt-0.5 shrink-0"
                data-testid={`checkbox-${checklistType}-${category.toLowerCase()}-${item.id}`}
              />
              {editingId === item.id && !disabled ? (
                <Textarea
                  value={item.text}
                  onChange={(e) => onUpdateText(item.id, e.target.value)}
                  onBlur={() => setEditingId(null)}
                  placeholder="Type checkpoint..."
                  className="min-h-[60px] text-xs flex-1 border bg-background/50 focus-visible:ring-1 p-2 resize-none"
                  autoFocus
                  data-testid={`textarea-${checklistType}-${category.toLowerCase()}-${item.id}`}
                />
              ) : (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => !disabled && setEditingId(item.id)}
                        disabled={disabled}
                        className="flex-1 text-left text-xs py-0.5 px-1 rounded hover:bg-muted/30 transition-colors min-h-[20px] break-words disabled:cursor-not-allowed"
                        data-testid={`text-${checklistType}-${category.toLowerCase()}-${item.id}`}
                      >
                        <span className="line-clamp-2">
                          {item.text || <span className="text-muted-foreground italic">Click to add text...</span>}
                        </span>
                      </button>
                    </TooltipTrigger>
                    {item.text && item.text.length > 50 && (
                      <TooltipContent side="top" align="start" className={`max-w-md bg-gradient-to-br ${colorScheme.gradient} border-2 ${colorScheme.border} shadow-xl p-4 ${colorScheme.glow}`}>
                        <div className="flex items-start gap-2 mb-2">
                          <div className={`w-1 h-full ${colorScheme.bar} rounded-full`}></div>
                          <p className={`text-xs font-semibold ${colorScheme.text}`}>{colorScheme.label}</p>
                        </div>
                        <p className="text-xs whitespace-pre-wrap break-words leading-relaxed text-foreground">{item.text}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                  {!disabled && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDeleteCheckpoint(item.id)}
                      className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      data-testid={`button-delete-checkpoint-${checklistType}-${category.toLowerCase()}-${item.id}`}
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  )}
                </>
              )}
            </div>
          ))}
          
          {hiddenCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full py-1 px-1"
                  data-testid={`button-show-more-${checklistType}-${category.toLowerCase()}`}
                >
                  <MoreHorizontal className="w-3 h-3" />
                  <span>{hiddenCount} more item{hiddenCount > 1 ? 's' : ''}...</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" align="start" className={`max-w-md bg-gradient-to-br ${colorScheme.gradient} border-2 ${colorScheme.border} shadow-xl p-4 ${colorScheme.glow}`}>
                <div className="flex items-start gap-2 mb-3">
                  <div className={`w-1 h-full ${colorScheme.bar} rounded-full`}></div>
                  <p className={`text-xs font-semibold ${colorScheme.text}`}>All {colorScheme.label}</p>
                </div>
                <div className="space-y-2">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-start gap-2 text-xs">
                      <Checkbox checked={item.checked} disabled className="h-3 w-3 mt-0.5 shrink-0" />
                      <span className="break-words whitespace-pre-wrap leading-relaxed text-foreground">{item.text || '(empty)'}</span>
                    </div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
          
          {!disabled && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleAddCheckpointClick}
              className="h-7 w-full text-xs text-muted-foreground hover:text-foreground gap-1 mt-1"
              data-testid={`button-add-checkpoint-${checklistType}-${category.toLowerCase()}`}
            >
              <Plus className="w-3 h-3" />
              Add Checkpoint
            </Button>
          )}
        </div>

        {/* Add Checkpoint Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className={`text-base font-semibold ${colorScheme.text}`}>
                Add New {colorScheme.label} Checkpoint
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className={`p-4 rounded-lg border-2 ${colorScheme.border} bg-gradient-to-br ${colorScheme.gradient} ${colorScheme.glow}`}>
                <div className="flex items-start gap-2 mb-3">
                  <div className={`w-1 h-full ${colorScheme.bar} rounded-full`}></div>
                  <p className={`text-sm font-medium ${colorScheme.text}`}>{category} - {colorScheme.label}</p>
                </div>
                <Textarea
                  value={newCheckpointText}
                  onChange={(e) => setNewCheckpointText(e.target.value)}
                  placeholder={`Enter your ${colorScheme.label.toLowerCase()} checkpoint...`}
                  className="min-h-[100px] text-sm bg-white dark:bg-gray-950 border-muted"
                  autoFocus
                  data-testid={`textarea-new-checkpoint-${checklistType}-${category.toLowerCase()}`}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowAddDialog(false)}
                  data-testid={`button-cancel-checkpoint-${checklistType}-${category.toLowerCase()}`}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveNewCheckpoint}
                  disabled={!newCheckpointText.trim()}
                  className="bg-gradient-to-r from-primary to-accent text-white hover:opacity-90"
                  data-testid={`button-save-checkpoint-${checklistType}-${category.toLowerCase()}`}
                >
                  Add Checkpoint
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  };

  // Automatic week progression: Check if 7 days have passed since week creation
  useEffect(() => {
    if (!Array.isArray(allWeeksData) || !onWeekChange) return;

    // Only auto-progress the latest (current) week, not when viewing history
    const maxWeekNumber = Math.max(...allWeeksData.map((w: any) => w.weekNumber || 0), weekNumber);
    if (weekNumber !== maxWeekNumber) return; // User is viewing an old week, don't auto-progress

    // Check if we've already auto-progressed this week
    if (hasAutoProgressed.current.has(weekNumber)) return;

    const currentWeekData = allWeeksData.find((w: any) => w.weekNumber === weekNumber);
    if (!currentWeekData?.createdAt) return;

    const weekCreatedDate = new Date(currentWeekData.createdAt);
    const now = new Date();
    const daysSinceCreated = Math.floor((now.getTime() - weekCreatedDate.getTime()) / (1000 * 60 * 60 * 24));

    // If 7 days have passed, automatically move to next week
    if (daysSinceCreated >= 7) {
      // Save current week data and wait for completion before moving to next
      const performAutoProgression = async () => {
        try {
          await apiRequest('POST', '/api/hercm/save-with-comparison', {
            weekNumber,
            year: new Date().getFullYear(),
            beliefs,
          });

          // Only mark as progressed and move to next week if save succeeded
          hasAutoProgressed.current.add(weekNumber);
          onWeekChange(weekNumber + 1);
          toast({
            title: '🎉 New Week Started!',
            description: `Week ${weekNumber} completed! Moving to Week ${weekNumber + 1}.`,
          });
        } catch (error) {
          // Don't mark as progressed so it can retry
          console.error('Failed to save before week progression:', error);
          toast({
            title: 'Error',
            description: 'Could not save your progress. Please try again.',
            variant: 'destructive',
          });
        }
      };

      performAutoProgression();
    }
  }, [allWeeksData, weekNumber, onWeekChange, beliefs, toast]);

  const startEdit = (category: string, field: string, currentValue: string, buttonElement?: HTMLButtonElement) => {
    // Store the button element for focus restoration
    if (buttonElement) {
      lastFocusedButton.current = buttonElement;
    }
    setEditingField({ category, field });
    setEditValue(currentValue);
  };

  const saveEdit = async () => {
    if (!editingField) return;
    
    // Save the editing info before clearing it
    const { category, field } = editingField;
    let updatedBelief: HRCMBelief | undefined;
    
    // Build updated beliefs array with checklist
    const updatedBeliefs = beliefs.map(belief => {
      if (belief.category === category) {
        let updated = { ...belief, [field]: editValue } as HRCMBelief;
        
        // Auto-generate checklist from Next Week fields
        if (editValue.trim()) {
          const lines = editValue
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
          
          const checklist: ChecklistItem[] = lines.map((line, index) => ({
            id: `${category}-${field}-${index}`,
            text: line.replace(/^[-•*]\s*/, ''), // Remove bullet points
            checked: false
          }));
          
          // Store in appropriate checklist field
          if (field === 'result') {
            updated = { ...updated, resultChecklist: checklist };
          } else if (field === 'nextFeelings') {
            updated = { ...updated, feelingsChecklist: checklist };
          } else if (field === 'nextWeekTarget') {
            updated = { ...updated, beliefsChecklist: checklist };
          } else if (field === 'nextActions') {
            updated = { ...updated, actionsChecklist: checklist };
          } else if (field === 'currentActions') {
            updated = { ...updated, checklist };
          }
        }
        
        updatedBelief = updated;
        return updated;
      }
      return belief;
    });
    
    // Update local state
    setBeliefs(updatedBeliefs);
    
    setEditingField(null);
    setEditValue('');
    
    // Restore focus to the button that triggered editing
    setTimeout(() => {
      if (lastFocusedButton.current) {
        lastFocusedButton.current.focus();
        lastFocusedButton.current = null;
      }
    }, 0);
    
    // Get AI assignment recommendations if next week fields were edited
    if (updatedBelief && ['result', 'nextFeelings', 'nextWeekTarget', 'nextActions'].includes(field) && editValue.trim()) {
      // Don't auto-generate, user will click the button to get recommendations
    }
    
    // Save to database with complete updated beliefs including checklist
    saveWeekMutation.mutate({
      weekNumber,
      year: new Date().getFullYear(),
      beliefs: updatedBeliefs,
    });
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
    
    // Restore focus to the button that triggered editing
    setTimeout(() => {
      if (lastFocusedButton.current) {
        lastFocusedButton.current.focus();
        lastFocusedButton.current = null;
      }
    }, 0);
  };

  const isEditing = (category: string, field: string) => {
    return editingField?.category === category && editingField?.field === field;
  };

  // Calculate comparison data (previous week's target vs current week's actual)
  const calculateComparison = () => {
    if (weekNumber <= 1) return [];
    
    // Use previous week data from API if available, otherwise use fallback
    const previousWeek = previousWeekData?.beliefs || getWeekBeliefs(weekNumber - 1);
    
    return beliefs.map((current, index) => {
      const previous = previousWeek[index];
      
      // Simple text similarity calculation (can be enhanced)
      const similarity = calculateTextSimilarity(
        previous?.nextWeekTarget || '',
        current.currentBelief || ''
      );
      
      return {
        category: current.category,
        previousTarget: previous?.nextWeekTarget || 'No target set',
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
            Week {weekNumber} - HRCM Tracker
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Track all 4 life areas in one unified view
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge 
            className={`${getProgressColor(weeklyProgress)} ${!isAdminView ? 'cursor-pointer hover:opacity-80' : ''} smooth-transition`}
            onClick={() => !isAdminView && setProgressOpen(true)}
            data-testid="badge-weekly-progress"
          >
            {weeklyProgress}% Weekly Progress
          </Badge>
          
          {!isAdminView && (
            <>
              <Button
                size="sm"
                onClick={handleGenerateNextWeek}
                disabled={generateNextWeekMutation.isPending}
                className="bg-gradient-to-r from-primary to-accent text-white smooth-transition"
                data-testid="button-generate-next-week"
              >
                {generateNextWeekMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <TrendingUp className="w-4 h-4 mr-2" />
                )}
                Generate Next Week
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Current Week Table */}
      <div className="border-2 border-coral-red/70 dark:border-coral-red/50 rounded-lg overflow-x-auto shadow-lg">
        <div className="px-4 py-3 border-b-2 border-coral-red/80 dark:border-coral-red/60 bg-coral-red">
          <div className="flex items-center justify-between">
            {/* Left: Calendar Icon */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                  data-testid="button-calendar-picker"
                >
                  <CalendarIcon className="w-5 h-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedHistoryDate}
                  onSelect={(date) => {
                    setSelectedHistoryDate(date);
                    if (date) {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const selected = new Date(date);
                      selected.setHours(0, 0, 0, 0);
                      // Only set viewingHistory to true if selected date is NOT today
                      setViewingHistory(selected.getTime() !== today.getTime());
                    } else {
                      setViewingHistory(false);
                    }
                  }}
                  initialFocus
                  data-testid="calendar-date-picker"
                />
                {selectedHistoryDate && (
                  <div className="p-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setSelectedHistoryDate(undefined);
                        setViewingHistory(false);
                      }}
                      data-testid="button-clear-date"
                    >
                      Clear & Return to Current Week
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            {/* Center: Heading */}
            <h3 className="font-bold text-white text-xl drop-shadow-md flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              {(() => {
                if (!viewingHistory || !selectedHistoryDate) return 'Current Week';
                
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const selected = new Date(selectedHistoryDate);
                selected.setHours(0, 0, 0, 0);
                
                // If selected date is today, show "Current Week"
                if (selected.getTime() === today.getTime()) {
                  return 'Current Week';
                }
                
                // Otherwise show "History - date"
                return `History - ${format(selectedHistoryDate, 'MMM dd, yyyy')}`;
              })()}
            </h3>

            {/* Right: Spacer for balance */}
            <div className="w-10"></div>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30">
              <TableHead className="font-bold border-r min-w-[100px]">HRCM Area</TableHead>
              <TableHead className="min-w-[60px] bg-rose-100 dark:bg-rose-900/40 font-semibold">Rating</TableHead>
              <TableHead className="min-w-[140px] bg-rose-100 dark:bg-rose-900/40 font-semibold">Results</TableHead>
              <TableHead className="min-w-[140px] bg-rose-100 dark:bg-rose-900/40 font-semibold">Feelings</TableHead>
              <TableHead className="min-w-[140px] bg-rose-100 dark:bg-rose-900/40 font-semibold">Beliefs/Reasons</TableHead>
              <TableHead className="min-w-[140px] bg-rose-100 dark:bg-rose-900/40 font-semibold border-r">Actions</TableHead>
              
              <TableHead className="min-w-[150px] bg-gradient-to-r from-soft-lavender/40 to-soft-lavender/60 dark:from-soft-lavender/20 dark:to-soft-lavender/30 font-semibold lavender-glow">Platinum Standards</TableHead>
              <TableHead className="min-w-[70px] bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40 font-semibold text-center">Progress</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {beliefs.map((belief) => (
              <TableRow key={belief.category} className="border-b" data-testid={`row-${belief.category.toLowerCase()}`}>
                {/* Category Column */}
                <TableCell className="font-semibold border-r bg-muted/20 align-top" data-testid={`cell-category-${belief.category.toLowerCase()}`}>
                  <Badge variant="outline" className="font-semibold">
                    {belief.category}
                  </Badge>
                </TableCell>

                {/* Current Week - Rating */}
                <TableCell className="p-2 bg-coral-red/5 dark:bg-coral-red/10 align-top">
                  <div className="flex flex-col gap-1">
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      value={belief.currentRating || 0}
                      onChange={(e) => {
                        const newRating = parseInt(e.target.value) || 0;
                        const categoryLower = belief.category.toLowerCase();
                        const maxRating = ratingCaps?.[categoryLower as keyof typeof ratingCaps] || 7;
                        
                        // Hard cap at 8 - never allow 9 or 10
                        const hardCappedRating = Math.min(newRating, 8);
                        // Apply progressive cap (7 or 8 based on weeks at max)
                        const finalRating = Math.min(hardCappedRating, maxRating);
                        
                        handleRatingChange(belief.category, finalRating);
                      }}
                      disabled={viewingHistory || isAdminView}
                      className="w-16 h-9 text-center font-semibold"
                      data-testid={`input-${belief.category.toLowerCase()}-rating`}
                    />
                    {ratingProgression && (() => {
                      const categoryLower = belief.category.toLowerCase();
                      const weeksAtMax = ratingProgression[`${categoryLower}WeeksAtMax` as keyof typeof ratingProgression] || 0;
                      const maxRating = ratingCaps?.[categoryLower as keyof typeof ratingCaps] || 7;
                      if (belief.currentRating === maxRating && weeksAtMax > 0) {
                        return (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0 h-5 justify-center">
                            {weeksAtMax}/4 weeks {maxRating < 8 ? '→ unlock 8' : ''}
                          </Badge>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </TableCell>

                {/* Current Week - Problems */}
                <TableCell className="p-2 bg-coral-red/5 dark:bg-coral-red/10 align-top">
                  {isEditing(belief.category, 'problems') ? (
                    <Textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={saveEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          cancelEdit();
                        }
                      }}
                      className="min-h-[60px] text-xs border-0"
                      placeholder="Enter your current problems..."
                      autoFocus
                      data-testid={`textarea-problems-${belief.category.toLowerCase()}`}
                    />
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className="w-full text-left text-xs p-2 hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset rounded"
                          onClick={(e) => !viewingHistory && !isAdminView && startEdit(belief.category, 'problems', belief.problems, e.currentTarget)}
                          disabled={viewingHistory || isAdminView}
                          type="button"
                          aria-label="Edit problems"
                          data-testid={`text-problems-${belief.category.toLowerCase()}`}
                        >
                          <span className="line-clamp-2 break-words">
                            {belief.problems || <span className="text-muted-foreground italic">Click to add...</span>}
                          </span>
                        </button>
                      </TooltipTrigger>
                      {belief.problems && belief.problems.length > 30 && (
                        <TooltipContent side="top" align="start" className="max-w-md bg-gradient-to-br from-coral-red/10 via-white to-coral-red/5 dark:from-coral-red/20 dark:via-gray-900 dark:to-coral-red/10 border-2 border-coral-red/30 shadow-xl p-4 coral-glow">
                          <div className="flex items-start gap-2 mb-2">
                            <div className="w-1 h-full bg-coral-red rounded-full"></div>
                            <p className="text-xs font-semibold text-coral-red">Results</p>
                          </div>
                          <p className="text-xs whitespace-pre-wrap break-words leading-relaxed text-foreground">{belief.problems}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  )}
                </TableCell>

                {/* Current Week - Feelings */}
                <TableCell className="p-2 bg-coral-red/5 dark:bg-coral-red/10 align-top">
                  {isEditing(belief.category, 'currentFeelings') ? (
                    <Textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={saveEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          cancelEdit();
                        }
                      }}
                      className="min-h-[60px] text-xs border-0"
                      autoFocus
                      data-testid={`textarea-feelings-${belief.category.toLowerCase()}`}
                    />
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className="w-full text-left text-xs p-2 hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset rounded"
                          onClick={(e) => !viewingHistory && !isAdminView && startEdit(belief.category, 'currentFeelings', belief.currentFeelings, e.currentTarget)}
                          disabled={viewingHistory || isAdminView}
                          type="button"
                          aria-label="Edit feelings"
                          data-testid={`text-feelings-${belief.category.toLowerCase()}`}
                        >
                          <span className="line-clamp-2 break-words">
                            {belief.currentFeelings || <span className="text-muted-foreground italic">Click to add...</span>}
                          </span>
                        </button>
                      </TooltipTrigger>
                      {belief.currentFeelings && belief.currentFeelings.length > 30 && (
                        <TooltipContent side="top" align="start" className="max-w-md bg-gradient-to-br from-emerald-green/10 via-white to-emerald-green/5 dark:from-emerald-green/20 dark:via-gray-900 dark:to-emerald-green/10 border-2 border-emerald-green/30 shadow-xl p-4 emerald-glow">
                          <div className="flex items-start gap-2 mb-2">
                            <div className="w-1 h-full bg-emerald-green rounded-full"></div>
                            <p className="text-xs font-semibold text-emerald-green">Feelings</p>
                          </div>
                          <p className="text-xs whitespace-pre-wrap break-words leading-relaxed text-foreground">{belief.currentFeelings}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  )}
                </TableCell>

                {/* Current Week - Beliefs */}
                <TableCell className="p-2 bg-coral-red/5 dark:bg-coral-red/10 align-top">
                  {isEditing(belief.category, 'currentBelief') ? (
                    <Textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={saveEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          cancelEdit();
                        }
                      }}
                      className="min-h-[60px] text-xs border-0"
                      autoFocus
                      data-testid={`textarea-beliefs-${belief.category.toLowerCase()}`}
                    />
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className="w-full text-left text-xs p-2 hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset rounded"
                          onClick={(e) => !viewingHistory && !isAdminView && startEdit(belief.category, 'currentBelief', belief.currentBelief, e.currentTarget)}
                          disabled={viewingHistory || isAdminView}
                          type="button"
                          aria-label="Edit beliefs"
                          data-testid={`text-beliefs-${belief.category.toLowerCase()}`}
                        >
                          <span className="line-clamp-2 break-words">
                            {belief.currentBelief || <span className="text-muted-foreground italic">Click to add...</span>}
                          </span>
                        </button>
                      </TooltipTrigger>
                      {belief.currentBelief && belief.currentBelief.length > 30 && (
                        <TooltipContent side="top" align="start" className="max-w-md bg-gradient-to-br from-golden-yellow/10 via-white to-golden-yellow/5 dark:from-golden-yellow/20 dark:via-gray-900 dark:to-golden-yellow/10 border-2 border-golden-yellow/30 shadow-xl p-4 golden-glow">
                          <div className="flex items-start gap-2 mb-2">
                            <div className="w-1 h-full bg-golden-yellow rounded-full"></div>
                            <p className="text-xs font-semibold text-golden-yellow">Beliefs/Reasons</p>
                          </div>
                          <p className="text-xs whitespace-pre-wrap break-words leading-relaxed text-foreground">{belief.currentBelief}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  )}
                </TableCell>

                {/* Current Week - Actions */}
                <TableCell className="p-2 bg-coral-red/5 dark:bg-coral-red/10 border-r align-top">
                  {isEditing(belief.category, 'currentActions') ? (
                    <Textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={saveEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          cancelEdit();
                        }
                      }}
                      className="min-h-[60px] text-xs border-0"
                      autoFocus
                      data-testid={`textarea-actions-${belief.category.toLowerCase()}`}
                    />
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className="w-full text-left text-xs p-2 hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset rounded"
                          onClick={(e) => !viewingHistory && !isAdminView && startEdit(belief.category, 'currentActions', belief.currentActions, e.currentTarget)}
                          disabled={viewingHistory || isAdminView}
                          type="button"
                          aria-label="Edit actions"
                          data-testid={`text-actions-${belief.category.toLowerCase()}`}
                        >
                          <span className="line-clamp-2 break-words">
                            {belief.currentActions || <span className="text-muted-foreground italic">Click to add...</span>}
                          </span>
                        </button>
                      </TooltipTrigger>
                      {belief.currentActions && belief.currentActions.length > 30 && (
                        <TooltipContent side="top" align="start" className="max-w-md bg-gradient-to-br from-soft-lavender/20 via-white to-soft-lavender/10 dark:from-soft-lavender/30 dark:via-gray-900 dark:to-soft-lavender/15 border-2 border-soft-lavender/40 shadow-xl p-4 lavender-glow">
                          <div className="flex items-start gap-2 mb-2">
                            <div className="w-1 h-full bg-soft-lavender rounded-full"></div>
                            <p className="text-xs font-semibold text-soft-lavender">Actions</p>
                          </div>
                          <p className="text-xs whitespace-pre-wrap break-words leading-relaxed text-foreground">{belief.currentActions}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  )}
                </TableCell>

                {/* Platinum Standards - Compact with Hover Popup */}
                <TableCell className="p-2 bg-soft-lavender/20 dark:bg-soft-lavender/10 align-top">
                  <HoverCard openDelay={200}>
                    <HoverCardTrigger asChild>
                      <div className="cursor-pointer">
                        {/* Show first 2 standards */}
                        <div className="space-y-1">
                          {belief.checklist.slice(0, 2).map((item) => (
                            <div key={item.id} className="flex items-center gap-2">
                              <Checkbox
                                checked={item.checked}
                                onCheckedChange={() => handleChecklistToggle(belief.category, item.id)}
                                disabled={viewingHistory || isAdminView}
                                data-testid={`checkbox-${belief.category.toLowerCase()}-${item.id}`}
                                className="h-3 w-3"
                              />
                              <span className="text-xs line-clamp-1">
                                {item.text}
                              </span>
                            </div>
                          ))}
                          {/* Show "X more items" if more than 2 */}
                          {belief.checklist.length > 2 && (
                            <div className="text-xs text-muted-foreground italic pl-5">
                              + {belief.checklist.length - 2} more items...
                            </div>
                          )}
                        </div>
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent 
                      side="left" 
                      align="start" 
                      className="w-96 max-h-[400px] overflow-y-auto"
                    >
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm mb-3">
                          {belief.category} Platinum Standards
                        </h4>
                        {belief.checklist.map((item) => (
                          <div key={item.id} className="flex items-start gap-2 py-1">
                            <Checkbox
                              checked={item.checked}
                              onCheckedChange={() => handleChecklistToggle(belief.category, item.id)}
                              disabled={viewingHistory || isAdminView}
                              data-testid={`checkbox-popup-${belief.category.toLowerCase()}-${item.id}`}
                              className="h-4 w-4 mt-0.5"
                            />
                            <span className="text-xs leading-relaxed">
                              {item.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </TableCell>

                {/* Progress */}
                <TableCell className="p-2 text-center bg-emerald-50/30 dark:bg-emerald-950/10 align-top">
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
      <div className="border-2 border-emerald-green/70 dark:border-emerald-green/50 rounded-lg overflow-x-auto shadow-lg">
        <div className="bg-emerald-green dark:bg-emerald-green/90 py-3 border-b-2 border-emerald-green/80 dark:border-emerald-green/60 flex items-center justify-center">
          <h3 className="font-bold text-white text-xl drop-shadow-md flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Next Week Target
          </h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30">
              <TableHead className="font-bold border-r min-w-[100px]">HRCM Area</TableHead>
              <TableHead className="min-w-[60px] bg-blue-100 dark:bg-blue-900/40 font-semibold border border-soft-gray dark:border-soft-gray/30">Rating</TableHead>
              <TableHead className="min-w-[140px] bg-blue-100 dark:bg-blue-900/40 font-semibold border border-soft-gray dark:border-soft-gray/30">Results</TableHead>
              <TableHead className="min-w-[140px] bg-blue-100 dark:bg-blue-900/40 font-semibold border border-soft-gray dark:border-soft-gray/30">Feelings</TableHead>
              <TableHead className="min-w-[140px] bg-blue-100 dark:bg-blue-900/40 font-semibold border border-soft-gray dark:border-soft-gray/30">Beliefs/Reasons</TableHead>
              <TableHead className="min-w-[140px] bg-blue-100 dark:bg-blue-900/40 font-semibold border-r border border-soft-gray dark:border-soft-gray/30">Actions</TableHead>
              
              <TableHead className="min-w-[130px] bg-gradient-to-r from-cyan-100 to-blue-100 dark:from-cyan-900/40 dark:to-blue-900/40 font-semibold">
                <div className="flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  Assignment
                </div>
              </TableHead>
              <TableHead className="min-w-[150px] bg-gradient-to-r from-soft-lavender/40 to-soft-lavender/60 dark:from-soft-lavender/20 dark:to-soft-lavender/30 font-semibold lavender-glow">Platinum Standards</TableHead>
              <TableHead className="min-w-[70px] bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40 font-semibold text-center">Progress</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {beliefs.map((belief) => (
              <TableRow key={belief.category} className="border-b" data-testid={`row-next-${belief.category.toLowerCase()}`}>
                {/* Category Column */}
                <TableCell className="font-semibold border-r bg-muted/20 align-top">
                  <Badge variant="outline" className="font-semibold">
                    {belief.category}
                  </Badge>
                </TableCell>

                {/* Next Week - Rating (Auto-calculated: Current + 1, Locked) */}
                <TableCell className="p-2 bg-blue-50/30 dark:bg-blue-950/10 align-top">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className="w-16 h-9 flex items-center justify-center text-center font-semibold border-2 border-muted bg-muted/20 rounded-md text-muted-foreground cursor-not-allowed"
                      data-testid={`text-next-${belief.category.toLowerCase()}-rating`}
                    >
                      {(belief.currentRating || 0) + 1}/10
                    </div>
                    {ratingCaps && ratingProgression && (() => {
                      const categoryLower = belief.category.toLowerCase();
                      const maxRating = ratingCaps[categoryLower as keyof typeof ratingCaps] || 7;
                      if (belief.targetRating >= maxRating) {
                        const weeksAtMaxKey = `${categoryLower}WeeksAtMax` as keyof typeof ratingProgression;
                        const weeksAtMax = ratingProgression[weeksAtMaxKey] || 0;
                        if (weeksAtMax > 0 && weeksAtMax < 4) {
                          return (
                            <Badge variant="secondary" className="text-xs px-2 py-0">
                              {weeksAtMax}/4 weeks
                            </Badge>
                          );
                        }
                      }
                      return null;
                    })()}
                  </div>
                </TableCell>

                {/* Next Week - Problems */}
                <TableCell className="p-2 bg-blue-50/30 dark:bg-blue-950/10 align-top">
                  {isEditing(belief.category, 'result') ? (
                    <Textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={saveEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          cancelEdit();
                        }
                      }}
                      placeholder="Enter each item on a new line..."
                      className="min-h-[60px] text-xs border-0"
                      autoFocus
                      data-testid={`textarea-next-problems-${belief.category.toLowerCase()}`}
                    />
                  ) : belief.resultChecklist && belief.resultChecklist.length > 0 ? (
                    <CompactChecklistView
                      items={belief.resultChecklist}
                      onToggle={(itemId) => handleResultChecklistToggle(belief.category, itemId)}
                      onUpdateText={(itemId, text) => handleUpdateCheckpointText(belief.category, itemId, text, 'result')}
                      onAddCheckpoint={(text) => handleAddCheckpoint(belief.category, 'result', text)}
                      onDeleteCheckpoint={(itemId) => handleDeleteCheckpoint(belief.category, itemId, 'result')}
                      category={belief.category}
                      checklistType="result"
                      disabled={viewingHistory || isAdminView}
                    />
                  ) : !viewingHistory && !isAdminView ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleAddCheckpoint(belief.category, 'result')}
                      className="h-6 w-full text-xs text-muted-foreground hover:text-foreground gap-1"
                      data-testid={`button-add-checkpoint-result-${belief.category.toLowerCase()}`}
                    >
                      <Plus className="w-3 h-3" />
                      Add Checkpoint
                    </Button>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-2">No items</p>
                  )}
                </TableCell>

                {/* Next Week - Feelings */}
                <TableCell className="p-2 bg-blue-50/30 dark:bg-blue-950/10 align-top">
                  {isEditing(belief.category, 'nextFeelings') ? (
                    <Textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={saveEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          cancelEdit();
                        }
                      }}
                      placeholder="Enter each item on a new line..."
                      className="min-h-[60px] text-xs border-0"
                      autoFocus
                      data-testid={`textarea-next-feelings-${belief.category.toLowerCase()}`}
                    />
                  ) : belief.feelingsChecklist && belief.feelingsChecklist.length > 0 ? (
                    <CompactChecklistView
                      items={belief.feelingsChecklist}
                      onToggle={(itemId) => handleFeelingsChecklistToggle(belief.category, itemId)}
                      onUpdateText={(itemId, text) => handleUpdateCheckpointText(belief.category, itemId, text, 'feelings')}
                      onAddCheckpoint={(text) => handleAddCheckpoint(belief.category, 'feelings', text)}
                      onDeleteCheckpoint={(itemId) => handleDeleteCheckpoint(belief.category, itemId, 'feelings')}
                      category={belief.category}
                      checklistType="feelings"
                      disabled={viewingHistory || isAdminView}
                    />
                  ) : !viewingHistory && !isAdminView ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleAddCheckpoint(belief.category, 'feelings')}
                      className="h-6 w-full text-xs text-muted-foreground hover:text-foreground gap-1"
                      data-testid={`button-add-checkpoint-feelings-${belief.category.toLowerCase()}`}
                    >
                      <Plus className="w-3 h-3" />
                      Add Checkpoint
                    </Button>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-2">No items</p>
                  )}
                </TableCell>

                {/* Next Week - Beliefs/Reasons */}
                <TableCell className="p-2 bg-blue-50/30 dark:bg-blue-950/10 align-top">
                  {isEditing(belief.category, 'nextWeekTarget') ? (
                    <Textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={saveEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          cancelEdit();
                        }
                      }}
                      placeholder="Enter each item on a new line..."
                      className="min-h-[60px] text-xs border-0"
                      autoFocus
                      data-testid={`textarea-next-beliefs-${belief.category.toLowerCase()}`}
                    />
                  ) : belief.beliefsChecklist && belief.beliefsChecklist.length > 0 ? (
                    <CompactChecklistView
                      items={belief.beliefsChecklist}
                      onToggle={(itemId) => handleBeliefsChecklistToggle(belief.category, itemId)}
                      onUpdateText={(itemId, text) => handleUpdateCheckpointText(belief.category, itemId, text, 'beliefs')}
                      onAddCheckpoint={(text) => handleAddCheckpoint(belief.category, 'beliefs', text)}
                      onDeleteCheckpoint={(itemId) => handleDeleteCheckpoint(belief.category, itemId, 'beliefs')}
                      category={belief.category}
                      checklistType="beliefs"
                      disabled={viewingHistory || isAdminView}
                    />
                  ) : !viewingHistory && !isAdminView ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleAddCheckpoint(belief.category, 'beliefs')}
                      className="h-6 w-full text-xs text-muted-foreground hover:text-foreground gap-1"
                      data-testid={`button-add-checkpoint-beliefs-${belief.category.toLowerCase()}`}
                    >
                      <Plus className="w-3 h-3" />
                      Add Checkpoint
                    </Button>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-2">No items</p>
                  )}
                </TableCell>

                {/* Next Week - Actions */}
                <TableCell className="p-2 bg-blue-50/30 dark:bg-blue-950/10 border-r align-top">
                  {isEditing(belief.category, 'nextActions') ? (
                    <Textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={saveEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          cancelEdit();
                        }
                      }}
                      placeholder="Enter each item on a new line..."
                      className="min-h-[60px] text-xs border-0"
                      autoFocus
                      data-testid={`textarea-next-actions-${belief.category.toLowerCase()}`}
                    />
                  ) : belief.actionsChecklist && belief.actionsChecklist.length > 0 ? (
                    <CompactChecklistView
                      items={belief.actionsChecklist}
                      onToggle={(itemId) => handleActionsChecklistToggle(belief.category, itemId)}
                      onUpdateText={(itemId, text) => handleUpdateCheckpointText(belief.category, itemId, text, 'actions')}
                      onAddCheckpoint={(text) => handleAddCheckpoint(belief.category, 'actions', text)}
                      onDeleteCheckpoint={(itemId) => handleDeleteCheckpoint(belief.category, itemId, 'actions')}
                      category={belief.category}
                      checklistType="actions"
                      disabled={viewingHistory || isAdminView}
                    />
                  ) : !viewingHistory && !isAdminView ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleAddCheckpoint(belief.category, 'actions')}
                      className="h-6 w-full text-xs text-muted-foreground hover:text-foreground gap-1"
                      data-testid={`button-add-checkpoint-actions-${belief.category.toLowerCase()}`}
                    >
                      <Plus className="w-3 h-3" />
                      Add Checkpoint
                    </Button>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-2">No items</p>
                  )}
                </TableCell>

                {/* Unified Assignment Column - Show only for first row with rowspan */}
                {belief.category === 'Health' && (
                  <TableCell rowSpan={4} className="p-2 bg-cyan-50/30 dark:bg-cyan-950/10 align-top">
                    {(() => {
                      const userLessons = unifiedAssignment.filter(l => l.source === 'user' || !l.source);
                      const adminLessons = unifiedAssignment.filter(l => l.source === 'admin');
                      
                      return (
                        <div className="space-y-3">
                          {/* Course Lessons (User Selected) */}
                          {userLessons.length > 0 && (
                            <div className="space-y-1">
                              <div className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 mb-2">
                                Course Lessons ({userLessons.length})
                              </div>
                              {userLessons.map((lesson) => (
                                <div key={lesson.id} className="flex items-center gap-2 py-0.5">
                                  <Checkbox
                                    checked={lesson.completed}
                                    onCheckedChange={() => handleUnifiedAssignmentToggle(lesson.id)}
                                    className="h-3 w-3"
                                    data-testid={`checkbox-user-lesson-${lesson.id}`}
                                  />
                                  <a
                                    href={lesson.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs hover:underline flex-1 text-cyan-700 dark:text-cyan-400"
                                    data-testid={`link-user-lesson-${lesson.id}`}
                                  >
                                    {lesson.lessonName}
                                  </a>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Recommended Lessons (Admin Recommended) */}
                          {adminLessons.length > 0 && (
                            <div className="space-y-1">
                              <div className="text-xs font-semibold text-pink-600 dark:text-pink-400 mb-2">
                                Recommended Lessons ({adminLessons.length})
                              </div>
                              {adminLessons.map((lesson) => (
                                <div key={lesson.id} className="flex items-center gap-2 py-0.5">
                                  <Checkbox
                                    checked={lesson.completed}
                                    onCheckedChange={() => handleUnifiedAssignmentToggle(lesson.id)}
                                    className="h-3 w-3"
                                    data-testid={`checkbox-admin-lesson-${lesson.id}`}
                                  />
                                  <a
                                    href={lesson.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs hover:underline flex-1 text-pink-700 dark:text-pink-400"
                                    data-testid={`link-admin-lesson-${lesson.id}`}
                                  >
                                    {lesson.lessonName}
                                  </a>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Empty State */}
                          {userLessons.length === 0 && adminLessons.length === 0 && (
                            <div className="text-xs text-muted-foreground italic text-center py-4">
                              No assignments yet. Check lessons in Course Tracker to add them here.
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </TableCell>
                )}

                {/* Platinum Standards - Compact with Hover Popup */}
                <TableCell className="p-2 bg-soft-lavender/20 dark:bg-soft-lavender/10 align-top">
                  <HoverCard openDelay={200}>
                    <HoverCardTrigger asChild>
                      <div className="cursor-pointer">
                        {/* Show first 2 standards */}
                        <div className="space-y-1">
                          {belief.checklist.slice(0, 2).map((item) => (
                            <div key={item.id} className="flex items-center gap-2">
                              <Checkbox
                                checked={item.checked}
                                onCheckedChange={() => handleChecklistToggle(belief.category, item.id)}
                                disabled={viewingHistory || isAdminView}
                                data-testid={`checkbox-next-${belief.category.toLowerCase()}-${item.id}`}
                                className="h-3 w-3"
                              />
                              <span className="text-xs line-clamp-1">
                                {item.text}
                              </span>
                            </div>
                          ))}
                          {/* Show "X more items" if more than 2 */}
                          {belief.checklist.length > 2 && (
                            <div className="text-xs text-muted-foreground italic pl-5">
                              + {belief.checklist.length - 2} more items...
                            </div>
                          )}
                        </div>
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent 
                      side="left" 
                      align="start" 
                      className="w-96 max-h-[400px] overflow-y-auto"
                    >
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm mb-3">
                          {belief.category} Platinum Standards
                        </h4>
                        {belief.checklist.map((item) => (
                          <div key={item.id} className="flex items-start gap-2 py-1">
                            <Checkbox
                              checked={item.checked}
                              onCheckedChange={() => handleChecklistToggle(belief.category, item.id)}
                              disabled={viewingHistory || isAdminView}
                              data-testid={`checkbox-next-popup-${belief.category.toLowerCase()}-${item.id}`}
                              className="h-4 w-4 mt-0.5"
                            />
                            <span className="text-xs leading-relaxed">
                              {item.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </TableCell>

                {/* Progress */}
                <TableCell className="p-2 text-center bg-emerald-50/30 dark:bg-emerald-950/10 align-top">
                  <Badge className={getProgressColor(calculateProgress(belief.checklist))} data-testid={`badge-next-progress-${belief.category.toLowerCase()}`}>
                    {calculateProgress(belief.checklist)}%
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Standards Dialog (All Categories) */}
      <Dialog open={showStandardsDialog} onOpenChange={setShowStandardsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {selectedCategory} Standards Checklist
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Select the standards you've completed today. Your {selectedCategory?.toLowerCase()} rating will be calculated automatically and scaled to a rating out of 10.
            </p>
            
            {selectedCategory && (() => {
              const categoryBelief = beliefs.find(b => b.category === selectedCategory);
              const currentStandards = categoryBelief?.checklist || [];
              const checkedCount = currentStandards.filter(item => item.checked).length;
              const totalStandards = currentStandards.length;
              
              // Get max rating cap for this category
              const categoryLower = selectedCategory.toLowerCase();
              const maxRating = ratingCaps?.[categoryLower as keyof typeof ratingCaps] || 7;
              
              // Calculate scaled rating and cap it at maxRating
              const rawScaledRating = Math.round((checkedCount / totalStandards) * 10);
              const scaledRating = Math.min(rawScaledRating, maxRating);
              
              // Check for progression badge display
              const weeksAtMax = ratingProgression?.[`${categoryLower}WeeksAtMax` as keyof typeof ratingProgression] || 0;
              const showProgressionBadge = scaledRating === maxRating && weeksAtMax > 0;
              
              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="font-semibold">Current {selectedCategory} Rating:</span>
                    <div className="flex items-center gap-2">
                      <Badge className="text-lg px-4 py-1" variant="default">
                        {scaledRating}/10
                      </Badge>
                      {showProgressionBadge && (
                        <Badge variant="secondary" className="text-xs px-2 py-0 h-5">
                          {weeksAtMax}/4 weeks
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground text-center">
                    {checkedCount} of {totalStandards} standards completed
                  </div>
                  
                  <div className="space-y-3">
                    {currentStandards.map((standard) => (
                      <div 
                        key={standard.id} 
                        className="flex items-start gap-3 p-3 rounded-lg hover-elevate border"
                        data-testid={`standard-item-${standard.id}`}
                      >
                        <Checkbox
                          id={standard.id}
                          checked={standard.checked}
                          onCheckedChange={() => handleStandardToggle(selectedCategory, standard.id)}
                          className="mt-1"
                          data-testid={`checkbox-standard-${standard.id}`}
                        />
                        <label 
                          htmlFor={standard.id} 
                          className="text-sm cursor-pointer flex-1"
                        >
                          {standard.text}
                        </label>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => setShowStandardsDialog(false)}
                      data-testid="button-close-standards"
                    >
                      Close
                    </Button>
                    <Button
                      onClick={() => {
                        setShowStandardsDialog(false);
                        // Save the updated data
                        saveWeekMutation.mutate({
                          weekNumber,
                          year: new Date().getFullYear(),
                          beliefs,
                        });
                      }}
                      data-testid="button-save-standards"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save & Close
                    </Button>
                  </div>
                </div>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Enhanced Weekly Progress Analytics Dialog */}
      <EnhancedAnalyticsDialog
        open={progressOpen}
        onOpenChange={setProgressOpen}
        currentWeek={weekNumber}
      />

      {/* HRCM Refined History Modal */}
      <RefinedHistoryModal 
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        currentWeek={weekNumber}
      />

    </div>
  );
}
