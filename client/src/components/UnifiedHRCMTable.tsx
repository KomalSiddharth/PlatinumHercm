import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkles, Check, X, TrendingUp, Save, Loader2, ArrowUp, ArrowDown, Plus, MoreHorizontal, Calendar as CalendarIcon, Trash2, ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon, RefreshCw } from 'lucide-react';
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

// Calculate progress based on average rating (Average Rating Progress formula)
const calculateStandardsProgress = (
  category: string,
  platinumStandards: any[],
  ratings: any[]
): number => {
  // Filter standards for this category
  const categoryStandards = platinumStandards.filter(
    (s) => s.category.toLowerCase() === category.toLowerCase()
  );
  
  if (categoryStandards.length === 0) return 0;
  
  // Get all ratings for standards in this category (0 if not rated)
  const allRatings = categoryStandards.map((standard) => {
    const rating = ratings.find((r) => r.standardId === standard.id);
    return rating ? rating.rating : 0;
  });
  
  // Calculate average rating
  const avgRating = allRatings.reduce((sum, rating) => sum + rating, 0) / allRatings.length;
  
  // Convert to percentage (out of 7)
  return Math.round((avgRating / 7) * 100);
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
  
  // 🔥 FIX: Fetch current user to determine if they're admin (for correct endpoint selection)
  const { data: currentUser } = useQuery<{ isAdmin: boolean }>({
    queryKey: ['/api/auth/user'],  // ✅ Correct endpoint path
    staleTime: 0, // Always fetch fresh - override default Infinity
    retry: 1, // Retry once on failure
  });
  const [editingField, setEditingField] = useState<{ category: string; field: string; section?: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editDialogData, setEditDialogData] = useState<{ category: string; field: string; value: string; label: string; color: string } | null>(null);
  const [manualNextWeekMode, setManualNextWeekMode] = useState(false); // 🔥 Flag to disable auto-sync when user manually updates Next Week Target
  const [calendarPopoverOpen, setCalendarPopoverOpen] = useState(false); // Calendar popover state for Current Week
  const [nextWeekCalendarPopoverOpen, setNextWeekCalendarPopoverOpen] = useState(false); // Calendar popover state for Next Week
  
  // Text Block Dialog States (Emotional Tracker Style)
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogValue, setDialogValue] = useState('');
  
  // Read-Only Dialog States (for viewing history)
  const [readOnlyDialogOpen, setReadOnlyDialogOpen] = useState(false);
  const [readOnlyDialogContent, setReadOnlyDialogContent] = useState('');
  const [readOnlyDialogTitle, setReadOnlyDialogTitle] = useState('');
  
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
  const [hasDataForDate, setHasDataForDate] = useState(false); // 🔥 Track if data exists for current date
  
  // CRITICAL FIX: Compute dateString from selectedDate (single source of truth)
  const dateString = format(selectedDate, 'yyyy-MM-dd');
  
  // Check if viewing a PAST date (previous dates are read-only, current & future are editable)
  const isPastDate = dateString < today;
  const lastFocusedButton = useRef<HTMLButtonElement | null>(null);
  const hasAutoProgressed = useRef<Set<number>>(new Set()); // Track which weeks have been auto-progressed
  const { toast} = useToast();
  
  // Custom Assignment Dialog State
  const [showCustomAssignmentDialog, setShowCustomAssignmentDialog] = useState(false);
  const [customAssignmentText, setCustomAssignmentText] = useState('');
  const [editCustomAssignmentId, setEditCustomAssignmentId] = useState<string | null>(null);
  
  // Platinum Standards Dialog State (click-based, no hover)
  const [platinumStandardsDialog, setPlatinumStandardsDialog] = useState<{
    open: boolean;
    category: string;
    items: Array<{ id: string; text: string; checked: boolean }>;
  }>({
    open: false,
    category: '',
    items: []
  });

  // Checkpoint Popup Dialog State (for viewing all checkboxes in Next Week Target boxes)
  const [checkpointPopup, setCheckpointPopup] = useState<{
    open: boolean;
    category: string;
    type: 'result' | 'feelings' | 'beliefs' | 'actions';
    items: ChecklistItem[];
  }>({
    open: false,
    category: '',
    type: 'result',
    items: []
  });

  // Current Week Checkpoint Dialog State
  const [showCurrentWeekCheckpointDialog, setShowCurrentWeekCheckpointDialog] = useState(false);
  const [currentWeekCheckpointData, setCurrentWeekCheckpointData] = useState<{ category: string; checklistType: 'problems' | 'currentFeelings' | 'currentBeliefs' | 'currentActions'; text: string } | null>(null);

  // Current Week Checkpoint Popup Dialog State (for viewing all checkboxes in Current Week boxes)
  const [currentWeekCheckpointPopup, setCurrentWeekCheckpointPopup] = useState<{
    open: boolean;
    category: string;
    type: 'problems' | 'currentFeelings' | 'currentBeliefs' | 'currentActions';
    items: ChecklistItem[];
  }>({
    open: false,
    category: '',
    type: 'problems',
    items: []
  });

  // Platinum Standard Ratings State (for Health category)
  const [standardRatings, setStandardRatings] = useState<Record<string, number>>({});
  
  // Fetch platinum standards from API
  const { data: platinumStandards = [] } = useQuery({
    queryKey: ['/api/platinum-standards'],
    enabled: true,
  });

  // 🔥 FIX: Fetch platinum standard ratings for current date (for BOTH dialog AND progress)
  // Use correct endpoint based on whether viewing another user's dashboard
  const ratingsEndpoint = viewAsUserId
    ? (isAdminView 
        ? `/api/admin/user/${viewAsUserId}/platinum-standard-ratings/${dateString}`
        : `/api/team/user/${viewAsUserId}/platinum-standard-ratings/${dateString}`)
    : `/api/platinum-standard-ratings/${dateString}`;
  
  const { data: savedRatings = [], refetch: refetchRatings } = useQuery({
    queryKey: [ratingsEndpoint],
    enabled: !!dateString,
    refetchInterval: viewAsUserId ? false : 5000, // Only poll for own dashboard, not when viewing others
  });

  // Update local ratings state when saved ratings are loaded
  // CRITICAL FIX: Always sync state with savedRatings (even if empty!)
  useEffect(() => {
    const ratingsMap: Record<string, number> = {};
    savedRatings.forEach((r: any) => {
      ratingsMap[r.standardId] = r.rating;
    });
    setStandardRatings(ratingsMap); // This clears state if savedRatings is empty
  }, [savedRatings]);

  // Mutation to save platinum standard rating with INSTANT optimistic updates
  const saveRatingMutation = useMutation({
    mutationFn: async ({ standardId, rating }: { standardId: string; rating: number }) => {
      console.log(`[RATING SAVE] Saving rating for standard ${standardId} on ${dateString}: ${rating}`);
      // CRITICAL FIX: apiRequest takes 3 params (url, method, data), not options object!
      return await apiRequest('/api/platinum-standard-ratings', 'POST', {
        standardId,
        dateString: dateString,
        rating,
      });
    },
    onMutate: async ({ standardId, rating }) => {
      console.log(`[OPTIMISTIC UPDATE] 🚀 Instantly updating rating for ${standardId} to ${rating}`);
      
      // Cancel outgoing refetches (to prevent overwriting optimistic update)
      await queryClient.cancelQueries({ 
        queryKey: [ratingsEndpoint]
      });
      
      // Snapshot previous values for rollback
      const previousRatings = queryClient.getQueryData([ratingsEndpoint]);
      
      // Optimistically update cache
      queryClient.setQueryData([ratingsEndpoint], (old: any) => {
        if (!old) return old;
        // Update the rating in the cached data
        return old.map((r: any) => 
          r.standardId === standardId 
            ? { ...r, rating } 
            : r
        );
      });
      
      console.log(`[OPTIMISTIC UPDATE] ✅ Cache updated instantly!`);
      
      // Return context for rollback
      return { previousRatings };
    },
    onSuccess: () => {
      console.log(`[RATING SAVE] Success! Invalidating queries for ${dateString}`);
      // Invalidate the specific ratings query for fresh data
      queryClient.invalidateQueries({ 
        queryKey: [ratingsEndpoint]
      });
      
      // Invalidate weekly progress for instant visibility
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key === '/api/weekly-progress';
        }
      });
      
      // Also invalidate unlock status to update streaks
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.includes('/api/hrcm-unlock-status');
        }
      });
    },
    onError: (error, { standardId }, context: any) => {
      console.error(`[OPTIMISTIC UPDATE] ❌ Error saving rating for ${standardId}:`, error);
      
      // Rollback to previous state on error
      if (context?.previousRatings) {
        console.log(`[OPTIMISTIC UPDATE] 🔄 Rolling back to previous state`);
        queryClient.setQueryData([ratingsEndpoint], context.previousRatings);
      }
      
      toast({
        title: "Failed to Save Rating",
        description: "Your changes have been reverted. Please try again.",
        variant: "destructive"
      });
    },
  });

  // Handler to update platinum standard rating (max 7)
  const handlePlatinumStandardRatingChange = (standardId: string, rating: number) => {
    // Ensure rating is between 0 and 7
    const validRating = Math.max(0, Math.min(7, rating));
    setStandardRatings(prev => ({ ...prev, [standardId]: validRating }));
    saveRatingMutation.mutate({ standardId, rating: validRating });
  };
  
  // Assignment Dialog State (click-based, no scroll in column)
  const [assignmentDialog, setAssignmentDialog] = useState(false);

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
    // 🔥 FIX: Use team endpoints for regular users viewing other users
    const isActualAdmin = currentUser?.isAdmin === true;
    const endpoint = viewAsUserId
      ? (isActualAdmin 
          ? `/api/admin/user/${viewAsUserId}/hercm/by-date/${dateStr}`
          : `/api/team/user/${viewAsUserId}/hercm/by-date/${dateStr}`)
      : `/api/hercm/by-date/${dateStr}`;
    
    try {
      await queryClient.refetchQueries({
        queryKey: viewAsUserId
          ? (isActualAdmin
              ? [`/api/admin/user/${viewAsUserId}/hercm/by-date`, dateStr]
              : [`/api/team/user/${viewAsUserId}/hercm/by-date`, dateStr])
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
  // 🔥 FIX: Use team endpoints for regular users viewing other users
  const isActualAdminForQuery = currentUser?.isAdmin === true;
  const dateDataQueryKey = viewAsUserId
    ? (isActualAdminForQuery
        ? [`/api/admin/user/${viewAsUserId}/hercm/by-date`, currentDateStr]
        : [`/api/team/user/${viewAsUserId}/hercm/by-date`, currentDateStr])
    : ['/api/hercm/by-date', currentDateStr];
  
  // 🔥 FIX: Wait for currentUser to load before enabling query (needed to determine correct endpoint)
  const shouldEnableQuery = viewAsUserId 
    ? (!!viewAsUserId && currentUser !== undefined) 
    : true;
  
  console.log('🔍 [QUERY ENABLED CHECK] viewAsUserId:', viewAsUserId, 'currentUser:', currentUser, 'isAdminView:', isAdminView, 'shouldEnableQuery:', shouldEnableQuery);
  
  const { data: dateData, isLoading, isFetching } = useQuery<{ beliefs?: HRCMBelief[]; createdAt?: string; weekNumber?: number }>({
    queryKey: dateDataQueryKey,
    queryFn: async () => {
      const endpoint = viewAsUserId
        ? (isActualAdminForQuery
            ? `/api/admin/user/${viewAsUserId}/hercm/by-date/${currentDateStr}`
            : `/api/team/user/${viewAsUserId}/hercm/by-date/${currentDateStr}`)
        : `/api/hercm/by-date/${currentDateStr}`;
      console.log(`[FRONTEND] 🚀 Fetching HRCM data for date: ${currentDateStr}, endpoint: ${endpoint}, isActualAdmin: ${isActualAdminForQuery}, viewAsUserId: ${viewAsUserId}`);
      const response = await fetch(endpoint, {
        credentials: 'include', // Required for authentication
      });
      if (!response.ok) {
        console.error(`[FRONTEND] ❌ Failed to fetch HRCM data: ${response.status} ${response.statusText}`);
        throw new Error('Failed to fetch HRCM data');
      }
      const data = await response.json();
      console.log(`[FRONTEND] ✅ Received HRCM data for ${currentDateStr}:`, data ? 'Data found' : 'No data', data);
      return data;
    },
    enabled: shouldEnableQuery, // 🔥 Use computed shouldEnableQuery
    staleTime: 0,  // Always fetch fresh data
    gcTime: 5000,  // Keep cache for 5 seconds to prevent blank flicker during navigation
    refetchOnMount: true,  // Refetch when component mounts
    refetchOnWindowFocus: false,  // Don't refetch on window focus
  });
  
  console.log('🔍 [QUERY RESULT] dateData:', dateData, 'isLoading:', isLoading, 'isFetching:', isFetching);

  // Use dateData as weekData for consistency with existing code
  const weekData = dateData;

  // Fetch previous week data for comparison (only if week > 1)
  const { data: previousWeekData } = useQuery<{ beliefs?: HRCMBelief[] }>({
    queryKey: ['/api/hercm/week', weekNumber - 1],
    enabled: weekNumber > 1,
  });

  // Fetch all weeks data (needed for auto-progression and comparison)
  // 🔥 FIX: Use team endpoints for regular users viewing other users
  const allWeeksQueryKey = viewAsUserId
    ? (isActualAdminForQuery
        ? [`/api/admin/user/${viewAsUserId}/hercm/weeks`]
        : [`/api/team/user/${viewAsUserId}/hercm/weeks`])
    : ['/api/hercm/weeks'];
  
  const { data: allWeeksData } = useQuery({
    queryKey: allWeeksQueryKey,
    queryFn: async () => {
      const endpoint = viewAsUserId
        ? (isActualAdminForQuery
            ? `/api/admin/user/${viewAsUserId}/hercm/weeks`
            : `/api/team/user/${viewAsUserId}/hercm/weeks`)
        : `/api/hercm/weeks`;
      console.log(`[FRONTEND] Fetching all weeks data, endpoint: ${endpoint}, isActualAdmin: ${isActualAdminForQuery}, viewAsUserId: ${viewAsUserId}`);
      const response = await fetch(endpoint, {
        credentials: 'include', // Required for authentication
      });
      if (!response.ok) {
        console.error(`[FRONTEND] Failed to fetch all weeks data: ${response.status} ${response.statusText}`);
        throw new Error('Failed to fetch all weeks data');
      }
      const data = await response.json();
      console.log(`[FRONTEND] Received all weeks data:`, data);
      return data;
    },
    enabled: shouldEnableQuery, // 🔥 Use same enable logic as dateData query
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

  // Fetch HRCM unlock status for all areas (7-day perfect streak system)
  const { data: healthUnlockStatus } = useQuery<{
    consecutivePerfectDays: number;
    isUnlocked: boolean;
    lastPerfectDate: string | null;
  }>({
    queryKey: ['/api/hrcm-unlock-status/health'],
    refetchInterval: 5000, // Poll every 5 seconds to catch updates
  });

  const { data: relationshipUnlockStatus } = useQuery<{
    consecutivePerfectDays: number;
    isUnlocked: boolean;
    lastPerfectDate: string | null;
  }>({
    queryKey: ['/api/hrcm-unlock-status/relationship'],
    refetchInterval: 5000,
  });

  const { data: careerUnlockStatus } = useQuery<{
    consecutivePerfectDays: number;
    isUnlocked: boolean;
    lastPerfectDate: string | null;
  }>({
    queryKey: ['/api/hrcm-unlock-status/career'],
    refetchInterval: 5000,
  });

  const { data: moneyUnlockStatus } = useQuery<{
    consecutivePerfectDays: number;
    isUnlocked: boolean;
    lastPerfectDate: string | null;
  }>({
    queryKey: ['/api/hrcm-unlock-status/money'],
    refetchInterval: 5000,
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

  // REMOVED DUPLICATE QUERY: Now using savedRatings for BOTH dialog AND progress
  // This ensures perfect synchronization between dialog display and progress calculation

  // Fetch persistent assignments (user-level, date-independent)
  // In admin view, fetch for the specific user being viewed
  // 🔥 FIX: Use team endpoints for regular users viewing other users
  const persistentAssignmentsQueryKey = viewAsUserId
    ? (isActualAdminForQuery
        ? [`/api/admin/user/${viewAsUserId}/persistent-assignments`]
        : [`/api/team/user/${viewAsUserId}/persistent-assignments`])
    : ['/api/persistent-assignments'];
  
  const { data: persistentAssignments = [], refetch: refetchAssignments } = useQuery<any[]>({
    queryKey: persistentAssignmentsQueryKey,
    queryFn: async () => {
      const endpoint = viewAsUserId
        ? (isActualAdminForQuery
            ? `/api/admin/user/${viewAsUserId}/persistent-assignments`
            : `/api/team/user/${viewAsUserId}/persistent-assignments`)
        : `/api/persistent-assignments`;
      const response = await fetch(endpoint, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch persistent assignments');
      return response.json();
    },
    enabled: viewAsUserId ? (!!viewAsUserId && currentUser !== undefined) : true, // Wait for user data when viewing another user
    refetchInterval: 5000, // Poll every 5 seconds for instant updates
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

  // 🔥 REMOVED OLD FRIDAY SNAPSHOT EFFECT - Was overwriting date-specific platinum standards!
  // The weekData effect below now handles ALL dates (both current AND historical) correctly
  // This fixes the bug where platinum standards weren't showing checked state for previous dates

  useEffect(() => {
    console.log('🔍 [WEEKDATA EFFECT] ========= START =========');
    console.log('[WEEKDATA EFFECT] weekData:', weekData);
    console.log('[WEEKDATA EFFECT] weekData?.beliefs:', weekData?.beliefs);
    console.log('[WEEKDATA EFFECT] weekData?.beliefs?.length:', weekData?.beliefs?.length);
    console.log('[WEEKDATA EFFECT] viewingHistory:', viewingHistory);
    console.log('[WEEKDATA EFFECT] currentDateStr:', currentDateStr);
    console.log('[WEEKDATA EFFECT] isFetching:', isFetching);
    console.log('[WEEKDATA EFFECT] viewAsUserId:', viewAsUserId);
    console.log('[WEEKDATA EFFECT] isAdminView:', isAdminView);
    
    // 🔥 CRITICAL FIX: Don't process data while fetching to prevent blank template flicker
    if (isFetching) {
      console.log('[WEEKDATA EFFECT] ⏸️ Skipping - query is fetching, keeping current state');
      return;
    }
    
    // Process weekData for BOTH today and history dates
    // The /api/hercm/by-date endpoint returns data for any date (not just today)
    if (weekData?.beliefs) {
      console.log('[FRONTEND DEBUG] ✅ Processing beliefs from weekData, count:', weekData.beliefs.length);
      
      // 🔥 Check if data exists for this date (has non-empty fields)
      const hasData = weekData.beliefs.some((b: any) => 
        b.problems || b.currentFeelings || b.currentBelief || b.currentActions ||
        b.result || b.nextFeelings || b.nextWeekTarget || b.nextActions ||
        (b.checklist && b.checklist.length > 0)
      );
      setHasDataForDate(hasData);
      console.log('[WEEKDATA EFFECT] hasDataForDate:', hasData);
      
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
      console.log('[FRONTEND DEBUG] 🔥 SETTING BELIEFS STATE with', updatedBeliefs.length, 'items');
      setBeliefs(updatedBeliefs);
      console.log('[FRONTEND DEBUG] ✅ Beliefs state updated successfully');
      
      // 🔥 RESTORE manualNextWeekMode from database to persist across browser refreshes
      if (weekData.manualNextWeekMode !== undefined && weekData.manualNextWeekMode !== null) {
        console.log('[LOAD] 🔄 Restoring manualNextWeekMode from database:', weekData.manualNextWeekMode);
        setManualNextWeekMode(weekData.manualNextWeekMode);
      } else {
        console.log('[LOAD] ℹ️ No manualNextWeekMode in database, using default: false');
        setManualNextWeekMode(false);
      }
      
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
      // Explicitly null from server (no data for this date)
      console.log('[WEEKDATA EFFECT] ⚠️ weekData is null - checking for daily auto-copy');
      setHasDataForDate(false); // 🔥 No data exists for this date
      
      // Helper function to show blank template
      const showBlankTemplate = () => {
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
      };
      
      // 🔥 DAILY AUTO-COPY FEATURE (RE-ENABLED Nov 7, 2025)
      // Only auto-copy when viewing current date (not history, not admin)
      if (!viewingHistory && !isAdminView) {
        console.log('[AUTO-COPY] 🚀 Fetching previous day data to auto-copy...');
        
        // Fetch previous day's data (backend will search last 7 days)
        fetch(`/api/hercm/previous-day/${currentDateStr}`)
          .then(res => res.json())
          .then(previousDayData => {
            if (previousDayData && previousDayData.beliefs) {
              // Extract source date from previousDayData if available
              const sourceDate = previousDayData.dateString || 'previous day';
              console.log(`[AUTO-COPY] ✅ Found data from ${sourceDate}, copying to current date...`);
              
              // 🔥 SMART AUTO-SYNC DETECTION
              // Check if previous day had Current Week == Next Week Target
              const hadAutoSync = previousDayData.beliefs.every((belief: HRCMBelief) => {
                const cwMatch = belief.problems === belief.result &&
                               belief.currentFeelings === belief.nextFeelings &&
                               belief.currentBelief === belief.nextWeekTarget &&
                               belief.currentActions === belief.nextActions;
                
                // Also check checklists
                const checklistMatch = JSON.stringify(belief.problemsChecklist || []) === JSON.stringify(belief.resultChecklist || []) &&
                                      JSON.stringify(belief.feelingsCurrentChecklist || []) === JSON.stringify(belief.feelingsChecklist || []) &&
                                      JSON.stringify(belief.beliefsCurrentChecklist || []) === JSON.stringify(belief.beliefsChecklist || []) &&
                                      JSON.stringify(belief.actionsCurrentChecklist || []) === JSON.stringify(belief.actionsChecklist || []);
                
                return cwMatch && checklistMatch;
              });
              
              if (hadAutoSync) {
                console.log('[AUTO-COPY] 🔄 Previous data had auto-sync enabled → Enabling auto-sync for today');
                setManualNextWeekMode(false); // Enable auto-sync
              } else {
                console.log('[AUTO-COPY] 📝 Previous data had manual planning → Preserving separate Next Week Target');
                setManualNextWeekMode(true); // Disable auto-sync, preserve manual planning
              }
              
              // Copy previous day data to current date
              const copiedBeliefs = previousDayData.beliefs.map((belief: HRCMBelief) => ({
                ...belief,
                // Preserve Platinum Standards from current date
                checklist: getPlatinumStandardsForCategory(belief.category),
              }));
              
              // Update state with copied data (includes BOTH Current Week AND Next Week Target)
              setBeliefs(copiedBeliefs);
              setUnifiedAssignment(previousDayData.unifiedAssignment || []);
              
              // Auto-save copied data to current date
              const savePayload = {
                weekNumber,
                dateString: currentDateStr, // 🔥 CRITICAL: Save to current date!
                beliefs: copiedBeliefs,
                unifiedAssignment: previousDayData.unifiedAssignment || []
              };
              
              console.log('[AUTO-COPY] 💾 Auto-saving copied data to current date:', currentDateStr);
              saveWeekMutation.mutate(savePayload, {
                onSuccess: () => {
                  console.log('[AUTO-COPY] ✅ Data successfully copied and saved!');
                  toast({
                    title: "📋 Data Auto-Copied",
                    description: hadAutoSync 
                      ? `Last available data from ${sourceDate} copied with auto-sync enabled.`
                      : `Last available data from ${sourceDate} copied with manual planning preserved.`,
                  });
                },
                onError: (error) => {
                  console.error('[AUTO-COPY] ❌ Failed to save copied data:', error);
                }
              });
            } else {
              console.log('[AUTO-COPY] ⚠️ No data found in last 7 days - showing blank template');
              showBlankTemplate();
            }
          })
          .catch(error => {
            console.error('[AUTO-COPY] ❌ Error fetching previous day:', error);
            showBlankTemplate();
          });
      } else {
        // Viewing history/admin - show blank template
        console.log('[WEEKDATA EFFECT] ⚠️ Viewing history/admin - showing blank template');
        showBlankTemplate();
      }
    } else {
      // weekData is undefined (still loading) - don't change anything
      console.log('[WEEKDATA EFFECT] ⏳ weekData is undefined - still loading, keeping current state');
    }
  }, [weekData, platinumStandardsData, isFetching]);
  // FIXED: Added platinumStandardsData to deps to auto-update when admin adds new standards
  // FIXED: Added isFetching to prevent blank template flicker during date navigation

  // 🔥 AUTO-SYNC: Real-time sync from Current Week to Next Week Target
  // Track if data is being initially loaded to prevent premature auto-sync
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  
  useEffect(() => {
    // Reset on date change to allow proper loading of new date's data
    setInitialDataLoaded(false);
  }, [currentDateStr]);
  
  useEffect(() => {
    // Mark initial data as loaded after weekData is processed
    if (weekData !== undefined) {
      setInitialDataLoaded(true);
    }
  }, [weekData]);
  
  useEffect(() => {
    // Skip auto-sync during initial data load to preserve database state
    if (!initialDataLoaded) {
      console.log('[AUTO-SYNC] ⏸️ Skipping auto-sync (initial data loading...)');
      return;
    }
    
    // Only skip auto-sync for admin view or when manual mode is ON
    // 🔥 UPDATED: Auto-sync now works on ALL dates (including history)
    if (isAdminView || manualNextWeekMode) {
      console.log('[AUTO-SYNC] ⏸️ Skipping auto-sync (admin view or manual mode enabled)');
      return;
    }
    
    console.log('[AUTO-SYNC] 🔄 Syncing Current Week → Next Week Target...');
    
    // Create updated beliefs with auto-synced Next Week Target data
    const syncedBeliefs = beliefs.map(belief => ({
      ...belief,
      // Sync Current Week text fields → Next Week Target text fields
      result: belief.problems,
      nextFeelings: belief.currentFeelings,
      nextWeekTarget: belief.currentBelief,
      nextActions: belief.currentActions,
      // Sync Current Week checklists → Next Week Target checklists
      resultChecklist: belief.problemsChecklist || [],
      feelingsChecklist: belief.feelingsCurrentChecklist || [],
      beliefsChecklist: belief.beliefsCurrentChecklist || [],
      actionsChecklist: belief.actionsCurrentChecklist || [],
    }));
    
    // Check if anything actually changed to avoid unnecessary updates
    const hasChanges = beliefs.some((belief, index) => {
      const synced = syncedBeliefs[index];
      return (
        belief.result !== synced.result ||
        belief.nextFeelings !== synced.nextFeelings ||
        belief.nextWeekTarget !== synced.nextWeekTarget ||
        belief.nextActions !== synced.nextActions
      );
    });
    
    if (hasChanges) {
      console.log('[AUTO-SYNC] ✅ Changes detected - updating Next Week Target fields');
      setBeliefs(syncedBeliefs);
      
      // Auto-save the synced data with manualNextWeekMode flag
      saveWeekMutation.mutate({
        beliefs: syncedBeliefs,
        weekNumber: weekNumber,
        dateString: currentDateStr,
        manualNextWeekMode: false, // 🔥 Auto-sync means NOT in manual mode
      });
    } else {
      console.log('[AUTO-SYNC] ⏭️ No changes detected - skipping update');
    }
  }, [
    beliefs.map(b => b.problems).join('|'),
    beliefs.map(b => b.currentFeelings).join('|'),
    beliefs.map(b => b.currentBelief).join('|'),
    beliefs.map(b => b.currentActions).join('|'),
    beliefs.map(b => JSON.stringify(b.problemsChecklist || [])).join('|'),
    beliefs.map(b => JSON.stringify(b.feelingsCurrentChecklist || [])).join('|'),
    beliefs.map(b => JSON.stringify(b.beliefsCurrentChecklist || [])).join('|'),
    beliefs.map(b => JSON.stringify(b.actionsCurrentChecklist || [])).join('|'),
    isAdminView,
    manualNextWeekMode,
    initialDataLoaded,
  ]);
  // Dependencies: Only trigger when Current Week fields change
  // 🔥 UPDATED: Removed viewingHistory from dependencies - auto-sync works on all dates
  // 🔥 SMART DETECTION FIX: Added initialDataLoaded to prevent premature auto-sync during data load

  // Calculate weekly average progress using React Query for instant visibility
  // Progress = Average of all 4 HRCM areas (Health, Relationship, Career, Money) for each day
  // Weekly Progress = Average of all 7 days' progress
  const weekDates = getWeekDateRange(selectedDate);
  
  const { data: weeklyProgressData } = useQuery({
    queryKey: ['/api/weekly-progress', selectedDate.toISOString(), viewAsUserId, platinumStandardsData?.length],
    queryFn: async () => {
      try {
        console.log('[WEEKLY PROGRESS] Calculating for week:', weekDates);
        
        // Fetch platinum standards and ratings for all 7 days in parallel
        const promises = weekDates.map(async (dateStr) => {
          try {
            // 🔥 FIX: Use correct endpoint based on viewAsUserId
            const ratingsUrl = viewAsUserId
              ? (isAdminView 
                  ? `/api/admin/user/${viewAsUserId}/platinum-standard-ratings/${dateStr}`
                  : `/api/team/user/${viewAsUserId}/platinum-standard-ratings/${dateStr}`)
              : `/api/platinum-standard-ratings/${dateStr}`;
            
            // Fetch platinum standard ratings for this date
            const ratingsResponse = await fetch(ratingsUrl, {
              credentials: 'include',
            });
            
            if (!ratingsResponse.ok) {
              console.log(`[WEEKLY PROGRESS] No ratings for ${dateStr}`);
              return 0; // Return 0 for days with no ratings
            }
            
            const ratings = await ratingsResponse.json();
            
            if (!ratings || ratings.length === 0) {
              console.log(`[WEEKLY PROGRESS] ${dateStr}: No ratings data`);
              return 0;
            }
            
            // Calculate progress for all 4 HRCM areas
            const hrcmAreas = ['health', 'relationship', 'career', 'money'];
            const areaProgresses = hrcmAreas.map(area => {
              return calculateStandardsProgress(area, platinumStandardsData, ratings);
            });
            
            // Average progress across all 4 areas for this day
            const dayProgress = areaProgresses.reduce((sum, prog) => sum + prog, 0) / 4;
            
            console.log(`[WEEKLY PROGRESS] ${dateStr}: H=${areaProgresses[0]}% R=${areaProgresses[1]}% C=${areaProgresses[2]}% M=${areaProgresses[3]}% → Avg=${Math.round(dayProgress)}%`);
            return dayProgress;
          } catch (error) {
            console.error(`[WEEKLY PROGRESS] Error fetching data for ${dateStr}:`, error);
            return 0; // Return 0 on error
          }
        });
        
        // Wait for all fetches to complete
        const dailyProgresses = await Promise.all(promises);
        
        // Calculate average across all 7 days (including 0% for days with no data)
        const weeklyAvg = dailyProgresses.reduce((sum, progress) => sum + progress, 0) / 7;
        
        console.log('[WEEKLY PROGRESS] Daily averages:', dailyProgresses.map(p => Math.round(p) + '%'));
        console.log('[WEEKLY PROGRESS] Final weekly average:', Math.round(weeklyAvg) + '%');
        
        const roundedWeeklyAvg = Math.round(weeklyAvg);
        console.log('[WEEKLY PROGRESS] Setting state to:', roundedWeeklyAvg + '%');
        return roundedWeeklyAvg;
      } catch (error) {
        console.error('[WEEKLY PROGRESS] Error calculating weekly average:', error);
        return 0;
      }
    },
    enabled: !!platinumStandardsData && platinumStandardsData.length > 0,
    staleTime: 0, // 🔥 INSTANT UPDATES: No cache, refetch immediately on invalidation
    gcTime: 300000, // Keep in cache for 5 minutes
  });
  
  const weeklyAverageProgress = weeklyProgressData ?? 0;

  // Use the calculated weekly average, or show a more accurate initial state
  const weeklyProgress = weeklyAverageProgress;
  
  // Log the current value being displayed
  if (weeklyProgress !== 0) {
    console.log('[WEEKLY PROGRESS] ✓ Displaying:', weeklyProgress + '%');
  } else {
    console.log('[WEEKLY PROGRESS] ⚠️ Displaying 0% - calculation may be pending');
  }

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

  // Helper function to calculate checkpoint counts
  const getCheckpointCounts = (category: string, type: 'result' | 'feelings' | 'beliefs' | 'actions') => {
    const belief = beliefs.find(b => b.category === category);
    if (!belief) return { checked: 0, total: 0 };
    
    let checklist: ChecklistItem[] = [];
    if (type === 'result') checklist = belief.resultChecklist || [];
    else if (type === 'feelings') checklist = belief.feelingsChecklist || [];
    else if (type === 'beliefs') checklist = belief.beliefsChecklist || [];
    else if (type === 'actions') checklist = belief.actionsChecklist || [];
    
    const checked = checklist.filter(item => item.checked).length;
    return { checked, total: checklist.length };
  };

  // Handle Next Week Target checkbox toggle
  const handleCheckpointToggle = (category: string, type: 'result' | 'feelings' | 'beliefs' | 'actions', itemId: string) => {
    setBeliefs(prev => {
      const updated = prev.map(belief => {
        if (belief.category === category) {
          let updatedBelief = { ...belief };
          let wasChecked = false;
          
          // Update the appropriate checklist based on type
          if (type === 'result' && belief.resultChecklist) {
            updatedBelief.resultChecklist = belief.resultChecklist.map(item => {
              if (item.id === itemId) {
                wasChecked = item.checked;
                return { ...item, checked: !item.checked };
              }
              return item;
            });
          } else if (type === 'feelings' && belief.feelingsChecklist) {
            updatedBelief.feelingsChecklist = belief.feelingsChecklist.map(item => {
              if (item.id === itemId) {
                wasChecked = item.checked;
                return { ...item, checked: !item.checked };
              }
              return item;
            });
          } else if (type === 'beliefs' && belief.beliefsChecklist) {
            updatedBelief.beliefsChecklist = belief.beliefsChecklist.map(item => {
              if (item.id === itemId) {
                wasChecked = item.checked;
                return { ...item, checked: !item.checked };
              }
              return item;
            });
          } else if (type === 'actions' && belief.actionsChecklist) {
            updatedBelief.actionsChecklist = belief.actionsChecklist.map(item => {
              if (item.id === itemId) {
                wasChecked = item.checked;
                return { ...item, checked: !item.checked };
              }
              return item;
            });
          }
          
          // Show congratulatory message when checking (not unchecking)
          if (!wasChecked) {
            const checklist = type === 'result' ? updatedBelief.resultChecklist || [] :
                            type === 'feelings' ? updatedBelief.feelingsChecklist || [] :
                            type === 'beliefs' ? updatedBelief.beliefsChecklist || [] :
                            updatedBelief.actionsChecklist || [];
            const checked = checklist.filter(item => item.checked).length;
            const total = checklist.length;
            const remaining = total - checked;
            
            toast({
              title: '🎉 Congratulation!',
              description: `One more milestone completed. Keep going, ${remaining} more to get all done!`,
            });
          }
          
          return updatedBelief;
        }
        return belief;
      });
      
      // Auto-save changes to database immediately
      saveWeekMutation.mutate({
        weekNumber,
        year: new Date().getFullYear(),
        dateString: currentDateStr,
        beliefs: updated,
      });
      
      return updated;
    });
  };

  // Handle Next Week Target checkpoint delete
  const handleCheckpointDelete = (category: string, type: 'result' | 'feelings' | 'beliefs' | 'actions', itemId: string) => {
    setBeliefs(prev => {
      const updated = prev.map(belief => {
        if (belief.category === category) {
          let updatedBelief = { ...belief };
          
          // Remove item from the appropriate checklist based on type
          if (type === 'result' && belief.resultChecklist) {
            updatedBelief.resultChecklist = belief.resultChecklist.filter(item => item.id !== itemId);
          } else if (type === 'feelings' && belief.feelingsChecklist) {
            updatedBelief.feelingsChecklist = belief.feelingsChecklist.filter(item => item.id !== itemId);
          } else if (type === 'beliefs' && belief.beliefsChecklist) {
            updatedBelief.beliefsChecklist = belief.beliefsChecklist.filter(item => item.id !== itemId);
          } else if (type === 'actions' && belief.actionsChecklist) {
            updatedBelief.actionsChecklist = belief.actionsChecklist.filter(item => item.id !== itemId);
          }
          
          return updatedBelief;
        }
        return belief;
      });
      
      // Auto-save changes to database immediately
      saveWeekMutation.mutate({
        weekNumber,
        year: new Date().getFullYear(),
        dateString: currentDateStr,
        beliefs: updated,
      });
      
      // Update popup state if open
      if (checkpointPopup.open && checkpointPopup.category === category && checkpointPopup.type === type) {
        const updatedBeliefData = updated.find(b => b.category === category);
        if (updatedBeliefData) {
          const newItems = type === 'result' ? updatedBeliefData.resultChecklist || [] :
                          type === 'feelings' ? updatedBeliefData.feelingsChecklist || [] :
                          type === 'beliefs' ? updatedBeliefData.beliefsChecklist || [] :
                          updatedBeliefData.actionsChecklist || [];
          
          setCheckpointPopup({
            ...checkpointPopup,
            items: newItems
          });
        }
      }
      
      return updated;
    });
  };

  // Handle Current Week checkbox toggle
  const handleCurrentWeekCheckpointToggle = (category: string, type: 'problems' | 'currentFeelings' | 'currentBeliefs' | 'currentActions', itemId: string) => {
    setBeliefs(prev => {
      const updated = prev.map(belief => {
        if (belief.category === category) {
          let updatedBelief = { ...belief };
          
          // Update the appropriate checklist based on type
          if (type === 'problems' && belief.problemsChecklist) {
            updatedBelief.problemsChecklist = belief.problemsChecklist.map(item =>
              item.id === itemId ? { ...item, checked: !item.checked } : item
            );
          } else if (type === 'currentFeelings' && belief.feelingsCurrentChecklist) {
            updatedBelief.feelingsCurrentChecklist = belief.feelingsCurrentChecklist.map(item =>
              item.id === itemId ? { ...item, checked: !item.checked } : item
            );
          } else if (type === 'currentBeliefs' && belief.beliefsCurrentChecklist) {
            updatedBelief.beliefsCurrentChecklist = belief.beliefsCurrentChecklist.map(item =>
              item.id === itemId ? { ...item, checked: !item.checked } : item
            );
          } else if (type === 'currentActions' && belief.actionsCurrentChecklist) {
            updatedBelief.actionsCurrentChecklist = belief.actionsCurrentChecklist.map(item =>
              item.id === itemId ? { ...item, checked: !item.checked } : item
            );
          }
          
          return updatedBelief;
        }
        return belief;
      });
      
      // Auto-save changes to database immediately
      saveWeekMutation.mutate({
        weekNumber,
        year: new Date().getFullYear(),
        dateString: currentDateStr,
        beliefs: updated,
      });
      
      // Update popup state if open
      if (currentWeekCheckpointPopup.open && currentWeekCheckpointPopup.category === category && currentWeekCheckpointPopup.type === type) {
        const updatedBeliefData = updated.find(b => b.category === category);
        if (updatedBeliefData) {
          const newItems = type === 'problems' ? updatedBeliefData.problemsChecklist || [] :
                          type === 'currentFeelings' ? updatedBeliefData.feelingsCurrentChecklist || [] :
                          type === 'currentBeliefs' ? updatedBeliefData.beliefsCurrentChecklist || [] :
                          updatedBeliefData.actionsCurrentChecklist || [];
          
          setCurrentWeekCheckpointPopup({
            ...currentWeekCheckpointPopup,
            items: newItems
          });
        }
      }
      
      return updated;
    });
  };

  // Handle Current Week checkpoint delete
  const handleCurrentWeekCheckpointDelete = (category: string, type: 'problems' | 'currentFeelings' | 'currentBeliefs' | 'currentActions', itemId: string) => {
    setBeliefs(prev => {
      const updated = prev.map(belief => {
        if (belief.category === category) {
          let updatedBelief = { ...belief };
          
          // Remove item from the appropriate checklist based on type
          if (type === 'problems' && belief.problemsChecklist) {
            updatedBelief.problemsChecklist = belief.problemsChecklist.filter(item => item.id !== itemId);
          } else if (type === 'currentFeelings' && belief.feelingsCurrentChecklist) {
            updatedBelief.feelingsCurrentChecklist = belief.feelingsCurrentChecklist.filter(item => item.id !== itemId);
          } else if (type === 'currentBeliefs' && belief.beliefsCurrentChecklist) {
            updatedBelief.beliefsCurrentChecklist = belief.beliefsCurrentChecklist.filter(item => item.id !== itemId);
          } else if (type === 'currentActions' && belief.actionsCurrentChecklist) {
            updatedBelief.actionsCurrentChecklist = belief.actionsCurrentChecklist.filter(item => item.id !== itemId);
          }
          
          return updatedBelief;
        }
        return belief;
      });
      
      // Auto-save changes to database immediately
      saveWeekMutation.mutate({
        weekNumber,
        year: new Date().getFullYear(),
        dateString: currentDateStr,
        beliefs: updated,
      });
      
      // Update popup state if open
      if (currentWeekCheckpointPopup.open && currentWeekCheckpointPopup.category === category && currentWeekCheckpointPopup.type === type) {
        const updatedBeliefData = updated.find(b => b.category === category);
        if (updatedBeliefData) {
          const newItems = type === 'problems' ? updatedBeliefData.problemsChecklist || [] :
                          type === 'currentFeelings' ? updatedBeliefData.feelingsCurrentChecklist || [] :
                          type === 'currentBeliefs' ? updatedBeliefData.beliefsCurrentChecklist || [] :
                          updatedBeliefData.actionsCurrentChecklist || [];
          
          setCurrentWeekCheckpointPopup({
            ...currentWeekCheckpointPopup,
            items: newItems
          });
        }
      }
      
      return updated;
    });
  };

  // Handle Current Week checkpoint add
  const handleCurrentWeekCheckpointAdd = (category: string, type: 'problems' | 'currentFeelings' | 'currentBeliefs' | 'currentActions', text: string) => {
    setBeliefs(prev => {
      const updated = prev.map(belief => {
        if (belief.category === category) {
          const newItem: ChecklistItem = { id: Date.now().toString(), text, checked: false };
          let updatedBelief = { ...belief };
          
          if (type === 'problems' && belief.problemsChecklist) {
            updatedBelief.problemsChecklist = [...belief.problemsChecklist, newItem];
          } else if (type === 'currentFeelings' && belief.feelingsCurrentChecklist) {
            updatedBelief.feelingsCurrentChecklist = [...belief.feelingsCurrentChecklist, newItem];
          } else if (type === 'currentBeliefs' && belief.beliefsCurrentChecklist) {
            updatedBelief.beliefsCurrentChecklist = [...belief.beliefsCurrentChecklist, newItem];
          } else if (type === 'currentActions' && belief.actionsCurrentChecklist) {
            updatedBelief.actionsCurrentChecklist = [...belief.actionsCurrentChecklist, newItem];
          }
          return updatedBelief;
        }
        return belief;
      });
      
      saveWeekMutation.mutate({ weekNumber, year: new Date().getFullYear(), dateString: currentDateStr, beliefs: updated });
      return updated;
    });
  };

  // Handle Current Week checkpoint update text
  const handleCurrentWeekCheckpointUpdateText = (category: string, type: 'problems' | 'currentFeelings' | 'currentBeliefs' | 'currentActions', itemId: string, text: string) => {
    setBeliefs(prev => {
      const updated = prev.map(belief => {
        if (belief.category === category) {
          let updatedBelief = { ...belief };
          
          if (type === 'problems' && belief.problemsChecklist) {
            updatedBelief.problemsChecklist = belief.problemsChecklist.map(item => item.id === itemId ? { ...item, text } : item);
          } else if (type === 'currentFeelings' && belief.feelingsCurrentChecklist) {
            updatedBelief.feelingsCurrentChecklist = belief.feelingsCurrentChecklist.map(item => item.id === itemId ? { ...item, text } : item);
          } else if (type === 'currentBeliefs' && belief.beliefsCurrentChecklist) {
            updatedBelief.beliefsCurrentChecklist = belief.beliefsCurrentChecklist.map(item => item.id === itemId ? { ...item, text } : item);
          } else if (type === 'currentActions' && belief.actionsCurrentChecklist) {
            updatedBelief.actionsCurrentChecklist = belief.actionsCurrentChecklist.map(item => item.id === itemId ? { ...item, text } : item);
          }
          return updatedBelief;
        }
        return belief;
      });
      
      saveWeekMutation.mutate({ weekNumber, year: new Date().getFullYear(), dateString: currentDateStr, beliefs: updated });
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

  // Handle text block dialog close with auto-save (Emotional Tracker Style)
  const handleDialogClose = (open: boolean) => {
    if (!open && editingField) {
      // Dialog is closing - auto-save the data
      const { category, field } = editingField;
      
      setBeliefs(prev => {
        const updated = prev.map(belief => {
          if (belief.category === category) {
            return {
              ...belief,
              [field]: dialogValue
            };
          }
          return belief;
        });
        
        // Auto-save changes to database
        saveWeekMutation.mutate({
          weekNumber,
          year: new Date().getFullYear(),
          dateString: currentDateStr,
          beliefs: updated,
        });
        
        return updated;
      });
      
      // Reset dialog state
      setEditingField(null);
      setDialogValue('');
    }
    
    setDialogOpen(open);
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
      
      // Only invalidate queries - let React Query handle background refetch
      // This prevents flickering by not forcing immediate re-renders
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
      
      console.log('[ASSIGNMENT] 📊 Before optimistic update - Previous points:', previousPoints);
      
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
        const newTotalPoints = previousPoints.totalPoints + pointsChange;
        queryClient.setQueryData<{ totalPoints: number }>(
          ['/api/user/total-points'],
          { totalPoints: newTotalPoints }
        );
        console.log('[ASSIGNMENT] ⚡ Optimistic points update:', {
          assignmentId,
          wasCompleted,
          willBeCompleted,
          previousPoints: previousPoints.totalPoints,
          pointsChange,
          newTotalPoints
        });
      } else {
        console.warn('[ASSIGNMENT] ⚠️ No previous points data found for optimistic update');
      }
      
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
        await queryClient.refetchQueries({ queryKey: ['/api/user/total-points'] });
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
  
  // Mutation for creating custom assignment
  const createCustomAssignmentMutation = useMutation({
    mutationFn: async (customText: string) => {
      return await apiRequest('/api/persistent-assignments/custom', 'POST', { customText });
    },
    onSuccess: async () => {
      await refetchAssignments();
      setShowCustomAssignmentDialog(false);
      setCustomAssignmentText('');
      toast({
        title: 'Custom Goal Added',
        description: 'Your custom goal has been added successfully',
      });
    },
    onError: (error) => {
      console.error('Error creating custom assignment:', error);
      toast({
        title: 'Error',
        description: 'Failed to create custom goal',
        variant: 'destructive'
      });
    }
  });
  
  // Mutation for updating custom assignment
  const updateCustomAssignmentMutation = useMutation({
    mutationFn: async ({ id, customText }: { id: string; customText: string }) => {
      return await apiRequest(`/api/persistent-assignments/${id}`, 'PATCH', { customText });
    },
    onSuccess: async () => {
      await refetchAssignments();
      setShowCustomAssignmentDialog(false);
      setCustomAssignmentText('');
      setEditCustomAssignmentId(null);
      toast({
        title: 'Custom Goal Updated',
        description: 'Your custom goal has been updated successfully',
      });
    },
    onError: (error) => {
      console.error('Error updating custom assignment:', error);
      toast({
        title: 'Error',
        description: 'Failed to update custom goal',
        variant: 'destructive'
      });
    }
  });
  
  // Handler for saving custom assignment (create or update)
  const handleSaveCustomAssignment = () => {
    if (!customAssignmentText.trim()) {
      toast({
        title: 'Empty Text',
        description: 'Please enter some text for your custom goal',
        variant: 'destructive'
      });
      return;
    }
    
    if (editCustomAssignmentId) {
      updateCustomAssignmentMutation.mutate({ id: editCustomAssignmentId, customText: customAssignmentText });
    } else {
      createCustomAssignmentMutation.mutate(customAssignmentText);
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

  // Save current week checkpoint from dialog
  const handleSaveCurrentWeekCheckpoint = () => {
    if (currentWeekCheckpointData && currentWeekCheckpointData.text.trim()) {
      // Map to existing checkpoint types
      const typeMap: Record<string, 'result' | 'feelings' | 'beliefs' | 'actions' | 'problems' | 'feelingsCurrent' | 'beliefsCurrent' | 'actionsCurrent'> = {
        'problems': 'problems',
        'currentFeelings': 'feelingsCurrent',
        'currentBeliefs': 'beliefsCurrent',
        'currentActions': 'actionsCurrent'
      };
      const mappedType = typeMap[currentWeekCheckpointData.checklistType];
      handleAddCheckpoint(currentWeekCheckpointData.category, mappedType, currentWeekCheckpointData.text.trim());
      setShowCurrentWeekCheckpointDialog(false);
      setCurrentWeekCheckpointData(null);
    }
  };
  
  // Handle current week checkpoint dialog close with auto-save (click-outside-to-save)
  const handleCurrentWeekCheckpointDialogClose = (open: boolean) => {
    if (!open) {
      // Dialog is closing - save if there's text
      if (currentWeekCheckpointData && currentWeekCheckpointData.text.trim()) {
        // Map to existing checkpoint types
        const typeMap: Record<string, 'result' | 'feelings' | 'beliefs' | 'actions' | 'problems' | 'feelingsCurrent' | 'beliefsCurrent' | 'actionsCurrent'> = {
          'problems': 'problems',
          'currentFeelings': 'feelingsCurrent',
          'currentBeliefs': 'beliefsCurrent',
          'currentActions': 'actionsCurrent'
        };
        const mappedType = typeMap[currentWeekCheckpointData.checklistType];
        handleAddCheckpoint(currentWeekCheckpointData.category, mappedType, currentWeekCheckpointData.text.trim());
        setCurrentWeekCheckpointData(null);
      }
    }
    setShowCurrentWeekCheckpointDialog(open);
  };

  // 🔥 UPDATE BUTTON: Clear Next Week Target data and enable manual planning mode
  const handleClearNextWeekTarget = () => {
    console.log('[UPDATE BTN] 🗑️ Clearing Next Week Target data and enabling manual mode...');
    
    // Clear all Next Week Target fields
    const clearedBeliefs = beliefs.map(belief => ({
      ...belief,
      result: '',
      nextFeelings: '',
      nextWeekTarget: '',
      nextActions: '',
      resultChecklist: [],
      feelingsChecklist: [],
      beliefsChecklist: [],
      actionsChecklist: [],
    }));
    
    setBeliefs(clearedBeliefs);
    setManualNextWeekMode(true); // Disable auto-sync
    
    // Save cleared data to database with manualNextWeekMode flag
    saveWeekMutation.mutate({
      beliefs: clearedBeliefs,
      weekNumber: weekNumber,
      dateString: currentDateStr,
      manualNextWeekMode: true, // 🔥 PERSIST manual mode to database
    });
    
    toast({
      title: 'Next Week Target Cleared',
      description: 'Auto-sync disabled. You can now plan your next week manually.',
    });
  };

  // 🔥 UPDATE BUTTON: Clear Current Week data
  const handleClearCurrentWeek = () => {
    console.log('[UPDATE BTN] 🗑️ Clearing Current Week data...');
    
    // Clear all Current Week fields
    const clearedBeliefs = beliefs.map(belief => ({
      ...belief,
      problems: '',
      currentFeelings: '',
      currentBelief: '',
      currentActions: '',
      problemsChecklist: [],
      feelingsCurrentChecklist: [],
      beliefsCurrentChecklist: [],
      actionsCurrentChecklist: [],
    }));
    
    setBeliefs(clearedBeliefs);
    
    // Save cleared data to database
    saveWeekMutation.mutate({
      beliefs: clearedBeliefs,
      weekNumber: weekNumber,
      dateString: currentDateStr,
    });
    
    toast({
      title: 'Current Week Cleared',
      description: 'All Current Week data has been cleared.',
    });
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
    // 🔥 NEW: Single master dialog for all operations
    const [showMasterDialog, setShowMasterDialog] = useState(false);
    const [newItemText, setNewItemText] = useState('');
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const visibleItems = items.slice(0, 3);
    const hiddenCount = items.length - 3;
    const hasMoreItems = items.length > 3;
    
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
    
    // Get column-specific button label
    const getButtonLabel = () => {
      switch(checklistType) {
        case 'result': return 'Result';
        case 'feelings': return 'Feeling';
        case 'beliefs': return 'Belief';
        case 'actions': return 'Action';
        case 'problems': return 'Problem';
        case 'feelingsCurrent': return 'Feeling';
        case 'beliefsCurrent': return 'Belief';
        case 'actionsCurrent': return 'Action';
        default: return 'Checkpoint';
      }
    };
    const buttonLabel = getButtonLabel();

    // 🔥 NEW: Simplified handlers for master dialog
    const openMasterDialog = () => {
      setShowMasterDialog(true);
      setEditingItemId(null);
      setIsAddingNew(false);
      setNewItemText('');
    };

    const handleAddNewItem = () => {
      if (newItemText.trim()) {
        onAddCheckpoint(newItemText.trim());
        setNewItemText(''); // Clear input, stay ready for next
        // Keep isAddingNew = true so input stays visible
        setTimeout(() => {
          inputRef.current?.focus();
        }, 0);
      }
    };

    const handleStartAddingNew = () => {
      setIsAddingNew(true);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    };

    const handleStartEdit = (itemId: string, text: string) => {
      setEditingItemId(itemId);
      setEditingText(text);
    };

    const handleSaveEdit = (itemId: string) => {
      if (editingText.trim()) {
        onUpdateText(itemId, editingText.trim());
      }
      setEditingItemId(null);
      setEditingText('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation(); // Prevent any parent handlers
        handleAddNewItem();
        // Keep focus on input for next entry
        setTimeout(() => {
          inputRef.current?.focus();
        }, 0);
      }
    };

    const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, itemId: string) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSaveEdit(itemId);
      }
      if (e.key === 'Escape') {
        setEditingItemId(null);
        setEditingText('');
      }
    };
    
    return (
      <>
        {/* 🔥 NEW: Clickable preview that opens master dialog */}
        <div 
          onClick={!disabled ? openMasterDialog : undefined}
          className={`space-y-1 max-w-full max-h-full overflow-hidden ${!disabled ? 'cursor-pointer' : 'cursor-not-allowed'}`}
        >
          {/* Compact View - Shows only first item */}
          {visibleItems.map((item) => (
            <div key={item.id} className="flex items-center gap-2 min-w-0">
              <Checkbox
                checked={item.checked}
                onCheckedChange={() => !disabled && onToggle(item.id)}
                disabled={disabled}
                className="h-3 w-3 shrink-0"
                onClick={(e) => e.stopPropagation()}
                data-testid={`checkbox-${checklistType}-${category.toLowerCase()}-${item.id}`}
              />
              <span className="text-xs line-clamp-1 break-all min-w-0">
                {item.text}
              </span>
            </div>
          ))}
          
          {/* Show "X more items" if more than 1 */}
          {hasMoreItems && (
            <div className="text-xs text-muted-foreground italic pl-5 cursor-pointer hover:underline">
              + {hiddenCount} more item{hiddenCount > 1 ? 's' : ''}...
            </div>
          )}
        </div>
        
        {/* Add Button - When no items exist */}
        {!disabled && items.length === 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={openMasterDialog}
            className="h-6 w-full text-xs text-muted-foreground hover:text-foreground gap-1"
            data-testid={`button-add-checkpoint-${checklistType}-${category.toLowerCase()}`}
          >
            <Plus className="w-3 h-3" />
            Add {buttonLabel}
          </Button>
        )}

        {/* 🔥 NEW: Master Dialog - Inline Input Design */}
        <Dialog open={showMasterDialog} onOpenChange={setShowMasterDialog}>
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className={`text-lg font-semibold ${colorScheme.text}`}>
                {category} - {colorScheme.label} ({items.length} {items.length === 1 ? 'item' : 'items'})
              </DialogTitle>
            </DialogHeader>
            
            {/* Scrollable list of all items with INLINE input field */}
            <ScrollArea className="flex-1 pr-4 min-h-0 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2 py-2">
                {items.map((item, index) => (
                  <div key={item.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors group/item">
                    {/* Checkbox */}
                    <Checkbox
                      checked={item.checked}
                      onCheckedChange={() => onToggle(item.id)}
                      className="h-5 w-5 mt-0.5 shrink-0"
                      data-testid={`checkbox-master-${checklistType}-${item.id}`}
                    />
                    
                    {/* Numbered text */}
                    <div className="flex-1 min-w-0">
                      {editingItemId === item.id ? (
                        <Input
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          onKeyDown={(e) => handleEditKeyDown(e, item.id)}
                          onBlur={() => handleSaveEdit(item.id)}
                          className="text-sm"
                          autoFocus
                          data-testid={`input-edit-${checklistType}-${item.id}`}
                        />
                      ) : (
                        <p
                          onClick={() => handleStartEdit(item.id, item.text)}
                          className="text-sm cursor-pointer hover:bg-muted/30 p-1 rounded break-words"
                          data-testid={`text-master-${checklistType}-${item.id}`}
                        >
                          <span className="font-semibold text-muted-foreground mr-2">{index + 1}.</span>
                          {item.text}
                        </p>
                      )}
                    </div>
                    
                    {/* Delete button */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDeleteCheckpoint(item.id)}
                      className="h-8 w-8 p-0 shrink-0"
                      data-testid={`button-delete-master-${checklistType}-${item.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                
                {items.length === 0 && !isAddingNew && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No {colorScheme.label.toLowerCase()} checkpoints yet. Click + to add your first one!
                  </p>
                )}
                
                {/* Inline input field - appears in list */}
                {isAddingNew && (
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAddNewItem();
                    }}
                    className="flex items-start gap-3 p-2 rounded-lg bg-muted/20"
                  >
                    <Checkbox
                      checked={false}
                      disabled
                      className="h-5 w-5 mt-0.5 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <Input
                        ref={inputRef}
                        value={newItemText}
                        onChange={(e) => setNewItemText(e.target.value)}
                        placeholder={`Type your ${colorScheme.label.toLowerCase()}...`}
                        className="text-sm"
                        data-testid={`input-new-checkpoint-inline-${checklistType}`}
                      />
                    </div>
                  </form>
                )}
              </div>
            </ScrollArea>
            
            {/* Footer with Add button and Close button */}
            <div className="flex justify-between items-center pt-4 border-t gap-2">
              {!isAddingNew && (
                <button
                  onClick={handleStartAddingNew}
                  className="flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/20"
                  data-testid={`button-start-add-checkpoint-${checklistType}`}
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm">Add {buttonLabel}</span>
                </button>
              )}
              <Button
                onClick={() => setShowMasterDialog(false)}
                variant="default"
                className="ml-auto"
                data-testid={`button-close-master-dialog-${checklistType}`}
              >
                Close
              </Button>
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
    saveWeekMutation.mutate({ 
      weekNumber, 
      year: new Date().getFullYear(), 
      dateString: currentDateStr, // 🔥 CRITICAL FIX: Use selected calendar date
      beliefs: updatedBeliefs 
    });
    
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
        saveWeekMutation.mutate({ 
          weekNumber, 
          year: new Date().getFullYear(), 
          dateString: currentDateStr, // 🔥 CRITICAL FIX: Use selected calendar date
          beliefs: updatedBeliefs 
        });
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
      saveWeekMutation.mutate({ 
        weekNumber, 
        year: new Date().getFullYear(), 
        dateString: currentDateStr, // 🔥 CRITICAL FIX: Use selected calendar date
        beliefs: updatedBeliefs 
      });
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
          
          <Badge 
            className={`${getProgressColor(weeklyProgress)} ${!isAdminView ? 'cursor-pointer hover:opacity-80' : ''} smooth-transition`}
            onClick={() => !isAdminView && setProgressOpen(true)}
            data-testid="badge-weekly-progress"
          >
            {weeklyProgress}% Weekly Progress
          </Badge>
        </div>
      </div>

      {/* Current Week Table */}
      <div className="border-2 border-coral-red/70 dark:border-coral-red/50 rounded-lg overflow-x-auto shadow-lg">
        <div className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 border-b-2 border-coral-red/80 dark:border-coral-red/60 bg-coral-red">
          <div className="flex items-center justify-between">
            <div className="flex-1"></div>
            {/* Centered: Clickable Date with Calendar Popup */}
            <Popover open={calendarPopoverOpen} onOpenChange={setCalendarPopoverOpen}>
              <PopoverTrigger asChild>
                <h3 
                  className="font-bold text-white text-sm sm:text-base md:text-lg lg:text-xl drop-shadow-md flex items-center gap-1 sm:gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                  data-testid="button-date-text"
                >
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                  {format(selectedDate, 'MMMM dd, yyyy')}
                </h3>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      handleDateChange(date);
                      setCalendarPopoverOpen(false);
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
                      setCalendarPopoverOpen(false);
                    }}
                    data-testid="button-reset-to-today"
                  >
                    Back to Today
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <div className="flex-1 flex justify-end items-center gap-2">
              {!isAdminView && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleClearCurrentWeek}
                  disabled={saveWeekMutation.isPending}
                  data-testid="button-update-current-week"
                  className="bg-orange-500 border-orange-600 text-white hover:bg-orange-600 hover:border-orange-700 shadow-lg h-8 font-semibold"
                >
                  {saveWeekMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  <span className="ml-1.5">Update</span>
                </Button>
              )}
            </div>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30">
              <TableHead className="text-xs sm:text-sm font-bold border-r w-[100px] px-1.5 sm:px-2 py-1.5 sm:py-2">HRCM Standards</TableHead>
              <TableHead className="text-xs sm:text-sm w-[80px] bg-rose-100 dark:bg-rose-900/40 font-semibold px-1.5 sm:px-2 py-1.5 sm:py-2">Rating</TableHead>
              <TableHead className="text-xs sm:text-sm w-[150px] bg-rose-100 dark:bg-rose-900/40 font-semibold px-1.5 sm:px-2 py-1.5 sm:py-2">Problems</TableHead>
              <TableHead className="text-xs sm:text-sm w-[150px] bg-rose-100 dark:bg-rose-900/40 font-semibold px-1.5 sm:px-2 py-1.5 sm:py-2">Feelings</TableHead>
              <TableHead className="text-xs sm:text-sm w-[150px] bg-rose-100 dark:bg-rose-900/40 font-semibold px-1.5 sm:px-2 py-1.5 sm:py-2">Beliefs/Reasons</TableHead>
              <TableHead className="text-xs sm:text-sm w-[150px] bg-rose-100 dark:bg-rose-900/40 font-semibold px-1.5 sm:px-2 py-1.5 sm:py-2">Actions</TableHead>
              <TableHead className="text-xs sm:text-sm w-[80px] bg-rose-100 dark:bg-rose-900/40 font-semibold border-r px-1.5 sm:px-2 py-1.5 sm:py-2">Progress</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {console.log('🔥 [RENDER] Current Week Table - beliefs.length:', beliefs.length, 'beliefs:', beliefs)}
            {beliefs.map((belief) => (
              <TableRow key={belief.category} className="border-b h-[85px]" data-testid={`row-${belief.category.toLowerCase()}`}>
                {/* Category Column - Entire cell clickable */}
                <TableCell 
                  className="text-xs sm:text-sm font-semibold border-r bg-muted/20 align-top px-1.5 sm:px-2 py-1.5 sm:py-2 text-center cursor-pointer hover:bg-primary/5 transition-colors" 
                  onClick={() => {
                    setPlatinumStandardsDialog({
                      open: true,
                      category: belief.category,
                      items: belief.checklist
                    });
                  }}
                  data-testid={`cell-category-${belief.category.toLowerCase()}`}
                >
                  <Badge 
                    variant="outline" 
                    className="font-semibold text-[10px] sm:text-xs px-1 sm:px-2 pointer-events-none"
                    data-testid={`badge-category-${belief.category.toLowerCase()}`}
                  >
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
                        
                        // All HRCM areas: Use unlock status for rating 7
                        let maxRating: number;
                        if (categoryLower === 'health') {
                          maxRating = healthUnlockStatus?.isUnlocked ? 7 : 6;
                        } else if (categoryLower === 'relationship') {
                          maxRating = relationshipUnlockStatus?.isUnlocked ? 7 : 6;
                        } else if (categoryLower === 'career') {
                          maxRating = careerUnlockStatus?.isUnlocked ? 7 : 6;
                        } else if (categoryLower === 'money') {
                          maxRating = moneyUnlockStatus?.isUnlocked ? 7 : 6;
                        } else {
                          // Fallback to existing rating caps
                          maxRating = ratingCaps?.[categoryLower as keyof typeof ratingCaps] || 7;
                        }
                        
                        // Hard cap at 8 - never allow 9 or 10
                        const hardCappedRating = Math.min(newRating, 8);
                        // Apply progressive cap
                        const finalRating = Math.min(hardCappedRating, maxRating);
                        
                        handleRatingChange(belief.category, finalRating);
                      }}
                      disabled={!!viewAsUserId || isAdminView}
                      className="w-16 h-9 text-center font-semibold"
                      data-testid={`input-${belief.category.toLowerCase()}-rating`}
                    />
                  </div>
                </TableCell>

                {/* Current Week - Problems */}
                <TableCell className="p-2 bg-coral-red/5 dark:bg-coral-red/10 align-top w-[180px] min-w-[180px] max-w-[180px]">
                  <CompactChecklistView
                    items={belief.problemsChecklist || []}
                    onToggle={(id) => handleCurrentWeekCheckpointToggle(belief.category as string, 'problems', id)}
                    onUpdateText={(id, text) => handleCurrentWeekCheckpointUpdateText(belief.category as string, 'problems', id, text)}
                    onAddCheckpoint={(text) => handleCurrentWeekCheckpointAdd(belief.category as string, 'problems', text)}
                    onDeleteCheckpoint={(id) => handleCurrentWeekCheckpointDelete(belief.category as string, 'problems', id)}
                    category={belief.category}
                    checklistType="problems"
                    disabled={isAdminView || viewingHistory || !!viewAsUserId}
                  />
                </TableCell>

                {/* Current Week - Feelings */}
                <TableCell className="p-2 bg-emerald-green/5 dark:bg-emerald-green/10 align-top w-[180px] min-w-[180px] max-w-[180px]">
                  <CompactChecklistView
                    items={belief.feelingsCurrentChecklist || []}
                    onToggle={(id) => handleCurrentWeekCheckpointToggle(belief.category as string, 'currentFeelings', id)}
                    onUpdateText={(id, text) => handleCurrentWeekCheckpointUpdateText(belief.category as string, 'currentFeelings', id, text)}
                    onAddCheckpoint={(text) => handleCurrentWeekCheckpointAdd(belief.category as string, 'currentFeelings', text)}
                    onDeleteCheckpoint={(id) => handleCurrentWeekCheckpointDelete(belief.category as string, 'currentFeelings', id)}
                    category={belief.category}
                    checklistType="feelingsCurrent"
                    disabled={isAdminView || viewingHistory || !!viewAsUserId}
                  />
                </TableCell>

                {/* Current Week - Beliefs */}
                <TableCell className="p-2 bg-golden-yellow/5 dark:bg-golden-yellow/10 align-top w-[180px] min-w-[180px] max-w-[180px]">
                  <CompactChecklistView
                    items={belief.beliefsCurrentChecklist || []}
                    onToggle={(id) => handleCurrentWeekCheckpointToggle(belief.category as string, 'currentBeliefs', id)}
                    onUpdateText={(id, text) => handleCurrentWeekCheckpointUpdateText(belief.category as string, 'currentBeliefs', id, text)}
                    onAddCheckpoint={(text) => handleCurrentWeekCheckpointAdd(belief.category as string, 'currentBeliefs', text)}
                    onDeleteCheckpoint={(id) => handleCurrentWeekCheckpointDelete(belief.category as string, 'currentBeliefs', id)}
                    category={belief.category}
                    checklistType="beliefsCurrent"
                    disabled={isAdminView || viewingHistory || !!viewAsUserId}
                  />
                </TableCell>

                {/* Current Week - Actions */}
                <TableCell className="p-2 bg-soft-lavender/5 dark:bg-soft-lavender/10 align-top w-[180px] min-w-[180px] max-w-[180px]">
                  <CompactChecklistView
                    items={belief.actionsCurrentChecklist || []}
                    onToggle={(id) => handleCurrentWeekCheckpointToggle(belief.category as string, 'currentActions', id)}
                    onUpdateText={(id, text) => handleCurrentWeekCheckpointUpdateText(belief.category as string, 'currentActions', id, text)}
                    onAddCheckpoint={(text) => handleCurrentWeekCheckpointAdd(belief.category as string, 'currentActions', text)}
                    onDeleteCheckpoint={(id) => handleCurrentWeekCheckpointDelete(belief.category as string, 'currentActions', id)}
                    category={belief.category}
                    checklistType="actionsCurrent"
                    disabled={isAdminView || viewingHistory || !!viewAsUserId}
                  />
                </TableCell>

                {/* Current Week - Progress */}
                <TableCell className="p-2 bg-rose-100 dark:bg-rose-900/40 border-r align-top text-center">
                  <Badge 
                    className={`${getProgressColor(calculateStandardsProgress(belief.category, platinumStandardsData, savedRatings))} font-semibold text-xs`}
                    data-testid={`badge-progress-${belief.category.toLowerCase()}`}
                  >
                    {calculateStandardsProgress(belief.category, platinumStandardsData, savedRatings)}%
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
            {/* Clickable Date with Calendar Popup for Next Week */}
            <Popover open={nextWeekCalendarPopoverOpen} onOpenChange={setNextWeekCalendarPopoverOpen}>
              <PopoverTrigger asChild>
                <h3 
                  className="font-bold text-white text-xl drop-shadow-md flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                  data-testid="button-next-week-date-text"
                >
                  <TrendingUp className="w-5 h-5" />
                  {format(new Date(selectedDate.getTime() + 7 * 24 * 60 * 60 * 1000), 'MMMM dd, yyyy')}
                </h3>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar
                  mode="single"
                  selected={new Date(selectedDate.getTime() + 7 * 24 * 60 * 60 * 1000)}
                  onSelect={(date) => {
                    if (date) {
                      // Calculate the corresponding Current Week date (7 days before selected Next Week date)
                      const newCurrentWeekDate = new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000);
                      handleDateChange(newCurrentWeekDate);
                      setNextWeekCalendarPopoverOpen(false);
                    }
                  }}
                  initialFocus
                  data-testid="calendar-next-week-date-picker"
                />
                <div className="p-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      // Reset to next week from today (today + 7 days)
                      const nextWeek = new Date();
                      nextWeek.setDate(nextWeek.getDate() + 7);
                      const currentWeekFromNextWeek = new Date(nextWeek.getTime() - 7 * 24 * 60 * 60 * 1000);
                      handleDateChange(currentWeekFromNextWeek);
                      setNextWeekCalendarPopoverOpen(false);
                    }}
                    data-testid="button-reset-to-next-week"
                  >
                    Reset to Next Week
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <div className="flex-1 flex justify-end items-center gap-2">
              {!isAdminView && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleClearNextWeekTarget}
                  disabled={saveWeekMutation.isPending}
                  data-testid="button-update-next-week"
                  className="bg-orange-500 border-orange-600 text-white hover:bg-orange-600 hover:border-orange-700 shadow-lg h-8 font-semibold"
                >
                  {saveWeekMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  <span className="ml-1.5">Update</span>
                </Button>
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
              <TableHead className="text-xs sm:text-sm font-bold border-r w-[100px] px-1.5 sm:px-2 py-1.5 sm:py-2">HRCM Standards</TableHead>
              <TableHead className="text-xs sm:text-sm w-[80px] bg-blue-100 dark:bg-blue-900/40 font-semibold border border-soft-gray dark:border-soft-gray/30 px-1.5 sm:px-2 py-1.5 sm:py-2">Rating</TableHead>
              <TableHead className="text-xs sm:text-sm w-[150px] bg-blue-100 dark:bg-blue-900/40 font-semibold border border-soft-gray dark:border-soft-gray/30 px-1.5 sm:px-2 py-1.5 sm:py-2">
                <div className="flex flex-col gap-0.5">
                  <span>Results</span>
                  <span className="text-[10px] font-normal text-coral-red">
                    {beliefs.reduce((total, b) => total + (b.resultChecklist?.filter(i => i.checked).length || 0), 0)}/{beliefs.reduce((total, b) => total + (b.resultChecklist?.length || 0), 0)}
                  </span>
                </div>
              </TableHead>
              <TableHead className="text-xs sm:text-sm w-[150px] bg-blue-100 dark:bg-blue-900/40 font-semibold border border-soft-gray dark:border-soft-gray/30 px-1.5 sm:px-2 py-1.5 sm:py-2">
                <div className="flex flex-col gap-0.5">
                  <span>Feelings</span>
                  <span className="text-[10px] font-normal text-emerald-green">
                    {beliefs.reduce((total, b) => total + (b.feelingsChecklist?.filter(i => i.checked).length || 0), 0)}/{beliefs.reduce((total, b) => total + (b.feelingsChecklist?.length || 0), 0)}
                  </span>
                </div>
              </TableHead>
              <TableHead className="text-xs sm:text-sm w-[150px] bg-blue-100 dark:bg-blue-900/40 font-semibold border border-soft-gray dark:border-soft-gray/30 px-1.5 sm:px-2 py-1.5 sm:py-2">
                <div className="flex flex-col gap-0.5">
                  <span>Beliefs/Reasons</span>
                  <span className="text-[10px] font-normal text-golden-yellow">
                    {beliefs.reduce((total, b) => total + (b.beliefsChecklist?.filter(i => i.checked).length || 0), 0)}/{beliefs.reduce((total, b) => total + (b.beliefsChecklist?.length || 0), 0)}
                  </span>
                </div>
              </TableHead>
              <TableHead className="text-xs sm:text-sm w-[150px] bg-blue-100 dark:bg-blue-900/40 font-semibold border-r border border-soft-gray dark:border-soft-gray/30 px-1.5 sm:px-2 py-1.5 sm:py-2">
                <div className="flex flex-col gap-0.5">
                  <span>Actions</span>
                  <span className="text-[10px] font-normal text-soft-lavender">
                    {beliefs.reduce((total, b) => total + (b.actionsChecklist?.filter(i => i.checked).length || 0), 0)}/{beliefs.reduce((total, b) => total + (b.actionsChecklist?.length || 0), 0)}
                  </span>
                </div>
              </TableHead>
              
              <TableHead className="text-xs sm:text-sm w-[150px] bg-gradient-to-r from-cyan-100 to-blue-100 dark:from-cyan-900/40 dark:to-blue-900/40 font-semibold px-1.5 sm:px-2 py-1.5 sm:py-2">
                <div className="flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  Assignment
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {console.log('🔥 [RENDER] Next Week Table - beliefs.length:', beliefs.length, 'beliefs:', beliefs)}
            {beliefs.map((belief) => (
              <TableRow key={belief.category} className="border-b h-[85px]" data-testid={`row-next-${belief.category.toLowerCase()}`}>
                {/* Category Column - Entire cell clickable */}
                <TableCell 
                  className="font-semibold border-r bg-muted/20 align-top max-h-[85px] overflow-hidden text-center cursor-pointer hover:bg-primary/5 transition-colors"
                  onClick={() => {
                    setPlatinumStandardsDialog({
                      open: true,
                      category: belief.category,
                      items: belief.checklist
                    });
                  }}
                  data-testid={`cell-next-category-${belief.category.toLowerCase()}`}
                >
                  <Badge 
                    variant="outline" 
                    className="font-semibold pointer-events-none"
                    data-testid={`badge-next-category-${belief.category.toLowerCase()}`}
                  >
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

                {/* Next Week - Results (Checkbox-based) */}
                <TableCell className="p-2 bg-blue-50/30 dark:bg-blue-950/10 align-top w-[180px] min-w-[180px] max-w-[180px]">
                  {(() => {
                    const checklist = belief.resultChecklist || [];
                    const totalCount = checklist.length;
                    const firstItem = checklist[0];
                    const hasMoreItems = totalCount > 1;
                    
                    return (
                      <div className="space-y-1.5" style={{ height: '60px', width: '100%' }}>
                        {/* Add Button - ALWAYS VISIBLE */}
                        {!isAdminView && !viewingHistory && !viewAsUserId && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setFirstCheckpointData({
                                category: belief.category,
                                checklistType: 'result',
                                text: ''
                              });
                              setShowFirstCheckpointDialog(true);
                            }}
                            className="w-full h-6 text-[10px] px-2 border-dashed border-coral-red/30 text-coral-red hover:bg-coral-red/10 flex items-center justify-center gap-1"
                            data-testid={`button-add-result-${belief.category.toLowerCase()}`}
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add</span>
                          </Button>
                        )}
                        
                        {/* Show first checkbox item */}
                        {firstItem && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-semibold text-coral-red shrink-0">1.</span>
                            <Checkbox
                              checked={firstItem.checked}
                              onCheckedChange={() => handleCheckpointToggle(belief.category, 'result', firstItem.id)}
                              disabled={isAdminView || viewingHistory || !!viewAsUserId}
                              className="h-3 w-3 shrink-0"
                              data-testid={`checkbox-result-${belief.category.toLowerCase()}-${firstItem.id}`}
                            />
                            <span 
                              className="text-[10px] line-clamp-1 text-coral-red cursor-pointer hover:underline"
                              onClick={() => {
                                if (!isAdminView && !viewingHistory && !viewAsUserId) {
                                  setFirstCheckpointData({
                                    category: belief.category,
                                    checklistType: 'result',
                                    text: firstItem.text
                                  });
                                  setShowFirstCheckpointDialog(true);
                                }
                              }}
                              data-testid={`text-edit-result-${belief.category.toLowerCase()}-${firstItem.id}`}
                            >
                              {firstItem.text}
                            </span>
                          </div>
                        )}
                        
                        {/* Show "+ X more items..." if more than 1 */}
                        {hasMoreItems && (
                          <div 
                            className="text-[10px] text-coral-red hover:text-coral-red/80 font-medium italic pl-5 cursor-pointer transition-colors"
                            onClick={() => {
                              setCheckpointPopup({
                                open: true,
                                category: belief.category,
                                type: 'result',
                                items: checklist
                              });
                            }}
                            data-testid={`text-more-results-${belief.category.toLowerCase()}`}
                          >
                            + {totalCount - 1} more item{totalCount - 1 > 1 ? 's' : ''}...
                          </div>
                        )}
                        
                        {/* Empty state */}
                        {totalCount === 0 && (
                          <p className="text-[10px] text-muted-foreground italic text-center py-1">
                            No items yet
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </TableCell>

                {/* Next Week - Feelings (Checkbox-based) */}
                <TableCell className="p-2 bg-blue-50/30 dark:bg-blue-950/10 align-top w-[180px] min-w-[180px] max-w-[180px]">
                  {(() => {
                    const checklist = belief.feelingsChecklist || [];
                    const totalCount = checklist.length;
                    const firstItem = checklist[0];
                    const hasMoreItems = totalCount > 1;
                    
                    return (
                      <div className="space-y-1.5" style={{ height: '60px', width: '100%' }}>
                        {/* Add Button - ALWAYS VISIBLE */}
                        {!isAdminView && !viewingHistory && !viewAsUserId && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setFirstCheckpointData({
                                category: belief.category,
                                checklistType: 'feelings',
                                text: ''
                              });
                              setShowFirstCheckpointDialog(true);
                            }}
                            className="w-full h-6 text-[10px] px-2 border-dashed border-emerald-green/30 text-emerald-green hover:bg-emerald-green/10 flex items-center justify-center gap-1"
                            data-testid={`button-add-feelings-${belief.category.toLowerCase()}`}
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add</span>
                          </Button>
                        )}
                        
                        {/* Show first checkbox item */}
                        {firstItem && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-semibold text-emerald-green shrink-0">1.</span>
                            <Checkbox
                              checked={firstItem.checked}
                              onCheckedChange={() => handleCheckpointToggle(belief.category, 'feelings', firstItem.id)}
                              disabled={isAdminView || viewingHistory || !!viewAsUserId}
                              className="h-3 w-3 shrink-0"
                              data-testid={`checkbox-feelings-${belief.category.toLowerCase()}-${firstItem.id}`}
                            />
                            <span 
                              className="text-[10px] line-clamp-1 text-emerald-green cursor-pointer hover:underline"
                              onClick={() => {
                                if (!isAdminView && !viewingHistory && !viewAsUserId) {
                                  setFirstCheckpointData({
                                    category: belief.category,
                                    checklistType: 'feelings',
                                    text: firstItem.text
                                  });
                                  setShowFirstCheckpointDialog(true);
                                }
                              }}
                              data-testid={`text-edit-feelings-${belief.category.toLowerCase()}-${firstItem.id}`}
                            >
                              {firstItem.text}
                            </span>
                          </div>
                        )}
                        
                        {/* Show "+ X more items..." if more than 1 */}
                        {hasMoreItems && (
                          <div 
                            className="text-[10px] text-emerald-green hover:text-emerald-green/80 font-medium italic pl-5 cursor-pointer transition-colors"
                            onClick={() => {
                              setCheckpointPopup({
                                open: true,
                                category: belief.category,
                                type: 'feelings',
                                items: checklist
                              });
                            }}
                            data-testid={`text-more-feelings-${belief.category.toLowerCase()}`}
                          >
                            + {totalCount - 1} more item{totalCount - 1 > 1 ? 's' : ''}...
                          </div>
                        )}
                        
                        {/* Empty state */}
                        {totalCount === 0 && (
                          <p className="text-[10px] text-muted-foreground italic text-center py-1">
                            No items yet
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </TableCell>

                {/* Next Week - Beliefs/Reasons (Checkbox-based) */}
                <TableCell className="p-2 bg-blue-50/30 dark:bg-blue-950/10 align-top w-[180px] min-w-[180px] max-w-[180px]">
                  {(() => {
                    const checklist = belief.beliefsChecklist || [];
                    const totalCount = checklist.length;
                    const firstItem = checklist[0];
                    const hasMoreItems = totalCount > 1;
                    
                    return (
                      <div className="space-y-1.5" style={{ height: '60px', width: '100%' }}>
                        {/* Add Button - ALWAYS VISIBLE */}
                        {!isAdminView && !viewingHistory && !viewAsUserId && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setFirstCheckpointData({
                                category: belief.category,
                                checklistType: 'beliefs',
                                text: ''
                              });
                              setShowFirstCheckpointDialog(true);
                            }}
                            className="w-full h-6 text-[10px] px-2 border-dashed border-golden-yellow/30 text-golden-yellow hover:bg-golden-yellow/10 flex items-center justify-center gap-1"
                            data-testid={`button-add-beliefs-${belief.category.toLowerCase()}`}
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add</span>
                          </Button>
                        )}
                        
                        {/* Show first checkbox item */}
                        {firstItem && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-semibold text-golden-yellow shrink-0">1.</span>
                            <Checkbox
                              checked={firstItem.checked}
                              onCheckedChange={() => handleCheckpointToggle(belief.category, 'beliefs', firstItem.id)}
                              disabled={isAdminView || viewingHistory || !!viewAsUserId}
                              className="h-3 w-3 shrink-0"
                              data-testid={`checkbox-beliefs-${belief.category.toLowerCase()}-${firstItem.id}`}
                            />
                            <span 
                              className="text-[10px] line-clamp-1 text-golden-yellow cursor-pointer hover:underline"
                              onClick={() => {
                                if (!isAdminView && !viewingHistory && !viewAsUserId) {
                                  setFirstCheckpointData({
                                    category: belief.category,
                                    checklistType: 'beliefs',
                                    text: firstItem.text
                                  });
                                  setShowFirstCheckpointDialog(true);
                                }
                              }}
                              data-testid={`text-edit-beliefs-${belief.category.toLowerCase()}-${firstItem.id}`}
                            >
                              {firstItem.text}
                            </span>
                          </div>
                        )}
                        
                        {/* Show "+ X more items..." if more than 1 */}
                        {hasMoreItems && (
                          <div 
                            className="text-[10px] text-golden-yellow hover:text-golden-yellow/80 font-medium italic pl-5 cursor-pointer transition-colors"
                            onClick={() => {
                              setCheckpointPopup({
                                open: true,
                                category: belief.category,
                                type: 'beliefs',
                                items: checklist
                              });
                            }}
                            data-testid={`text-more-beliefs-${belief.category.toLowerCase()}`}
                          >
                            + {totalCount - 1} more item{totalCount - 1 > 1 ? 's' : ''}...
                          </div>
                        )}
                        
                        {/* Empty state */}
                        {totalCount === 0 && (
                          <p className="text-[10px] text-muted-foreground italic text-center py-1">
                            No items yet
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </TableCell>

                {/* Next Week - Actions (Checkbox-based) */}
                <TableCell className="p-2 bg-blue-50/30 dark:bg-blue-950/10 align-top w-[180px] min-w-[180px] max-w-[180px] border-r">
                  {(() => {
                    const checklist = belief.actionsChecklist || [];
                    const totalCount = checklist.length;
                    const firstItem = checklist[0];
                    const hasMoreItems = totalCount > 1;
                    
                    return (
                      <div className="space-y-1.5" style={{ height: '60px', width: '100%' }}>
                        {/* Add Button - ALWAYS VISIBLE */}
                        {!isAdminView && !viewingHistory && !viewAsUserId && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setFirstCheckpointData({
                                category: belief.category,
                                checklistType: 'actions',
                                text: ''
                              });
                              setShowFirstCheckpointDialog(true);
                            }}
                            className="w-full h-6 text-[10px] px-2 border-dashed border-blue-500/30 text-blue-500 hover:bg-blue-500/10 flex items-center justify-center gap-1"
                            data-testid={`button-add-actions-${belief.category.toLowerCase()}`}
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add</span>
                          </Button>
                        )}
                        
                        {/* Show first checkbox item */}
                        {firstItem && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-semibold text-blue-500 shrink-0">1.</span>
                            <Checkbox
                              checked={firstItem.checked}
                              onCheckedChange={() => handleCheckpointToggle(belief.category, 'actions', firstItem.id)}
                              disabled={isAdminView || viewingHistory || !!viewAsUserId}
                              className="h-3 w-3 shrink-0"
                              data-testid={`checkbox-actions-${belief.category.toLowerCase()}-${firstItem.id}`}
                            />
                            <span 
                              className="text-[10px] line-clamp-1 text-blue-500 cursor-pointer hover:underline"
                              onClick={() => {
                                if (!isAdminView && !viewingHistory && !viewAsUserId) {
                                  setFirstCheckpointData({
                                    category: belief.category,
                                    checklistType: 'actions',
                                    text: firstItem.text
                                  });
                                  setShowFirstCheckpointDialog(true);
                                }
                              }}
                              data-testid={`text-edit-actions-${belief.category.toLowerCase()}-${firstItem.id}`}
                            >
                              {firstItem.text}
                            </span>
                          </div>
                        )}
                        
                        {/* Show "+ X more items..." if more than 1 */}
                        {hasMoreItems && (
                          <div 
                            className="text-[10px] text-blue-500 hover:text-blue-500/80 font-medium italic pl-5 cursor-pointer transition-colors"
                            onClick={() => {
                              setCheckpointPopup({
                                open: true,
                                category: belief.category,
                                type: 'actions',
                                items: checklist
                              });
                            }}
                            data-testid={`text-more-actions-${belief.category.toLowerCase()}`}
                          >
                            + {totalCount - 1} more item{totalCount - 1 > 1 ? 's' : ''}...
                          </div>
                        )}
                        
                        {/* Empty state */}
                        {totalCount === 0 && (
                          <p className="text-[10px] text-muted-foreground italic text-center py-1">
                            No items yet
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </TableCell>

                {/* Unified Assignment Column - Compact view with click popup */}
                {belief.category === 'Health' && (
                  <TableCell rowSpan={4} className="p-2 bg-cyan-50/30 dark:bg-cyan-950/10 align-top">
                    {(() => {
                      // CRITICAL: Persistent assignments should ALWAYS show across all dates
                      const assignmentsToDisplay = persistentAssignments;
                      
                      const userLessons = assignmentsToDisplay.filter((l: any) => l.source === 'user' || !l.source);
                      const adminLessons = assignmentsToDisplay.filter((l: any) => l.source === 'admin' || l.source === 'admin_recommendation');
                      const customAssignments = assignmentsToDisplay.filter((l: any) => l.source === 'custom');
                      
                      // Combine all assignments
                      const allAssignments = [...customAssignments, ...userLessons, ...adminLessons];
                      const totalCount = allAssignments.length;
                      
                      // Show first 12 items to fill the column height
                      const maxVisibleItems = 12;
                      const visibleItems = allAssignments.slice(0, maxVisibleItems);
                      const hiddenCount = totalCount - maxVisibleItems;
                      const hasMoreItems = hiddenCount > 0;
                      
                      return (
                        <div className="space-y-2">
                          {/* Add Custom Goal Button - ALWAYS VISIBLE IN COLUMN */}
                          {!isAdminView && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditCustomAssignmentId(null);
                                setCustomAssignmentText('');
                                setShowCustomAssignmentDialog(true);
                              }}
                              className="w-full h-8 text-[10px] sm:text-xs px-2 border-dashed border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 flex items-center justify-center gap-1"
                              data-testid="button-add-custom-assignment-column"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add Custom</span>
                            </Button>
                          )}
                          
                          {/* Show multiple assignments until column end */}
                          {visibleItems.map((assignment, index) => (
                            <div key={assignment.id} className="flex items-center gap-2 group/assignment">
                              <Checkbox
                                checked={assignment.completed}
                                onCheckedChange={() => handleUnifiedAssignmentToggle(assignment.id)}
                                disabled={isAdminView}
                                className="h-3 w-3 shrink-0"
                                data-testid={`checkbox-assignment-preview-${assignment.id}`}
                              />
                              {assignment.source === 'custom' ? (
                                <span 
                                  className="text-xs line-clamp-1 text-purple-700 dark:text-purple-400 cursor-pointer hover:underline flex-1 min-w-0"
                                  onClick={() => {
                                    if (!isAdminView) {
                                      setEditCustomAssignmentId(assignment.id);
                                      setCustomAssignmentText(assignment.customText || '');
                                      setShowCustomAssignmentDialog(true);
                                    }
                                  }}
                                  data-testid={`text-edit-custom-assignment-${assignment.id}`}
                                >
                                  {assignment.customText}
                                </span>
                              ) : (
                                <a
                                  href={assignment.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs line-clamp-1 text-cyan-700 dark:text-cyan-400 hover:underline flex-1 min-w-0"
                                  data-testid={`link-assignment-preview-${assignment.id}`}
                                >
                                  {assignment.lessonName || assignment.courseName}
                                </a>
                              )}
                              {!isAdminView && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleRemoveUnifiedAssignment(assignment.id)}
                                  className="h-4 w-4 p-0 shrink-0"
                                  data-testid={`button-remove-assignment-preview-${assignment.id}`}
                                >
                                  <Trash2 className="w-3 h-3 text-destructive" />
                                </Button>
                              )}
                            </div>
                          ))}
                          
                          {/* Show "+ X more items..." if there are hidden items */}
                          {hasMoreItems && (
                            <div 
                              className="text-xs text-primary hover:text-primary/80 font-medium italic pl-5 cursor-pointer transition-colors"
                              onClick={() => setAssignmentDialog(true)}
                              data-testid="text-show-more-assignments"
                            >
                              + {hiddenCount} more item{hiddenCount > 1 ? 's' : ''}...
                            </div>
                          )}
                          
                          {/* Empty state - show when no assignments exist */}
                          {totalCount === 0 && (
                            <p className="text-xs text-muted-foreground italic text-center py-1">
                              No assignments yet
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </TableCell>
                )}
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
                          dateString: currentDateStr, // 🔥 CRITICAL FIX: Use selected calendar date
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

      {/* Text Block Edit Dialog (Emotional Tracker Style) */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              Edit {editingField?.field === 'problems' ? 'Problems' : 
                    editingField?.field === 'currentFeelings' ? 'Feelings' : 
                    editingField?.field === 'currentBelief' ? 'Beliefs' : 
                    editingField?.field === 'currentActions' ? 'Actions' : 
                    editingField?.field === 'result' ? 'Results' : 
                    editingField?.field === 'nextFeelings' ? 'Next Week Feelings' : 
                    editingField?.field === 'nextWeekTarget' ? 'Next Week Beliefs/Reasons' : 
                    editingField?.field === 'nextActions' ? 'Next Week Actions' : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={dialogValue}
              onChange={(e) => setDialogValue(e.target.value)}
              placeholder="Enter text..."
              className="min-h-[200px] text-sm"
              data-testid="textarea-text-block-edit"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Read-Only Text Dialog (for viewing history) */}
      <Dialog open={readOnlyDialogOpen} onOpenChange={setReadOnlyDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {readOnlyDialogTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 max-h-[60vh] overflow-y-auto">
            <div className="p-4 rounded-lg border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
              <p className="text-sm whitespace-pre-wrap break-words leading-relaxed text-foreground">
                {readOnlyDialogContent}
              </p>
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => setReadOnlyDialogOpen(false)}
              data-testid="button-close-readonly"
            >
              Close
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
                Add {
                  firstCheckpointData?.checklistType === 'result' ? 'Result' :
                  firstCheckpointData?.checklistType === 'feelings' ? 'Feeling' :
                  firstCheckpointData?.checklistType === 'beliefs' ? 'Belief' :
                  firstCheckpointData?.checklistType === 'actions' ? 'Action' :
                  firstCheckpointData?.checklistType === 'problems' ? 'Problem' :
                  firstCheckpointData?.checklistType === 'feelingsCurrent' ? 'Feeling' :
                  firstCheckpointData?.checklistType === 'beliefsCurrent' ? 'Belief' :
                  firstCheckpointData?.checklistType === 'actionsCurrent' ? 'Action' : 'Checkpoint'
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Custom Assignment Dialog - Click Outside to Save */}
      <Dialog 
        open={showCustomAssignmentDialog} 
        onOpenChange={(open) => {
          // Auto-save when clicking outside (closing dialog)
          if (!open && customAssignmentText.trim()) {
            // Save the custom assignment before closing
            if (editCustomAssignmentId) {
              updateCustomAssignmentMutation.mutate({ id: editCustomAssignmentId, customText: customAssignmentText });
            } else {
              createCustomAssignmentMutation.mutate(customAssignmentText);
            }
          }
          
          // Close dialog and reset state
          if (!open) {
            setShowCustomAssignmentDialog(false);
            setCustomAssignmentText('');
            setEditCustomAssignmentId(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {editCustomAssignmentId ? 'Edit Custom Goal' : 'Add Custom Goal'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg border-2 bg-gradient-to-br from-purple-100/50 to-purple-50/30 dark:from-purple-900/20 dark:to-purple-950/20 border-purple-200 dark:border-purple-800">
              <Textarea
                value={customAssignmentText}
                onChange={(e) => setCustomAssignmentText(e.target.value)}
                onFocus={(e) => {
                  const length = e.target.value.length;
                  e.target.setSelectionRange(length, length);
                }}
                placeholder="Enter your custom goal..."
                className="min-h-[100px] text-sm bg-white dark:bg-gray-950 border-muted"
                autoFocus
                data-testid="textarea-custom-assignment"
              />
            </div>
            <div className="flex gap-2 justify-between">
              <div className="flex gap-2">
                {editCustomAssignmentId && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (editCustomAssignmentId) {
                        handleRemoveUnifiedAssignment(editCustomAssignmentId);
                        setShowCustomAssignmentDialog(false);
                        setCustomAssignmentText('');
                        setEditCustomAssignmentId(null);
                      }
                    }}
                    data-testid="button-delete-custom-assignment"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCustomAssignmentDialog(false);
                    setCustomAssignmentText('');
                    setEditCustomAssignmentId(null);
                  }}
                  data-testid="button-cancel-custom-assignment"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveCustomAssignment}
                  disabled={!customAssignmentText.trim() || createCustomAssignmentMutation.isPending || updateCustomAssignmentMutation.isPending}
                  className="bg-gradient-to-r from-purple-600 to-purple-500 text-white hover:opacity-90"
                  data-testid="button-save-custom-assignment"
                >
                  {editCustomAssignmentId ? 'Update Goal' : 'Add Goal'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Assignment Full List Dialog (Click-based, No Scroll in Column) */}
      <Dialog 
        open={assignmentDialog} 
        onOpenChange={setAssignmentDialog}
      >
        <DialogContent className="max-w-lg max-h-[700px] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold bg-gradient-to-r from-cyan-600 to-cyan-400 bg-clip-text text-transparent">
              All Assignments
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Your custom goals, course lessons, and recommendations
            </p>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Add Custom Goal Button - AT THE TOP */}
            {!isAdminView && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditCustomAssignmentId(null);
                  setCustomAssignmentText('');
                  setShowCustomAssignmentDialog(true);
                }}
                className="w-full h-9 text-sm border-dashed border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30"
                data-testid="button-add-custom-assignment-dialog"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Custom Goal
              </Button>
            )}
            
            {(() => {
              const assignmentsToDisplay = persistentAssignments;
              const userLessons = assignmentsToDisplay.filter((l: any) => l.source === 'user' || !l.source);
              const adminLessons = assignmentsToDisplay.filter((l: any) => l.source === 'admin' || l.source === 'admin_recommendation');
              const customAssignments = assignmentsToDisplay.filter((l: any) => l.source === 'custom');
              const totalCount = customAssignments.length + userLessons.length + adminLessons.length;
              
              if (totalCount === 0) {
                return (
                  <p className="text-sm text-muted-foreground italic text-center py-4">
                    No assignments yet. Add custom goals or check lessons in Course Tracker.
                  </p>
                );
              }
              
              return (
                <>
                  {/* Custom Goals */}
                  {customAssignments.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-purple-600 dark:text-purple-400 border-b pb-1">
                        My Custom Goals ({customAssignments.length})
                      </div>
                      {customAssignments.map((assignment) => (
                        <div key={assignment.id} className="flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-muted/30 transition-colors group/item">
                          <Checkbox
                            checked={assignment.completed}
                            onCheckedChange={() => handleUnifiedAssignmentToggle(assignment.id)}
                            disabled={isAdminView}
                            className="h-5 w-5 mt-0.5 shrink-0"
                            data-testid={`checkbox-dialog-custom-${assignment.id}`}
                          />
                          <span
                            className="text-sm flex-1 text-purple-700 dark:text-purple-400 leading-relaxed break-words cursor-pointer hover:underline"
                            onClick={() => {
                              if (!isAdminView) {
                                setEditCustomAssignmentId(assignment.id);
                                setCustomAssignmentText(assignment.customText || '');
                                setShowCustomAssignmentDialog(true);
                              }
                            }}
                          >
                            {assignment.customText}
                          </span>
                          {!isAdminView && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveUnifiedAssignment(assignment.id)}
                              className="h-6 w-6 p-0 shrink-0"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Course Lessons */}
                  {userLessons.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-cyan-600 dark:text-cyan-400 border-b pb-1">
                        Course Lessons ({userLessons.length})
                      </div>
                      {userLessons.map((lesson) => (
                        <div key={lesson.id} className="flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-muted/30 transition-colors group/item">
                          <Checkbox
                            checked={lesson.completed}
                            onCheckedChange={() => handleUnifiedAssignmentToggle(lesson.id)}
                            disabled={isAdminView}
                            className="h-5 w-5 mt-0.5 shrink-0"
                            data-testid={`checkbox-dialog-user-${lesson.id}`}
                          />
                          <a
                            href={lesson.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm hover:underline flex-1 text-cyan-700 dark:text-cyan-400 leading-relaxed break-words"
                          >
                            {lesson.lessonName || lesson.courseName}
                          </a>
                          {!isAdminView && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveUnifiedAssignment(lesson.id)}
                              className="h-6 w-6 p-0 shrink-0"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Recommended Lessons */}
                  {adminLessons.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-pink-600 dark:text-pink-400 border-b pb-1">
                        Recommended Lessons ({adminLessons.length})
                      </div>
                      {adminLessons.map((lesson) => (
                        <div key={lesson.id} className="flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-muted/30 transition-colors group/item">
                          <Checkbox
                            checked={lesson.completed}
                            onCheckedChange={() => handleUnifiedAssignmentToggle(lesson.id)}
                            disabled={isAdminView}
                            className="h-5 w-5 mt-0.5 shrink-0"
                            data-testid={`checkbox-dialog-admin-${lesson.id}`}
                          />
                          <a
                            href={lesson.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm hover:underline flex-1 text-pink-700 dark:text-pink-400 leading-relaxed break-words"
                          >
                            {lesson.lessonName || lesson.courseName}
                          </a>
                          {!isAdminView && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveUnifiedAssignment(lesson.id)}
                              className="h-6 w-6 p-0 shrink-0"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
          <div className="flex justify-end pt-3 border-t">
            <Button
              variant="outline"
              onClick={() => setAssignmentDialog(false)}
              data-testid="button-close-assignment-dialog"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Platinum Standards Full Checklist Dialog (Click-based, No Hover) */}
      <Dialog 
        open={platinumStandardsDialog.open} 
        onOpenChange={(open) => setPlatinumStandardsDialog({ ...platinumStandardsDialog, open })}
      >
        <DialogContent className="max-w-md max-h-[600px] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent">
              {platinumStandardsDialog.category} Platinum Standards
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Rate each standard from 0 to 7
            </p>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {(() => {
              // Get platinum standards for current category from API
              const categoryKey = platinumStandardsDialog.category.toLowerCase();
              const categoryStandards = (platinumStandards as any[]).filter(
                (s: any) => s.category === categoryKey && s.isActive
              );
              
              return (
                <>
                  <div className="px-3 pb-3 border-b">
                    <span className="text-sm font-semibold text-muted-foreground">How many days in this week did you follow the standards?</span>
                  </div>
                  {categoryStandards.map((standard: any) => (
                    <div key={standard.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/30 transition-colors">
                      <Input
                        type="number"
                        min="0"
                        max="7"
                        value={standardRatings[standard.id] || 0}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          if (value >= 0 && value <= 7) {
                            handlePlatinumStandardRatingChange(standard.id, value);
                          }
                        }}
                        disabled={!!viewAsUserId || isAdminView}
                        className="w-16 h-8 text-center shrink-0"
                        data-testid={`input-rating-${standard.id}`}
                      />
                      <span className="text-sm leading-relaxed flex-1 break-words">
                        {standard.standardText}
                      </span>
                    </div>
                  ))}
                </>
              );
            })()}
          </div>
          <div className="flex justify-end pt-3 border-t">
            <Button
              variant="outline"
              onClick={() => setPlatinumStandardsDialog({ open: false, category: '', items: [] })}
              data-testid="button-close-standards-dialog"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Checkpoint Popup Dialog (for Next Week Target boxes) */}
      <Dialog 
        open={checkpointPopup.open} 
        onOpenChange={(open) => setCheckpointPopup({ ...checkpointPopup, open })}
      >
        <DialogContent className="max-w-md max-h-[600px] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {checkpointPopup.category} - {checkpointPopup.type === 'result' ? 'Results' : checkpointPopup.type === 'feelings' ? 'Feelings' : checkpointPopup.type === 'beliefs' ? 'Beliefs/Reasons' : 'Actions'}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {checkpointPopup.items.length} item{checkpointPopup.items.length > 1 ? 's' : ''}
            </p>
          </DialogHeader>
          <div className="space-y-2 py-4">
            {checkpointPopup.items.map((item, index) => (
              <div key={item.id} className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-muted/30 transition-colors">
                <span className={`text-sm font-semibold shrink-0 ${
                  checkpointPopup.type === 'result' ? 'text-coral-red' :
                  checkpointPopup.type === 'feelings' ? 'text-emerald-green' :
                  checkpointPopup.type === 'beliefs' ? 'text-golden-yellow' :
                  'text-blue-500'
                }`}>
                  {index + 1}.
                </span>
                <Checkbox
                  checked={item.checked}
                  onCheckedChange={() => handleCheckpointToggle(checkpointPopup.category, checkpointPopup.type, item.id)}
                  disabled={isAdminView || viewingHistory || !!viewAsUserId}
                  className="h-4 w-4 shrink-0"
                  data-testid={`checkbox-popup-${checkpointPopup.type}-${index}`}
                />
                <span 
                  className={`text-sm flex-1 leading-relaxed break-words cursor-pointer hover:underline ${
                    checkpointPopup.type === 'result' ? 'text-coral-red' :
                    checkpointPopup.type === 'feelings' ? 'text-emerald-green' :
                    checkpointPopup.type === 'beliefs' ? 'text-golden-yellow' :
                    'text-blue-500'
                  }`}
                  onClick={() => {
                    if (!isAdminView && !viewingHistory && !viewAsUserId) {
                      setFirstCheckpointData({
                        category: checkpointPopup.category,
                        checklistType: checkpointPopup.type,
                        text: item.text
                      });
                      setShowFirstCheckpointDialog(true);
                      // Close the popup
                      setCheckpointPopup({ open: false, category: '', type: 'result', items: [] });
                    }
                  }}
                  data-testid={`text-edit-popup-${checkpointPopup.type}-${index}`}
                >
                  {item.text}
                </span>
                {!isAdminView && !viewingHistory && !viewAsUserId && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCheckpointDelete(checkpointPopup.category, checkpointPopup.type, item.id)}
                    className="h-6 w-6 p-0 shrink-0"
                    data-testid={`button-delete-${checkpointPopup.type}-${index}`}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-3 border-t">
            <Button
              variant="outline"
              onClick={() => setCheckpointPopup({ open: false, category: '', type: 'result', items: [] })}
              data-testid="button-close-checkpoint-popup"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Current Week Checkpoint Dialog */}
      <Dialog open={showCurrentWeekCheckpointDialog} onOpenChange={handleCurrentWeekCheckpointDialogClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              Add Current Week Checkpoint
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg border-2 bg-gradient-to-br from-primary/10 to-accent/10">
              <div className="flex items-start gap-2 mb-3">
                <div className="w-1 h-full bg-gradient-to-b from-primary to-accent rounded-full"></div>
                <p className="text-sm font-medium">
                  {currentWeekCheckpointData?.category} - {
                    currentWeekCheckpointData?.checklistType === 'problems' ? 'Problems' : 
                    currentWeekCheckpointData?.checklistType === 'currentFeelings' ? 'Feelings' : 
                    currentWeekCheckpointData?.checklistType === 'currentBeliefs' ? 'Beliefs/Reasons' : 
                    currentWeekCheckpointData?.checklistType === 'currentActions' ? 'Actions' : 'Checkpoint'
                  }
                </p>
              </div>
              <Textarea
                value={currentWeekCheckpointData?.text || ''}
                onChange={(e) => setCurrentWeekCheckpointData(prev => prev ? { ...prev, text: e.target.value } : null)}
                onFocus={(e) => {
                  const length = e.target.value.length;
                  e.target.setSelectionRange(length, length);
                }}
                placeholder="Enter your checkpoint..."
                className="min-h-[100px] text-sm bg-white dark:bg-gray-950 border-muted"
                autoFocus
                data-testid="textarea-current-week-checkpoint"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCurrentWeekCheckpointDialog(false);
                  setCurrentWeekCheckpointData(null);
                }}
                data-testid="button-cancel-current-week-checkpoint"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveCurrentWeekCheckpoint}
                disabled={!currentWeekCheckpointData?.text.trim()}
                className="bg-gradient-to-r from-primary to-accent text-white hover:opacity-90"
                data-testid="button-save-current-week-checkpoint"
              >
                Add {
                  currentWeekCheckpointData?.checklistType === 'problems' ? 'Problem' :
                  currentWeekCheckpointData?.checklistType === 'currentFeelings' ? 'Feeling' :
                  currentWeekCheckpointData?.checklistType === 'currentBeliefs' ? 'Belief' :
                  currentWeekCheckpointData?.checklistType === 'currentActions' ? 'Action' : 'Checkpoint'
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Current Week Checkpoint Popup Dialog */}
      <Dialog 
        open={currentWeekCheckpointPopup.open} 
        onOpenChange={(open) => setCurrentWeekCheckpointPopup({ ...currentWeekCheckpointPopup, open })}
      >
        <DialogContent className="max-w-md max-h-[600px] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {currentWeekCheckpointPopup.category} - {currentWeekCheckpointPopup.type === 'problems' ? 'Problems' : currentWeekCheckpointPopup.type === 'currentFeelings' ? 'Feelings' : currentWeekCheckpointPopup.type === 'currentBeliefs' ? 'Beliefs/Reasons' : 'Actions'}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {currentWeekCheckpointPopup.items.length} item{currentWeekCheckpointPopup.items.length > 1 ? 's' : ''}
            </p>
          </DialogHeader>
          <div className="space-y-2 py-4">
            {currentWeekCheckpointPopup.items.map((item, index) => (
              <div key={item.id} className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-muted/30 transition-colors">
                <span className={`text-sm font-semibold shrink-0 ${
                  currentWeekCheckpointPopup.type === 'problems' ? 'text-coral-red' :
                  currentWeekCheckpointPopup.type === 'currentFeelings' ? 'text-emerald-green' :
                  currentWeekCheckpointPopup.type === 'currentBeliefs' ? 'text-golden-yellow' :
                  'text-blue-500'
                }`}>
                  {index + 1}.
                </span>
                <Checkbox
                  checked={item.checked}
                  onCheckedChange={() => handleCurrentWeekCheckpointToggle(currentWeekCheckpointPopup.category, currentWeekCheckpointPopup.type, item.id)}
                  disabled={isAdminView || viewingHistory || !!viewAsUserId}
                  className="h-4 w-4 shrink-0"
                  data-testid={`checkbox-popup-current-week-${currentWeekCheckpointPopup.type}-${index}`}
                />
                <span 
                  className={`text-sm flex-1 leading-relaxed break-words cursor-pointer hover:underline ${
                    currentWeekCheckpointPopup.type === 'problems' ? 'text-coral-red' :
                    currentWeekCheckpointPopup.type === 'currentFeelings' ? 'text-emerald-green' :
                    currentWeekCheckpointPopup.type === 'currentBeliefs' ? 'text-golden-yellow' :
                    'text-blue-500'
                  }`}
                  onClick={() => {
                    if (!isAdminView && !viewingHistory && !viewAsUserId) {
                      setCurrentWeekCheckpointData({
                        category: currentWeekCheckpointPopup.category,
                        checklistType: currentWeekCheckpointPopup.type,
                        text: item.text
                      });
                      setShowCurrentWeekCheckpointDialog(true);
                      // Close the popup
                      setCurrentWeekCheckpointPopup({ open: false, category: '', type: 'problems', items: [] });
                    }
                  }}
                  data-testid={`text-edit-popup-current-week-${currentWeekCheckpointPopup.type}-${index}`}
                >
                  {item.text}
                </span>
                {!isAdminView && !viewingHistory && !viewAsUserId && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCurrentWeekCheckpointDelete(currentWeekCheckpointPopup.category, currentWeekCheckpointPopup.type, item.id)}
                    className="h-6 w-6 p-0 shrink-0"
                    data-testid={`button-delete-current-week-${currentWeekCheckpointPopup.type}-${index}`}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-3 border-t">
            <Button
              variant="outline"
              onClick={() => setCurrentWeekCheckpointPopup({ open: false, category: '', type: 'problems', items: [] })}
              data-testid="button-close-current-week-checkpoint-popup"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
