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
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

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
// In Phase 2, this will be replaced with real database data
const generateHistoricalData = (currentWeek: number): WeekData[] => {
  const historicalData: WeekData[] = [];
  
  // Generate data for all completed weeks (Week 1 to currentWeek-1)
  for (let week = 1; week < currentWeek; week++) {
    // Simulate random progress for past weeks (25-75%)
    const weekProgress = week === 1 ? 25 : week === 2 ? 42 : 33 + (week * 10);
    
    historicalData.push({
      weekNumber: week,
      overallProgress: weekProgress,
      areas: [
        {
          category: 'Health',
          currentBelief: week === 1 ? "I can't stick to a routine" : 
                        week === 2 ? "I create simple, sustainable habits" :
                        "I prioritize my health consistently",
          nextWeekTarget: week === 1 ? "I create simple, sustainable habits" :
                         week === 2 ? "I prioritize my health consistently" :
                         "I am a fitness role model",
          courseSuggestion: `Health ${week === 1 ? 'Foundations' : week === 2 ? 'Mastery' : 'Advanced'} - Module ${week}`,
          affirmation: week === 1 ? "I am disciplined and consistent" :
                      week === 2 ? "My body is my temple" :
                      "I radiate health and vitality",
          checklist: [
            { id: '1', text: week === 1 ? 'Walk 10 min daily' : week === 2 ? '20 min morning walk' : '30 min workout daily', checked: true },
            { id: '2', text: week === 1 ? 'Drink 8 glasses water' : week === 2 ? 'Meal prep Sunday' : 'Cook healthy meals 5x', checked: week === 2 },
            { id: '3', text: week === 1 ? 'Sleep by 11 PM' : week === 2 ? 'Yoga 3x per week' : 'Meditation 10 min', checked: false },
          ],
          progress: week === 1 ? 33 : week === 2 ? 67 : 33,
        },
        {
          category: 'Relationship',
          currentBelief: week === 1 ? "I'm not good at relationships" :
                        week === 2 ? "I build meaningful connections" :
                        "I communicate with love and clarity",
          nextWeekTarget: week === 1 ? "I build meaningful connections" :
                         week === 2 ? "I communicate with love and clarity" :
                         "I am a master at deep connections",
          courseSuggestion: `Relationship ${week === 1 ? 'Basics' : week === 2 ? 'Mastery' : 'Advanced'} - Module ${week}`,
          affirmation: week === 1 ? "I am worthy of love and connection" :
                      week === 2 ? "I communicate with love and clarity" :
                      "Love flows through me",
          checklist: [
            { id: '1', text: week === 1 ? 'Daily check-in with partner' : week === 2 ? 'Daily gratitude practice' : 'Deep conversation daily', checked: false },
            { id: '2', text: week === 1 ? 'Express gratitude 3x' : week === 2 ? 'Plan date night' : 'Show appreciation 5x', checked: week === 2 },
            { id: '3', text: week === 1 ? 'Quality time 30 min' : week === 2 ? 'Active listening 15 min' : 'Quality time 1 hour', checked: false },
          ],
          progress: week === 1 ? 0 : week === 2 ? 33 : 0,
        },
        {
          category: 'Career',
          currentBelief: week === 1 ? "I'm stuck in my career" :
                        week === 2 ? "I take steps toward my goals" :
                        "I am worthy of success and recognition",
          nextWeekTarget: week === 1 ? "I take steps toward my goals" :
                         week === 2 ? "I am worthy of success and recognition" :
                         "I am a leader in my field",
          courseSuggestion: `Career ${week === 1 ? 'Growth' : week === 2 ? 'Excellence' : 'Leadership'} - Module ${week}`,
          affirmation: week === 1 ? "I am capable of achieving my dreams" :
                      week === 2 ? "I deserve success" :
                      "I am a respected leader",
          checklist: [
            { id: '1', text: week === 1 ? 'Update resume' : week === 2 ? 'Complete project milestone' : 'Lead team project', checked: true },
            { id: '2', text: week === 1 ? 'Network with 2 people' : week === 2 ? 'Speak up in meetings' : 'Mentor junior colleague', checked: week === 2 },
            { id: '3', text: week === 1 ? 'Learn new skill 30 min' : week === 2 ? 'Request feedback' : 'Deliver presentation', checked: false },
          ],
          progress: week === 1 ? 33 : week === 2 ? 67 : 33,
        },
        {
          category: 'Money',
          currentBelief: week === 1 ? "I'll never be financially free" :
                        week === 2 ? "I manage money wisely" :
                        "Money flows to me with ease",
          nextWeekTarget: week === 1 ? "I manage money wisely" :
                         week === 2 ? "Money flows to me with ease" :
                         "I am financially abundant",
          courseSuggestion: `${week === 1 ? 'Financial Literacy' : week === 2 ? 'Wealth Building' : 'Wealth Mastery'} - Module ${week}`,
          affirmation: week === 1 ? "Money flows to me naturally" :
                      week === 2 ? "I attract abundance" :
                      "Abundance is my birthright",
          checklist: [
            { id: '1', text: week === 1 ? 'Track all expenses' : week === 2 ? 'Automate savings' : 'Invest 20% income', checked: true },
            { id: '2', text: week === 1 ? 'Save 10% income' : week === 2 ? 'Research investments' : 'Create passive income stream', checked: false },
            { id: '3', text: week === 1 ? 'Review budget weekly' : week === 2 ? 'Cut 2 expenses' : 'Financial review weekly', checked: false },
          ],
          progress: week === 1 ? 33 : week === 2 ? 33 : 33,
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

  // Generate historical data based on current week
  const mockHistoricalData = generateHistoricalData(currentWeek);

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

          {/* Overall Analytics */}
          {!selectedWeek && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Progress Analytics</h3>
              
              {/* Overall Progress Line Chart */}
              <div className="rounded-lg border p-4 space-y-3" data-testid="chart-overall-progress">
                <h4 className="text-sm font-medium">Overall Progress Trend</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={mockHistoricalData.map(week => ({
                    week: `Week ${week.weekNumber}`,
                    progress: week.overallProgress,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis 
                      dataKey="week" 
                      className="text-xs fill-muted-foreground"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      className="text-xs fill-muted-foreground"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      domain={[0, 100]}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                        color: 'hsl(var(--popover-foreground))'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="progress" 
                      stroke="hsl(var(--chart-3))" 
                      strokeWidth={3}
                      dot={{ fill: 'hsl(var(--chart-3))', r: 6 }}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* HERCM Area Comparison Bar Chart */}
              <div className="rounded-lg border p-4 space-y-3" data-testid="chart-area-comparison">
                <h4 className="text-sm font-medium">HERCM Area Progress Comparison</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={mockHistoricalData.map(week => ({
                    week: `W${week.weekNumber}`,
                    Health: week.areas.find(a => a.category === 'Health')?.progress || 0,
                    Relationship: week.areas.find(a => a.category === 'Relationship')?.progress || 0,
                    Career: week.areas.find(a => a.category === 'Career')?.progress || 0,
                    Money: week.areas.find(a => a.category === 'Money')?.progress || 0,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis 
                      dataKey="week" 
                      className="text-xs fill-muted-foreground"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      className="text-xs fill-muted-foreground"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      domain={[0, 100]}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                        color: 'hsl(var(--popover-foreground))'
                      }}
                    />
                    <Legend 
                      wrapperStyle={{ 
                        paddingTop: '20px'
                      }}
                    />
                    <Bar dataKey="Health" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Relationship" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Career" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Money" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Improvement Summary Cards */}
              <div className="rounded-lg border p-4 space-y-3">
                <h4 className="text-sm font-medium">Overall Improvement Summary</h4>
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
                          <span className={`text-xs flex items-center gap-1 ${improvement > 0 ? 'text-chart-3' : improvement < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {improvement > 0 ? <TrendingUp className="h-3 w-3" /> : improvement < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
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
        )}
      </DialogContent>
    </Dialog>
  );
}
