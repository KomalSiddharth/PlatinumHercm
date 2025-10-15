import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkles, Check, X, TrendingUp, Save, Loader2, ArrowUp, ArrowDown, History } from 'lucide-react';
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
import WeekComparison from './WeekComparison';
import HRCMHistoryModal from './HRCMHistoryModal';
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
  weekNumber: number;
  onWeekChange?: (newWeek: number) => void;
}

// Generate completely blank beliefs for a new week - absolutely no pre-filled data
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
  if (progress >= 80) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
  if (progress >= 50) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
};

// Health Standards - Predefined checklist for Health category (4 standards)
const HEALTH_STANDARDS: ChecklistItem[] = [
  { id: 'health-std-1', text: 'Eat clean meals', checked: false },
  { id: 'health-std-2', text: 'Drink 8–10 glasses water', checked: false },
  { id: 'health-std-3', text: 'Move 30 mins daily', checked: false },
  { id: 'health-std-4', text: 'Sleep 7–8 hrs, no late screens', checked: false },
];

// Relationship Standards - Predefined checklist for Relationship category (4 standards)
const RELATIONSHIP_STANDARDS: ChecklistItem[] = [
  { id: 'relationship-std-1', text: 'Communicated with respect and kindness', checked: false },
  { id: 'relationship-std-2', text: 'Practiced active and empathetic listening', checked: false },
  { id: 'relationship-std-3', text: 'Showed appreciation and gratitude to others', checked: false },
  { id: 'relationship-std-4', text: 'Resolved conflicts peacefully and constructively', checked: false },
];

// Career Standards - Predefined checklist for Career category (4 standards)
const CAREER_STANDARDS: ChecklistItem[] = [
  { id: 'career-std-1', text: 'Added significant value in all work tasks', checked: false },
  { id: 'career-std-2', text: 'Focused on serving others and contributing positively', checked: false },
  { id: 'career-std-3', text: 'Invested time in developing professional skills', checked: false },
  { id: 'career-std-4', text: 'Maintained positive and productive work mindset', checked: false },
];

// Money Standards - Predefined checklist for Money category (4 standards)
const MONEY_STANDARDS: ChecklistItem[] = [
  { id: 'money-std-1', text: 'Practiced abundance mindset and generosity', checked: false },
  { id: 'money-std-2', text: 'Developed money-making skills and opportunities', checked: false },
  { id: 'money-std-3', text: 'Made wise and conscious financial decisions', checked: false },
  { id: 'money-std-4', text: 'Expressed gratitude for financial blessings', checked: false },
];

export default function UnifiedHRCMTable({ weekNumber, onWeekChange }: UnifiedHRCMTableProps) {
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
  const lastFocusedButton = useRef<HTMLButtonElement | null>(null);
  const hasAutoProgressed = useRef<Set<number>>(new Set()); // Track which weeks have been auto-progressed
  const { toast} = useToast();

  // Fetch current week data from database
  const { data: weekData, isLoading } = useQuery<{ beliefs?: HRCMBelief[]; createdAt?: string }>({
    queryKey: ['/api/hercm/week', weekNumber],
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

  useEffect(() => {
    // Priority: Use actual database data if available, otherwise use demo/blank template
    if (weekData?.beliefs) {
      // Use saved ratings from database - DO NOT recalculate based on checklist
      setBeliefs(weekData.beliefs);
      // Load unified assignment from week data
      setUnifiedAssignment((weekData as any).unifiedAssignment || []);
    } else {
      // No database data - use demo/blank template immediately (don't wait for loading)
      setBeliefs(getWeekBeliefs(weekNumber));
      setUnifiedAssignment([]);
    }
  }, [weekNumber, weekData, ratingCaps]);

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
    setBeliefs(prev => prev.map(belief => {
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
    }));
  };

  // Open standards dialog for a category
  const handleOpenStandardsDialog = (category: string) => {
    setSelectedCategory(category);
    
    if (category === 'Health') {
      setBeliefs(prev => prev.map(b => {
        if (b.category === 'Health') {
          const existingChecklist = b.checklist || [];
          
          // Check if this is the old format by looking for health-std-* IDs
          const hasNewFormat = existingChecklist.some(item => item.id.startsWith('health-std-'));
          
          if (!hasNewFormat || existingChecklist.length !== 4) {
            // Replace with new 4 health standards
            return {
              ...b,
              checklist: HEALTH_STANDARDS.map(std => ({ ...std })),
              currentRating: 0,
              targetRating: 1
            };
          }
          
          // Already has new format, keep as is
          return b;
        }
        return b;
      }));
    } else if (category === 'Relationship') {
      setBeliefs(prev => prev.map(b => {
        if (b.category === 'Relationship') {
          const existingChecklist = b.checklist || [];
          
          // Check if this is the old format by looking for relationship-std-* IDs
          const hasNewFormat = existingChecklist.some(item => item.id.startsWith('relationship-std-'));
          
          if (!hasNewFormat || existingChecklist.length !== 4) {
            // Replace with new 4 relationship standards
            return {
              ...b,
              checklist: RELATIONSHIP_STANDARDS.map(std => ({ ...std })),
              currentRating: 0,
              targetRating: 1
            };
          }
          
          // Already has new format, keep as is
          return b;
        }
        return b;
      }));
    } else if (category === 'Career') {
      setBeliefs(prev => prev.map(b => {
        if (b.category === 'Career') {
          const existingChecklist = b.checklist || [];
          
          // Check if this is the old format by looking for career-std-* IDs
          const hasNewFormat = existingChecklist.some(item => item.id.startsWith('career-std-'));
          
          if (!hasNewFormat || existingChecklist.length !== 4) {
            // Replace with new 4 career standards
            return {
              ...b,
              checklist: CAREER_STANDARDS.map(std => ({ ...std })),
              currentRating: 0,
              targetRating: 1
            };
          }
          
          // Already has new format, keep as is
          return b;
        }
        return b;
      }));
    } else if (category === 'Money') {
      setBeliefs(prev => prev.map(b => {
        if (b.category === 'Money') {
          const existingChecklist = b.checklist || [];
          
          // Check if this is the old format by looking for money-std-* IDs
          const hasNewFormat = existingChecklist.some(item => item.id.startsWith('money-std-'));
          
          if (!hasNewFormat || existingChecklist.length !== 4) {
            // Replace with new 4 money standards
            return {
              ...b,
              checklist: MONEY_STANDARDS.map(std => ({ ...std })),
              currentRating: 0,
              targetRating: 1
            };
          }
          
          // Already has new format, keep as is
          return b;
        }
        return b;
      }));
    }
    
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hercm/weeks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rating-progression/caps'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rating-progression/status'] });
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

  // AI Auto-Fill Next Week mutation
  const aiAutoFillMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/hercm/ai-autofill-next-week', {
        beliefs: beliefs.map(b => ({
          category: b.category,
          currentRating: b.currentRating,
          problems: b.problems,
          currentFeelings: b.currentFeelings,
          currentBelief: b.currentBelief,
          currentActions: b.currentActions,
        }))
      });
      return response.json();
    },
    onSuccess: (data) => {
      setBeliefs(prev => prev.map(belief => {
        const aiData = data.find((d: any) => d.category === belief.category);
        return aiData ? {
          ...belief,
          result: aiData.result || belief.result,
          nextFeelings: aiData.feelings || belief.nextFeelings,
          nextWeekTarget: aiData.target || belief.nextWeekTarget,
          nextActions: aiData.actions || belief.nextActions,
        } : belief;
      }));
      
      toast({
        title: 'AI Auto-Fill Complete!',
        description: 'Next week suggestions have been generated.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to generate AI suggestions.',
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
  const handleAIAutoFill = () => {
    aiAutoFillMutation.mutate();
  };

  const handleGenerateNextWeek = () => {
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
            className={`${getProgressColor(weeklyProgress)} cursor-pointer hover:opacity-80 transition-opacity`}
            onClick={() => setProgressOpen(true)}
            data-testid="badge-weekly-progress"
          >
            {weeklyProgress}% Weekly Progress
          </Badge>
          
          <Button
            size="sm"
            onClick={() => setHistoryOpen(true)}
            className="bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-700 hover:to-red-700 text-white"
            data-testid="button-history"
          >
            <History className="w-4 h-4 mr-2" />
            History
          </Button>
          
          <Button
            size="sm"
            onClick={handleAIAutoFill}
            disabled={aiAutoFillMutation.isPending}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white"
            data-testid="button-ai-autofill"
          >
            {aiAutoFillMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            AI Auto-Fill Next Week
          </Button>
          
          <Button
            size="sm"
            onClick={handleGenerateNextWeek}
            disabled={generateNextWeekMutation.isPending}
            className="bg-gradient-to-r from-pink-600 to-coral-600 hover:from-pink-700 hover:to-coral-700 text-white"
            data-testid="button-generate-next-week"
          >
            {generateNextWeekMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <TrendingUp className="w-4 h-4 mr-2" />
            )}
            Generate Next Week
          </Button>
        </div>
      </div>

      {/* Current Week Table */}
      <div className="border-2 border-red-800 dark:border-red-900 rounded-lg overflow-x-auto shadow-lg">
        <div className="px-4 py-3 border-b-2 border-red-900 dark:border-red-950" style={{ backgroundColor: '#bc0000' }}>
          <h3 className="font-bold text-white text-xl text-center drop-shadow-md flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5" />
            Current Week
          </h3>
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
              
              <TableHead className="min-w-[150px] bg-gradient-to-r from-purple-100 to-violet-100 dark:from-purple-900/40 dark:to-violet-900/40 font-semibold">Platinum Standards</TableHead>
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
                <TableCell className="p-2 bg-red-50/30 dark:bg-red-950/10 align-top">
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="outline"
                      onClick={() => handleOpenStandardsDialog(belief.category)}
                      className="w-16 h-9 text-center font-semibold"
                      data-testid={`button-${belief.category.toLowerCase()}-rating`}
                    >
                      {belief.currentRating}/10
                    </Button>
                    {ratingProgression && (() => {
                      const categoryLower = belief.category.toLowerCase();
                      const weeksAtMax = ratingProgression[`${categoryLower}WeeksAtMax` as keyof typeof ratingProgression] || 0;
                      const maxRating = ratingCaps?.[categoryLower as keyof typeof ratingCaps] || 7;
                      if (belief.currentRating === maxRating && weeksAtMax > 0) {
                        return (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0 h-5 justify-center">
                            {weeksAtMax}/4 weeks
                          </Badge>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </TableCell>

                {/* Current Week - Problems */}
                <TableCell className="p-0 bg-red-50/30 dark:bg-red-950/10 align-top">
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
                    <button
                      className="w-full text-left text-xs p-2 hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset rounded"
                      onClick={(e) => startEdit(belief.category, 'problems', belief.problems, e.currentTarget)}
                      type="button"
                      aria-label="Edit problems"
                      data-testid={`text-problems-${belief.category.toLowerCase()}`}
                    >
                      {belief.problems || <span className="text-muted-foreground italic">Click to add problems...</span>}
                    </button>
                  )}
                </TableCell>

                {/* Current Week - Feelings */}
                <TableCell className="p-0 bg-red-50/30 dark:bg-red-950/10 align-top">
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
                    <button
                      className="w-full text-left text-xs p-2 hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset rounded"
                      onClick={(e) => startEdit(belief.category, 'currentFeelings', belief.currentFeelings, e.currentTarget)}
                      type="button"
                      aria-label="Edit feelings"
                      data-testid={`text-feelings-${belief.category.toLowerCase()}`}
                    >
                      {belief.currentFeelings || <span className="text-muted-foreground italic">Click to add feelings...</span>}
                    </button>
                  )}
                </TableCell>

                {/* Current Week - Beliefs */}
                <TableCell className="p-0 bg-red-50/30 dark:bg-red-950/10 align-top">
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
                    <button
                      className="w-full text-left text-xs p-2 hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset rounded"
                      onClick={(e) => startEdit(belief.category, 'currentBelief', belief.currentBelief, e.currentTarget)}
                      type="button"
                      aria-label="Edit beliefs"
                      data-testid={`text-beliefs-${belief.category.toLowerCase()}`}
                    >
                      {belief.currentBelief || <span className="text-muted-foreground italic">Click to add beliefs...</span>}
                    </button>
                  )}
                </TableCell>

                {/* Current Week - Actions */}
                <TableCell className="p-0 bg-red-50/30 dark:bg-red-950/10 border-r align-top">
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
                    <button
                      className="w-full text-left text-xs p-2 hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset rounded"
                      onClick={(e) => startEdit(belief.category, 'currentActions', belief.currentActions, e.currentTarget)}
                      type="button"
                      aria-label="Edit actions"
                      data-testid={`text-actions-${belief.category.toLowerCase()}`}
                    >
                      {belief.currentActions || <span className="text-muted-foreground italic">Click to add actions...</span>}
                    </button>
                  )}
                </TableCell>

                {/* Checklist */}
                <TableCell className="p-2 bg-purple-50/30 dark:bg-purple-950/10 align-top">
                  <div className="space-y-1">
                    {belief.checklist.map((item) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={item.checked}
                          onCheckedChange={() => handleChecklistToggle(belief.category, item.id)}
                          data-testid={`checkbox-${belief.category.toLowerCase()}-${item.id}`}
                        />
                        <span className="text-xs">
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
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
      <div className="border-2 border-green-600 dark:border-green-800 rounded-lg overflow-x-auto shadow-lg">
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-700 dark:to-emerald-700 px-4 py-3 border-b-2 border-green-700 dark:border-green-900">
          <h3 className="font-bold text-white text-xl text-center drop-shadow-md flex items-center justify-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Next Week Target
          </h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30">
              <TableHead className="font-bold border-r min-w-[100px]">HRCM Area</TableHead>
              <TableHead className="min-w-[60px] bg-blue-100 dark:bg-blue-900/40 font-semibold">Rating</TableHead>
              <TableHead className="min-w-[140px] bg-blue-100 dark:bg-blue-900/40 font-semibold">Results</TableHead>
              <TableHead className="min-w-[140px] bg-blue-100 dark:bg-blue-900/40 font-semibold">Feelings</TableHead>
              <TableHead className="min-w-[140px] bg-blue-100 dark:bg-blue-900/40 font-semibold">Beliefs/Reasons</TableHead>
              <TableHead className="min-w-[140px] bg-blue-100 dark:bg-blue-900/40 font-semibold border-r">Actions</TableHead>
              
              <TableHead className="min-w-[130px] bg-gradient-to-r from-cyan-100 to-blue-100 dark:from-cyan-900/40 dark:to-blue-900/40 font-semibold">
                <div className="flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  Assignment
                </div>
              </TableHead>
              <TableHead className="min-w-[150px] bg-gradient-to-r from-purple-100 to-violet-100 dark:from-purple-900/40 dark:to-violet-900/40 font-semibold">Platinum Standards</TableHead>
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
                <TableCell className="p-0 bg-blue-50/30 dark:bg-blue-950/10 align-top">
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
                    <div
                      className="w-full p-2 space-y-1 hover:bg-muted/30 cursor-pointer rounded"
                      onClick={(e) => {
                        // Only open edit if we didn't click on the checkbox
                        const target = e.target as HTMLElement;
                        if (!target.closest('button[role="checkbox"]')) {
                          startEdit(belief.category, 'result', belief.result, e.currentTarget as any);
                        }
                      }}
                      data-testid={`button-edit-result-${belief.category.toLowerCase()}`}
                    >
                      {belief.resultChecklist.map((item) => (
                        <div key={item.id} className="flex items-center gap-2">
                          <Checkbox
                            checked={item.checked}
                            onCheckedChange={() => handleResultChecklistToggle(belief.category, item.id)}
                            className="h-3 w-3"
                            data-testid={`checkbox-result-${belief.category.toLowerCase()}-${item.id}`}
                          />
                          <span className="text-xs">{item.text}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <button
                      className="w-full text-left text-xs p-2 hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset rounded"
                      onClick={(e) => startEdit(belief.category, 'result', belief.result, e.currentTarget)}
                      type="button"
                      aria-label="Edit target result"
                      data-testid={`text-next-problems-${belief.category.toLowerCase()}`}
                    >
                      <span className="text-muted-foreground italic">Click to add target result...</span>
                    </button>
                  )}
                </TableCell>

                {/* Next Week - Feelings */}
                <TableCell className="p-0 bg-blue-50/30 dark:bg-blue-950/10 align-top">
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
                    <div
                      className="w-full p-2 space-y-1 hover:bg-muted/30 cursor-pointer rounded"
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (!target.closest('button[role="checkbox"]')) {
                          startEdit(belief.category, 'nextFeelings', belief.nextFeelings, e.currentTarget as any);
                        }
                      }}
                      data-testid={`button-edit-feelings-${belief.category.toLowerCase()}`}
                    >
                      {belief.feelingsChecklist.map((item) => (
                        <div key={item.id} className="flex items-center gap-2">
                          <Checkbox
                            checked={item.checked}
                            onCheckedChange={() => handleFeelingsChecklistToggle(belief.category, item.id)}
                            className="h-3 w-3"
                            data-testid={`checkbox-feelings-${belief.category.toLowerCase()}-${item.id}`}
                          />
                          <span className="text-xs">{item.text}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <button
                      className="w-full text-left text-xs p-2 hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset rounded"
                      onClick={(e) => startEdit(belief.category, 'nextFeelings', belief.nextFeelings, e.currentTarget)}
                      type="button"
                      aria-label="Edit next week feelings"
                      data-testid={`text-next-feelings-${belief.category.toLowerCase()}`}
                    >
                      <span className="text-muted-foreground italic">Click to add feelings...</span>
                    </button>
                  )}
                </TableCell>

                {/* Next Week - Beliefs/Reasons */}
                <TableCell className="p-0 bg-blue-50/30 dark:bg-blue-950/10 align-top">
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
                    <div
                      className="w-full p-2 space-y-1 hover:bg-muted/30 cursor-pointer rounded"
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (!target.closest('button[role="checkbox"]')) {
                          startEdit(belief.category, 'nextWeekTarget', belief.nextWeekTarget, e.currentTarget as any);
                        }
                      }}
                      data-testid={`button-edit-beliefs-${belief.category.toLowerCase()}`}
                    >
                      {belief.beliefsChecklist.map((item) => (
                        <div key={item.id} className="flex items-center gap-2">
                          <Checkbox
                            checked={item.checked}
                            onCheckedChange={() => handleBeliefsChecklistToggle(belief.category, item.id)}
                            className="h-3 w-3"
                            data-testid={`checkbox-beliefs-${belief.category.toLowerCase()}-${item.id}`}
                          />
                          <span className="text-xs">{item.text}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <button
                      className="w-full text-left text-xs p-2 hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset rounded"
                      onClick={(e) => startEdit(belief.category, 'nextWeekTarget', belief.nextWeekTarget, e.currentTarget)}
                      type="button"
                      aria-label="Edit next week beliefs"
                      data-testid={`text-next-beliefs-${belief.category.toLowerCase()}`}
                    >
                      <span className="text-muted-foreground italic">Click to add beliefs...</span>
                    </button>
                  )}
                </TableCell>

                {/* Next Week - Actions */}
                <TableCell className="p-0 bg-blue-50/30 dark:bg-blue-950/10 border-r align-top">
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
                    <div
                      className="w-full p-2 space-y-1 hover:bg-muted/30 cursor-pointer rounded"
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (!target.closest('button[role="checkbox"]')) {
                          startEdit(belief.category, 'nextActions', belief.nextActions, e.currentTarget as any);
                        }
                      }}
                      data-testid={`button-edit-actions-${belief.category.toLowerCase()}`}
                    >
                      {belief.actionsChecklist.map((item) => (
                        <div key={item.id} className="flex items-center gap-2">
                          <Checkbox
                            checked={item.checked}
                            onCheckedChange={() => handleActionsChecklistToggle(belief.category, item.id)}
                            className="h-3 w-3"
                            data-testid={`checkbox-actions-${belief.category.toLowerCase()}-${item.id}`}
                          />
                          <span className="text-xs">{item.text}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <button
                      className="w-full text-left text-xs p-2 hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset rounded"
                      onClick={(e) => startEdit(belief.category, 'nextActions', belief.nextActions, e.currentTarget)}
                      type="button"
                      aria-label="Edit next week actions"
                      data-testid={`text-next-actions-${belief.category.toLowerCase()}`}
                    >
                      <span className="text-muted-foreground italic">Click to add actions...</span>
                    </button>
                  )}
                </TableCell>

                {/* Unified Assignment Column - Show only for first row with rowspan */}
                {belief.category === 'Health' && (
                  <TableCell rowSpan={4} className="p-2 bg-cyan-50/30 dark:bg-cyan-950/10 align-top">
                    {unifiedAssignment && unifiedAssignment.length > 0 ? (
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-cyan-600 dark:text-cyan-400 mb-2">
                          Course Lessons ({unifiedAssignment.length})
                        </div>
                        {unifiedAssignment.map((lesson) => (
                          <div key={lesson.id} className="flex items-center gap-2 py-0.5">
                            <Checkbox
                              checked={lesson.completed}
                              onCheckedChange={() => handleUnifiedAssignmentToggle(lesson.id)}
                              className="h-3 w-3"
                              data-testid={`checkbox-unified-assignment-${lesson.id}`}
                            />
                            <a
                              href={lesson.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs hover:underline flex-1 text-cyan-700 dark:text-cyan-400"
                              data-testid={`link-unified-assignment-${lesson.id}`}
                            >
                              {lesson.lessonName}
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground italic text-center py-4">
                        No assignments yet. Check lessons in Course Tracker to add them here.
                      </div>
                    )}
                  </TableCell>
                )}

                {/* Checklist */}
                <TableCell className="p-2 bg-purple-50/30 dark:bg-purple-950/10 align-top">
                  <div className="space-y-1">
                    {belief.checklist.map((item) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={item.checked}
                          onCheckedChange={() => handleChecklistToggle(belief.category, item.id)}
                          data-testid={`checkbox-next-${belief.category.toLowerCase()}-${item.id}`}
                        />
                        <span className="text-xs">
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
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

      {/* Weekly Progress Analytics Dialog */}
      <Dialog open={progressOpen} onOpenChange={setProgressOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Week {weekNumber} - Progress Analytics
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Overall Progress */}
            <div className="text-center">
              <div className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {weeklyProgress}%
              </div>
              <p className="text-sm text-muted-foreground mt-2">Overall Weekly Progress</p>
            </div>

            {/* Individual HRCM Progress Bars */}
            <div className="space-y-4">
              {beliefs.map((belief) => {
                const progress = calculateProgress(belief.checklist);
                return (
                  <div key={belief.category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{belief.category}</span>
                      <span className="text-sm font-bold">{progress}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          belief.category === 'Health' ? 'bg-gradient-to-r from-red-500 to-orange-500' :
                          belief.category === 'Relationship' ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                          belief.category === 'Career' ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
                          'bg-gradient-to-r from-green-500 to-emerald-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{belief.checklist.filter(c => c.checked).length}/{belief.checklist.length} standards completed</span>
                      <span>Rating: {belief.currentRating}/10</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {beliefs.reduce((sum, b) => sum + b.checklist.filter(c => c.checked).length, 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Total Standards Completed</p>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <div className="text-2xl font-bold text-accent">
                  {(beliefs.reduce((sum, b) => sum + b.currentRating, 0) / beliefs.length).toFixed(1)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Average Rating</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* HRCM History Modal */}
      <HRCMHistoryModal 
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        currentWeek={weekNumber}
      />

    </div>
  );
}
