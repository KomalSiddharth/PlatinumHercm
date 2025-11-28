import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Clock, TrendingUp, Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfDay, endOfDay, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface RefinedHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentWeek: number;
}

export function RefinedHistoryModal({ open, onOpenChange, currentWeek }: RefinedHistoryModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Fetch all weeks from database
  const { data: allWeeksData } = useQuery<any[]>({
    queryKey: ['/api/hercm/weeks'],
    enabled: open,
  });

  // Get the most recent snapshot for the selected date
  const getSnapshotForDate = () => {
    if (!allWeeksData || !selectedDate) return null;

    // Filter snapshots for the selected date
    const snapshotsForDate = allWeeksData.filter(snapshot => {
      const snapshotDate = new Date(snapshot.createdAt);
      return isSameDay(snapshotDate, selectedDate);
    });

    // Return the most recent snapshot for that date
    if (snapshotsForDate.length === 0) return null;
    
    return [...snapshotsForDate].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
  };

  const displaySnapshot = getSnapshotForDate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            HRCM History
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Calendar Date Picker */}
          <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-primary" />
              <span className="font-medium">Select Date:</span>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[280px] justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                  data-testid="button-select-date"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "MMMM dd, yyyy") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return date > today; // Disable all future dates
                  }}
                  initialFocus
                  data-testid="calendar-picker"
                />
              </PopoverContent>
            </Popover>
          </div>

          {displaySnapshot ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-medium">
                    Last Updated: {format(new Date(displaySnapshot.createdAt), 'EEEE, MMMM d, yyyy - h:mm a')}
                  </h3>
                </div>
                <Badge variant="secondary">Week {displaySnapshot.weekNumber}</Badge>
              </div>

              {/* Current Week Table - Exact Structure */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gradient-to-r from-rose-400 to-pink-500 dark:from-rose-600 dark:to-pink-700 px-4 py-3">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Current Week
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30">
                        <TableHead className="font-bold border-r min-w-[100px]">HRCM Area</TableHead>
                        <TableHead className="min-w-[60px] bg-rose-100 dark:bg-rose-900/40 font-semibold">Rating</TableHead>
                        <TableHead className="min-w-[140px] bg-rose-100 dark:bg-rose-900/40 font-semibold">Results</TableHead>
                        <TableHead className="min-w-[140px] bg-rose-100 dark:bg-rose-900/40 font-semibold">Feelings</TableHead>
                        <TableHead className="min-w-[140px] bg-rose-100 dark:bg-rose-900/40 font-semibold">Beliefs/Reasons</TableHead>
                        <TableHead className="min-w-[140px] bg-rose-100 dark:bg-rose-900/40 font-semibold border-r">Actions</TableHead>
                        <TableHead className="min-w-[150px] bg-gradient-to-r from-purple-100 to-violet-100 dark:from-purple-900/40 dark:to-violet-900/40 font-semibold">Platinum Standards</TableHead>
                        <TableHead className="min-w-[70px] bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40 font-semibold text-center">Progress</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {['Health', 'Relationship', 'Career', 'Money'].map((category) => {
                        const prefix = category.toLowerCase();
                        const ratingMap: Record<string, any> = {
                          health: displaySnapshot.currentH,
                          relationship: displaySnapshot.currentE,
                          career: displaySnapshot.currentR,
                          money: displaySnapshot.currentC,
                        };
                        const resultsMap: Record<string, any> = {
                          health: displaySnapshot.healthProblems,
                          relationship: displaySnapshot.relationshipProblems,
                          career: displaySnapshot.careerProblems,
                          money: displaySnapshot.moneyProblems,
                        };
                        const feelingsMap: Record<string, any> = {
                          health: displaySnapshot.healthCurrentFeelings,
                          relationship: displaySnapshot.relationshipCurrentFeelings,
                          career: displaySnapshot.careerCurrentFeelings,
                          money: displaySnapshot.moneyCurrentFeelings,
                        };
                        const beliefsMap: Record<string, any> = {
                          health: displaySnapshot.healthCurrentBelief,
                          relationship: displaySnapshot.relationshipCurrentBelief,
                          career: displaySnapshot.careerCurrentBelief,
                          money: displaySnapshot.moneyCurrentBelief,
                        };
                        const actionsMap: Record<string, any> = {
                          health: displaySnapshot.healthCurrentActions,
                          relationship: displaySnapshot.relationshipCurrentActions,
                          career: displaySnapshot.careerCurrentActions,
                          money: displaySnapshot.moneyCurrentActions,
                        };
                        const checklist = displaySnapshot[`${prefix}Checklist`] || [];
                        const progress = checklist.length > 0 
                          ? Math.round((checklist.filter((c: any) => c.checked).length / checklist.length) * 100)
                          : 0;

                        return (
                          <TableRow key={category} className="border-b">
                            <TableCell className="font-semibold border-r bg-muted/20 align-top">
                              <Badge variant="outline" className="font-semibold">
                                {category}
                              </Badge>
                            </TableCell>
                            <TableCell className="p-2 bg-red-50/30 dark:bg-red-950/10 align-top">
                              <div className="w-16 h-9 flex items-center justify-center text-center font-semibold border rounded-md bg-muted/20">
                                {ratingMap[prefix as keyof typeof ratingMap] || 0}
                              </div>
                            </TableCell>
                            <TableCell className="p-2 bg-red-50/30 dark:bg-red-950/10 align-top text-xs">
                              {resultsMap[prefix as keyof typeof resultsMap] || <span className="text-muted-foreground italic">-</span>}
                            </TableCell>
                            <TableCell className="p-2 bg-red-50/30 dark:bg-red-950/10 align-top text-xs">
                              {feelingsMap[prefix as keyof typeof feelingsMap] || <span className="text-muted-foreground italic">-</span>}
                            </TableCell>
                            <TableCell className="p-2 bg-red-50/30 dark:bg-red-950/10 align-top text-xs">
                              {beliefsMap[prefix as keyof typeof beliefsMap] || <span className="text-muted-foreground italic">-</span>}
                            </TableCell>
                            <TableCell className="p-2 bg-red-50/30 dark:bg-red-950/10 align-top border-r text-xs">
                              {actionsMap[prefix as keyof typeof actionsMap] || <span className="text-muted-foreground italic">-</span>}
                            </TableCell>
                            <TableCell className="p-2 bg-purple-50/30 dark:bg-purple-950/10 align-top">
                              <div className="space-y-1">
                                {checklist.map((item: any) => (
                                  <div key={item.id} className="flex items-center gap-2 text-xs">
                                    <Checkbox checked={item.checked} disabled />
                                    <span>{item.text}</span>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="p-2 bg-emerald-50/30 dark:bg-emerald-950/10 text-center align-top">
                              <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white">{progress}%</Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Next Week Target Table - Exact Structure */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gradient-to-r from-teal-400 to-emerald-500 dark:from-teal-600 dark:to-emerald-700 px-4 py-3">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Next Week Target
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30">
                        <TableHead className="font-bold border-r min-w-[100px]">HRCM Area</TableHead>
                        <TableHead className="min-w-[60px] bg-blue-100 dark:bg-blue-900/40 font-semibold">Rating</TableHead>
                        <TableHead className="min-w-[140px] bg-blue-100 dark:bg-blue-900/40 font-semibold">Results</TableHead>
                        <TableHead className="min-w-[140px] bg-blue-100 dark:bg-blue-900/40 font-semibold">Feelings</TableHead>
                        <TableHead className="min-w-[140px] bg-blue-100 dark:bg-blue-900/40 font-semibold">Beliefs/Reasons</TableHead>
                        <TableHead className="min-w-[140px] bg-blue-100 dark:bg-blue-900/40 font-semibold border-r">Actions</TableHead>
                        <TableHead className="min-w-[200px] bg-cyan-100 dark:bg-cyan-900/40 font-semibold">Platinum Skills</TableHead>
                        <TableHead className="min-w-[150px] bg-amber-100 dark:bg-amber-900/40 font-semibold">Platinum Standards</TableHead>
                        <TableHead className="min-w-[70px] bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40 font-semibold text-center">Progress</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {['Health', 'Relationship', 'Career', 'Money'].map((category, index) => {
                        const prefix = category.toLowerCase();
                        const ratingMap: Record<string, any> = {
                          health: displaySnapshot.nextHealthRating,
                          relationship: displaySnapshot.nextRelationshipRating,
                          career: displaySnapshot.nextCareerRating,
                          money: displaySnapshot.nextMoneyRating,
                        };
                        const nextChecklist = displaySnapshot[`next${category}Checklist`] || [];
                        const platinumStandards = displaySnapshot[`${prefix}Checklist`] || [];
                        const progress = nextChecklist.length > 0 
                          ? Math.round((nextChecklist.filter((c: any) => c.checked).length / nextChecklist.length) * 100)
                          : 0;

                        return (
                          <TableRow key={category} className="border-b">
                            <TableCell className="font-semibold border-r bg-muted/20 align-top">
                              <Badge variant="outline" className="font-semibold">
                                {category}
                              </Badge>
                            </TableCell>
                            <TableCell className="p-2 bg-blue-50/30 dark:bg-blue-950/10 align-top">
                              <div className="w-16 h-9 flex items-center justify-center text-center font-semibold border rounded-md bg-muted/20">
                                {ratingMap[prefix as keyof typeof ratingMap] || 0}
                              </div>
                            </TableCell>
                            <TableCell className="p-2 bg-blue-50/30 dark:bg-blue-950/10 align-top text-xs">
                              {displaySnapshot[`${prefix}ResultChecklist`]?.map((item: any) => (
                                <div key={item.id} className="flex items-center gap-1 mb-1">
                                  <Checkbox checked={item.checked} disabled className="h-3 w-3" />
                                  <span>{item.text}</span>
                                </div>
                              )) || <span className="text-muted-foreground italic">-</span>}
                            </TableCell>
                            <TableCell className="p-2 bg-blue-50/30 dark:bg-blue-950/10 align-top text-xs">
                              {displaySnapshot[`${prefix}FeelingsChecklist`]?.map((item: any) => (
                                <div key={item.id} className="flex items-center gap-1 mb-1">
                                  <Checkbox checked={item.checked} disabled className="h-3 w-3" />
                                  <span>{item.text}</span>
                                </div>
                              )) || <span className="text-muted-foreground italic">-</span>}
                            </TableCell>
                            <TableCell className="p-2 bg-blue-50/30 dark:bg-blue-950/10 align-top text-xs">
                              {displaySnapshot[`${prefix}BeliefsChecklist`]?.map((item: any) => (
                                <div key={item.id} className="flex items-center gap-1 mb-1">
                                  <Checkbox checked={item.checked} disabled className="h-3 w-3" />
                                  <span>{item.text}</span>
                                </div>
                              )) || <span className="text-muted-foreground italic">-</span>}
                            </TableCell>
                            <TableCell className="p-2 bg-blue-50/30 dark:bg-blue-950/10 align-top border-r text-xs">
                              {displaySnapshot[`${prefix}ActionsChecklist`]?.map((item: any) => (
                                <div key={item.id} className="flex items-center gap-1 mb-1">
                                  <Checkbox checked={item.checked} disabled className="h-3 w-3" />
                                  <span>{item.text}</span>
                                </div>
                              )) || <span className="text-muted-foreground italic">-</span>}
                            </TableCell>
                            {/* Unified Assignment Column with rowspan */}
                            {index === 0 && (
                              <TableCell rowSpan={4} className="p-2 bg-cyan-50/30 dark:bg-cyan-950/10 align-top">
                                <div className="space-y-2">
                                  {displaySnapshot.unifiedAssignment && Array.isArray(displaySnapshot.unifiedAssignment) && displaySnapshot.unifiedAssignment.length > 0 ? (
                                    displaySnapshot.unifiedAssignment.map((lesson: any) => (
                                      <div key={lesson.id} className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded border text-xs">
                                        <Checkbox checked={lesson.completed} disabled className="h-3 w-3" />
                                        <div className="flex-1">
                                          <div className="font-medium">{lesson.lessonName}</div>
                                          <div className="text-[10px] text-muted-foreground">{lesson.courseName}</div>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <span className="text-muted-foreground italic text-xs">No assignments</span>
                                  )}
                                </div>
                              </TableCell>
                            )}
                            <TableCell className="p-2 bg-amber-50/30 dark:bg-amber-950/10 align-top">
                              <div className="space-y-1">
                                {platinumStandards.length > 0 ? platinumStandards.map((item: any) => (
                                  <div key={item.id} className="flex items-center gap-2 text-xs">
                                    <Checkbox checked={item.checked} disabled className="h-3 w-3" />
                                    <span>{item.text}</span>
                                  </div>
                                )) : <span className="text-muted-foreground italic text-xs">No standards</span>}
                              </div>
                            </TableCell>
                            <TableCell className="p-2 bg-emerald-50/30 dark:bg-emerald-950/10 text-center align-top">
                              <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white">{progress}%</Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {selectedDate 
                  ? `No history available for ${format(selectedDate, "MMMM dd, yyyy")}. Please select another date.`
                  : "Please select a date to view history."
                }
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
