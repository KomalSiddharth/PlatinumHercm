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

interface HERCMArea {
  category: 'Health' | 'Relationship' | 'Career' | 'Money';
  currentBelief: string;
  nextWeekTarget: string;
  courseSuggestion: string;
  affirmation: string;
  checklist: ChecklistItem[];
  progress: number;
}

interface WeekData {
  weekNumber: number;
  areas: HERCMArea[];
  overallProgress: number;
}

interface HERCMHistoryModalProps {
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
          currentBelief: week === 1 ? "I have anxiety because of financial problems" : week === 2 ? "I am building healthy habits" : "I feel energized and healthy",
          nextWeekTarget: week === 1 ? "I create healthy habits that reduce my anxiety" : week === 2 ? "I maintain consistent healthy routines" : "I am a model of health and wellness",
          courseSuggestion: week === 1 ? "Health Foundations - Module 1" : week === 2 ? "Health Foundations - Module 2" : "Advanced Health - Module 1",
          affirmation: week === 1 ? "I am disciplined and consistent" : week === 2 ? "Health flows through me naturally" : "I am vibrant and full of energy",
          checklist: healthChecklist,
          progress: healthProgress,
        },
        {
          category: 'Relationship',
          currentBelief: week === 1 ? "I get angry at my family. My boss is not supporting me" : week === 2 ? "I am improving communication" : "My relationships are harmonious",
          nextWeekTarget: week === 1 ? "My boss and I have mutual respect. I communicate with love" : week === 2 ? "I express love and gratitude daily" : "I am surrounded by loving relationships",
          courseSuggestion: week === 1 ? "Relationship Basics - Module 1" : week === 2 ? "Relationship Basics - Module 2" : "Advanced Communication - Module 1",
          affirmation: week === 1 ? "I am worthy of love and connection" : week === 2 ? "I attract positive relationships" : "Love surrounds me everywhere",
          checklist: relationshipChecklist,
          progress: relationshipProgress,
        },
        {
          category: 'Career',
          currentBelief: week === 1 ? "I am not skilled enough for better opportunities" : week === 2 ? "I am developing valuable skills" : "I am confident in my abilities",
          nextWeekTarget: week === 1 ? "I am worthy of success and recognition" : week === 2 ? "I attract great opportunities" : "Success comes to me naturally",
          courseSuggestion: week === 1 ? "Career Growth - Module 1" : week === 2 ? "Career Growth - Module 2" : "Leadership Mastery - Module 1",
          affirmation: week === 1 ? "I am capable of achieving my dreams" : week === 2 ? "Opportunities flow to me" : "I am a leader in my field",
          checklist: careerChecklist,
          progress: careerProgress,
        },
        {
          category: 'Money',
          currentBelief: week === 1 ? "I don't earn enough to save" : week === 2 ? "I am building financial discipline" : "Money flows to me abundantly",
          nextWeekTarget: week === 1 ? "Money flows to me naturally" : week === 2 ? "I create multiple income streams" : "I am financially abundant",
          courseSuggestion: week === 1 ? "Financial Literacy - Module 1" : week === 2 ? "Financial Literacy - Module 2" : "Wealth Building - Module 1",
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

export default function HERCMHistoryModal({ open, onOpenChange, currentWeek }: HERCMHistoryModalProps) {
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

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

  // Transform API data to match WeekData format and filter for completed weeks only
  const historicalData: WeekData[] = [];
  
  if (allWeeksData && Array.isArray(allWeeksData)) {
    // Use real database data
    for (const weekData of allWeeksData) {
      if (weekData.weekNumber < currentWeek && weekData.beliefs) {
        const areas: HERCMArea[] = weekData.beliefs.map((belief: any) => ({
          category: belief.category,
          currentBelief: belief.currentBelief || '',
          nextWeekTarget: belief.nextWeekTarget || '',
          courseSuggestion: belief.courseSuggestion || '',
          affirmation: belief.affirmationSuggestion || '',
          checklist: belief.checklist || [],
          progress: calculateProgress(belief.checklist || []),
        }));
        
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
  }
  
  // Sort by week number to ensure correct chronological order for trends
  historicalData.sort((a, b) => a.weekNumber - b.weekNumber);
  
  // Fallback to generated data if no API data (for demo purposes)
  const mockHistoricalData = historicalData.length > 0 ? historicalData : generateHistoricalData(currentWeek);

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
          <DialogTitle className="flex items-center justify-between">
            <span>HERCM History</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              data-testid="button-close-history"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            View exact snapshots of your HERCM table for each completed week
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
                    {trend && getTrendIcon(week.overallProgress, mockHistoricalData[index - 1].overallProgress)}
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

              {/* Week Table with New Colorful Design */}
              <div className="border-2 border-purple-300 dark:border-purple-700 rounded-lg overflow-x-auto shadow-lg">
                <div className="bg-gradient-to-r from-purple-400 to-indigo-500 dark:from-purple-600 dark:to-indigo-700 px-4 py-3 border-b-2 border-purple-300 dark:border-purple-800">
                  <h3 className="font-bold text-white text-lg text-center drop-shadow-md">Week {weekToDisplay.weekNumber} Snapshot</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30">
                        <th className="p-3 text-left text-sm font-semibold border-r">HERCM Area</th>
                        <th className="p-3 text-left text-sm font-semibold bg-purple-100 dark:bg-purple-900/40">Current Belief</th>
                        <th className="p-3 text-left text-sm font-semibold bg-purple-100 dark:bg-purple-900/40">Next Week Target</th>
                        <th className="p-3 text-left text-sm font-semibold bg-gradient-to-r from-cyan-100 to-blue-100 dark:from-cyan-900/40 dark:to-blue-900/40">Course Suggestion</th>
                        <th className="p-3 text-left text-sm font-semibold bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/40 dark:to-yellow-900/40">Affirmation</th>
                        <th className="p-3 text-left text-sm font-semibold bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40">Action Checklist</th>
                        <th className="p-3 text-left text-sm font-semibold bg-gradient-to-r from-pink-100 to-rose-100 dark:from-pink-900/40 dark:to-rose-900/40">Progress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weekToDisplay.areas.map((area) => (
                        <tr key={area.category} className="border-b last:border-0 hover:bg-muted/30 transition-colors" data-testid={`history-row-${area.category.toLowerCase()}-week-${weekToDisplay.weekNumber}`}>
                          <td className="p-3 border-r bg-muted/10">
                            <Badge variant="outline" className={`font-semibold ${getCategoryColor(area.category)}`}>
                              {area.category}
                            </Badge>
                          </td>
                          <td className="p-3 bg-purple-50/30 dark:bg-purple-950/10">
                            <div className="rounded-md bg-white/50 dark:bg-black/20 border border-purple-200 dark:border-purple-800 p-2 text-sm">
                              {area.currentBelief}
                            </div>
                          </td>
                          <td className="p-3 bg-purple-50/30 dark:bg-purple-950/10">
                            <div className="rounded-md bg-white/50 dark:bg-black/20 border border-purple-200 dark:border-purple-800 p-2 text-sm">
                              {area.nextWeekTarget}
                            </div>
                          </td>
                          <td className="p-3 bg-cyan-50/30 dark:bg-cyan-950/10">
                            <div className="rounded-md bg-white/50 dark:bg-black/20 border border-cyan-200 dark:border-cyan-800 p-2 text-sm">
                              {area.courseSuggestion}
                            </div>
                          </td>
                          <td className="p-3 bg-amber-50/30 dark:bg-amber-950/10">
                            <div className="rounded-md bg-white/50 dark:bg-black/20 border border-amber-200 dark:border-amber-800 p-2 text-sm italic">
                              "{area.affirmation}"
                            </div>
                          </td>
                          <td className="p-3 bg-green-50/30 dark:bg-green-950/10">
                            <div className="space-y-1">
                              {area.checklist.map((item) => (
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
                              ))}
                            </div>
                          </td>
                          <td className="p-3 text-center bg-pink-50/30 dark:bg-pink-950/10">
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
