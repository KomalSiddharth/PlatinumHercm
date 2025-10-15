import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface RefinedHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentWeek: number;
}

export function RefinedHistoryModal({ open, onOpenChange, currentWeek }: RefinedHistoryModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null);

  // Fetch all weeks from database
  const { data: allWeeksData } = useQuery<any[]>({
    queryKey: ['/api/hercm/weeks'],
    enabled: open,
  });

  // Filter snapshots by selected date and month
  const filteredSnapshots = (allWeeksData || []).filter((week: any) => {
    const weekDate = new Date(week.createdAt);
    if (selectedDate) {
      return (
        weekDate.getDate() === selectedDate.getDate() &&
        weekDate.getMonth() === selectedDate.getMonth() &&
        weekDate.getFullYear() === selectedDate.getFullYear()
      );
    }
    return weekDate.getMonth() === selectedMonth;
  }) || [];

  // Group by date for better organization
  const groupedByDate = filteredSnapshots.reduce((acc: any, week: any) => {
    const dateKey = format(new Date(week.createdAt), 'yyyy-MM-dd');
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(week);
    return acc;
  }, {});

  // Sort dates descending (newest first)
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  const selectedWeekData = selectedSnapshot 
    ? filteredSnapshots.find((w: any) => w.id === selectedSnapshot)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            HRCM History - Recent Snapshots
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Filter Controls */}
          <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/30 rounded-lg">
            {/* Date Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" data-testid="button-select-date">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {/* Month Filter */}
            <Select 
              value={selectedMonth.toString()} 
              onValueChange={(v) => {
                setSelectedMonth(Number(v));
                setSelectedDate(undefined);
              }}
            >
              <SelectTrigger className="w-40" data-testid="select-month">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  'January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'
                ].map((month, idx) => (
                  <SelectItem key={idx} value={idx.toString()}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => {
                setSelectedDate(new Date());
                setSelectedMonth(new Date().getMonth());
              }}
              data-testid="button-reset-filters"
            >
              Today
            </Button>
          </div>

          {/* Snapshots Timeline */}
          {sortedDates.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Recent Changes</h3>
              
              {sortedDates.map((dateKey) => (
                <div key={dateKey} className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">
                    {format(new Date(dateKey), 'EEEE, MMMM d, yyyy')}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {groupedByDate[dateKey]
                      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((week: any) => (
                        <Button
                          key={week.id}
                          variant={selectedSnapshot === week.id ? "default" : "outline"}
                          onClick={() => setSelectedSnapshot(week.id === selectedSnapshot ? null : week.id)}
                          className="flex items-center gap-2"
                          data-testid={`button-snapshot-${week.id}`}
                        >
                          <Clock className="w-4 h-4" />
                          {format(new Date(week.createdAt), 'h:mm a')}
                          <Badge variant="secondary">Week {week.weekNumber}</Badge>
                        </Button>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No snapshots found for {selectedDate ? format(selectedDate, 'PPP') : 'this month'}
              </p>
            </div>
          )}

          {/* Selected Snapshot Details */}
          {selectedWeekData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Snapshot from {format(new Date(selectedWeekData.createdAt), 'PPP p')}
                </h3>
                <Badge>Week {selectedWeekData.weekNumber}</Badge>
              </div>

              {/* Current Week Table */}
              <div className="border-2 border-rose-300 dark:border-rose-700 rounded-lg overflow-hidden">
                <div className="bg-gradient-to-r from-rose-400 to-pink-500 dark:from-rose-600 dark:to-pink-700 px-4 py-2">
                  <h4 className="font-bold text-white text-center">Current Week</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/30">
                        <th className="p-2 text-left font-medium">Area</th>
                        <th className="p-2 text-left font-medium">Rating</th>
                        <th className="p-2 text-left font-medium">Platinum Standards</th>
                        <th className="p-2 text-center font-medium">Progress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {['Health', 'Relationship', 'Career', 'Money'].map((category) => {
                        const prefix = category.toLowerCase();
                        const ratingMap: Record<string, any> = {
                          health: selectedWeekData.currentH,
                          relationship: selectedWeekData.currentE,
                          career: selectedWeekData.currentR,
                          money: selectedWeekData.currentC,
                        };
                        const checklist = selectedWeekData[`${prefix}Checklist`] || [];
                        const progress = checklist.length > 0 
                          ? Math.round((checklist.filter((c: any) => c.checked).length / checklist.length) * 100)
                          : 0;

                        return (
                          <tr key={category} className="border-t">
                            <td className="p-2">
                              <Badge variant="outline">{category}</Badge>
                            </td>
                            <td className="p-2 font-medium">
                              {ratingMap[prefix as keyof typeof ratingMap] || '-'}/10
                            </td>
                            <td className="p-2">
                              <div className="space-y-1">
                                {checklist.map((item: any) => (
                                  <div key={item.id} className="flex items-center gap-2 text-xs">
                                    <Checkbox checked={item.checked} disabled />
                                    <span className={item.checked ? 'opacity-70' : ''}>{item.text}</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="p-2 text-center">
                              <Badge>{progress}%</Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Next Week Target Table */}
              <div className="border-2 border-teal-300 dark:border-teal-700 rounded-lg overflow-hidden">
                <div className="bg-gradient-to-r from-teal-400 to-cyan-500 dark:from-teal-600 dark:to-cyan-700 px-4 py-2">
                  <h4 className="font-bold text-white text-center">Next Week Target</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/30">
                        <th className="p-2 text-left font-medium">Area</th>
                        <th className="p-2 text-left font-medium">Rating</th>
                        <th className="p-2 text-left font-medium">Platinum Standards</th>
                        <th className="p-2 text-left font-medium">Results</th>
                        <th className="p-2 text-left font-medium">Feelings</th>
                        <th className="p-2 text-left font-medium">Beliefs</th>
                        <th className="p-2 text-left font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {['Health', 'Relationship', 'Career', 'Money'].map((category) => {
                        const prefix = category.toLowerCase();
                        const nextChecklist = selectedWeekData[`next${category}Checklist`] || [];
                        const ratingMap: Record<string, any> = {
                          health: selectedWeekData.nextHealthRating,
                          relationship: selectedWeekData.nextRelationshipRating,
                          career: selectedWeekData.nextCareerRating,
                          money: selectedWeekData.nextMoneyRating,
                        };

                        return (
                          <tr key={category} className="border-t">
                            <td className="p-2">
                              <Badge variant="outline">{category}</Badge>
                            </td>
                            <td className="p-2 font-medium">
                              {ratingMap[prefix as keyof typeof ratingMap] || '-'}/10
                            </td>
                            <td className="p-2">
                              <div className="space-y-1">
                                {nextChecklist.map((item: any) => (
                                  <div key={item.id} className="flex items-center gap-2 text-xs">
                                    <Checkbox checked={item.checked} disabled />
                                    <span className={item.checked ? 'opacity-70' : ''}>{item.text}</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="p-2 text-xs">
                              {selectedWeekData[`${prefix}ResultChecklist`]?.map((item: any) => (
                                <div key={item.id} className="flex items-center gap-1 mb-1">
                                  <Checkbox checked={item.checked} disabled className="h-3 w-3" />
                                  <span>{item.text}</span>
                                </div>
                              )) || '-'}
                            </td>
                            <td className="p-2 text-xs">
                              {selectedWeekData[`${prefix}FeelingsChecklist`]?.map((item: any) => (
                                <div key={item.id} className="flex items-center gap-1 mb-1">
                                  <Checkbox checked={item.checked} disabled className="h-3 w-3" />
                                  <span>{item.text}</span>
                                </div>
                              )) || '-'}
                            </td>
                            <td className="p-2 text-xs">
                              {selectedWeekData[`${prefix}BeliefsChecklist`]?.map((item: any) => (
                                <div key={item.id} className="flex items-center gap-1 mb-1">
                                  <Checkbox checked={item.checked} disabled className="h-3 w-3" />
                                  <span>{item.text}</span>
                                </div>
                              )) || '-'}
                            </td>
                            <td className="p-2 text-xs">
                              {selectedWeekData[`${prefix}ActionsChecklist`]?.map((item: any) => (
                                <div key={item.id} className="flex items-center gap-1 mb-1">
                                  <Checkbox checked={item.checked} disabled className="h-3 w-3" />
                                  <span>{item.text}</span>
                                </div>
                              )) || '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {!selectedSnapshot && filteredSnapshots.length > 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Select a snapshot from the timeline above to view details</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
