import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface RitualHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ritualTitle: string;
  ritualId: string;
  allCompletions: Array<{ date: string; ritualId: string }>;
}

// Helper function to generate history for any month/year
const generateMonthHistory = (year: number, month: number, completions: Array<{ date: string; ritualId: string }>, ritualId: string) => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const history = [];
  
  for (let day = 1; day <= daysInMonth; day++) {
    const isoDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const date = new Date(year, month, day);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    const completionRecord = completions.find(c => c.date === isoDate && c.ritualId === ritualId);
    const isMarked = !!completionRecord;
    
    history.push({
      date: dateStr,
      completed: isMarked,
      marked: isMarked
    });
  }
  
  return history;
};

export default function RitualHistoryModal({
  open,
  onOpenChange,
  ritualTitle,
  ritualId,
  allCompletions
}: RitualHistoryModalProps) {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // 0-11

  // Generate history for selected month
  const history = useMemo(() => {
    return generateMonthHistory(selectedYear, selectedMonth, allCompletions, ritualId);
  }, [selectedYear, selectedMonth, allCompletions, ritualId]);

  const markedDays = history.filter(h => h.marked);
  const completedCount = markedDays.filter(h => h.completed).length;
  const totalDaysInMonth = history.length;
  const completionRate = totalDaysInMonth > 0 
    ? Math.round((completedCount / totalDaysInMonth) * 100) 
    : 0;

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  // Reset to current month when modal opens
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setSelectedYear(now.getFullYear());
      setSelectedMonth(now.getMonth());
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">{ritualTitle}</DialogTitle>
          <DialogDescription className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevMonth}
              className="h-8 w-8"
              data-testid="button-prev-month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="flex-1 text-center">
              {new Date(selectedYear, selectedMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} - Monthly history
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextMonth}
              className="h-8 w-8"
              data-testid="button-next-month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">Completion Rate (This Month)</p>
            <div className="flex items-center justify-center gap-2">
              <p className="text-3xl font-bold">{completionRate}%</p>
              <Badge variant={completionRate >= 80 ? 'default' : 'secondary'}>
                {completedCount}/{totalDaysInMonth} days tracked
              </Badge>
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {history.map((day, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  day.marked && day.completed
                    ? 'bg-chart-3/10 border-chart-3/20'
                    : 'bg-muted/20 border-border'
                }`}
                data-testid={`history-day-${idx}`}
              >
                <span className="font-medium">{day.date}</span>
                <div className="flex items-center gap-2">
                  {day.marked ? (
                    day.completed ? (
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
                    )
                  ) : (
                    <span className="text-sm text-muted-foreground italic">Not marked</span>
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
