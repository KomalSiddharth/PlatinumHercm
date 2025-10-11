import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Check, X, TrendingUp, History, Loader2, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface UnifiedHERCMTableProps {
  weekNumber: number;
  onGenerateNextWeek: () => void;
  onViewHistory: () => void;
}

interface HERCMWeekData {
  id?: string;
  weekNumber: number;
  year: number;
  currentH?: number;
  currentE?: number;
  currentR?: number;
  currentC?: number;
  currentM?: number;
  targetH?: number;
  targetE?: number;
  targetR?: number;
  targetC?: number;
  targetM?: number;
  nextWeekH?: number;
  nextWeekE?: number;
  nextWeekR?: number;
  nextWeekC?: number;
  nextWeekM?: number;
  improvementH?: number;
  improvementE?: number;
  improvementR?: number;
  improvementC?: number;
  improvementM?: number;
  checklistCompleted?: boolean;
  courseCompleted?: boolean;
  overallScore?: number;
  achievementRate?: number;
}

export default function UnifiedHERCMTable({ weekNumber, onGenerateNextWeek, onViewHistory }: UnifiedHERCMTableProps) {
  const { toast } = useToast();
  const [currentRatings, setCurrentRatings] = useState({
    H: 3,
    E: 3,
    R: 3,
    C: 3,
    M: 3,
  });
  const [targetGoals, setTargetGoals] = useState({
    H: 0,
    E: 0,
    R: 0,
    C: 0,
    M: 0,
  });
  const [checklistCompleted, setChecklistCompleted] = useState(false);
  const [courseCompleted, setCourseCompleted] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  // Fetch current week data
  const { data: weekData, isLoading } = useQuery<HERCMWeekData>({
    queryKey: ['/api/hercm/current-week', weekNumber],
  });

  // Load existing data when available
  useEffect(() => {
    if (weekData) {
      setCurrentRatings({
        H: weekData.currentH || 3,
        E: weekData.currentE || 3,
        R: weekData.currentR || 3,
        C: weekData.currentC || 3,
        M: weekData.currentM || 3,
      });
      setTargetGoals({
        H: weekData.nextWeekH || 0,
        E: weekData.nextWeekE || 0,
        R: weekData.nextWeekR || 0,
        C: weekData.nextWeekC || 0,
        M: weekData.nextWeekM || 0,
      });
      setChecklistCompleted(weekData.checklistCompleted || false);
      setCourseCompleted(weekData.courseCompleted || false);
      // Show comparison if we have target data and improvements
      setShowComparison(!!weekData.targetH && weekData.improvementH !== undefined);
    }
  }, [weekData]);

  // Auto-fill target goals
  const handleAutoFill = async () => {
    setAutoFilling(true);
    try {
      const response = await apiRequest('POST', '/api/hercm/auto-fill-goals', {
        currentH: currentRatings.H,
        currentE: currentRatings.E,
        currentR: currentRatings.R,
        currentC: currentRatings.C,
        currentM: currentRatings.M,
      });
      const suggestions = await response.json();
      setTargetGoals({
        H: suggestions.nextWeekH,
        E: suggestions.nextWeekE,
        R: suggestions.nextWeekR,
        C: suggestions.nextWeekC,
        M: suggestions.nextWeekM,
      });
      toast({
        title: "Goals Auto-filled!",
        description: "AI has suggested your target goals based on current ratings.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to auto-fill goals. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAutoFilling(false);
    }
  };

  // Save week mutation
  const saveWeekMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/hercm/save-with-comparison', {
        weekNumber,
        year: new Date().getFullYear(),
        currentH: currentRatings.H,
        currentE: currentRatings.E,
        currentR: currentRatings.R,
        currentC: currentRatings.C,
        currentM: currentRatings.M,
        nextWeekH: targetGoals.H,
        nextWeekE: targetGoals.E,
        nextWeekR: targetGoals.R,
        nextWeekC: targetGoals.C,
        nextWeekM: targetGoals.M,
        // Targets come from previous week's nextWeek goals
        targetH: weekData?.targetH,
        targetE: weekData?.targetE,
        targetR: weekData?.targetR,
        targetC: weekData?.targetC,
        targetM: weekData?.targetM,
        checklistCompleted,
        courseCompleted,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/hercm/current-week'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hercm/weeks'] });
      setShowComparison(!!data.targetH);
      toast({
        title: "Week Saved!",
        description: "Your HERCM data has been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save week data. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getComparisonBadge = (improvement: number | undefined) => {
    if (improvement === undefined || improvement === null) return null;
    if (improvement > 0) {
      return (
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          <ArrowUp className="w-3 h-3 mr-1" />
          +{improvement}
        </Badge>
      );
    } else if (improvement < 0) {
      return (
        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
          <ArrowDown className="w-3 h-3 mr-1" />
          {improvement}
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          <Minus className="w-3 h-3 mr-1" />
          Same
        </Badge>
      );
    }
  };

  const categories = [
    { key: 'H', label: 'Hope (H)', color: 'bg-blue-50 dark:bg-blue-950/20' },
    { key: 'E', label: 'Energy (E)', color: 'bg-green-50 dark:bg-green-950/20' },
    { key: 'R', label: 'Respect (R)', color: 'bg-purple-50 dark:bg-purple-950/20' },
    { key: 'C', label: 'Courage (C)', color: 'bg-orange-50 dark:bg-orange-950/20' },
    { key: 'M', label: 'Maturity (M)', color: 'bg-pink-50 dark:bg-pink-950/20' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Week {weekNumber} - HERCM Tracker
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Fill current feelings, get AI target goals, track progress
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={onViewHistory}
            data-testid="button-view-history"
          >
            <History className="w-4 h-4 mr-2" />
            View History
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

      {/* Current Week Table */}
      <Card className="border-2 border-rose-300 dark:border-rose-700">
        <CardHeader className="bg-gradient-to-r from-rose-400 to-pink-500 dark:from-rose-600 dark:to-pink-700 text-white">
          <CardTitle className="flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5" />
            Current Week - How I Feel Now
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Category</TableHead>
                <TableHead>Current Rating (1-5)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map(({ key, label, color }) => (
                <TableRow key={key} className={color}>
                  <TableCell className="font-semibold">{label}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-4">
                      <Slider
                        value={[currentRatings[key as keyof typeof currentRatings]]}
                        onValueChange={(value) => setCurrentRatings(prev => ({ ...prev, [key]: value[0] }))}
                        min={1}
                        max={5}
                        step={1}
                        className="flex-1"
                        data-testid={`slider-current-${key.toLowerCase()}`}
                      />
                      <span className="w-8 text-center font-bold" data-testid={`text-current-${key.toLowerCase()}`}>
                        {currentRatings[key as keyof typeof currentRatings]}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {/* Task Completion */}
          <div className="mt-4 flex items-center gap-6 p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="checklist" 
                checked={checklistCompleted}
                onCheckedChange={(checked) => setChecklistCompleted(checked as boolean)}
                data-testid="checkbox-checklist"
              />
              <label htmlFor="checklist" className="text-sm font-medium cursor-pointer">
                ✅ Checklist Completed This Week
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="course" 
                checked={courseCompleted}
                onCheckedChange={(checked) => setCourseCompleted(checked as boolean)}
                data-testid="checkbox-course"
              />
              <label htmlFor="course" className="text-sm font-medium cursor-pointer">
                📚 Course Completed This Week
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Target Goals Table */}
      <Card className="border-2 border-blue-300 dark:border-blue-700">
        <CardHeader className="bg-gradient-to-r from-blue-400 to-cyan-500 dark:from-blue-600 dark:to-cyan-700 text-white">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Target Goals - Where I Want To Be
            </span>
            <Button 
              variant="secondary"
              size="sm"
              onClick={handleAutoFill}
              disabled={autoFilling}
              data-testid="button-auto-fill"
            >
              {autoFilling ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Auto-fill Goals
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Category</TableHead>
                <TableHead>Target Goal (Editable)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map(({ key, label, color }) => (
                <TableRow key={key} className={color}>
                  <TableCell className="font-semibold">{label}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-4">
                      <Slider
                        value={[targetGoals[key as keyof typeof targetGoals] || 3]}
                        onValueChange={(value) => setTargetGoals(prev => ({ ...prev, [key]: value[0] }))}
                        min={1}
                        max={5}
                        step={1}
                        className="flex-1"
                        data-testid={`slider-target-${key.toLowerCase()}`}
                      />
                      <span className="w-8 text-center font-bold" data-testid={`text-target-${key.toLowerCase()}`}>
                        {targetGoals[key as keyof typeof targetGoals] || 0}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-center">
        <Button
          size="lg"
          onClick={() => saveWeekMutation.mutate()}
          disabled={saveWeekMutation.isPending}
          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
          data-testid="button-save-week"
        >
          {saveWeekMutation.isPending ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <Check className="w-5 h-5 mr-2" />
          )}
          Save Week
        </Button>
      </div>

      {/* Weekly Comparison */}
      {showComparison && weekData && weekData.targetH && (
        <Card className="border-2 border-emerald-300 dark:border-emerald-700">
          <CardHeader className="bg-gradient-to-r from-emerald-400 to-teal-500 dark:from-emerald-600 dark:to-teal-700 text-white">
            <CardTitle className="flex items-center gap-2">
              📊 Weekly Progress Comparison
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">Category</TableHead>
                  <TableHead>Last Week Target</TableHead>
                  <TableHead>This Week Actual</TableHead>
                  <TableHead>Improvement</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map(({ key, label }) => {
                  const targetKey = `target${key}` as keyof HERCMWeekData;
                  const currentKey = `current${key}` as keyof HERCMWeekData;
                  const improvementKey = `improvement${key}` as keyof HERCMWeekData;
                  
                  return (
                    <TableRow key={key}>
                      <TableCell className="font-semibold">{label}</TableCell>
                      <TableCell data-testid={`text-target-comparison-${key.toLowerCase()}`}>
                        {weekData[targetKey] || '-'}
                      </TableCell>
                      <TableCell data-testid={`text-current-comparison-${key.toLowerCase()}`}>
                        {weekData[currentKey] || '-'}
                      </TableCell>
                      <TableCell data-testid={`badge-improvement-${key.toLowerCase()}`}>
                        {getComparisonBadge(weekData[improvementKey] as number)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            
            {weekData.achievementRate !== undefined && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Overall Achievement:</span>
                  <Badge className={
                    weekData.achievementRate >= 70 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : weekData.achievementRate >= 40
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }>
                    {weekData.achievementRate}% Goals Achieved
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
