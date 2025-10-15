import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

interface HRCMArea {
  category: 'Health' | 'Relationship' | 'Career' | 'Money';
  currentRating?: number;
  problems?: string;
  currentFeelings?: string;
  currentBelief: string;
  currentActions?: string;
  nextWeekTarget: string;
  affirmation: string;
  checklist: ChecklistItem[];
  progress: number;
}

interface WeekData {
  weekNumber: number;
  areas: HRCMArea[];
  overallProgress: number;
}

interface HRCMHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentWeek: number;
}

// Generate historical data dynamically based on current week
// Week 1: Demo data with sample progress (33% for demo)
// Week 2: Moderate progress (50%)
// Week 3+: Higher progress (67%)
const generateHistoricalData = (currentWeek: number): WeekData[] => {
  const historicalData: WeekData[] = [];
  
  // Generate data for all completed weeks (Week 1 to currentWeek-1)
  for (let week = 1; week < currentWeek; week++) {
    // Week 1: 33% progress, Week 2: 50%, Week 3+: 67%
    const demoProgress = week === 1 ? 33 : week === 2 ? 50 : 67;
    
    const healthChecklist = week === 1 ? [
      { id: 'h1', text: 'ALOA breathing 2x daily', checked: true },
      { id: 'h2', text: 'Walk 2000 steps 3/week', checked: false },
      { id: 'h3', text: 'Stop overeating', checked: false },
    ] : week === 2 ? [
      { id: 'h1', text: 'Exercise/Walk daily', checked: true },
      { id: 'h2', text: 'Healthy eating habit', checked: true },
      { id: 'h3', text: 'Stress management practice', checked: false },
    ] : [
      { id: 'h1', text: 'Exercise/Walk daily', checked: true },
      { id: 'h2', text: 'Healthy eating habit', checked: true },
      { id: 'h3', text: 'Stress management practice', checked: true },
    ];

    const relationshipChecklist = week === 1 ? [
      { id: 'e1', text: 'Daily gratitude practice', checked: false },
      { id: 'e2', text: 'Active listening 15 min', checked: true },
      { id: 'e3', text: 'Quality time 30 min', checked: false },
    ] : week === 2 ? [
      { id: 'e1', text: 'Daily gratitude practice', checked: true },
      { id: 'e2', text: 'Active listening session', checked: false },
      { id: 'e3', text: 'Quality time with loved ones', checked: true },
    ] : [
      { id: 'e1', text: 'Daily gratitude practice', checked: true },
      { id: 'e2', text: 'Active listening session', checked: true },
      { id: 'e3', text: 'Quality time with loved ones', checked: true },
    ];

    const careerChecklist = week === 1 ? [
      { id: 'r1', text: 'Apply to 5 jobs', checked: false },
      { id: 'r2', text: 'Update resume', checked: true },
      { id: 'r3', text: 'Practice mock interview', checked: false },
    ] : week === 2 ? [
      { id: 'r1', text: 'Skill development activity', checked: true },
      { id: 'r2', text: 'Networking or job search', checked: true },
      { id: 'r3', text: 'Complete key task/project', checked: false },
    ] : [
      { id: 'r1', text: 'Skill development activity', checked: true },
      { id: 'r2', text: 'Networking or job search', checked: true },
      { id: 'r3', text: 'Complete key task/project', checked: true },
    ];

    const moneyChecklist = week === 1 ? [
      { id: 'c1', text: 'Track all expenses', checked: true },
      { id: 'c2', text: 'Save 10% income', checked: false },
      { id: 'c3', text: 'Review budget weekly', checked: false },
    ] : week === 2 ? [
      { id: 'c1', text: 'Track daily expenses', checked: false },
      { id: 'c2', text: 'Save/Invest percentage', checked: true },
      { id: 'c3', text: 'Review budget/finances', checked: true },
    ] : [
      { id: 'c1', text: 'Track daily expenses', checked: true },
      { id: 'c2', text: 'Save/Invest percentage', checked: true },
      { id: 'c3', text: 'Review budget/finances', checked: true },
    ];

    // Use demo progress values for consistent visualization
    // Week 1: 33%, Week 2: 50%, Week 3+: 67%
    const healthProgress = demoProgress;
    const relationshipProgress = demoProgress;
    const careerProgress = demoProgress;
    const moneyProgress = demoProgress;
    const overallProgress = demoProgress;
    
    historicalData.push({
      weekNumber: week,
      overallProgress,
      areas: [
        {
          category: 'Health',
          currentRating: week === 1 ? 3 : week === 2 ? 5 : 7,
          problems: week === 1 ? "Anxiety due to financial stress, poor sleep" : week === 2 ? "Inconsistent exercise routine" : "Minor energy dips",
          currentFeelings: week === 1 ? "Stressed, anxious" : week === 2 ? "Hopeful, motivated" : "Energized, healthy",
          currentBelief: week === 1 ? "I have anxiety because of financial problems" : week === 2 ? "I am building healthy habits" : "I feel energized and healthy",
          currentActions: week === 1 ? "Started breathing exercises" : week === 2 ? "Walking 3x per week" : "Daily exercise routine",
          nextWeekTarget: week === 1 ? "I create healthy habits that reduce my anxiety" : week === 2 ? "I maintain consistent healthy routines" : "I am a model of health and wellness",
          affirmation: week === 1 ? "I am disciplined and consistent" : week === 2 ? "Health flows through me naturally" : "I am vibrant and full of energy",
          checklist: healthChecklist,
          progress: healthProgress,
        },
        {
          category: 'Relationship',
          currentRating: week === 1 ? 4 : week === 2 ? 6 : 8,
          problems: week === 1 ? "Anger issues with family, boss not supportive" : week === 2 ? "Communication gaps" : "Minor misunderstandings",
          currentFeelings: week === 1 ? "Frustrated, angry" : week === 2 ? "Improving, calm" : "Connected, loved",
          currentBelief: week === 1 ? "I get angry at my family. My boss is not supporting me" : week === 2 ? "I am improving communication" : "My relationships are harmonious",
          currentActions: week === 1 ? "Practicing active listening" : week === 2 ? "Daily gratitude practice" : "Quality time with loved ones",
          nextWeekTarget: week === 1 ? "My boss and I have mutual respect. I communicate with love" : week === 2 ? "I express love and gratitude daily" : "I am surrounded by loving relationships",
          affirmation: week === 1 ? "I am worthy of love and connection" : week === 2 ? "I attract positive relationships" : "Love surrounds me everywhere",
          checklist: relationshipChecklist,
          progress: relationshipProgress,
        },
        {
          category: 'Career',
          currentRating: week === 1 ? 2 : week === 2 ? 5 : 7,
          problems: week === 1 ? "Lack of skills, no good opportunities" : week === 2 ? "Need more practice" : "Minor skill gaps",
          currentFeelings: week === 1 ? "Insecure, worried" : week === 2 ? "Learning, growing" : "Confident, capable",
          currentBelief: week === 1 ? "I am not skilled enough for better opportunities" : week === 2 ? "I am developing valuable skills" : "I am confident in my abilities",
          currentActions: week === 1 ? "Updating resume" : week === 2 ? "Skill development courses" : "Networking actively",
          nextWeekTarget: week === 1 ? "I am worthy of success and recognition" : week === 2 ? "I attract great opportunities" : "Success comes to me naturally",
          affirmation: week === 1 ? "I am capable of achieving my dreams" : week === 2 ? "Opportunities flow to me" : "I am a leader in my field",
          checklist: careerChecklist,
          progress: careerProgress,
        },
        {
          category: 'Money',
          currentRating: week === 1 ? 3 : week === 2 ? 5 : 7,
          problems: week === 1 ? "Not earning enough, can't save" : week === 2 ? "Irregular savings" : "Minor budget issues",
          currentFeelings: week === 1 ? "Worried, stressed" : week === 2 ? "Building discipline" : "Abundant, secure",
          currentBelief: week === 1 ? "I don't earn enough to save" : week === 2 ? "I am building financial discipline" : "Money flows to me abundantly",
          currentActions: week === 1 ? "Tracking expenses" : week === 2 ? "Saving 10% income" : "Multiple income streams",
          nextWeekTarget: week === 1 ? "Money flows to me naturally" : week === 2 ? "I create multiple income streams" : "I am financially abundant",
          affirmation: week === 1 ? "Money flows to me naturally" : week === 2 ? "I attract wealth effortlessly" : "I am a money magnet",
          checklist: moneyChecklist,
          progress: moneyProgress,
        },
      ],
    });
  }
  
  return historicalData;
};

const getCategoryColor = (category: string) => {
  const colors = {
    Health: 'text-chart-1',
    Relationship: 'text-chart-2',
    Career: 'text-chart-4',
    Money: 'text-chart-5',
  };
  return colors[category as keyof typeof colors] || 'text-foreground';
};

const getProgressColor = (progress: number) => {
  if (progress >= 80) return 'bg-chart-3 text-white';
  if (progress >= 50) return 'bg-yellow-500 text-black';
  return 'bg-muted text-muted-foreground';
};

const getTrendIcon = (current: number, previous: number) => {
  if (current > previous) return <TrendingUp className="h-4 w-4 text-chart-3" />;
  if (current < previous) return <TrendingDown className="h-4 w-4 text-destructive" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
};

export default function HRCMHistoryModal({ open, onOpenChange, currentWeek }: HRCMHistoryModalProps) {
  const [selectedWeek, setSelectedWeek] = useState<number | null>(1);

  // Helper function to calculate progress
  const calculateProgress = (checklist: ChecklistItem[]): number => {
    if (!checklist || checklist.length === 0) return 0;
    const completed = checklist.filter((item) => item.checked).length;
    return Math.round((completed / checklist.length) * 100);
  };

  // Fetch all weeks from database
  const { data: allWeeksData } = useQuery({
    queryKey: ['/api/hercm/weeks'],
    enabled: open, // Only fetch when modal is open
  });

  // Transform API data to match WeekData format - show all saved weeks including current
  const historicalData: WeekData[] = [];
  
  if (allWeeksData && Array.isArray(allWeeksData)) {
    // Use real database data - include all weeks (including current week if saved)
    for (const weekData of allWeeksData) {
      // Transform category-specific database fields back to beliefs array format
      const categories = ['Health', 'Relationship', 'Career', 'Money'] as const;
      const areas: HRCMArea[] = categories.map((category) => {
        const prefix = category.toLowerCase();
        
        // Get the current rating for each category (H=Health, E=Relationship, R=Career, C=Money)
        const ratingMap = {
          health: weekData.currentH,
          relationship: weekData.currentE,
          career: weekData.currentR,
          money: weekData.currentC,
        };
        
        return {
          category,
          currentRating: ratingMap[prefix as keyof typeof ratingMap],
          problems: weekData[`${prefix}Problems`] || '',
          currentFeelings: weekData[`${prefix}CurrentFeelings`] || '',
          currentBelief: weekData[`${prefix}CurrentBelief`] || '',
          currentActions: weekData[`${prefix}CurrentActions`] || '',
          nextWeekTarget: weekData[`${prefix}NextTarget`] || '',
          affirmation: weekData[`${prefix}Affirmation`] || '',
          checklist: weekData[`${prefix}Checklist`] || [],
          progress: calculateProgress(weekData[`${prefix}Checklist`] || []),
        };
      });
      
      const overallProgress = areas.length > 0
        ? Math.round(areas.reduce((sum, area) => sum + area.progress, 0) / areas.length)
        : 0;
      
      historicalData.push({
        weekNumber: weekData.weekNumber,
        areas,
        overallProgress,
      });
    }
  }
  
  // Sort by week number to ensure correct chronological order for trends
  historicalData.sort((a, b) => a.weekNumber - b.weekNumber);
  
  // Use real data, no mock fallback - if no data, show empty message
  const mockHistoricalData = historicalData;

  // Calculate trends
  const calculateTrends = () => {
    if (mockHistoricalData.length < 2) return [];
    
    const trends = mockHistoricalData.map((week, index) => {
      if (index === 0) return null;
      const prevWeek = mockHistoricalData[index - 1];
      return {
        weekNumber: week.weekNumber,
        change: week.overallProgress - prevWeek.overallProgress,
      };
    }).filter(Boolean);
    
    return trends;
  };

  const trends = calculateTrends();

  const weekToDisplay = selectedWeek 
    ? mockHistoricalData.find(w => w.weekNumber === selectedWeek)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto" data-testid="modal-hercm-history">
        <DialogHeader>
          <DialogTitle>HRCM History</DialogTitle>
          <DialogDescription>
            View exact snapshots of your HRCM table for each completed week
          </DialogDescription>
        </DialogHeader>

        {mockHistoricalData.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No historical data yet. Complete Week {currentWeek} and generate Week {currentWeek + 1} to see your progress history!</p>
          </div>
        ) : (
          <div className="space-y-6">
          {/* Timeline Overview */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Week Timeline</h3>
            <div className="flex gap-2 flex-wrap">
              {mockHistoricalData.map((week, index) => {
                const trend = trends.find(t => t?.weekNumber === week.weekNumber);
                return (
                  <Button
                    key={week.weekNumber}
                    variant={selectedWeek === week.weekNumber ? "default" : "outline"}
                    onClick={() => setSelectedWeek(week.weekNumber === selectedWeek ? null : week.weekNumber)}
                    className="flex items-center gap-2"
                    data-testid={`button-week-${week.weekNumber}`}
                  >
                    Week {week.weekNumber}
                    <Badge className={getProgressColor(week.overallProgress)}>
                      {week.overallProgress}%
                    </Badge>
                    {trend && index > 0 && mockHistoricalData[index - 1] && getTrendIcon(week.overallProgress, mockHistoricalData[index - 1].overallProgress)}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Selected Week Details */}
          {weekToDisplay && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold">Week {weekToDisplay.weekNumber} Details</h3>
                <Badge className={getProgressColor(weekToDisplay.overallProgress)}>
                  {weekToDisplay.overallProgress}% Overall
                </Badge>
              </div>

              {/* Week Table - Current Week Format */}
              <div className="border-2 border-rose-300 dark:border-rose-700 rounded-lg overflow-x-auto shadow-lg">
                <div className="bg-gradient-to-r from-rose-400 to-pink-500 dark:from-rose-600 dark:to-pink-700 px-4 py-3 border-b-2 border-rose-300 dark:border-rose-800">
                  <h3 className="font-bold text-white text-xl text-center drop-shadow-md">Week {weekToDisplay.weekNumber} Snapshot</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30">
                        <th className="p-3 text-left text-sm font-bold border-r">HRCM Area</th>
                        <th className="p-3 text-left text-sm font-semibold bg-rose-100 dark:bg-rose-900/40 w-[80px]">Rating</th>
                        <th className="p-3 text-left text-sm font-semibold bg-rose-100 dark:bg-rose-900/40 w-[180px]">Problems</th>
                        <th className="p-3 text-left text-sm font-semibold bg-rose-100 dark:bg-rose-900/40 w-[150px]">Feelings</th>
                        <th className="p-3 text-left text-sm font-semibold bg-rose-100 dark:bg-rose-900/40 w-[180px]">Beliefs/Reasons</th>
                        <th className="p-3 text-left text-sm font-semibold bg-rose-100 dark:bg-rose-900/40 w-[180px] border-r">Actions</th>
                        <th className="p-3 text-left text-sm font-semibold bg-gradient-to-r from-purple-100 to-violet-100 dark:from-purple-900/40 dark:to-violet-900/40 w-[200px]">Checklist (3)</th>
                        <th className="p-3 text-center text-sm font-semibold bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40 w-[100px]">Progress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weekToDisplay.areas.map((area) => (
                        <tr key={area.category} className="border-b last:border-0" data-testid={`history-row-${area.category.toLowerCase()}-week-${weekToDisplay.weekNumber}`}>
                          <td className="p-3 border-r bg-muted/20">
                            <Badge variant="outline" className="font-semibold">
                              {area.category}
                            </Badge>
                          </td>
                          <td className="p-2 bg-red-50/30 dark:bg-red-950/10">
                            <div className="text-center font-medium">{area.currentRating || '-'}</div>
                          </td>
                          <td className="p-2 bg-red-50/30 dark:bg-red-950/10">
                            <div className="text-xs">{area.problems || '-'}</div>
                          </td>
                          <td className="p-2 bg-red-50/30 dark:bg-red-950/10">
                            <div className="text-xs">{area.currentFeelings || '-'}</div>
                          </td>
                          <td className="p-2 bg-red-50/30 dark:bg-red-950/10">
                            <div className="text-xs">{area.currentBelief || '-'}</div>
                          </td>
                          <td className="p-2 bg-red-50/30 dark:bg-red-950/10 border-r">
                            <div className="text-xs">{area.currentActions || '-'}</div>
                          </td>
                          <td className="p-2 bg-purple-50/30 dark:bg-purple-950/10">
                            <div className="space-y-1">
                              {area.checklist && area.checklist.length > 0 ? area.checklist.map((item) => (
                                <div key={item.id} className="flex items-center gap-2">
                                  <Checkbox 
                                    checked={item.checked} 
                                    disabled 
                                    className="opacity-50"
                                  />
                                  <span className={`text-xs ${item.checked ? 'line-through text-muted-foreground' : ''}`}>
                                    {item.text}
                                  </span>
                                </div>
                              )) : <span className="text-xs text-muted-foreground">-</span>}
                            </div>
                          </td>
                          <td className="p-2 text-center bg-emerald-50/30 dark:bg-emerald-950/10">
                            <Badge className={getProgressColor(area.progress)}>
                              {area.progress}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Show message when no week selected */}
          {!selectedWeek && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Select a week from the timeline above to view its snapshot</p>
            </div>
          )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
