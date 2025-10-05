import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';

interface RitualHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ritualTitle: string;
  history: {
    date: string;
    completed: boolean;
  }[];
}

export default function RitualHistoryModal({
  open,
  onOpenChange,
  ritualTitle,
  history
}: RitualHistoryModalProps) {
  const completedCount = history.filter(h => h.completed).length;
  const completionRate = Math.round((completedCount / history.length) * 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">{ritualTitle}</DialogTitle>
          <DialogDescription>7-day completion history</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">Completion Rate</p>
            <div className="flex items-center justify-center gap-2">
              <p className="text-3xl font-bold">{completionRate}%</p>
              <Badge variant={completionRate >= 80 ? 'default' : 'secondary'}>
                {completedCount}/{history.length} days
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            {history.map((day, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  day.completed
                    ? 'bg-chart-3/10 border-chart-3/20'
                    : 'bg-muted/20 border-border'
                }`}
                data-testid={`history-day-${idx}`}
              >
                <span className="font-medium">{day.date}</span>
                <div className="flex items-center gap-2">
                  {day.completed ? (
                    <>
                      <Badge variant="outline" className="bg-chart-3/20 text-chart-3 border-chart-3/30">
                        Completed
                      </Badge>
                      <div className="w-6 h-6 rounded-full bg-chart-3 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    </>
                  ) : (
                    <>
                      <Badge variant="secondary" className="text-muted-foreground">
                        Missed
                      </Badge>
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                        <X className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
