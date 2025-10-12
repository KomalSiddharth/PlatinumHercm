import { useState, useEffect } from 'react';
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
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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
  onGenerateNextWeek: () => void;
  onViewHistory: () => void;
  canUnlockNextWeek?: boolean;
  nextUnlockDate?: Date | null;
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

export default function UnifiedHRCMTable({ weekNumber, onGenerateNextWeek, onViewHistory, canUnlockNextWeek = true, nextUnlockDate = null }: UnifiedHRCMTableProps) {
  const [beliefs, setBeliefs] = useState<HRCMBelief[]>([]);
  const [editingField, setEditingField] = useState<{ category: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [loadingCourses, setLoadingCourses] = useState<Set<string>>(new Set());
  const [autoFilling, setAutoFilling] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const { toast } = useToast();

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

  // Calculate active month and weeks in it
  const activeMonth = selectedMonth || Math.ceil(weekNumber / 4);
  const weeksInMonth = (() => {
    const startWeek = (activeMonth - 1) * 4 + 1;
    const endWeek = activeMonth * 4; // Show all 4 weeks in the month
    return Array.from({ length: endWeek - startWeek + 1 }, (_, i) => startWeek + i);
  })();

  // Fetch all weeks data for the selected month
  const { data: allWeeksData } = useQuery({
    queryKey: ['/api/hercm/weeks'],
    enabled: showComparison,
  });

  // Show all 12 months in dropdown
  const totalMonths = 12;

  // Process month data for analytics
  const monthWeeksData = weeksInMonth.map(week => {
    const weekDataFromAPI = Array.isArray(allWeeksData) 
      ? allWeeksData.find((w: any) => w.weekNumber === week)
      : null;
    const beliefs = weekDataFromAPI?.beliefs || getWeekBeliefs(week);
    const progress = beliefs.length > 0
      ? Math.round(beliefs.reduce((sum: number, b: any) => sum + calculateProgress(b.checklist || []), 0) / beliefs.length)
      : 0;
    return { week, beliefs, progress };
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
        return {
          ...belief,
          currentRating: newRating,
          targetRating: newRating + 1 // Auto-increment by 1
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

  const startEdit = (category: string, field: string, currentValue: string) => {
    setEditingField({ category, field });
    setEditValue(currentValue);
  };

  const saveEdit = async () => {
    if (!editingField) return;
    
    // Save the editing info before clearing it
    const { category, field } = editingField;
    let updatedBelief: HRCMBelief | undefined = undefined;
    
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
    
    // Fetch AI course recommendation if current week field was edited
    if (updatedBelief && ['problems', 'currentFeelings', 'currentBelief', 'currentActions'].includes(field)) {
      await fetchCourseRecommendation(category, updatedBelief);
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
            className={`${getProgressColor(weeklyProgress)} cursor-pointer hover-elevate active-elevate-2`} 
            data-testid="badge-weekly-progress"
            onClick={() => setShowComparison(true)}
          >
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
            onClick={() => {
              // Manually trigger save with current week data
              saveWeekMutation.mutate({
                weekNumber,
                year: new Date().getFullYear(),
                beliefs,
              });
            }}
            disabled={saveWeekMutation.isPending}
            variant="default"
            data-testid="button-save-week"
          >
            {saveWeekMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Week
              </>
            )}
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
          <div className="flex flex-col items-end gap-1">
            <Button 
              onClick={onGenerateNextWeek}
              disabled={!canUnlockNextWeek}
              className="bg-gradient-to-r from-primary to-accent"
              data-testid="button-generate-next-week"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Generate Next Week
            </Button>
            {!canUnlockNextWeek && nextUnlockDate && (
              <p className="text-xs text-muted-foreground" data-testid="text-unlock-date">
                Unlocks: {nextUnlockDate.toLocaleDateString('en-IN')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Week-over-Week Comparison Dialog */}
      <Dialog open={showComparison} onOpenChange={setShowComparison}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Monthly Progress Analytics</DialogTitle>
          </DialogHeader>
          
          {/* Month Selector */}
          <div className="flex items-center gap-3 pb-4 border-b">
            <label className="text-sm font-medium">Select Month:</label>
            <Select 
              value={selectedMonth?.toString() || Math.ceil(weekNumber / 4).toString()} 
              onValueChange={(value) => setSelectedMonth(parseInt(value))}
            >
              <SelectTrigger className="w-[200px]" data-testid="select-month">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: totalMonths }, (_, i) => i + 1).map((month) => {
                  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                  return (
                    <SelectItem key={month} value={month.toString()}>
                      {monthNames[month - 1]}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          
          {weekNumber > 1 && comparisonData.length > 0 ? (
            <div className="space-y-6">
              {/* Analytics Charts */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Progress Analytics</h3>
                
                {/* Progress Trend Chart - All Weeks in Month */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Overall Progress Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={monthWeeksData.map(({ week, progress }, index) => ({
                        week: `Week ${index + 1}`,
                        progress
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Line type="monotone" dataKey="progress" stroke="#0d9488" strokeWidth={2} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* HRCM Area Comparison - All Weeks in Month */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">HRCM Area Progress Comparison</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={['Health', 'Relationship', 'Career', 'Money'].map(category => {
                        const dataPoint: any = { area: category };
                        monthWeeksData.forEach(({ beliefs }, index) => {
                          const belief = beliefs.find((b: any) => b.category === category);
                          dataPoint[`Week ${index + 1}`] = calculateProgress(belief?.checklist || []);
                        });
                        return dataPoint;
                      })}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="area" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Legend />
                        {monthWeeksData.map((_, index) => (
                          <Bar 
                            key={index} 
                            dataKey={`Week ${index + 1}`} 
                            fill={['#94a3b8', '#64748b', '#0d9488', '#14b8a6'][index % 4]} 
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Improvement Summary - Month Progress */}
                <div className="space-y-2">
                  <h3 className="text-base font-semibold">Monthly Improvement Summary</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {['Health', 'Relationship', 'Career', 'Money'].map((category) => {
                      const firstWeekData = monthWeeksData[0];
                      const lastWeekData = monthWeeksData[monthWeeksData.length - 1];
                      
                      const firstBelief = firstWeekData.beliefs.find((b: any) => b.category === category);
                      const lastBelief = lastWeekData.beliefs.find((b: any) => b.category === category);
                      
                      const firstProgress = calculateProgress(firstBelief?.checklist || []);
                      const lastProgress = calculateProgress(lastBelief?.checklist || []);
                      const improvement = lastProgress - firstProgress;
                      
                      return (
                        <Card key={category} className="p-3">
                          <div className="space-y-1">
                            <p className="text-sm font-medium">{category}</p>
                            <div className="flex items-center gap-2">
                              {improvement > 0 ? (
                                <ArrowUp className="w-4 h-4 text-green-600" />
                              ) : improvement < 0 ? (
                                <ArrowDown className="w-4 h-4 text-red-600" />
                              ) : (
                                <span className="w-4 h-4">-</span>
                              )}
                              <span className={`text-lg font-bold ${improvement > 0 ? 'text-green-600' : improvement < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                                {improvement > 0 ? '+' : ''}{improvement}%
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Week 1: {firstProgress}% → Week {monthWeeksData.length}: {lastProgress}%
                            </p>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Text Comparison */}
              <WeekComparison comparisons={comparisonData} />
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              Comparison available from Week 2 onwards
            </p>
          )}
        </DialogContent>
      </Dialog>

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
              <TableHead className="font-bold border-r">HRCM Area</TableHead>
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
              <TableHead className="w-[200px] bg-gradient-to-r from-purple-100 to-violet-100 dark:from-purple-900/40 dark:to-violet-900/40 font-semibold">Checklist</TableHead>
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

                {/* Course Recommendation with Link */}
                <TableCell className="p-2 bg-cyan-50/30 dark:bg-cyan-950/10">
                  {loadingCourses.has(belief.category) ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-cyan-600" />
                      <span className="text-xs text-muted-foreground">Loading...</span>
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
                        </div>
                      );
                    })()
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Fill problems to get recommendations</span>
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
              <TableHead className="font-bold border-r">HRCM Area</TableHead>
              <TableHead className="w-[80px] bg-blue-100 dark:bg-blue-900/40 font-semibold">Rating</TableHead>
              <TableHead className="w-[180px] bg-blue-100 dark:bg-blue-900/40 font-semibold">Problems</TableHead>
              <TableHead className="w-[150px] bg-blue-100 dark:bg-blue-900/40 font-semibold">Feelings</TableHead>
              <TableHead className="w-[180px] bg-blue-100 dark:bg-blue-900/40 font-semibold">Beliefs/Reasons</TableHead>
              <TableHead className="w-[180px] bg-blue-100 dark:bg-blue-900/40 font-semibold border-r">Actions</TableHead>
              
              <TableHead className="w-[180px] bg-gradient-to-r from-cyan-100 to-blue-100 dark:from-cyan-900/40 dark:to-blue-900/40 font-semibold">
                <div className="flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  Affirmations
                </div>
              </TableHead>
              <TableHead className="w-[200px] bg-gradient-to-r from-purple-100 to-violet-100 dark:from-purple-900/40 dark:to-violet-900/40 font-semibold">Checklist</TableHead>
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

                {/* Next Week - Rating (Auto-calculated: Current + 1, Read-only) */}
                <TableCell className="p-2 bg-blue-50/30 dark:bg-blue-950/10">
                  <div className="flex items-center justify-center">
                    <Badge 
                      variant="secondary" 
                      className="w-12 justify-center font-bold text-base bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700"
                      data-testid={`badge-target-rating-${belief.category.toLowerCase()}`}
                    >
                      {belief.targetRating}
                    </Badge>
                  </div>
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
                      <div className="text-xs" data-testid={`text-next-problems-${belief.category.toLowerCase()}`}>
                        {belief.result || <span className="text-muted-foreground italic">Click to add target result...</span>}
                      </div>
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
                      <div className="text-xs" data-testid={`text-next-feelings-${belief.category.toLowerCase()}`}>
                        {belief.nextFeelings || <span className="text-muted-foreground italic">Click to add feelings...</span>}
                      </div>
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
                      <div className="text-xs" data-testid={`text-next-beliefs-${belief.category.toLowerCase()}`}>
                        {belief.nextWeekTarget || <span className="text-muted-foreground italic">Click to add beliefs...</span>}
                      </div>
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
                      <div className="text-xs" data-testid={`text-next-actions-${belief.category.toLowerCase()}`}>
                        {belief.nextActions || <span className="text-muted-foreground italic">Click to add actions...</span>}
                      </div>
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
