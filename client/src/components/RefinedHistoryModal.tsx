import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Clock } from 'lucide-react';
import { format } from 'date-fns';

interface RefinedHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentWeek: number;
}

export function RefinedHistoryModal({ open, onOpenChange, currentWeek }: RefinedHistoryModalProps) {
  // Fetch all weeks from database
  const { data: allWeeksData } = useQuery<any[]>({
    queryKey: ['/api/hercm/weeks'],
    enabled: open,
  });

  // Get the most recent snapshot
  const mostRecentSnapshot = allWeeksData && allWeeksData.length > 0
    ? [...allWeeksData].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            HRCM History - Most Recent Snapshot
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {mostRecentSnapshot ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-medium">
                    Last Updated: {format(new Date(mostRecentSnapshot.createdAt), 'EEEE, MMMM d, yyyy - h:mm a')}
                  </h3>
                </div>
                <Badge variant="secondary">Week {mostRecentSnapshot.weekNumber}</Badge>
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
                          health: mostRecentSnapshot.currentH,
                          relationship: mostRecentSnapshot.currentE,
                          career: mostRecentSnapshot.currentR,
                          money: mostRecentSnapshot.currentC,
                        };
                        const checklist = mostRecentSnapshot[`${prefix}Checklist`] || [];
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
                        const nextChecklist = mostRecentSnapshot[`next${category}Checklist`] || [];
                        const ratingMap: Record<string, any> = {
                          health: mostRecentSnapshot.nextHealthRating,
                          relationship: mostRecentSnapshot.nextRelationshipRating,
                          career: mostRecentSnapshot.nextCareerRating,
                          money: mostRecentSnapshot.nextMoneyRating,
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
                              {mostRecentSnapshot[`${prefix}ResultChecklist`]?.map((item: any) => (
                                <div key={item.id} className="flex items-center gap-1 mb-1">
                                  <Checkbox checked={item.checked} disabled className="h-3 w-3" />
                                  <span>{item.text}</span>
                                </div>
                              )) || '-'}
                            </td>
                            <td className="p-2 text-xs">
                              {mostRecentSnapshot[`${prefix}FeelingsChecklist`]?.map((item: any) => (
                                <div key={item.id} className="flex items-center gap-1 mb-1">
                                  <Checkbox checked={item.checked} disabled className="h-3 w-3" />
                                  <span>{item.text}</span>
                                </div>
                              )) || '-'}
                            </td>
                            <td className="p-2 text-xs">
                              {mostRecentSnapshot[`${prefix}BeliefsChecklist`]?.map((item: any) => (
                                <div key={item.id} className="flex items-center gap-1 mb-1">
                                  <Checkbox checked={item.checked} disabled className="h-3 w-3" />
                                  <span>{item.text}</span>
                                </div>
                              )) || '-'}
                            </td>
                            <td className="p-2 text-xs">
                              {mostRecentSnapshot[`${prefix}ActionsChecklist`]?.map((item: any) => (
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
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No history available yet. Start tracking your HRCM progress!</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
