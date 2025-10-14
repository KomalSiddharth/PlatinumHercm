import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkles, Check, X, TrendingUp, History, Edit2, Save, Loader2, ArrowUp, ArrowDown } from 'lucide-react';
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

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
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
  // AI Suggestions & Checklist
  checklist: ChecklistItem[];
  courseSuggestion: string;
  affirmationSuggestion: string;
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
      checklist: [],
      courseSuggestion: '',
      affirmationSuggestion: 'I am healthy, strong, and full of energy. My body deserves care and nourishment.'
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
      checklist: [],
      courseSuggestion: '',
      affirmationSuggestion: 'I attract loving relationships. I communicate with clarity, love, and respect.'
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
      checklist: [],
      courseSuggestion: '',
      affirmationSuggestion: 'I am capable and skilled. Success flows to me naturally as I follow my purpose.'
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
      checklist: [],
      courseSuggestion: '',
      affirmationSuggestion: 'I am a money magnet. Abundance flows to me from multiple sources with ease.'
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
  if (checklist.length === 0) return 0;
  const completed = checklist.filter(item => item.checked).length;
  return Math.round((completed / checklist.length) * 100);
};

const getProgressColor = (progress: number) => {
  if (progress >= 80) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
  if (progress >= 50) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
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

export default function UnifiedHRCMTable({ weekNumber, onWeekChange }: UnifiedHRCMTableProps) {
  const [beliefs, setBeliefs] = useState<HRCMBelief[]>([]);
  const [editingField, setEditingField] = useState<{ category: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [loadingCourses, setLoadingCourses] = useState<Set<string>>(new Set());
  const [showStandardsDialog, setShowStandardsDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const lastFocusedButton = useRef<HTMLButtonElement | null>(null);
  const hasAutoProgressed = useRef<Set<number>>(new Set()); // Track which weeks have been auto-progressed
  const { toast} = useToast();

  // Fetch current week data from database
  const { data: weekData, isLoading } = useQuery<{ beliefs?: HRCMBelief[] }>({
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
      // Database has data for this week - use it
      setBeliefs(weekData.beliefs);
    } else {
      // No database data - use demo/blank template immediately (don't wait for loading)
      setBeliefs(getWeekBeliefs(weekNumber));
    }
  }, [weekNumber, weekData]);

  // Fetch AI course recommendations
  const fetchCourseRecommendation = async (category: string, belief: HRCMBelief) => {
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
              courseSuggestion: `${topCourse.course.courseName} (${topCourse.score}% match)\nLink: ${topCourse.course.link}` 
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
        // Get category-specific max rating from API (defaults to 7 if not loaded)
        const categoryLower = category.toLowerCase();
        const maxRating = ratingCaps?.[categoryLower as keyof typeof ratingCaps] || 7;
        
        // Cap both current and target ratings at max allowed
        const cappedRating = Math.min(newRating, maxRating);
        
        return {
          ...belief,
          currentRating: cappedRating,
          targetRating: Math.min(cappedRating + 1, maxRating) // Auto-increment by 1, capped at max
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
          
          if (!hasNewFormat || existingChecklist.length !== 10) {
            // Replace with new 10 health standards
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
          
          if (!hasNewFormat || existingChecklist.length !== 6) {
            // Replace with new 6 relationship standards
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
          
          if (!hasNewFormat || existingChecklist.length !== 5) {
            // Replace with new 5 career standards
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
          
          if (!hasNewFormat || existingChecklist.length !== 5) {
            // Replace with new 5 money standards
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
    setBeliefs(prev => prev.map(belief => {
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
          targetRating: Math.min(newRating + 1, maxRating) // Target is +1, capped at max
        };
      }
      return belief;
    }));
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

  // Get AI course recommendation for a category
  const getAICourseRecommendation = async (category: string) => {
    const belief = beliefs.find(b => b.category === category);
    if (!belief) return;

    // Set loading state
    setLoadingCourses(prev => new Set(prev).add(category));

    try {
      const response = await apiRequest('POST', '/api/courses/recommend-single', {
        category: belief.category,
        currentRating: belief.currentRating,
        problems: belief.problems,
        feelings: belief.currentFeelings,
        beliefs: belief.currentBelief,
        actions: belief.currentActions
      });

      const data = await response.json();

      // Update belief with course suggestion
      setBeliefs(prev => prev.map(b => 
        b.category === category 
          ? { 
              ...b, 
              courseSuggestion: `${data.courseName} (${data.score}% match)\nLink: ${data.courseLink}`
            }
          : b
      ));

      toast({
        title: "AI Course Recommended",
        description: `Found: ${data.courseName}`,
      });

      // Auto-save the updated course suggestion
      saveWeekMutation.mutate({
        weekNumber,
        beliefs
      });
    } catch (error) {
      console.error('Error getting AI course recommendation:', error);
      toast({
        title: "Failed to get AI course",
        description: "Please try again or fill in more HRCM data",
        variant: "destructive"
      });
    } finally {
      setLoadingCourses(prev => {
        const newSet = new Set(prev);
        newSet.delete(category);
        return newSet;
      });
    }
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
        
        // Auto-generate checklist from currentActions or nextActions field
        if ((field === 'currentActions' || field === 'nextActions') && editValue.trim()) {
          const actionLines = editValue
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
          
          const checklist: ChecklistItem[] = actionLines.map((action, index) => ({
            id: `${category}-action-${index}`,
            text: action.replace(/^[-•*]\s*/, ''), // Remove bullet points
            checked: false
          }));
          
          updated = { ...updated, checklist };
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
    
    // Fetch AI course recommendation if current week field was edited
    if (updatedBelief && ['problems', 'currentFeelings', 'currentBelief', 'currentActions'].includes(field)) {
      await fetchCourseRecommendation(category, updatedBelief);
    }
    
    // Generate fresh affirmation if next week target was edited
    if (updatedBelief && field === 'nextWeekTarget' && editValue.trim()) {
      try {
        const response = await apiRequest('POST', '/api/affirmations/generate', {
          category: category,
          currentRating: updatedBelief.currentRating || 1,
          problems: updatedBelief.problems || '',
          currentFeelings: updatedBelief.currentFeelings || '',
          currentBelief: updatedBelief.currentBelief || '',
          currentActions: updatedBelief.currentActions || '',
          nextWeekTarget: editValue,
        });
        
        const data = await response.json();
        
        // Update affirmation in the beliefs array
        const beliefsWithAffirmation = updatedBeliefs.map(belief => {
          if (belief.category === category) {
            return { ...belief, affirmationSuggestion: data.affirmation };
          }
          return belief;
        });
        
        setBeliefs(beliefsWithAffirmation);
        
        // Save with the new affirmation
        saveWeekMutation.mutate({
          weekNumber,
          year: new Date().getFullYear(),
          beliefs: beliefsWithAffirmation,
        });
        
        return; // Early return to avoid duplicate save
      } catch (error) {
        console.error('Error generating affirmation:', error);
        // Continue with normal save if affirmation generation fails
      }
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
            className={getProgressColor(weeklyProgress)} 
            data-testid="badge-weekly-progress"
          >
            {weeklyProgress}% Weekly Progress
          </Badge>
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
              <TableHead className="min-w-[140px] bg-rose-100 dark:bg-rose-900/40 font-semibold">Problems</TableHead>
              <TableHead className="min-w-[140px] bg-rose-100 dark:bg-rose-900/40 font-semibold">Feelings</TableHead>
              <TableHead className="min-w-[140px] bg-rose-100 dark:bg-rose-900/40 font-semibold">Beliefs/Reasons</TableHead>
              <TableHead className="min-w-[140px] bg-rose-100 dark:bg-rose-900/40 font-semibold border-r">Actions</TableHead>
              
              <TableHead className="min-w-[130px] bg-gradient-to-r from-cyan-100 to-blue-100 dark:from-cyan-900/40 dark:to-blue-900/40 font-semibold">
                <div className="flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  AI Course
                </div>
              </TableHead>
              <TableHead className="min-w-[150px] bg-gradient-to-r from-purple-100 to-violet-100 dark:from-purple-900/40 dark:to-violet-900/40 font-semibold">Checklist</TableHead>
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
                      {belief.currentRating}/{ratingCaps?.[belief.category.toLowerCase() as keyof typeof ratingCaps] || 7}
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

                {/* Course Recommendation with Link */}
                <TableCell className="p-2 bg-cyan-50/30 dark:bg-cyan-950/10 align-top">
                  {loadingCourses.has(belief.category) ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-cyan-600" />
                      <span className="text-xs text-muted-foreground">AI analyzing...</span>
                    </div>
                  ) : belief.courseSuggestion ? (
                    (() => {
                      const lines = belief.courseSuggestion.split('\n');
                      const courseName = lines[0] || '';
                      const linkLine = lines.find(l => l.startsWith('Link:'));
                      const link = linkLine ? linkLine.replace('Link:', '').trim() : '';
                      
                      return (
                        <div className="space-y-1">
                          <div className="text-xs text-cyan-700 dark:text-cyan-400 font-medium" data-testid={`text-course-${belief.category.toLowerCase()}`}>
                            {courseName}
                          </div>
                          {link && (
                            <a 
                              href={link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300"
                              data-testid={`link-course-${belief.category.toLowerCase()}`}
                            >
                              View Course →
                            </a>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs mt-1"
                            onClick={() => getAICourseRecommendation(belief.category)}
                            data-testid={`button-refresh-course-${belief.category.toLowerCase()}`}
                          >
                            <Sparkles className="w-3 h-3 mr-1" />
                            Refresh
                          </Button>
                        </div>
                      );
                    })()
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      onClick={() => getAICourseRecommendation(belief.category)}
                      disabled={!belief.problems && !belief.currentFeelings}
                      data-testid={`button-get-course-${belief.category.toLowerCase()}`}
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      Get AI Course
                    </Button>
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
                        <span className={`text-xs ${item.checked ? 'line-through text-muted-foreground' : ''}`}>
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
              <TableHead className="min-w-[140px] bg-blue-100 dark:bg-blue-900/40 font-semibold">Problems</TableHead>
              <TableHead className="min-w-[140px] bg-blue-100 dark:bg-blue-900/40 font-semibold">Feelings</TableHead>
              <TableHead className="min-w-[140px] bg-blue-100 dark:bg-blue-900/40 font-semibold">Beliefs/Reasons</TableHead>
              <TableHead className="min-w-[140px] bg-blue-100 dark:bg-blue-900/40 font-semibold border-r">Actions</TableHead>
              
              <TableHead className="min-w-[130px] bg-gradient-to-r from-cyan-100 to-blue-100 dark:from-cyan-900/40 dark:to-blue-900/40 font-semibold">
                <div className="flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  Affirmations
                </div>
              </TableHead>
              <TableHead className="min-w-[150px] bg-gradient-to-r from-purple-100 to-violet-100 dark:from-purple-900/40 dark:to-violet-900/40 font-semibold">Checklist</TableHead>
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

                {/* Next Week - Rating (Click to set via Standards) */}
                <TableCell className="p-2 bg-blue-50/30 dark:bg-blue-950/10 align-top">
                  <div className="flex flex-col items-center gap-1">
                    <Button
                      variant="outline"
                      onClick={() => handleOpenStandardsDialog(belief.category)}
                      className="w-16 h-9 text-center font-semibold"
                      data-testid={`button-next-${belief.category.toLowerCase()}-rating`}
                    >
                      {belief.targetRating}/10
                    </Button>
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
                      className="min-h-[60px] text-xs border-0"
                      autoFocus
                      data-testid={`textarea-next-problems-${belief.category.toLowerCase()}`}
                    />
                  ) : (
                    <button
                      className="w-full text-left text-xs p-2 hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset rounded"
                      onClick={(e) => startEdit(belief.category, 'result', belief.result, e.currentTarget)}
                      type="button"
                      aria-label="Edit target result"
                      data-testid={`text-next-problems-${belief.category.toLowerCase()}`}
                    >
                      {belief.result || <span className="text-muted-foreground italic">Click to add target result...</span>}
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
                      className="min-h-[60px] text-xs border-0"
                      autoFocus
                      data-testid={`textarea-next-feelings-${belief.category.toLowerCase()}`}
                    />
                  ) : (
                    <button
                      className="w-full text-left text-xs p-2 hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset rounded"
                      onClick={(e) => startEdit(belief.category, 'nextFeelings', belief.nextFeelings, e.currentTarget)}
                      type="button"
                      aria-label="Edit next week feelings"
                      data-testid={`text-next-feelings-${belief.category.toLowerCase()}`}
                    >
                      {belief.nextFeelings || <span className="text-muted-foreground italic">Click to add feelings...</span>}
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
                      className="min-h-[60px] text-xs border-0"
                      autoFocus
                      data-testid={`textarea-next-beliefs-${belief.category.toLowerCase()}`}
                    />
                  ) : (
                    <button
                      className="w-full text-left text-xs p-2 hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset rounded"
                      onClick={(e) => startEdit(belief.category, 'nextWeekTarget', belief.nextWeekTarget, e.currentTarget)}
                      type="button"
                      aria-label="Edit next week beliefs"
                      data-testid={`text-next-beliefs-${belief.category.toLowerCase()}`}
                    >
                      {belief.nextWeekTarget || <span className="text-muted-foreground italic">Click to add beliefs...</span>}
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
                      className="min-h-[60px] text-xs border-0"
                      autoFocus
                      data-testid={`textarea-next-actions-${belief.category.toLowerCase()}`}
                    />
                  ) : (
                    <button
                      className="w-full text-left text-xs p-2 hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset rounded"
                      onClick={(e) => startEdit(belief.category, 'nextActions', belief.nextActions, e.currentTarget)}
                      type="button"
                      aria-label="Edit next week actions"
                      data-testid={`text-next-actions-${belief.category.toLowerCase()}`}
                    >
                      {belief.nextActions || <span className="text-muted-foreground italic">Click to add actions...</span>}
                    </button>
                  )}
                </TableCell>

                {/* AI Course */}
                <TableCell className="p-2 bg-cyan-50/30 dark:bg-cyan-950/10 align-top">
                  <div className="text-xs italic text-cyan-700 dark:text-cyan-400" data-testid={`text-next-course-${belief.category.toLowerCase()}`}>
                    {belief.affirmationSuggestion}
                  </div>
                </TableCell>

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
                        <span className={`text-xs ${item.checked ? 'line-through text-muted-foreground' : ''}`}>
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
              const scaledRating = Math.round((checkedCount / totalStandards) * 10);
              
              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="font-semibold">Current {selectedCategory} Rating:</span>
                    <Badge className="text-lg px-4 py-1" variant="default">
                      {scaledRating}/10
                    </Badge>
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
                          className={`text-sm cursor-pointer flex-1 ${standard.checked ? 'text-muted-foreground line-through' : ''}`}
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
    </div>
  );
}
