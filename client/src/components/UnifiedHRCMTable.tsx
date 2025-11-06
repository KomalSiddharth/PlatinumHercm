import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkles, Check, X, TrendingUp, Save, Loader2, ArrowUp, ArrowDown, Plus, MoreHorizontal, Calendar as CalendarIcon, Trash2, ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon } from 'lucide-react';
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
import { useWebSocket } from '@/hooks/useWebSocket';
import { format, isSameDay, getDay } from 'date-fns';
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
  lessonName: string | null;  // Can be null for course-level recommendations
  url: string | null;  // Can be null for course-level recommendations
  completed: boolean;
  source?: 'user' | 'admin';  // Track if user-selected or admin-recommended
  recommendationId?: string;   // Original recommendation ID if admin-recommended
  hrcmArea?: string;  // 'health', 'relationship', 'career', 'money' - for extracting from beliefs
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
  // Current Week Checklists
  problemsChecklist?: ChecklistItem[];
  feelingsCurrentChecklist?: ChecklistItem[];
  beliefsCurrentChecklist?: ChecklistItem[];
  actionsCurrentChecklist?: ChecklistItem[];
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
  // Calculate checklist progress - NO CAP, show real completion percentage
  const checklistProgress = checklist.length > 0 
    ? (checklist.filter(item => item.checked).length / checklist.length) * 100
    : 0;
  
  // Return actual progress without any artificial cap
  return Math.round(checklistProgress);
};

const getProgressColor = (progress: number) => {
  if (progress >= 80) return 'bg-gradient-to-r from-emerald-green to-golden-yellow text-white emerald-glow smooth-transition';
  if (progress >= 50) return 'bg-gradient-to-r from-golden-yellow to-coral-red text-white golden-glow smooth-transition';
  return 'bg-gradient-to-r from-coral-red to-coral-red/80 text-white coral-glow smooth-transition';
};

// Helper function to get Friday-Thursday date range for any given date
const getWeekDateRange = (currentDate: Date): string[] => {
  const dayOfWeek = getDay(currentDate);
  const daysToSubtract = dayOfWeek >= 5 ? dayOfWeek - 5 : dayOfWeek + 2;
  
  const friday = new Date(currentDate);
  friday.setDate(currentDate.getDate() - daysToSubtract);
  
  const dateStrings: string[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(friday);
    date.setDate(friday.getDate() + i);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    dateStrings.push(dateStr);
  }
  
  return dateStrings;
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
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentDateStr, setCurrentDateStr] = useState<string>(today);
  const [beliefs, setBeliefs] = useState<HRCMBelief[]>([]);
  const [editingField, setEditingField] = useState<{ category: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editDialogData, setEditDialogData] = useState<{ category: string; field: string; value: string; label: string; color: string } | null>(null);
  
  // State for hover editing
  const [hoverEditingField, setHoverEditingField] = useState<{ category: string; field: string } | null>(null);
  const [hoverEditValue, setHoverEditValue] = useState<string>('');
  const [loadingAssignments, setLoadingAssignments] = useState<Set<string>>(new Set());
  const [showStandardsDialog, setShowStandardsDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [collapsedCourses, setCollapsedCourses] = useState<Set<string>>(new Set());
  const [showFirstCheckpointDialog, setShowFirstCheckpointDialog] = useState(false);
  const [firstCheckpointData, setFirstCheckpointData] = useState<{ category: string; checklistType: 'result' | 'feelings' | 'beliefs' | 'actions' | 'problems' | 'feelingsCurrent' | 'beliefsCurrent' | 'actionsCurrent'; text: string } | null>(null);
  const [unifiedAssignment, setUnifiedAssignment] = useState<AssignmentLesson[]>([]);
  const [progressOpen, setProgressOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<Date | undefined>(undefined);
  const [viewingHistory, setViewingHistory] = useState(false);
  const [weeklyAverageProgress, setWeeklyAverageProgress] = useState<number>(0);
  const lastFocusedButton = useRef<HTMLButtonElement | null>(null);
  const hasAutoProgressed = useRef<Set<number>>(new Set()); // Track which weeks have been auto-progressed
  const { toast} = useToast();

  // Real-time WebSocket connection for instant sync
  // When user makes changes, admin panels viewing this user see updates immediately (no delay!)
  const { lastMessage } = useWebSocket(viewAsUserId || undefined);
  
  // Listen for real-time HRCM data changes
  useEffect(() => {
    if (!lastMessage) return;
    
    console.log('[HRCM REALTIME] WebSocket message received:', lastMessage);
    
    if (lastMessage.type === 'hrcm_data_changed') {
      console.log('[HRCM REALTIME] ✅ HRCM DATA CHANGED EVENT - Instant refetch!');
      console.log('[HRCM REALTIME] User:', lastMessage.data?.userId, 'Week:', lastMessage.data?.weekNumber);
      
      // Instantly refetch all HRCM data to show latest changes
      queryClient.invalidateQueries({ queryKey: ['/api/hercm/by-date'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hercm/weeks'] });
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && (key.includes('/api/admin/user/') && key.includes('/hercm/'));
        }
      });
      
      toast({
        title: 'Data Updated',
        description: 'Dashboard refreshed with latest changes',
      });
    }
  }, [lastMessage, toast]);

  // 🔥 GOOGLE-LEVEL DATE NAVIGATION - Instant, Smooth, No Glitches!
  const handleDateChange = async (newDate: Date) => {
    // CRITICAL: Use LOCAL timezone for date strings, NOT UTC!
    // toISOString() uses UTC which causes timezone bugs (IST 2 AM Nov 4 = UTC Nov 3)
    const dateStr = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-${String(newDate.getDate()).padStart(2, '0')}`;
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    console.log(`[🔥 DATE CHANGE] Switching to: ${dateStr} from current: ${currentDateStr}`);
    
    // Update date states FIRST (this changes the queryKey, triggering automatic refetch)
    setSelectedDate(newDate);
    setCurrentDateStr(dateStr);
    setViewingHistory(dateStr !== todayStr);
    
    // Force immediate refetch for the new date (don't just invalidate, actually refetch!)
    const endpoint = isAdminView && viewAsUserId
      ? `/api/admin/user/${viewAsUserId}/hercm/by-date/${dateStr}`
      : `/api/hercm/by-date/${dateStr}`;
    
    try {
      await queryClient.refetchQueries({
        queryKey: isAdminView && viewAsUserId
          ? [`/api/admin/user/${viewAsUserId}/hercm/by-date`, dateStr]
          : ['/api/hercm/by-date', dateStr],
        exact: true,
      });
      console.log(`[🔥 DATE CHANGE] ✅ Data loaded for ${dateStr}`);
    } catch (error) {
      console.error(`[🔥 DATE CHANGE] ❌ Error loading data for ${dateStr}:`, error);
    }
  };

  // Navigate date (Previous/Next) - using optimized handler
  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 1);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    handleDateChange(newDate);
  };

  // Fetch HRCM data for the selected date (admin-aware)
  const dateDataQueryKey = isAdminView && viewAsUserId
    ? [`/api/admin/user/${viewAsUserId}/hercm/by-date`, currentDateStr]
    : ['/api/hercm/by-date', currentDateStr];
  
  const { data: dateData, isLoading } = useQuery<{ beliefs?: HRCMBelief[]; createdAt?: string; weekNumber?: number }>({
    queryKey: dateDataQueryKey,
    queryFn: async () => {
      const endpoint = isAdminView && viewAsUserId
        ? `/api/admin/user/${viewAsUserId}/hercm/by-date/${currentDateStr}`
        : `/api/hercm/by-date/${currentDateStr}`;
      console.log(`[FRONTEND] Fetching HRCM data for date: ${currentDateStr}, endpoint: ${endpoint}, isAdminView: ${isAdminView}, viewAsUserId: ${viewAsUserId}`);
      const response = await fetch(endpoint, {
        credentials: 'include', // Required for admin authentication
      });
      if (!response.ok) {
        console.error(`[FRONTEND] Failed to fetch HRCM data: ${response.status} ${response.statusText}`);
        throw new Error('Failed to fetch HRCM data');
      }
      const data = await response.json();
      console.log(`[FRONTEND] Received HRCM data for ${currentDateStr}:`, data ? 'Data found' : 'No data', data);
      return data;
    },
    enabled: isAdminView ? !!viewAsUserId : true, // Only fetch when we have a user ID in admin view
    staleTime: 0,  // Always fetch fresh data
    gcTime: 0,  // Immediately garbage collect old cache (was cacheTime in v4)
    refetchOnMount: true,  // Refetch when component mounts
    refetchOnWindowFocus: false,  // Don't refetch on window focus
  });

  // Use dateData as weekData for consistency with existing code
  const weekData = dateData;

  // Fetch previous week data for comparison (only if week > 1)
  const { data: previousWeekData } = useQuery<{ beliefs?: HRCMBelief[] }>({
    queryKey: ['/api/hercm/week', weekNumber - 1],
    enabled: weekNumber > 1,
  });

  // Fetch all weeks data (needed for auto-progression and comparison)
  // In admin view, fetch all weeks for the specific user being viewed
  const allWeeksQueryKey = isAdminView && viewAsUserId
    ? [`/api/admin/user/${viewAsUserId}/hercm/weeks`]
    : ['/api/hercm/weeks'];
  
  const { data: allWeeksData } = useQuery({
    queryKey: allWeeksQueryKey,
    queryFn: async () => {
      const endpoint = isAdminView && viewAsUserId
        ? `/api/admin/user/${viewAsUserId}/hercm/weeks`
        : `/api/hercm/weeks`;
      console.log(`[FRONTEND] Fetching all weeks data, endpoint: ${endpoint}, isAdminView: ${isAdminView}, viewAsUserId: ${viewAsUserId}`);
      const response = await fetch(endpoint, {
        credentials: 'include', // Required for admin authentication
      });
      if (!response.ok) {
        console.error(`[FRONTEND] Failed to fetch all weeks data: ${response.status} ${response.statusText}`);
        throw new Error('Failed to fetch all weeks data');
      }
      const data = await response.json();
      console.log(`[FRONTEND] Received all weeks data:`, data);
      return data;
    },
    enabled: isAdminView ? !!viewAsUserId : true, // Only fetch when we have a user ID in admin view
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

  // Fetch dynamic platinum standards from database with real-time updates
  const { data: platinumStandardsData = [] } = useQuery<any[]>({
    queryKey: ['/api/platinum-standards'],
    staleTime: 0, // Always fetch fresh data to catch admin updates instantly
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchInterval: 5000, // Auto-refresh every 5 seconds for instant admin updates
    refetchOnMount: true, // Always refetch when component mounts
    refetchIntervalInBackground: true, // Keep refetching even when tab is not focused
  });

  // Fetch persistent assignments (user-level, date-independent)
  // In admin view, fetch for the specific user being viewed
  const persistentAssignmentsQueryKey = isAdminView && viewAsUserId
    ? [`/api/admin/user/${viewAsUserId}/persistent-assignments`]
    : ['/api/persistent-assignments'];
  
  const { data: persistentAssignments = [], refetch: refetchAssignments } = useQuery<any[]>({
    queryKey: persistentAssignmentsQueryKey,
    queryFn: async () => {
      const endpoint = isAdminView && viewAsUserId
        ? `/api/admin/user/${viewAsUserId}/persistent-assignments`
        : `/api/persistent-assignments`;
      const response = await fetch(endpoint, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch persistent assignments');
      return response.json();
    },
    enabled: isAdminView ? !!viewAsUserId : true, // Enable when we have a user ID in admin view, or always in normal view
    refetchInterval: 5000, // Poll every 5 seconds for instant admin updates
    refetchIntervalInBackground: true, // Continue polling in background
  });

  // Friday-to-Friday Snapshot System - Fetch active snapshot for continuity
  const { data: activeSnapshot, refetch: refetchSnapshot } = useQuery<{
    id: string;
    userId: string;
    snapshotDate: string;
    snapshotData: any;
    archived: boolean;
    createdAt: Date;
    archivedAt: Date | null;
  } | null>({
    queryKey: ['/api/snapshots/active'],
    enabled: !isAdminView && !viewingHistory, // Only for regular users viewing today
    staleTime: 0,
  });

  // Debug logging for snapshot
  useEffect(() => {
    console.log('[FRIDAY SNAPSHOT DEBUG] Today is:', new Date().toLocaleDateString('en-US', { weekday: 'long' }));
    console.log('[FRIDAY SNAPSHOT DEBUG] Active snapshot:', activeSnapshot);
    console.log('[FRIDAY SNAPSHOT DEBUG] viewingHistory:', viewingHistory, 'isAdminView:', isAdminView);
  }, [activeSnapshot, viewingHistory, isAdminView]);

  // Check if today is Friday
  const isTodayFriday = () => {
    const today = new Date();
    return getDay(today) === 5; // Friday = 5 (0 = Sunday, 6 = Saturday)
  };

  // Get last Friday's date string
  const getLastFridayDate = () => {
    const today = new Date();
    const dayOfWeek = getDay(today);
    const daysToSubtract = dayOfWeek >= 5 ? dayOfWeek - 5 : dayOfWeek + 2;
    const lastFriday = new Date(today);
    lastFriday.setDate(today.getDate() - daysToSubtract);
    return `${lastFriday.getFullYear()}-${String(lastFriday.getMonth() + 1).padStart(2, '0')}-${String(lastFriday.getDate()).padStart(2, '0')}`;
  };

  // Auto-create snapshot on new Friday (only runs once per Friday)
  useEffect(() => {
    if (isAdminView || viewingHistory || !isTodayFriday()) return;
    
    const lastFridayDate = getLastFridayDate();
    
    // Check if we already have a snapshot for this Friday
    if (activeSnapshot && activeSnapshot.snapshotDate === lastFridayDate) {
      console.log('[FRIDAY SNAPSHOT] Snapshot already exists for this Friday');
      return;
    }

    // Create new snapshot from current Next Week Target data
    const snapshotData = {
      beliefs: beliefs.map(b => ({
        category: b.category,
        targetRating: b.targetRating,
        result: b.result,
        nextFeelings: b.nextFeelings,
        nextWeekTarget: b.nextWeekTarget,
        nextActions: b.nextActions,
        resultChecklist: b.resultChecklist || [],
        feelingsChecklist: b.feelingsChecklist || [],
        beliefsChecklist: b.beliefsChecklist || [],
        actionsChecklist: b.actionsChecklist || [],
      }))
    };

    // Only create if there's actual data to snapshot
    const hasData = beliefs.some(b => 
      b.targetRating > 0 || b.result || b.nextFeelings || b.nextWeekTarget || b.nextActions ||
      (b.resultChecklist && b.resultChecklist.length > 0) ||
      (b.feelingsChecklist && b.feelingsChecklist.length > 0) ||
      (b.beliefsChecklist && b.beliefsChecklist.length > 0) ||
      (b.actionsChecklist && b.actionsChecklist.length > 0)
    );

    if (hasData) {
      console.log('[FRIDAY SNAPSHOT] Creating new snapshot for Friday:', lastFridayDate);
      apiRequest('/api/snapshots', 'POST', {
        snapshotDate: lastFridayDate,
        snapshotData
      }).then(() => {
        refetchSnapshot();
        toast({
          title: 'Friday Snapshot Created',
          description: 'Your Next Week Target data has been preserved for this week.',
        });
      }).catch(error => {
        console.error('[FRIDAY SNAPSHOT] Error creating snapshot:', error);
      });
    }
  }, [beliefs, activeSnapshot, isAdminView, viewingHistory, toast]);

  // Transform platinum standards into ChecklistItem format
  // Uses database ID for stable identification across admin updates
  const getPlatinumStandardsForCategory = (category: string): ChecklistItem[] => {
    const categoryLower = category.toLowerCase();
    const standards = platinumStandardsData.filter((s: any) => s.category === categoryLower && s.isActive);
    return standards
      .sort((a: any, b: any) => a.orderIndex - b.orderIndex)
      .map((s: any) => ({
        id: s.id, // Use database ID for stable merge with existing data
        text: s.standardText,
        checked: false // Default for NEW weeks only
      }));
  };

  // Get the most recent snapshot for the selected date (finds week containing this date)
  const getSnapshotForDate = () => {
    if (!allWeeksData || !selectedHistoryDate) {
      return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(selectedHistoryDate);
    selected.setHours(0, 0, 0, 0);

    // If selected date is in the future, return null (no data for future)
    if (selected > today) {
      return null;
    }

    // Find ALL snapshots created on or before the selected date
    const eligibleSnapshots = (allWeeksData as any[])
      .filter(snapshot => {
        if (!snapshot.createdAt) return false;
        const snapshotDate = new Date(snapshot.createdAt);
        snapshotDate.setHours(0, 0, 0, 0);
        // Include snapshots created on or before selected date
        return snapshotDate <= selected;
      })
      .sort((a, b) => {
        // Sort by createdAt descending (most recent first)
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });

    if (eligibleSnapshots.length === 0) {
      return null;
    }

    // Return the most recent snapshot (first in sorted array)
    return eligibleSnapshots[0];
  };

  const historicalSnapshot = getSnapshotForDate();

  useEffect(() => {
    console.log('[HISTORY EFFECT] viewingHistory:', viewingHistory, 'historicalSnapshot:', !!historicalSnapshot);
    
    // ONLY run this effect when viewing history (NOT today)
    if (!viewingHistory) {
      console.log('[HISTORY EFFECT] ⏸️ Not viewing history - skipping');
      return;
    }
    
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
        
        // Extract and combine assignments from all categories into unified list
        const combinedAssignments: AssignmentLesson[] = [];
        convertedBeliefs.forEach(belief => {
          if (belief.assignment && belief.assignment.lessons) {
            belief.assignment.lessons.forEach((lesson: any) => {
              combinedAssignments.push({
                id: lesson.id,
                courseId: lesson.courseId,
                courseName: lesson.courseName,
                lessonName: lesson.lessonName,
                url: lesson.url,
                completed: lesson.completed || false,
                source: lesson.source || 'user',
                hrcmArea: belief.category.toLowerCase()
              });
            });
          }
        });
        setUnifiedAssignment(combinedAssignments);
    } else {
      // No snapshot found (future date or no data for this date) - show blank
      setBeliefs(getBlankBeliefs());
      setUnifiedAssignment([]);
    }
  }, [viewingHistory, historicalSnapshot, selectedHistoryDate, allWeeksData]);

  useEffect(() => {
    console.log('[WEEKDATA EFFECT] weekData:', weekData);
    console.log('[WEEKDATA EFFECT] weekData?.beliefs:', weekData?.beliefs);
    console.log('[WEEKDATA EFFECT] viewingHistory:', viewingHistory);
    console.log('[WEEKDATA EFFECT] currentDateStr:', currentDateStr);
    
    // Process weekData for BOTH today and history dates
    // The /api/hercm/by-date endpoint returns data for any date (not just today)
    if (weekData?.beliefs) {
      console.log('[FRONTEND DEBUG] Processing beliefs from weekData');
      
      // SMART MERGE: Combine saved checklist with fresh platinum standards
      // Preserves checked states + adds new standards automatically
      // CRITICAL FIX: Also preserve checkpoint checklists (problemsChecklist, feelingsCurrentChecklist, etc.)
      const updatedBeliefs = weekData.beliefs.map(belief => {
        console.log(`[FRONTEND DEBUG] ${belief.category} - checklist:`, belief.checklist);
        console.log(`[FRONTEND DEBUG] ${belief.category} - checklist length:`, belief.checklist?.length);
        console.log(`[FRONTEND DEBUG] ${belief.category} - is array:`, Array.isArray(belief.checklist));
        console.log(`[FRONTEND DEBUG] ${belief.category} - problemsChecklist:`, belief.problemsChecklist);
        console.log(`[FRONTEND DEBUG] ${belief.category} - feelingsCurrentChecklist:`, belief.feelingsCurrentChecklist);
        
        // Get fresh platinum standards from database
        const freshStandards = getPlatinumStandardsForCategory(belief.category);
        
        if (belief.checklist && Array.isArray(belief.checklist) && belief.checklist.length > 0) {
          // SMART MERGE: Merge saved checklist with fresh platinum standards
          console.log(`[FRONTEND DEBUG] ${belief.category} - SMART MERGING SAVED + FRESH STANDARDS`);
          
          const existingChecklist = belief.checklist;
          
          // Merge: preserve checked states for existing items, add new items
          const mergedChecklist = freshStandards.map(freshItem => {
            const existing = existingChecklist.find(e => e.id === freshItem.id);
            return existing ? { ...freshItem, checked: existing.checked } : freshItem;
          });
          
          return {
            ...belief,
            checklist: mergedChecklist,
            // CRITICAL: Preserve checkpoint checklists from database
            problemsChecklist: belief.problemsChecklist || [],
            feelingsCurrentChecklist: belief.feelingsCurrentChecklist || [],
            beliefsCurrentChecklist: belief.beliefsCurrentChecklist || [],
            actionsCurrentChecklist: belief.actionsCurrentChecklist || []
          };
        }
        
        // No saved checklist or empty - load fresh platinum standards from database
        console.log(`[FRONTEND DEBUG] ${belief.category} - LOADING FRESH STANDARDS`);
        return {
          ...belief,
          checklist: freshStandards,
          // CRITICAL: Preserve checkpoint checklists from database even when no platinum standards
          problemsChecklist: belief.problemsChecklist || [],
          feelingsCurrentChecklist: belief.feelingsCurrentChecklist || [],
          beliefsCurrentChecklist: belief.beliefsCurrentChecklist || [],
          actionsCurrentChecklist: belief.actionsCurrentChecklist || []
        };
      });
      
      console.log('[FRONTEND DEBUG] Final updatedBeliefs:', updatedBeliefs);
      setBeliefs(updatedBeliefs);
      
      // Extract and combine assignments from all categories into unified list
      const combinedAssignments: AssignmentLesson[] = [];
      updatedBeliefs.forEach(belief => {
        if (belief.assignment && belief.assignment.lessons) {
          belief.assignment.lessons.forEach((lesson: any) => {
            combinedAssignments.push({
              id: lesson.id,
              courseId: lesson.courseId,
              courseName: lesson.courseName,
              lessonName: lesson.lessonName,
              url: lesson.url,
              completed: lesson.completed || false,
              source: lesson.source || 'user',
              hrcmArea: belief.category.toLowerCase()
            });
          });
        }
      });
      setUnifiedAssignment(combinedAssignments);
    } else if (weekData === null) {
      // Explicitly null from server (no data for this date) - show blank
      console.log('[WEEKDATA EFFECT] ⚠️ weekData is null - showing blank template');
      const dynamicBeliefs: HRCMBelief[] = [
        {
          category: 'Health' as const,
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
          checklist: getPlatinumStandardsForCategory('Health'),
          assignment: { courses: [], lessons: [] }
        },
        {
          category: 'Relationship' as const,
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
          checklist: getPlatinumStandardsForCategory('Relationship'),
          assignment: { courses: [], lessons: [] }
        },
        {
          category: 'Career' as const,
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
          checklist: getPlatinumStandardsForCategory('Career'),
          assignment: { courses: [], lessons: [] }
        },
        {
          category: 'Money' as const,
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
          checklist: getPlatinumStandardsForCategory('Money'),
          assignment: { courses: [], lessons: [] }
        }
      ];
      
      setBeliefs(dynamicBeliefs);
      setUnifiedAssignment([]);
    } else {
      // weekData is undefined (still loading) - don't change anything
      console.log('[WEEKDATA EFFECT] ⏳ weekData is undefined - still loading, keeping current state');
    }
  }, [weekData, platinumStandardsData]);
  // FIXED: Added platinumStandardsData to deps to auto-update when admin adds new standards

  // Calculate weekly average progress across Friday-Thursday (7 days)
  useEffect(() => {
    const calculateWeeklyAverage = async () => {
      try {
        // Get all 7 dates in the current Friday-Thursday week
        const weekDates = getWeekDateRange(selectedDate);
        
        // Fetch data for all 7 days in parallel
        const promises = weekDates.map(async (dateStr) => {
          try {
            const endpoint = isAdminView && viewAsUserId
              ? `/api/admin/user/${viewAsUserId}/hercm/by-date/${dateStr}`
              : `/api/hercm/by-date/${dateStr}`;
            
            const response = await fetch(endpoint, {
              credentials: 'include',
            });
            
            if (!response.ok) {
              return 0; // Return 0 for days with no data
            }
            
            const data = await response.json();
            
            // Calculate progress for this day
            if (data && data.beliefs && data.beliefs.length > 0) {
              const dayProgress = data.beliefs.reduce((sum: number, b: HRCMBelief) => {
                return sum + calculateProgress(b.checklist);
              }, 0) / data.beliefs.length;
              return dayProgress;
            }
            
            return 0; // No data for this day
          } catch (error) {
            console.error(`[WEEKLY AVG] Error fetching data for ${dateStr}:`, error);
            return 0; // Return 0 on error
          }
        });
        
        // Wait for all fetches to complete
        const dailyProgresses = await Promise.all(promises);
        
        // Calculate average across all 7 days (including 0% for days with no data)
        const weeklyAvg = dailyProgresses.reduce((sum, progress) => sum + progress, 0) / 7;
        
        setWeeklyAverageProgress(Math.round(weeklyAvg));
      } catch (error) {
        console.error('[WEEKLY AVG] Error calculating weekly average:', error);
        setWeeklyAverageProgress(0);
      }
    };
    
    calculateWeeklyAverage();
  }, [selectedDate, viewAsUserId, isAdminView]); // Only recalculate when date changes (not beliefs to avoid too many API calls)

  const weeklyProgress = weeklyAverageProgress;

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
        dateString: currentDateStr, // Use selected calendar date, not today's date
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
        dateString: currentDateStr, // Use selected calendar date, not today's date
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
        dateString: currentDateStr, // Use selected calendar date, not today's date
        beliefs: updated,
      });
      
      return updated;
    });
  };

  // Save status tracking
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  // Mutation for saving week data to database with retry logic and status tracking
  const saveWeekMutation = useMutation({
    mutationFn: async (weekData: any) => {
      setSaveStatus('saving');
      console.log('[SAVE] Starting save operation:', {
        weekNumber: weekData.weekNumber,
        dateString: weekData.dateString,
        currentDateStr: currentDateStr,
        hasBeliefs: !!weekData.beliefs,
        beliefCount: weekData.beliefs?.length,
        timestamp: new Date().toISOString()
      });
      
      // CRITICAL DEBUG: Log checkpoint data being sent
      if (weekData.beliefs && weekData.beliefs.length > 0) {
        weekData.beliefs.forEach((belief: any) => {
          console.log(`[FRONTEND SAVE] ${belief.category} checkpoint data:`, {
            problemsChecklist: belief.problemsChecklist,
            problemsChecklistLength: belief.problemsChecklist?.length || 0,
            feelingsCurrentChecklist: belief.feelingsCurrentChecklist,
            feelingsCurrentChecklistLength: belief.feelingsCurrentChecklist?.length || 0,
            beliefsCurrentChecklist: belief.beliefsCurrentChecklist,
            beliefsCurrentChecklistLength: belief.beliefsCurrentChecklist?.length || 0,
            actionsCurrentChecklist: belief.actionsCurrentChecklist,
            actionsCurrentChecklistLength: belief.actionsCurrentChecklist?.length || 0
          });
        });
      }
      
      const response = await apiRequest('/api/hercm/save-with-comparison', 'POST', weekData);
      const result = await response.json();
      
      console.log('[SAVE] Save operation completed:', {
        success: true,
        timestamp: new Date().toISOString()
      });
      
      return result;
    },
    onSuccess: async () => {
      setSaveStatus('saved');
      setRetryCount(0); // Reset retry count on success
      
      // Show "saved" status briefly
      setTimeout(() => setSaveStatus('idle'), 2000);
      
      // Invalidate and refetch to ensure UI updates immediately
      await queryClient.invalidateQueries({ queryKey: ['/api/hercm/weeks'] });
      await queryClient.refetchQueries({ queryKey: ['/api/hercm/weeks'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/rating-progression/caps'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/rating-progression/status'] });
      // Invalidate ALL analytics queries regardless of parameters (prefix matching)
      await queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.includes('/api/analytics/progress');
        }
      });
      
      console.log('[SAVE] ✅ Data saved successfully and cache invalidated');
    },
    onError: (error) => {
      console.error('[SAVE] ❌ Save failed:', error);
      setSaveStatus('error');
      
      // Auto-retry up to 3 times
      if (retryCount < maxRetries) {
        const newRetryCount = retryCount + 1;
        setRetryCount(newRetryCount);
        console.log(`[SAVE] Retrying... (${newRetryCount}/${maxRetries})`);
        
        // Retry after a delay
        setTimeout(() => {
          // Re-trigger the same mutation with the last data
          saveWeekMutation.mutate(saveWeekMutation.variables as any);
        }, 1000 * newRetryCount); // Exponential backoff: 1s, 2s, 3s
      } else {
        // Max retries reached - show error to user
        toast({
          title: "❌ Save Failed",
          description: `Could not save your data after ${maxRetries} attempts. Please check your connection and try again.`,
          variant: "destructive",
        });
        
        console.error('[SAVE] Max retries reached. Data not saved.');
        
        // Reset retry count after a delay
        setTimeout(() => {
          setRetryCount(0);
          setSaveStatus('idle');
        }, 5000);
      }
    }
  });


  // Update mutation - Archive snapshot and blank Next Week Target table
  const updateSnapshotMutation = useMutation({
    mutationFn: async () => {
      if (activeSnapshot) {
        await apiRequest(`/api/snapshots/${activeSnapshot.id}/archive`, 'POST', {});
      }
      // Also clear the Next Week Target data in local state
      return Promise.resolve();
    },
    onSuccess: () => {
      // Blank the Next Week Target table
      setBeliefs(prev => prev.map(belief => ({
        ...belief,
        targetRating: 0,
        result: '',
        nextFeelings: '',
        nextWeekTarget: '',
        nextActions: '',
        resultChecklist: [],
        feelingsChecklist: [],
        beliefsChecklist: [],
        actionsChecklist: [],
      })));
      
      // Save the blanked state to database
      saveWeekMutation.mutate({ 
        weekNumber, 
        year: new Date().getFullYear(),
        dateString: currentDateStr, // Use selected calendar date, not today's date
        beliefs: beliefs.map(belief => ({
          ...belief,
          targetRating: 0,
          result: '',
          nextFeelings: '',
          nextWeekTarget: '',
          nextActions: '',
          resultChecklist: [],
          feelingsChecklist: [],
          beliefsChecklist: [],
          actionsChecklist: [],
        }))
      });
      
      // Refetch snapshot to clear it from UI
      refetchSnapshot();
      
      toast({
        title: 'Updated!',
        description: 'Previous data archived. Next Week Target table is now blank for fresh planning.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update snapshot.',
        variant: 'destructive',
      });
    }
  });

  // Handlers

  // Get rating-based AI assignment course recommendations for Next Week
  const getAssignmentRecommendation = async (category: string) => {
    const belief = beliefs.find(b => b.category === category);
    if (!belief) return;

    setLoadingAssignments(prev => new Set(prev).add(category));

    try {
      const response = await apiRequest('/api/courses/recommend-assignment', 'POST', {
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
          year: new Date().getFullYear(),
          dateString: currentDateStr, // Use selected calendar date, not today's date
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

  // Assignment toggle mutation with INSTANT optimistic updates (Google-level UX)
  const assignmentToggleMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      return await apiRequest(`/api/persistent-assignments/${assignmentId}/toggle`, 'PUT', {});
    },
    onMutate: async (assignmentId: string) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: persistentAssignmentsQueryKey });
      await queryClient.cancelQueries({ queryKey: ['/api/user/total-points'] });
      
      // Snapshot previous values
      const previousAssignments = queryClient.getQueryData<any[]>(persistentAssignmentsQueryKey);
      const previousPoints = queryClient.getQueryData<{ totalPoints: number }>(['/api/user/total-points']);
      
      // Find the assignment being toggled
      const assignment = previousAssignments?.find(a => a.id === assignmentId);
      const wasCompleted = assignment?.completed || false;
      const willBeCompleted = !wasCompleted;
      
      // INSTANT UI UPDATE: Optimistically update assignments
      queryClient.setQueryData<any[]>(
        persistentAssignmentsQueryKey,
        (old) => old ? old.map(a => 
          a.id === assignmentId 
            ? { ...a, completed: willBeCompleted, updatedAt: new Date().toISOString() }
            : a
        ) : old
      );
      
      // INSTANT UI UPDATE: Optimistically update points in header (+10 or -10)
      if (previousPoints) {
        const pointsChange = willBeCompleted ? 10 : -10;
        queryClient.setQueryData<{ totalPoints: number }>(
          ['/api/user/total-points'],
          { totalPoints: previousPoints.totalPoints + pointsChange }
        );
      }
      
      console.log('[ASSIGNMENT] ⚡ Instant optimistic update applied:', {
        assignmentId,
        wasCompleted,
        willBeCompleted,
        pointsChange: willBeCompleted ? '+10' : '-10'
      });
      
      // Return context for rollback if needed
      return { previousAssignments, previousPoints };
    },
    onSuccess: async (response) => {
      const data = await response.json();
      console.log('[ASSIGNMENT] ✅ Server confirmed:', data);
      
      // Refetch to sync with server (but UI already updated instantly!)
      await queryClient.refetchQueries({ queryKey: persistentAssignmentsQueryKey });
      await queryClient.refetchQueries({ queryKey: ['/api/user/total-points'] });
    },
    onError: (error, assignmentId, context) => {
      console.error('[ASSIGNMENT] ❌ Toggle failed, rolling back:', error);
      
      // Rollback optimistic updates
      if (context?.previousAssignments) {
        queryClient.setQueryData(persistentAssignmentsQueryKey, context.previousAssignments);
      }
      if (context?.previousPoints) {
        queryClient.setQueryData(['/api/user/total-points'], context.previousPoints);
      }
      
      toast({
        title: 'Error',
        description: 'Failed to update assignment',
        variant: 'destructive'
      });
    }
  });
  
  // Toggle handler - uses mutation for instant response
  const handleUnifiedAssignmentToggle = (assignmentId: string) => {
    assignmentToggleMutation.mutate(assignmentId);
  };

  // Remove persistent assignment
  const handleRemoveUnifiedAssignment = async (assignmentId: string) => {
    try {
      const response = await apiRequest(`/api/persistent-assignments/${assignmentId}`, 'DELETE', {});
      
      if (response.ok) {
        await refetchAssignments();
        toast({
          title: 'Assignment Removed',
          description: 'Assignment removed successfully',
        });
      }
    } catch (error) {
      console.error('Error removing persistent assignment:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove assignment',
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

  // ======== CURRENT WEEK CHECKPOINT HANDLERS ========
  
  // Toggle problems checklist item (Current Week)
  const handleProblemsChecklistToggle = (category: string, itemId: string) => {
    setBeliefs(prev => {
      let updated = prev.map(belief => {
        if (belief.category === category && belief.problemsChecklist) {
          const updatedChecklist = belief.problemsChecklist.map(item =>
            item.id === itemId ? { ...item, checked: !item.checked } : item
          );
          return { ...belief, problemsChecklist: updatedChecklist };
        }
        return belief;
      });
      
      // Auto-sync to Next Week Target
      updated = syncCurrentToNextWeek(updated);
      
      saveWeekMutation.mutate({ weekNumber, year: new Date().getFullYear(), beliefs: updated });
      return updated;
    });
  };

  // Toggle feelings current checklist item (Current Week)
  const handleFeelingsCurrentChecklistToggle = (category: string, itemId: string) => {
    setBeliefs(prev => {
      let updated = prev.map(belief => {
        if (belief.category === category && belief.feelingsCurrentChecklist) {
          const updatedChecklist = belief.feelingsCurrentChecklist.map(item =>
            item.id === itemId ? { ...item, checked: !item.checked } : item
          );
          return { ...belief, feelingsCurrentChecklist: updatedChecklist };
        }
        return belief;
      });
      
      // Auto-sync to Next Week Target
      updated = syncCurrentToNextWeek(updated);
      
      saveWeekMutation.mutate({ weekNumber, year: new Date().getFullYear(), beliefs: updated });
      return updated;
    });
  };

  // Toggle beliefs current checklist item (Current Week)
  const handleBeliefsCurrentChecklistToggle = (category: string, itemId: string) => {
    setBeliefs(prev => {
      let updated = prev.map(belief => {
        if (belief.category === category && belief.beliefsCurrentChecklist) {
          const updatedChecklist = belief.beliefsCurrentChecklist.map(item =>
            item.id === itemId ? { ...item, checked: !item.checked } : item
          );
          return { ...belief, beliefsCurrentChecklist: updatedChecklist };
        }
        return belief;
      });
      
      // Auto-sync to Next Week Target
      updated = syncCurrentToNextWeek(updated);
      
      saveWeekMutation.mutate({ weekNumber, year: new Date().getFullYear(), beliefs: updated });
      return updated;
    });
  };

  // Toggle actions current checklist item (Current Week)
  const handleActionsCurrentChecklistToggle = (category: string, itemId: string) => {
    setBeliefs(prev => {
      let updated = prev.map(belief => {
        if (belief.category === category && belief.actionsCurrentChecklist) {
          const updatedChecklist = belief.actionsCurrentChecklist.map(item =>
            item.id === itemId ? { ...item, checked: !item.checked } : item
          );
          return { ...belief, actionsCurrentChecklist: updatedChecklist };
        }
        return belief;
      });
      
      // Auto-sync to Next Week Target
      updated = syncCurrentToNextWeek(updated);
      
      saveWeekMutation.mutate({ weekNumber, year: new Date().getFullYear(), beliefs: updated });
      return updated;
    });
  };

  // Show dialog for first checkpoint
  const handleShowFirstCheckpointDialog = (category: string, checklistType: 'result' | 'feelings' | 'beliefs' | 'actions' | 'problems' | 'feelingsCurrent' | 'beliefsCurrent' | 'actionsCurrent') => {
    setFirstCheckpointData({ category, checklistType, text: '' });
    setShowFirstCheckpointDialog(true);
  };

  // Save first checkpoint from dialog
  const handleSaveFirstCheckpoint = () => {
    if (firstCheckpointData && firstCheckpointData.text.trim()) {
      handleAddCheckpoint(firstCheckpointData.category, firstCheckpointData.checklistType, firstCheckpointData.text.trim());
      setShowFirstCheckpointDialog(false);
      setFirstCheckpointData(null);
    }
  };
  
  // Handle first checkpoint dialog close with auto-save (click-outside-to-save)
  const handleFirstCheckpointDialogClose = (open: boolean) => {
    if (!open) {
      // Dialog is closing - save if there's text
      if (firstCheckpointData && firstCheckpointData.text.trim()) {
        handleAddCheckpoint(firstCheckpointData.category, firstCheckpointData.checklistType, firstCheckpointData.text.trim());
        setFirstCheckpointData(null);
      }
    }
    setShowFirstCheckpointDialog(open);
  };

  // Helper function to sync Current Week checkpoints to Next Week Target (replace mode)
  const syncCurrentToNextWeek = (updatedBeliefs: HRCMBelief[]) => {
    return updatedBeliefs.map(belief => ({
      ...belief,
      // Replace Next Week Target checkpoints with Current Week checkpoints
      resultChecklist: belief.problemsChecklist ? [...belief.problemsChecklist] : [],
      feelingsChecklist: belief.feelingsCurrentChecklist ? [...belief.feelingsCurrentChecklist] : [],
      beliefsChecklist: belief.beliefsCurrentChecklist ? [...belief.beliefsCurrentChecklist] : [],
      actionsChecklist: belief.actionsCurrentChecklist ? [...belief.actionsCurrentChecklist] : []
    }));
  };

  // Add new checkpoint to a checklist
  const handleAddCheckpoint = (category: string, checklistType: 'result' | 'feelings' | 'beliefs' | 'actions' | 'problems' | 'feelingsCurrent' | 'beliefsCurrent' | 'actionsCurrent', text: string = '') => {
    setBeliefs(prev => {
      let updated = prev.map(belief => {
        if (belief.category === category) {
          const newItem: ChecklistItem = {
            id: `${category}-${checklistType}-${Date.now()}`,
            text: text,
            checked: false
          };
          
          // Next Week Target checkpoints - Add new checkpoint at START for visibility
          if (checklistType === 'result') {
            return { ...belief, resultChecklist: [newItem, ...(belief.resultChecklist || [])] };
          } else if (checklistType === 'feelings') {
            return { ...belief, feelingsChecklist: [newItem, ...(belief.feelingsChecklist || [])] };
          } else if (checklistType === 'beliefs') {
            return { ...belief, beliefsChecklist: [newItem, ...(belief.beliefsChecklist || [])] };
          } else if (checklistType === 'actions') {
            return { ...belief, actionsChecklist: [newItem, ...(belief.actionsChecklist || [])] };
          }
          // Current Week checkpoints - Add new checkpoint at START for visibility
          else if (checklistType === 'problems') {
            return { ...belief, problemsChecklist: [newItem, ...(belief.problemsChecklist || [])] };
          } else if (checklistType === 'feelingsCurrent') {
            return { ...belief, feelingsCurrentChecklist: [newItem, ...(belief.feelingsCurrentChecklist || [])] };
          } else if (checklistType === 'beliefsCurrent') {
            return { ...belief, beliefsCurrentChecklist: [newItem, ...(belief.beliefsCurrentChecklist || [])] };
          } else if (checklistType === 'actionsCurrent') {
            return { ...belief, actionsCurrentChecklist: [newItem, ...(belief.actionsCurrentChecklist || [])] };
          }
        }
        return belief;
      });
      
      // Auto-sync: If Current Week checkpoint was modified, sync to Next Week Target
      const isCurrentWeekCheckpoint = ['problems', 'feelingsCurrent', 'beliefsCurrent', 'actionsCurrent'].includes(checklistType);
      if (isCurrentWeekCheckpoint) {
        updated = syncCurrentToNextWeek(updated);
      }
      
      saveWeekMutation.mutate({ weekNumber, year: new Date().getFullYear(), beliefs: updated });
      return updated;
    });
  };

  // Update checkpoint text
  const handleUpdateCheckpointText = (category: string, itemId: string, text: string, checklistType: 'result' | 'feelings' | 'beliefs' | 'actions' | 'problems' | 'feelingsCurrent' | 'beliefsCurrent' | 'actionsCurrent') => {
    setBeliefs(prev => {
      let updated = prev.map(belief => {
        if (belief.category === category) {
          // Next Week Target checkpoints
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
          // Current Week checkpoints
          else if (checklistType === 'problems' && belief.problemsChecklist) {
            const updatedChecklist = belief.problemsChecklist.map(item =>
              item.id === itemId ? { ...item, text } : item
            );
            return { ...belief, problemsChecklist: updatedChecklist };
          } else if (checklistType === 'feelingsCurrent' && belief.feelingsCurrentChecklist) {
            const updatedChecklist = belief.feelingsCurrentChecklist.map(item =>
              item.id === itemId ? { ...item, text } : item
            );
            return { ...belief, feelingsCurrentChecklist: updatedChecklist };
          } else if (checklistType === 'beliefsCurrent' && belief.beliefsCurrentChecklist) {
            const updatedChecklist = belief.beliefsCurrentChecklist.map(item =>
              item.id === itemId ? { ...item, text } : item
            );
            return { ...belief, beliefsCurrentChecklist: updatedChecklist };
          } else if (checklistType === 'actionsCurrent' && belief.actionsCurrentChecklist) {
            const updatedChecklist = belief.actionsCurrentChecklist.map(item =>
              item.id === itemId ? { ...item, text } : item
            );
            return { ...belief, actionsCurrentChecklist: updatedChecklist };
          }
        }
        return belief;
      });
      
      // Auto-sync: If Current Week checkpoint was modified, sync to Next Week Target
      const isCurrentWeekCheckpoint = ['problems', 'feelingsCurrent', 'beliefsCurrent', 'actionsCurrent'].includes(checklistType);
      if (isCurrentWeekCheckpoint) {
        updated = syncCurrentToNextWeek(updated);
      }
      
      saveWeekMutation.mutate({ weekNumber, year: new Date().getFullYear(), beliefs: updated });
      return updated;
    });
  };

  // Delete checkpoint
  const handleDeleteCheckpoint = (category: string, itemId: string, checklistType: 'result' | 'feelings' | 'beliefs' | 'actions' | 'problems' | 'feelingsCurrent' | 'beliefsCurrent' | 'actionsCurrent') => {
    setBeliefs(prev => {
      let updated = prev.map(belief => {
        if (belief.category === category) {
          // Next Week Target checkpoints
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
          // Current Week checkpoints
          else if (checklistType === 'problems' && belief.problemsChecklist) {
            const updatedChecklist = belief.problemsChecklist.filter(item => item.id !== itemId);
            return { ...belief, problemsChecklist: updatedChecklist };
          } else if (checklistType === 'feelingsCurrent' && belief.feelingsCurrentChecklist) {
            const updatedChecklist = belief.feelingsCurrentChecklist.filter(item => item.id !== itemId);
            return { ...belief, feelingsCurrentChecklist: updatedChecklist };
          } else if (checklistType === 'beliefsCurrent' && belief.beliefsCurrentChecklist) {
            const updatedChecklist = belief.beliefsCurrentChecklist.filter(item => item.id !== itemId);
            return { ...belief, beliefsCurrentChecklist: updatedChecklist };
          } else if (checklistType === 'actionsCurrent' && belief.actionsCurrentChecklist) {
            const updatedChecklist = belief.actionsCurrentChecklist.filter(item => item.id !== itemId);
            return { ...belief, actionsCurrentChecklist: updatedChecklist };
          }
        }
        return belief;
      });
      
      // Auto-sync: If Current Week checkpoint was deleted, sync to Next Week Target
      const isCurrentWeekCheckpoint = ['problems', 'feelingsCurrent', 'beliefsCurrent', 'actionsCurrent'].includes(checklistType);
      if (isCurrentWeekCheckpoint) {
        updated = syncCurrentToNextWeek(updated);
      }
      
      saveWeekMutation.mutate({ weekNumber, year: new Date().getFullYear(), beliefs: updated });
      return updated;
    });
  };

  // Compact Checklist View Component - Matches Platinum Standards Style
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
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [newCheckpointText, setNewCheckpointText] = useState('');
    const [showEditCheckpointDialog, setShowEditCheckpointDialog] = useState(false);
    const [editCheckpointData, setEditCheckpointData] = useState<{ itemId: string; text: string; category: string } | null>(null);
    const visibleItems = items.slice(0, 1);
    const hiddenCount = items.length - 1;
    const hasMoreItems = items.length > 1;
    
    // Get color scheme based on checklistType
    const getColorScheme = (type: string) => {
      switch(type) {
        // Next Week Target checkpoints
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
        // Current Week checkpoints
        case 'problems':
          return {
            gradient: 'from-coral-red/10 via-white to-coral-red/5 dark:from-coral-red/20 dark:via-gray-900 dark:to-coral-red/10',
            border: 'border-coral-red/30',
            bar: 'bg-coral-red',
            text: 'text-coral-red',
            glow: 'coral-glow',
            label: 'Problems'
          };
        case 'feelingsCurrent':
          return {
            gradient: 'from-emerald-green/10 via-white to-emerald-green/5 dark:from-emerald-green/20 dark:via-gray-900 dark:to-emerald-green/10',
            border: 'border-emerald-green/30',
            bar: 'bg-emerald-green',
            text: 'text-emerald-green',
            glow: 'emerald-glow',
            label: 'Feelings'
          };
        case 'beliefsCurrent':
          return {
            gradient: 'from-golden-yellow/10 via-white to-golden-yellow/5 dark:from-golden-yellow/20 dark:via-gray-900 dark:to-golden-yellow/10',
            border: 'border-golden-yellow/30',
            bar: 'bg-golden-yellow',
            text: 'text-golden-yellow',
            glow: 'golden-glow',
            label: 'Beliefs'
          };
        case 'actionsCurrent':
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
    
    // Handle dialog close with auto-save (click-outside-to-save)
    const handleDialogClose = (open: boolean) => {
      if (!open) {
        // Dialog is closing - save if there's text
        if (newCheckpointText.trim()) {
          onAddCheckpoint(newCheckpointText.trim());
          setNewCheckpointText('');
        }
      }
      setShowAddDialog(open);
    };
    
    // Open edit checkpoint dialog
    const handleOpenEditCheckpointDialog = (itemId: string, text: string) => {
      setEditCheckpointData({ itemId, text, category });
      setShowEditCheckpointDialog(true);
    };
    
    // Save edited checkpoint
    const handleSaveEditedCheckpoint = () => {
      if (editCheckpointData && editCheckpointData.text.trim()) {
        onUpdateText(editCheckpointData.itemId, editCheckpointData.text.trim());
        setShowEditCheckpointDialog(false);
        setEditCheckpointData(null);
      }
    };
    
    // Handle edit checkpoint dialog close with auto-save (click-outside-to-save)
    const handleEditCheckpointDialogClose = (open: boolean) => {
      if (!open) {
        // Dialog is closing - save if text changed
        if (editCheckpointData && editCheckpointData.text.trim()) {
          onUpdateText(editCheckpointData.itemId, editCheckpointData.text.trim());
          setEditCheckpointData(null);
        }
      }
      setShowEditCheckpointDialog(open);
    };
    
    return (
      <>
        <HoverCard openDelay={200}>
          <HoverCardTrigger asChild>
            <div className="space-y-1 cursor-pointer max-w-full max-h-full overflow-hidden">
              {/* Compact View - Fixed Height, No Inline Editing (Exactly like Platinum Standards) */}
              {visibleItems.map((item) => (
                <div key={item.id} className="flex items-center gap-2 min-w-0">
                  <Checkbox
                    checked={item.checked}
                    onCheckedChange={() => !disabled && onToggle(item.id)}
                    disabled={disabled}
                    className="h-3 w-3 shrink-0"
                    data-testid={`checkbox-${checklistType}-${category.toLowerCase()}-${item.id}`}
                  />
                  <span className="text-xs line-clamp-1 break-all min-w-0">
                    {item.text}
                  </span>
                </div>
              ))}
              
              {/* Show "X more items" if more than 2 */}
              {hasMoreItems && (
                <div className="text-xs text-muted-foreground italic pl-5">
                  + {hiddenCount} more item{hiddenCount > 1 ? 's' : ''}...
                </div>
              )}
              
              {/* Add Checkpoint button when items exist */}
              {items.length > 0 && !disabled && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleAddCheckpointClick}
                  className="h-6 w-full text-xs text-muted-foreground hover:text-foreground gap-1 mt-1"
                  data-testid={`button-add-checkpoint-inline-${checklistType}-${category.toLowerCase()}`}
                >
                  <Plus className="w-3 h-3" />
                  Add Checkpoint
                </Button>
              )}
            </div>
          </HoverCardTrigger>
          
          <HoverCardContent 
            side="left" 
            align="start" 
            className={`w-96 max-h-[400px] overflow-y-auto bg-gradient-to-br ${colorScheme.gradient} border-2 ${colorScheme.border} z-[100]`}
          >
            <div className="space-y-2">
              <h4 className="font-semibold text-sm mb-3">
                {category} - {colorScheme.label} ({items.length} items)
              </h4>
              {items.map((item) => (
                <div key={item.id} className="flex items-start gap-2 py-1 group/hover-item">
                  <Checkbox
                    checked={item.checked}
                    onCheckedChange={() => !disabled && onToggle(item.id)}
                    disabled={disabled}
                    className="h-4 w-4 mt-0.5 shrink-0"
                    data-testid={`checkbox-hover-${checklistType}-${category.toLowerCase()}-${item.id}`}
                  />
                  <span
                    onClick={() => {
                      if (!disabled) {
                        handleOpenEditCheckpointDialog(item.id, item.text);
                      }
                    }}
                    className={`flex-1 text-left text-xs py-0.5 px-1 rounded ${!disabled ? 'cursor-pointer hover:bg-muted/30' : 'cursor-not-allowed'} transition-colors min-h-[20px] break-words`}
                    data-testid={`text-hover-${checklistType}-${category.toLowerCase()}-${item.id}`}
                  >
                    {item.text || <span className="text-muted-foreground italic">Click to edit...</span>}
                  </span>
                  {!disabled && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDeleteCheckpoint(item.id)}
                      className="h-5 w-5 p-0 opacity-0 group-hover/hover-item:opacity-100 transition-opacity shrink-0"
                      data-testid={`button-delete-hover-${checklistType}-${category.toLowerCase()}-${item.id}`}
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </HoverCardContent>
        </HoverCard>
        
        {/* Add Checkpoint Button - Outside HoverCard to prevent layout shift */}
        {!disabled && items.length === 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleAddCheckpointClick}
            className="h-6 w-full text-xs text-muted-foreground hover:text-foreground gap-1"
            data-testid={`button-add-checkpoint-${checklistType}-${category.toLowerCase()}`}
          >
            <Plus className="w-3 h-3" />
            Add Checkpoint
          </Button>
        )}

        {/* Add Checkpoint Dialog */}
        <Dialog open={showAddDialog} onOpenChange={handleDialogClose}>
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
                  onFocus={(e) => {
                    const length = e.target.value.length;
                    e.target.setSelectionRange(length, length);
                  }}
                  onKeyDown={(e) => {
                    // Save on Enter key (without Shift for new line)
                    if (e.key === 'Enter' && !e.shiftKey && newCheckpointText.trim()) {
                      e.preventDefault();
                      handleSaveNewCheckpoint();
                    }
                    // Prevent event propagation for all keys to avoid closing dialog
                    e.stopPropagation();
                  }}
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

        {/* Edit Checkpoint Dialog */}
        <Dialog open={showEditCheckpointDialog} onOpenChange={handleEditCheckpointDialogClose}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className={`text-base font-semibold ${colorScheme.text}`}>
                Edit {colorScheme.label} Checkpoint
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className={`p-4 rounded-lg border-2 ${colorScheme.border} bg-gradient-to-br ${colorScheme.gradient} ${colorScheme.glow}`}>
                <div className="flex items-start gap-2 mb-3">
                  <div className={`w-1 h-full ${colorScheme.bar} rounded-full`}></div>
                  <p className={`text-sm font-medium ${colorScheme.text}`}>{category} - {colorScheme.label}</p>
                </div>
                <Textarea
                  value={editCheckpointData?.text || ''}
                  onChange={(e) => setEditCheckpointData(prev => prev ? { ...prev, text: e.target.value } : null)}
                  onFocus={(e) => {
                    const length = e.target.value.length;
                    e.target.setSelectionRange(length, length);
                  }}
                  placeholder="Edit your checkpoint..."
                  className="min-h-[100px] text-sm bg-white dark:bg-gray-950 border-muted"
                  autoFocus
                  data-testid={`textarea-edit-checkpoint-${checklistType}`}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditCheckpointDialog(false);
                    setEditCheckpointData(null);
                  }}
                  data-testid="button-cancel-edit-checkpoint"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEditedCheckpoint}
                  disabled={!editCheckpointData?.text.trim()}
                  className="bg-gradient-to-r from-primary to-accent text-white hover:opacity-90"
                  data-testid="button-save-edit-checkpoint"
                >
                  Save Changes
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
          await apiRequest('/api/hercm/save-with-comparison', 'POST', {
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

  // Open edit dialog for Current Week fields
  const openEditDialog = (category: string, field: string, currentValue: string, label: string, color: string) => {
    setEditDialogData({ category, field, value: currentValue, label, color });
    setShowEditDialog(true);
  };

  // Save edit from dialog
  const saveEditDialog = async () => {
    if (!editDialogData) return;
    
    const { category, field, value } = editDialogData;
    
    const updatedBeliefs = beliefs.map(belief => {
      if (belief.category === category) {
        return { ...belief, [field]: value };
      }
      return belief;
    });
    
    setBeliefs(updatedBeliefs);
    saveWeekMutation.mutate({ weekNumber, year: new Date().getFullYear(), beliefs: updatedBeliefs });
    
    setShowEditDialog(false);
    setEditDialogData(null);
  };

  // Handle hover card close and auto-save
  const handleHoverClose = (isOpen: boolean, category: string, field: string) => {
    if (!isOpen && hoverEditingField?.category === category && hoverEditingField?.field === field) {
      // HoverCard is closing - auto-save if there's a change
      const currentBelief = beliefs.find(b => b.category === category);
      const currentValue = currentBelief?.[field as keyof HRCMBelief] as string || '';
      
      if (hoverEditValue !== currentValue) {
        // Value changed - save it
        const updatedBeliefs = beliefs.map(belief => {
          if (belief.category === category) {
            return { ...belief, [field]: hoverEditValue };
          }
          return belief;
        });
        
        setBeliefs(updatedBeliefs);
        saveWeekMutation.mutate({ weekNumber, year: new Date().getFullYear(), beliefs: updatedBeliefs });
      }
      
      // Clear hover editing state
      setHoverEditingField(null);
      setHoverEditValue('');
    }
  };

  // Start editing in hover card
  const startHoverEdit = (category: string, field: string, currentValue: string) => {
    setHoverEditingField({ category, field });
    setHoverEditValue(currentValue);
  };

  // Save hover edit (called from Enter key or hover close)
  const saveHoverEdit = () => {
    if (!hoverEditingField) return;
    
    const { category, field } = hoverEditingField;
    const currentBelief = beliefs.find(b => b.category === category);
    const currentValue = currentBelief?.[field as keyof HRCMBelief] as string || '';
    
    if (hoverEditValue !== currentValue) {
      // Value changed - save it
      const updatedBeliefs = beliefs.map(belief => {
        if (belief.category === category) {
          return { ...belief, [field]: hoverEditValue };
        }
        return belief;
      });
      
      setBeliefs(updatedBeliefs);
      saveWeekMutation.mutate({ weekNumber, year: new Date().getFullYear(), beliefs: updatedBeliefs });
    }
    
    // Clear hover editing state
    setHoverEditingField(null);
    setHoverEditValue('');
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

  // Show loading state while data is being fetched
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Week {weekNumber} - HRCM Tracker
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Loading your data...
            </p>
          </div>
        </div>
        <div className="border-2 border-primary/30 rounded-lg p-8">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-lg font-semibold text-foreground">Loading HRCM Data</p>
            <p className="text-sm text-muted-foreground">Please wait while we fetch your saved progress...</p>
          </div>
        </div>
      </div>
    );
  }

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
          {/* Save Status Indicator */}
          {saveStatus !== 'idle' && (
            <Badge 
              variant={saveStatus === 'saved' ? 'default' : saveStatus === 'saving' ? 'secondary' : 'destructive'}
              className="flex items-center gap-1.5"
              data-testid="badge-save-status"
            >
              {saveStatus === 'saving' && (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Saving...
                </>
              )}
              {saveStatus === 'saved' && (
                <>
                  <Check className="w-3 h-3" />
                  Saved
                </>
              )}
              {saveStatus === 'error' && (
                <>
                  <X className="w-3 h-3" />
                  Save Failed
                </>
              )}
            </Badge>
          )}
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                className={`${getProgressColor(weeklyProgress)} ${!isAdminView ? 'cursor-pointer hover:opacity-80' : ''} smooth-transition`}
                onClick={() => !isAdminView && setProgressOpen(true)}
                data-testid="badge-weekly-progress"
              >
                {weeklyProgress}% Weekly Progress
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm">Average across Friday-Thursday (7 days)</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Current Week Table */}
      <div className="border-2 border-coral-red/70 dark:border-coral-red/50 rounded-lg overflow-x-auto shadow-lg">
        <div className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 border-b-2 border-coral-red/80 dark:border-coral-red/60 bg-coral-red">
          <div className="flex items-center justify-between">
            {/* Left: Date Navigation Controls - Like Emotional Tracker */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateDate('prev')}
                data-testid="button-prev-date"
                className="text-white hover:bg-white/20 h-7 w-7 sm:h-8 sm:w-8 p-0"
              >
                <ChevronLeftIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Button>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20 h-7 w-7 sm:h-8 sm:w-8 p-0"
                    data-testid="button-calendar-picker"
                  >
                    <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </Button>
                </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      handleDateChange(date);
                    }
                  }}
                  initialFocus
                  data-testid="calendar-date-picker"
                />
                <div className="p-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      handleDateChange(new Date());
                    }}
                    data-testid="button-reset-to-today"
                  >
                    Back to Today
                  </Button>
                  </div>
              </PopoverContent>
            </Popover>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateDate('next')}
              disabled={(() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const selected = new Date(selectedDate);
                selected.setHours(0, 0, 0, 0);
                return selected.getTime() >= today.getTime(); // Disable if today or future
              })()}
              data-testid="button-next-date"
              className="text-white hover:bg-white/20 h-7 w-7 sm:h-8 sm:w-8 p-0 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRightIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Button>
          </div>

            {/* Center: Heading - Shows "Current Week" for today, date for other days */}
            <h3 className="font-bold text-white text-sm sm:text-base md:text-lg lg:text-xl drop-shadow-md flex items-center gap-1 sm:gap-2">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
              {(() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const selected = new Date(selectedDate);
                selected.setHours(0, 0, 0, 0);
                
                // If selected date is today, show "Current Week"
                if (selected.getTime() === today.getTime()) {
                  return 'Current Week';
                }
                
                // For other dates, show the actual date
                return format(selectedDate, 'MMMM dd, yyyy');
              })()}
            </h3>

            {/* Right: Spacer for balance */}
            <div className="w-7 sm:w-8 md:w-10"></div>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30">
              <TableHead className="text-xs sm:text-sm font-bold border-r min-w-[80px] sm:min-w-[100px] px-1.5 sm:px-2 py-1.5 sm:py-2">HRCM Area</TableHead>
              <TableHead className="text-xs sm:text-sm min-w-[50px] sm:min-w-[60px] bg-rose-100 dark:bg-rose-900/40 font-semibold px-1.5 sm:px-2 py-1.5 sm:py-2">Rating</TableHead>
              <TableHead className="text-xs sm:text-sm min-w-[120px] sm:min-w-[140px] bg-rose-100 dark:bg-rose-900/40 font-semibold px-1.5 sm:px-2 py-1.5 sm:py-2">Problems</TableHead>
              <TableHead className="text-xs sm:text-sm min-w-[120px] sm:min-w-[140px] bg-rose-100 dark:bg-rose-900/40 font-semibold px-1.5 sm:px-2 py-1.5 sm:py-2">Feelings</TableHead>
              <TableHead className="text-xs sm:text-sm min-w-[120px] sm:min-w-[140px] bg-rose-100 dark:bg-rose-900/40 font-semibold px-1.5 sm:px-2 py-1.5 sm:py-2">Beliefs/Reasons</TableHead>
              <TableHead className="text-xs sm:text-sm min-w-[120px] sm:min-w-[140px] bg-rose-100 dark:bg-rose-900/40 font-semibold border-r px-1.5 sm:px-2 py-1.5 sm:py-2">Actions</TableHead>
              
              <TableHead className="text-xs sm:text-sm min-w-[130px] sm:min-w-[150px] bg-gradient-to-r from-soft-lavender/40 to-soft-lavender/60 dark:from-soft-lavender/20 dark:to-soft-lavender/30 font-semibold lavender-glow px-1.5 sm:px-2 py-1.5 sm:py-2">Platinum Standards</TableHead>
              <TableHead className="text-xs sm:text-sm min-w-[60px] sm:min-w-[70px] bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40 font-semibold text-center px-1.5 sm:px-2 py-1.5 sm:py-2">Progress</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {beliefs.map((belief) => (
              <TableRow key={belief.category} className="border-b h-[85px]" data-testid={`row-${belief.category.toLowerCase()}`}>
                {/* Category Column */}
                <TableCell className="text-xs sm:text-sm font-semibold border-r bg-muted/20 align-top px-1.5 sm:px-2 py-1.5 sm:py-2" data-testid={`cell-category-${belief.category.toLowerCase()}`}>
                  <Badge variant="outline" className="font-semibold text-[10px] sm:text-xs px-1 sm:px-2">
                    {belief.category}
                  </Badge>
                </TableCell>

                {/* Current Week - Rating */}
                <TableCell className="p-1 sm:p-1.5 md:p-2 bg-coral-red/5 dark:bg-coral-red/10 align-top">
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

                {/* Current Week - Problems (Checkpoint System) */}
                <TableCell className="p-2 bg-coral-red/5 dark:bg-coral-red/10 align-top">
                  {belief.problemsChecklist && belief.problemsChecklist.length > 0 ? (
                    <CompactChecklistView
                      items={belief.problemsChecklist}
                      onToggle={(itemId) => handleProblemsChecklistToggle(belief.category, itemId)}
                      onUpdateText={(itemId, text) => handleUpdateCheckpointText(belief.category, itemId, text, 'problems')}
                      onAddCheckpoint={(text) => handleAddCheckpoint(belief.category, 'problems', text)}
                      onDeleteCheckpoint={(itemId) => handleDeleteCheckpoint(belief.category, itemId, 'problems')}
                      category={belief.category}
                      checklistType="problems"
                      disabled={viewingHistory || isAdminView}
                    />
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => !viewingHistory && !isAdminView && handleShowFirstCheckpointDialog(belief.category, 'problems')}
                      className="h-7 w-full text-xs text-muted-foreground hover:text-foreground gap-1 justify-start"
                      disabled={viewingHistory || isAdminView}
                      data-testid={`button-add-first-checkpoint-problems-${belief.category.toLowerCase()}`}
                    >
                      <Plus className="w-3 h-3" />
                      Add Checkpoint
                    </Button>
                  )}
                </TableCell>

                {/* Current Week - Feelings (Checkpoint System) */}
                <TableCell className="p-2 bg-emerald-green/5 dark:bg-emerald-green/10 align-top">
                  {belief.feelingsCurrentChecklist && belief.feelingsCurrentChecklist.length > 0 ? (
                    <CompactChecklistView
                      items={belief.feelingsCurrentChecklist}
                      onToggle={(itemId) => handleFeelingsCurrentChecklistToggle(belief.category, itemId)}
                      onUpdateText={(itemId, text) => handleUpdateCheckpointText(belief.category, itemId, text, 'feelingsCurrent')}
                      onAddCheckpoint={(text) => handleAddCheckpoint(belief.category, 'feelingsCurrent', text)}
                      onDeleteCheckpoint={(itemId) => handleDeleteCheckpoint(belief.category, itemId, 'feelingsCurrent')}
                      category={belief.category}
                      checklistType="feelingsCurrent"
                      disabled={viewingHistory || isAdminView}
                    />
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => !viewingHistory && !isAdminView && handleShowFirstCheckpointDialog(belief.category, 'feelingsCurrent')}
                      className="h-7 w-full text-xs text-muted-foreground hover:text-foreground gap-1 justify-start"
                      disabled={viewingHistory || isAdminView}
                      data-testid={`button-add-first-checkpoint-feelings-${belief.category.toLowerCase()}`}
                    >
                      <Plus className="w-3 h-3" />
                      Add Checkpoint
                    </Button>
                  )}
                </TableCell>

                {/* Current Week - Beliefs (Checkpoint System) */}
                <TableCell className="p-2 bg-golden-yellow/5 dark:bg-golden-yellow/10 align-top">
                  {belief.beliefsCurrentChecklist && belief.beliefsCurrentChecklist.length > 0 ? (
                    <CompactChecklistView
                      items={belief.beliefsCurrentChecklist}
                      onToggle={(itemId) => handleBeliefsCurrentChecklistToggle(belief.category, itemId)}
                      onUpdateText={(itemId, text) => handleUpdateCheckpointText(belief.category, itemId, text, 'beliefsCurrent')}
                      onAddCheckpoint={(text) => handleAddCheckpoint(belief.category, 'beliefsCurrent', text)}
                      onDeleteCheckpoint={(itemId) => handleDeleteCheckpoint(belief.category, itemId, 'beliefsCurrent')}
                      category={belief.category}
                      checklistType="beliefsCurrent"
                      disabled={viewingHistory || isAdminView}
                    />
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => !viewingHistory && !isAdminView && handleShowFirstCheckpointDialog(belief.category, 'beliefsCurrent')}
                      className="h-7 w-full text-xs text-muted-foreground hover:text-foreground gap-1 justify-start"
                      disabled={viewingHistory || isAdminView}
                      data-testid={`button-add-first-checkpoint-beliefs-${belief.category.toLowerCase()}`}
                    >
                      <Plus className="w-3 h-3" />
                      Add Checkpoint
                    </Button>
                  )}
                </TableCell>

                {/* Current Week - Actions (Checkpoint System) */}
                <TableCell className="p-2 bg-soft-lavender/5 dark:bg-soft-lavender/10 border-r align-top">
                  {belief.actionsCurrentChecklist && belief.actionsCurrentChecklist.length > 0 ? (
                    <CompactChecklistView
                      items={belief.actionsCurrentChecklist}
                      onToggle={(itemId) => handleActionsCurrentChecklistToggle(belief.category, itemId)}
                      onUpdateText={(itemId, text) => handleUpdateCheckpointText(belief.category, itemId, text, 'actionsCurrent')}
                      onAddCheckpoint={(text) => handleAddCheckpoint(belief.category, 'actionsCurrent', text)}
                      onDeleteCheckpoint={(itemId) => handleDeleteCheckpoint(belief.category, itemId, 'actionsCurrent')}
                      category={belief.category}
                      checklistType="actionsCurrent"
                      disabled={viewingHistory || isAdminView}
                    />
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => !viewingHistory && !isAdminView && handleShowFirstCheckpointDialog(belief.category, 'actionsCurrent')}
                      className="h-7 w-full text-xs text-muted-foreground hover:text-foreground gap-1 justify-start"
                      disabled={viewingHistory || isAdminView}
                      data-testid={`button-add-first-checkpoint-actions-${belief.category.toLowerCase()}`}
                    >
                      <Plus className="w-3 h-3" />
                      Add Checkpoint
                    </Button>
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
        <div className="bg-emerald-green dark:bg-emerald-green/90 py-3 border-b-2 border-emerald-green/80 dark:border-emerald-green/60 px-4">
          <div className="flex items-center justify-between">
            <div className="flex-1"></div>
            <h3 className="font-bold text-white text-xl drop-shadow-md flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Next Week Target
            </h3>
            <div className="flex-1 flex justify-end items-center gap-2">
              {!viewingHistory && !isAdminView && activeSnapshot && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateSnapshotMutation.mutate()}
                      disabled={updateSnapshotMutation.isPending}
                      data-testid="button-update-snapshot"
                      className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white h-8"
                    >
                      {updateSnapshotMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      <span className="ml-1.5">Update</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Archive current data and blank table for fresh planning</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {!viewingHistory && !isAdminView && activeSnapshot && (
                <Badge variant="outline" className="bg-white/10 border-white/30 text-white text-xs">
                  Friday {format(new Date(activeSnapshot.snapshotDate), 'MMM d')}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30">
              <TableHead className="font-bold border-r min-w-[100px]">HRCM Area</TableHead>
              <TableHead className="min-w-[60px] bg-blue-100 dark:bg-blue-900/40 font-semibold border border-soft-gray dark:border-soft-gray/30">Rating</TableHead>
              <TableHead className="w-[180px] bg-blue-100 dark:bg-blue-900/40 font-semibold border border-soft-gray dark:border-soft-gray/30">Results</TableHead>
              <TableHead className="w-[180px] bg-blue-100 dark:bg-blue-900/40 font-semibold border border-soft-gray dark:border-soft-gray/30">Feelings</TableHead>
              <TableHead className="w-[180px] bg-blue-100 dark:bg-blue-900/40 font-semibold border border-soft-gray dark:border-soft-gray/30">Beliefs/Reasons</TableHead>
              <TableHead className="w-[180px] bg-blue-100 dark:bg-blue-900/40 font-semibold border-r border border-soft-gray dark:border-soft-gray/30">Actions</TableHead>
              
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
              <TableRow key={belief.category} className="border-b h-[85px]" data-testid={`row-next-${belief.category.toLowerCase()}`}>
                {/* Category Column */}
                <TableCell className="font-semibold border-r bg-muted/20 align-top max-h-[85px] overflow-hidden">
                  <Badge variant="outline" className="font-semibold">
                    {belief.category}
                  </Badge>
                </TableCell>

                {/* Next Week - Rating (Auto-calculated: Current + 1, Locked) */}
                <TableCell className="p-2 bg-blue-50/30 dark:bg-blue-950/10 align-top max-h-[85px] overflow-hidden">
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
                <TableCell className="p-2 bg-blue-50/30 dark:bg-blue-950/10 align-top max-h-[85px] w-[180px] overflow-hidden">
                  {belief.resultChecklist && belief.resultChecklist.length > 0 ? (
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
                      onClick={() => handleShowFirstCheckpointDialog(belief.category, 'result')}
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
                <TableCell className="p-2 bg-blue-50/30 dark:bg-blue-950/10 align-top max-h-[85px] w-[180px] overflow-hidden">
                  {belief.feelingsChecklist && belief.feelingsChecklist.length > 0 ? (
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
                      onClick={() => handleShowFirstCheckpointDialog(belief.category, 'feelings')}
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
                <TableCell className="p-2 bg-blue-50/30 dark:bg-blue-950/10 align-top max-h-[85px] w-[180px] overflow-hidden">
                  {belief.beliefsChecklist && belief.beliefsChecklist.length > 0 ? (
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
                      onClick={() => handleShowFirstCheckpointDialog(belief.category, 'beliefs')}
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
                <TableCell className="p-2 bg-blue-50/30 dark:bg-blue-950/10 border-r align-top max-h-[85px] w-[180px] overflow-hidden">
                  {belief.actionsChecklist && belief.actionsChecklist.length > 0 ? (
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
                      onClick={() => handleShowFirstCheckpointDialog(belief.category, 'actions')}
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

                {/* Unified Assignment Column - Compact with Hover Popup (Show only for first row with rowspan) */}
                {belief.category === 'Health' && (
                  <TableCell rowSpan={4} className="p-2 bg-cyan-50/30 dark:bg-cyan-950/10 align-top max-h-[340px] overflow-hidden">
                    {(() => {
                      // CRITICAL: Persistent assignments should ALWAYS show across all dates
                      // - Assignments persist until completed, regardless of date
                      // - This includes: course tracking additions, recommendations, and user-added assignments
                      // - Admin view ALSO uses persistent assignments (fetched via admin API endpoint)
                      // - Both user and admin view use the same persistentAssignments data source
                      const assignmentsToDisplay = persistentAssignments;  // Always use persistent assignments for all views
                      
                      // Show ALL assignments (completed + pending) so users can see their progress
                      // Previously filtered to show only pending, but this caused confusion when clicking checkbox
                      // Users would click to complete, and assignment would disappear (looked like deletion)
                      const userLessons = assignmentsToDisplay.filter((l: any) => l.source === 'user' || !l.source);
                      const adminLessons = assignmentsToDisplay.filter((l: any) => l.source === 'admin');
                      const allLessons = [...userLessons, ...adminLessons];
                      const totalCount = allLessons.length;
                      
                      // Empty state
                      if (totalCount === 0) {
                        return (
                          <div className="space-y-2 py-4">
                            <p className="text-xs text-muted-foreground italic text-center">
                              No assignments yet. Check lessons in Course Tracker to add them here.
                            </p>
                          </div>
                        );
                      }
                      
                      // Compact view with hover popup (similar to Platinum Standards)
                      return (
                        <HoverCard openDelay={200}>
                          <HoverCardTrigger asChild>
                            <div className="cursor-pointer">
                              <div className="space-y-2">
                                {/* User Lessons - Show first 2 */}
                                {userLessons.length > 0 && (
                                  <div className="space-y-1">
                                    <div className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 mb-1">
                                      Course Lessons ({userLessons.length})
                                    </div>
                                    {userLessons.slice(0, 2).map((lesson) => (
                                      <div key={lesson.id} className="flex items-center gap-2 py-0.5">
                                        <Checkbox
                                          checked={lesson.completed}
                                          onCheckedChange={() => handleUnifiedAssignmentToggle(lesson.id)}
                                          disabled={isAdminView}
                                          className="h-3 w-3"
                                          data-testid={`checkbox-user-lesson-${lesson.id}`}
                                        />
                                        <span className="text-xs line-clamp-1 text-cyan-700 dark:text-cyan-400">
                                          {lesson.lessonName || lesson.courseName}
                                        </span>
                                      </div>
                                    ))}
                                    {userLessons.length > 2 && (
                                      <div className="text-xs text-muted-foreground italic pl-5">
                                        + {userLessons.length - 2} more items...
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {/* Admin Lessons - Show first 2 */}
                                {adminLessons.length > 0 && (
                                  <div className="space-y-1">
                                    <div className="text-xs font-semibold text-pink-600 dark:text-pink-400 mb-1">
                                      Recommended ({adminLessons.length})
                                    </div>
                                    {adminLessons.slice(0, 2).map((lesson) => (
                                      <div key={lesson.id} className="flex items-center gap-2 py-0.5">
                                        <Checkbox
                                          checked={lesson.completed}
                                          onCheckedChange={() => handleUnifiedAssignmentToggle(lesson.id)}
                                          disabled={isAdminView}
                                          className="h-3 w-3"
                                          data-testid={`checkbox-admin-lesson-${lesson.id}`}
                                        />
                                        <span className="text-xs line-clamp-1 text-pink-700 dark:text-pink-400">
                                          {lesson.lessonName || lesson.courseName}
                                        </span>
                                      </div>
                                    ))}
                                    {adminLessons.length > 2 && (
                                      <div className="text-xs text-muted-foreground italic pl-5">
                                        + {adminLessons.length - 2} more items...
                                      </div>
                                    )}
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
                            <div className="space-y-3">
                              <h4 className="font-semibold text-sm mb-3">
                                Assignment - All Items ({totalCount})
                              </h4>
                              
                              {/* User Lessons - Full List in Popup */}
                              {userLessons.length > 0 && (
                                <div className="space-y-2">
                                  <div className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 mb-2">
                                    Course Lessons ({userLessons.length})
                                  </div>
                                  {userLessons.map((lesson) => (
                                    <div key={lesson.id} className="flex items-center gap-2 py-1 group/assignment">
                                      <Checkbox
                                        checked={lesson.completed}
                                        onCheckedChange={() => handleUnifiedAssignmentToggle(lesson.id)}
                                        disabled={isAdminView}
                                        className="h-4 w-4 mt-0.5"
                                        data-testid={`checkbox-popup-user-lesson-${lesson.id}`}
                                      />
                                      <a
                                        href={lesson.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs hover:underline flex-1 text-cyan-700 dark:text-cyan-400 leading-relaxed"
                                        data-testid={`link-popup-user-lesson-${lesson.id}`}
                                      >
                                        {lesson.lessonName || lesson.courseName}
                                      </a>
                                      {!isAdminView && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleRemoveUnifiedAssignment(lesson.id)}
                                          className="h-4 w-4 p-0 opacity-0 group-hover/assignment:opacity-100 transition-opacity shrink-0"
                                          data-testid={`button-popup-delete-user-lesson-${lesson.id}`}
                                        >
                                          <Trash2 className="w-3 h-3 text-destructive" />
                                        </Button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {/* Admin Lessons - Full List in Popup */}
                              {adminLessons.length > 0 && (
                                <div className="space-y-2">
                                  <div className="text-xs font-semibold text-pink-600 dark:text-pink-400 mb-2">
                                    Recommended Lessons ({adminLessons.length})
                                  </div>
                                  {adminLessons.map((lesson) => (
                                    <div key={lesson.id} className="flex items-center gap-2 py-1 group/assignment">
                                      <Checkbox
                                        checked={lesson.completed}
                                        onCheckedChange={() => handleUnifiedAssignmentToggle(lesson.id)}
                                        disabled={isAdminView}
                                        className="h-4 w-4 mt-0.5"
                                        data-testid={`checkbox-popup-admin-lesson-${lesson.id}`}
                                      />
                                      <a
                                        href={lesson.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs hover:underline flex-1 text-pink-700 dark:text-pink-400 leading-relaxed"
                                        data-testid={`link-popup-admin-lesson-${lesson.id}`}
                                      >
                                        {lesson.lessonName || lesson.courseName}
                                      </a>
                                      {!isAdminView && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleRemoveUnifiedAssignment(lesson.id)}
                                          className="h-4 w-4 p-0 opacity-0 group-hover/assignment:opacity-100 transition-opacity shrink-0"
                                          data-testid={`button-popup-delete-admin-lesson-${lesson.id}`}
                                        >
                                          <Trash2 className="w-3 h-3 text-destructive" />
                                        </Button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                      );
                    })()}
                  </TableCell>
                )}

                {/* Platinum Standards - Compact with Hover Popup */}
                <TableCell className="p-2 bg-soft-lavender/20 dark:bg-soft-lavender/10 align-top max-h-[85px] overflow-hidden">
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
                <TableCell className="p-2 text-center bg-emerald-50/30 dark:bg-emerald-950/10 align-top max-h-[85px] overflow-hidden">
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

      {/* Edit Current Week Field Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className={`text-${editDialogData?.color || 'primary'}`}>
                Edit {editDialogData?.label}
              </span>
              <Badge variant="outline" className="ml-auto">
                {editDialogData?.category}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className={`p-4 rounded-lg bg-gradient-to-br from-${editDialogData?.color}/10 via-white to-${editDialogData?.color}/5 dark:from-${editDialogData?.color}/20 dark:via-gray-900 dark:to-${editDialogData?.color}/10 border-2 border-${editDialogData?.color}/30`}>
              <Textarea
                value={editDialogData?.value || ''}
                onChange={(e) => setEditDialogData(prev => prev ? { ...prev, value: e.target.value } : null)}
                onFocus={(e) => {
                  const length = e.target.value.length;
                  e.target.setSelectionRange(length, length);
                }}
                className="min-h-[200px] text-sm resize-none border-0 bg-transparent focus-visible:ring-0"
                placeholder={`Enter your ${editDialogData?.label.toLowerCase()}...`}
                autoFocus
                data-testid="textarea-edit-dialog"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDialog(false);
                setEditDialogData(null);
              }}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button
              onClick={saveEditDialog}
              className="bg-gradient-to-r from-primary to-accent text-white"
              data-testid="button-save-edit"
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* First Checkpoint Dialog */}
      <Dialog open={showFirstCheckpointDialog} onOpenChange={handleFirstCheckpointDialogClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              Add New Checkpoint
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg border-2 bg-gradient-to-br from-primary/10 to-accent/10">
              <div className="flex items-start gap-2 mb-3">
                <div className="w-1 h-full bg-gradient-to-b from-primary to-accent rounded-full"></div>
                <p className="text-sm font-medium">
                  {firstCheckpointData?.category} - {
                    firstCheckpointData?.checklistType === 'result' ? 'Results' : 
                    firstCheckpointData?.checklistType === 'feelings' ? 'Feelings' : 
                    firstCheckpointData?.checklistType === 'beliefs' ? 'Beliefs/Reasons' : 
                    firstCheckpointData?.checklistType === 'actions' ? 'Actions' :
                    firstCheckpointData?.checklistType === 'problems' ? 'Problems' :
                    firstCheckpointData?.checklistType === 'feelingsCurrent' ? 'Feelings' :
                    firstCheckpointData?.checklistType === 'beliefsCurrent' ? 'Beliefs' :
                    firstCheckpointData?.checklistType === 'actionsCurrent' ? 'Actions' : 'Checkpoint'
                  }
                </p>
              </div>
              <Textarea
                value={firstCheckpointData?.text || ''}
                onChange={(e) => setFirstCheckpointData(prev => prev ? { ...prev, text: e.target.value } : null)}
                onFocus={(e) => {
                  const length = e.target.value.length;
                  e.target.setSelectionRange(length, length);
                }}
                placeholder="Enter your checkpoint..."
                className="min-h-[100px] text-sm bg-white dark:bg-gray-950 border-muted"
                autoFocus
                data-testid="textarea-first-checkpoint"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowFirstCheckpointDialog(false);
                  setFirstCheckpointData(null);
                }}
                data-testid="button-cancel-first-checkpoint"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveFirstCheckpoint}
                disabled={!firstCheckpointData?.text.trim()}
                className="bg-gradient-to-r from-primary to-accent text-white hover:opacity-90"
                data-testid="button-save-first-checkpoint"
              >
                Add Checkpoint
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
