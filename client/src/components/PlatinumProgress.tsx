import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Lock, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface WeekData {
  week: number;
  standardsRating: number;
  problemsAddressed: number;
  lifeSkillsCompleted: number;
  hercmFilled: boolean;
  ritualRate: number;
}

interface PlatinumProgressProps {
  currentWeek: number;
  weeklyData: WeekData[];
}

export default function PlatinumProgress({ 
  currentWeek, 
  weeklyData
}: PlatinumProgressProps) {
  const totalWeeks = 4;

  const checkWeekCriteria = (week: number) => {
    if (week > currentWeek) return { met: false, isFuture: true };
    
    if (!weeklyData || weeklyData.length === 0) return { met: false, isFuture: false };
    
    const weekData = weeklyData.find(w => w.week === week);
    if (!weekData) return { met: false, isFuture: false };
    
    const standardsMet = weekData.standardsRating >= 7;
    const problemsMet = weekData.problemsAddressed >= 3;
    const skillsMet = weekData.lifeSkillsCompleted >= 2;
    const hercmMet = weekData.hercmFilled;
    const ritualsMet = weekData.ritualRate >= 80;
    
    return {
      met: standardsMet && problemsMet && skillsMet && hercmMet && ritualsMet,
      isFuture: false,
      criteria: {
        standardsMet,
        problemsMet,
        skillsMet,
        hercmMet,
        ritualsMet
      },
      weekData
    };
  };

  const completedWeeks = Array.from({ length: currentWeek - 1 }, (_, i) => i + 1).filter(
    week => checkWeekCriteria(week).met
  ).length;

  return (
    <Card className="border-2 border-chart-2/20">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-xl">Platinum Streak Progress</CardTitle>
          <Badge className="bg-gradient-to-r from-primary to-accent text-white gap-1 border-0">
            <span className="font-bold">{completedWeeks}/4</span> weeks complete
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="hidden md:flex items-center justify-between">
            {Array.from({ length: totalWeeks }, (_, idx) => {
              const weekNum = idx + 1;
              const { met: isCompleted, isFuture, criteria, weekData } = checkWeekCriteria(weekNum);
              const isCurrent = weekNum === currentWeek;

              return (
                <div key={weekNum} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all cursor-help ${
                            isCompleted
                              ? 'bg-chart-3 border-chart-3 text-white'
                              : isCurrent
                              ? 'bg-gradient-to-br from-primary to-accent border-primary text-white animate-pulse'
                              : 'bg-card border-muted text-muted-foreground'
                          }`}
                        >
                          {isCompleted ? (
                            <Check className="w-6 h-6" />
                          ) : isFuture ? (
                            <Lock className="w-5 h-5" />
                          ) : (
                            <span className="font-bold text-lg">{weekNum}</span>
                          )}
                        </div>
                      </TooltipTrigger>
                      {isCurrent && criteria && weekData && (
                        <TooltipContent side="bottom" className="max-w-xs">
                          <div className="space-y-1 text-xs">
                            <p className="font-semibold mb-2">Week {weekNum} Progress:</p>
                            <div className={criteria.standardsMet ? 'text-chart-3' : 'text-muted-foreground'}>
                              {criteria.standardsMet ? '✓' : '○'} Standards: {weekData.standardsRating.toFixed(1)}/10 {!criteria.standardsMet && '(need 7+)'}
                            </div>
                            <div className={criteria.problemsMet ? 'text-chart-3' : 'text-muted-foreground'}>
                              {criteria.problemsMet ? '✓' : '○'} Problems: {weekData.problemsAddressed} {!criteria.problemsMet && '(need 3+)'}
                            </div>
                            <div className={criteria.skillsMet ? 'text-chart-3' : 'text-muted-foreground'}>
                              {criteria.skillsMet ? '✓' : '○'} Skills: {weekData.lifeSkillsCompleted} {!criteria.skillsMet && '(need 2+)'}
                            </div>
                            <div className={criteria.hercmMet ? 'text-chart-3' : 'text-muted-foreground'}>
                              {criteria.hercmMet ? '✓' : '○'} HERCM {!criteria.hercmMet && 'not filled'}
                            </div>
                            <div className={criteria.ritualsMet ? 'text-chart-3' : 'text-muted-foreground'}>
                              {criteria.ritualsMet ? '✓' : '○'} Rituals: {weekData.ritualRate.toFixed(0)}% {!criteria.ritualsMet && '(need 80%+)'}
                            </div>
                          </div>
                        </TooltipContent>
                      )}
                    </Tooltip>
                    <p className="text-sm font-medium mt-2">Week {weekNum}</p>
                    {isCurrent && (
                      <div className="text-xs text-muted-foreground mt-1 text-center">
                        {isCompleted ? (
                          <span className="text-chart-3 font-medium">All criteria met!</span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            In progress
                          </span>
                        )}
                      </div>
                    )}
                    {isCompleted && !isCurrent && (
                      <div className="text-xs text-chart-3 font-medium mt-1">Complete!</div>
                    )}
                  </div>
                  {idx < totalWeeks - 1 && (
                    <div
                      className={`h-0.5 flex-1 mx-2 ${
                        isCompleted ? 'bg-chart-3' : 'bg-muted'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="md:hidden space-y-4">
            {Array.from({ length: totalWeeks }, (_, idx) => {
              const weekNum = idx + 1;
              const { met: isCompleted, isFuture } = checkWeekCriteria(weekNum);
              const isCurrent = weekNum === currentWeek;

              return (
                <div key={weekNum} className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center border-2 flex-shrink-0 ${
                      isCompleted
                        ? 'bg-chart-3 border-chart-3 text-white'
                        : isCurrent
                        ? 'bg-gradient-to-br from-primary to-accent border-primary text-white'
                        : 'bg-card border-muted text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5" />
                    ) : isFuture ? (
                      <Lock className="w-4 h-4" />
                    ) : (
                      <span className="font-bold">{weekNum}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Week {weekNum}</p>
                    <p className="text-sm text-muted-foreground">
                      {isCompleted ? 'All criteria met' : isCurrent ? 'In progress' : 'Not started'}
                    </p>
                  </div>
                  {isCompleted && (
                    <Check className="w-5 h-5 text-chart-3" />
                  )}
                </div>
              );
            })}
          </div>

          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium">Platinum Criteria (Weekly):</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-chart-3" />
                Platinum Standards rated 7+/10
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-chart-3" />
                3+ Problems addressed
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-chart-3" />
                2+ Life Skills modules completed
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-chart-3" />
                HERCM scores filled
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-chart-3" />
                80%+ daily ritual completion
              </li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
