import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Lock } from 'lucide-react';

interface PlatinumProgressProps {
  currentWeek: number;
  weekStatuses: {
    week: number;
    hercmCompleted: boolean;
    checklistCompleted: boolean;
    ritualRate: number;
  }[];
}

export default function PlatinumProgress({ currentWeek, weekStatuses }: PlatinumProgressProps) {
  const totalWeeks = 4;

  return (
    <Card className="border-2 border-chart-2/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Platinum Streak Progress</CardTitle>
          <Badge className="bg-gradient-to-r from-chart-2 to-chart-1 text-white gap-1">
            <span className="font-bold">{currentWeek}/4</span> weeks
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="hidden md:flex items-center justify-between">
            {Array.from({ length: totalWeeks }, (_, idx) => {
              const weekNum = idx + 1;
              const status = weekStatuses[idx];
              const isCompleted = status?.hercmCompleted && status?.checklistCompleted && status?.ritualRate >= 80;
              const isCurrent = weekNum === currentWeek;
              const isFuture = weekNum > currentWeek;

              return (
                <div key={weekNum} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all ${
                        isCompleted
                          ? 'bg-chart-3 border-chart-3 text-white'
                          : isCurrent
                          ? 'bg-primary border-primary text-primary-foreground animate-pulse'
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
                    <p className="text-sm font-medium mt-2">Week {weekNum}</p>
                    {status && (
                      <div className="text-xs text-muted-foreground mt-1 text-center">
                        {isCompleted ? (
                          <span className="text-chart-3 font-medium">Complete!</span>
                        ) : (
                          <span>{status.ritualRate}% rituals</span>
                        )}
                      </div>
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
              const status = weekStatuses[idx];
              const isCompleted = status?.hercmCompleted && status?.checklistCompleted && status?.ritualRate >= 80;
              const isCurrent = weekNum === currentWeek;
              const isFuture = weekNum > currentWeek;

              return (
                <div key={weekNum} className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center border-2 flex-shrink-0 ${
                      isCompleted
                        ? 'bg-chart-3 border-chart-3 text-white'
                        : isCurrent
                        ? 'bg-primary border-primary text-primary-foreground'
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
                    {status && (
                      <p className="text-sm text-muted-foreground">
                        {isCompleted ? 'All criteria met' : `${status.ritualRate}% ritual completion`}
                      </p>
                    )}
                  </div>
                  {isCompleted && (
                    <Check className="w-5 h-5 text-chart-3" />
                  )}
                </div>
              );
            })}
          </div>

          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium">Platinum Criteria:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-chart-3" />
                HERCM scores filled every week
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-chart-3" />
                Checklists completed each week
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-chart-3" />
                80%+ ritual completion rate
              </li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
