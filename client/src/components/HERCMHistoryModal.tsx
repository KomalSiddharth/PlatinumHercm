import { useState } from 'react';
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

// Mock historical data - will be replaced with real data from database
const mockHistoricalData: WeekData[] = [
  {
    weekNumber: 1,
    overallProgress: 25,
    areas: [
      {
        category: 'Health',
        currentBelief: "I can't stick to a routine",
        nextWeekTarget: "I create simple, sustainable habits",
        courseSuggestion: "Health Foundations - Module 1",
        affirmation: "I am disciplined and consistent",
        checklist: [
          { id: '1', text: 'Walk 10 min daily', checked: true },
          { id: '2', text: 'Drink 8 glasses water', checked: false },
          { id: '3', text: 'Sleep by 11 PM', checked: false },
        ],
        progress: 33,
      },
      {
        category: 'Relationship',
        currentBelief: "I'm not good at relationships",
        nextWeekTarget: "I build meaningful connections",
        courseSuggestion: "Relationship Basics - Module 1",
        affirmation: "I am worthy of love and connection",
        checklist: [
          { id: '1', text: 'Daily check-in with partner', checked: false },
          { id: '2', text: 'Express gratitude 3x', checked: false },
          { id: '3', text: 'Quality time 30 min', checked: false },
        ],
        progress: 0,
      },
      {
        category: 'Career',
        currentBelief: "I'm stuck in my career",
        nextWeekTarget: "I take steps toward my goals",
        courseSuggestion: "Career Growth - Module 1",
        affirmation: "I am capable of achieving my dreams",
        checklist: [
          { id: '1', text: 'Update resume', checked: true },
          { id: '2', text: 'Network with 2 people', checked: false },
          { id: '3', text: 'Learn new skill 30 min', checked: false },
        ],
        progress: 33,
      },
      {
        category: 'Money',
        currentBelief: "I'll never be financially free",
        nextWeekTarget: "I manage money wisely",
        courseSuggestion: "Financial Literacy - Module 1",
        affirmation: "Money flows to me naturally",
        checklist: [
          { id: '1', text: 'Track all expenses', checked: true },
          { id: '2', text: 'Save 10% income', checked: false },
          { id: '3', text: 'Review budget weekly', checked: false },
        ],
        progress: 33,
      },
    ],
  },
  {
    weekNumber: 2,
    overallProgress: 42,
    areas: [
      {
        category: 'Health',
        currentBelief: "I create simple, sustainable habits",
        nextWeekTarget: "I don't have time to exercise",
        courseSuggestion: "Health Mastery - Module 1",
        affirmation: "My body is my temple",
        checklist: [
          { id: '1', text: '20 min morning walk', checked: true },
          { id: '2', text: 'Meal prep Sunday', checked: true },
          { id: '3', text: 'Yoga 3x per week', checked: false },
        ],
        progress: 67,
      },
      {
        category: 'Relationship',
        currentBelief: "I build meaningful connections",
        nextWeekTarget: "I struggle to communicate my feelings",
        courseSuggestion: "Relationship Mastery - Module 1",
        affirmation: "I communicate with love and clarity",
        checklist: [
          { id: '1', text: 'Daily gratitude for partner', checked: false },
          { id: '2', text: 'Plan date night', checked: true },
          { id: '3', text: 'Active listening practice', checked: false },
        ],
        progress: 33,
      },
      {
        category: 'Career',
        currentBelief: "I take steps toward my goals",
        nextWeekTarget: "I'm not good enough for promotion",
        courseSuggestion: "Career Excellence - Module 2",
        affirmation: "I deserve success and recognition",
        checklist: [
          { id: '1', text: 'Complete project milestone', checked: true },
          { id: '2', text: 'Speak up in meetings', checked: true },
          { id: '3', text: 'Request feedback', checked: false },
        ],
        progress: 67,
      },
      {
        category: 'Money',
        currentBelief: "I manage money wisely",
        nextWeekTarget: "Money is hard to earn",
        courseSuggestion: "Wealth Building - Module 2",
        affirmation: "I attract abundance effortlessly",
        checklist: [
          { id: '1', text: 'Automate savings', checked: true },
          { id: '2', text: 'Research investments', checked: false },
          { id: '3', text: 'Cut 2 expenses', checked: false },
        ],
        progress: 33,
      },
    ],
  },
];

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
            <span>HERCM History & Analytics</span>
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
            View your journey across all weeks and track your progress trends
          </DialogDescription>
        </DialogHeader>

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

              {/* Week Table */}
              <div className="rounded-lg border">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-3 text-left text-sm font-semibold text-muted-foreground">HERCM Area</th>
                        <th className="p-3 text-left text-sm font-semibold text-muted-foreground">Current Belief</th>
                        <th className="p-3 text-left text-sm font-semibold text-muted-foreground">Next Week Target</th>
                        <th className="p-3 text-left text-sm font-semibold text-muted-foreground">✨ Course Suggestion</th>
                        <th className="p-3 text-left text-sm font-semibold text-muted-foreground">💫 Affirmation</th>
                        <th className="p-3 text-left text-sm font-semibold text-muted-foreground">✓ Action Checklist</th>
                        <th className="p-3 text-left text-sm font-semibold text-muted-foreground">Progress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weekToDisplay.areas.map((area) => (
                        <tr key={area.category} className="border-b last:border-0" data-testid={`history-row-${area.category.toLowerCase()}-week-${weekToDisplay.weekNumber}`}>
                          <td className="p-3">
                            <span className={`font-semibold ${getCategoryColor(area.category)}`}>
                              {area.category}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="rounded bg-muted/30 p-2 text-sm">
                              {area.currentBelief}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="rounded bg-accent/5 border border-accent/20 p-2 text-sm">
                              {area.nextWeekTarget}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="rounded bg-chart-1/5 border border-chart-1/20 p-2 text-sm">
                              {area.courseSuggestion}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="rounded bg-chart-2/5 border border-chart-2/20 p-2 text-sm italic">
                              "{area.affirmation}"
                            </div>
                          </td>
                          <td className="p-3">
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
                          <td className="p-3">
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

          {/* Overall Analytics */}
          {!selectedWeek && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Progress Analytics</h3>
              
              {/* Overall Trend */}
              <div className="rounded-lg border p-4 space-y-3">
                <h4 className="text-sm font-medium">Overall Progress Trend</h4>
                <div className="flex items-center gap-2">
                  {mockHistoricalData.map((week, index) => {
                    const prevProgress = index > 0 ? mockHistoricalData[index - 1].overallProgress : 0;
                    const change = week.overallProgress - prevProgress;
                    
                    return (
                      <div key={week.weekNumber} className="flex flex-col items-center gap-1" data-testid={`analytics-week-${week.weekNumber}`}>
                        <div className="text-xs text-muted-foreground">W{week.weekNumber}</div>
                        <Badge className={getProgressColor(week.overallProgress)}>
                          {week.overallProgress}%
                        </Badge>
                        {index > 0 && (
                          <div className={`text-xs font-semibold ${change > 0 ? 'text-chart-3' : change < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {change > 0 ? '+' : ''}{change}%
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Area-wise Comparison */}
              <div className="rounded-lg border p-4 space-y-3">
                <h4 className="text-sm font-medium">HERCM Area Progress</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {['Health', 'Relationship', 'Career', 'Money'].map((category) => {
                    const latestWeek = mockHistoricalData[mockHistoricalData.length - 1];
                    const firstWeek = mockHistoricalData[0];
                    const latestArea = latestWeek.areas.find(a => a.category === category);
                    const firstArea = firstWeek.areas.find(a => a.category === category);
                    const improvement = latestArea && firstArea ? latestArea.progress - firstArea.progress : 0;

                    return (
                      <div key={category} className="space-y-2" data-testid={`analytics-category-${category.toLowerCase()}`}>
                        <div className={`text-sm font-semibold ${getCategoryColor(category)}`}>
                          {category}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getProgressColor(latestArea?.progress || 0)}>
                            {latestArea?.progress || 0}%
                          </Badge>
                          <span className={`text-xs ${improvement > 0 ? 'text-chart-3' : improvement < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {improvement > 0 ? '+' : ''}{improvement}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
