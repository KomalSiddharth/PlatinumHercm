import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Calendar, TrendingUp } from 'lucide-react';

interface WeeklySummaryProps {
  weekStart: string;
  weekEnd: string;
  completionPercent: number;
  areasCompleted: number;
  totalAreas: number;
}

export default function WeeklySummary({
  weekStart,
  weekEnd,
  completionPercent,
  areasCompleted,
  totalAreas
}: WeeklySummaryProps) {
  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-card to-primary/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Weekly Summary
          </CardTitle>
          <Badge variant="outline" className="gap-1">
            <TrendingUp className="w-3 h-3" />
            {completionPercent}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">
              {weekStart} - {weekEnd}
            </span>
            <span className="font-medium">
              {areasCompleted}/{totalAreas} areas
            </span>
          </div>
          <Progress value={completionPercent} className="h-3" />
        </div>
        <p className="text-sm text-muted-foreground">
          {completionPercent === 100
            ? 'Amazing! All HERCM areas completed this week!'
            : `${areasCompleted} out of ${totalAreas} HERCM areas completed. Keep going!`}
        </p>
      </CardContent>
    </Card>
  );
}
