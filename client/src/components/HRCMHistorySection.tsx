import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

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
  courseSuggestion: string;
  affirmation: string;
  checklist: ChecklistItem[];
  progress: number;
}

interface WeekData {
  weekNumber: number;
  areas: HRCMArea[];
  overallProgress: number;
}

interface HRCMHistorySectionProps {
  currentWeek: number;
}

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

export default function HRCMHistorySection({ currentWeek }: HRCMHistorySectionProps) {
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
          courseSuggestion: weekData[`${prefix}CourseSuggestion`] || '',
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

  // Calculate trends
  const calculateTrends = () => {
    if (historicalData.length < 2) return [];
    
    const trends = historicalData.map((week, index) => {
      if (index === 0) return null;
      const prevWeek = historicalData[index - 1];
      return {
        weekNumber: week.weekNumber,
        change: week.overallProgress - prevWeek.overallProgress,
      };
    }).filter(Boolean);
    
    return trends;
  };

  const trends = calculateTrends();

  const weekToDisplay = selectedWeek 
    ? historicalData.find(w => w.weekNumber === selectedWeek)
    : null;

  return (
    <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 p-6 rounded-lg border-2 border-orange-200 dark:border-orange-800" data-testid="section-hercm-history">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">HRCM History</h2>
          <p className="text-muted-foreground mt-1">View exact snapshots of your HRCM table for each completed week</p>
        </div>

        {historicalData.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-orange-300 dark:border-orange-700 rounded-lg">
            <p className="text-muted-foreground">No historical data yet. Complete Week {currentWeek} and generate Week {currentWeek + 1} to see your progress history!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Timeline Overview */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Week Timeline</h3>
              <div className="flex gap-2 flex-wrap">
                {historicalData.map((week, index) => {
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
                      {trend && index > 0 && historicalData[index - 1] && getTrendIcon(week.overallProgress, historicalData[index - 1].overallProgress)}
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
                <div className="border-2 border-rose-300 dark:border-rose-700 rounded-lg overflow-hidden shadow-lg">
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
                          <th className="p-3 text-left text-sm font-semibold bg-gradient-to-r from-cyan-100 to-blue-100 dark:from-cyan-900/40 dark:to-blue-900/40 w-[180px]">AI Course</th>
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
                            <td className="p-2 bg-cyan-50/30 dark:bg-cyan-950/10">
                              <div className="text-xs">{area.courseSuggestion || '-'}</div>
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
      </div>
    </div>
  );
}
