import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';

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

interface SnapshotData {
  id: string;
  weekNumber: number;
  createdAt: string;
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

export default function HRCMHistorySection({ currentWeek }: HRCMHistorySectionProps) {
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);

  // Helper function to calculate progress
  const calculateProgress = (checklist: ChecklistItem[]): number => {
    if (!checklist || checklist.length === 0) return 0;
    const completed = checklist.filter((item) => item.checked).length;
    return Math.round((completed / checklist.length) * 100);
  };

  // Format date/time nicely
  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return format(date, 'MMM dd, yyyy - h:mm a'); // e.g., "Oct 14, 2025 - 2:30 PM"
  };

  // Fetch all snapshots from database
  const { data: allSnapshotsData, isLoading } = useQuery({
    queryKey: ['/api/hercm/weeks'],
  });

  // Transform API data to snapshot format
  const snapshots: SnapshotData[] = [];
  
  if (allSnapshotsData && Array.isArray(allSnapshotsData)) {
    for (const snapshot of allSnapshotsData) {
      const categories = ['Health', 'Relationship', 'Career', 'Money'] as const;
      const areas: HRCMArea[] = categories.map((category) => {
        const prefix = category.toLowerCase();
        
        const ratingMap = {
          health: snapshot.currentH,
          relationship: snapshot.currentE,
          career: snapshot.currentR,
          money: snapshot.currentC,
        };
        
        return {
          category,
          currentRating: ratingMap[prefix as keyof typeof ratingMap],
          problems: snapshot[`${prefix}Problems`] || '',
          currentFeelings: snapshot[`${prefix}CurrentFeelings`] || '',
          currentBelief: snapshot[`${prefix}CurrentBelief`] || '',
          currentActions: snapshot[`${prefix}CurrentActions`] || '',
          nextWeekTarget: snapshot[`${prefix}NextTarget`] || '',
          courseSuggestion: snapshot[`${prefix}CourseSuggestion`] || '',
          affirmation: snapshot[`${prefix}Affirmation`] || '',
          checklist: snapshot[`${prefix}Checklist`] || [],
          progress: calculateProgress(snapshot[`${prefix}Checklist`] || []),
        };
      });
      
      const overallProgress = areas.length > 0
        ? Math.round(areas.reduce((sum, area) => sum + area.progress, 0) / areas.length)
        : 0;
      
      snapshots.push({
        id: snapshot.id,
        weekNumber: snapshot.weekNumber,
        createdAt: snapshot.createdAt,
        areas,
        overallProgress,
      });
    }
  }

  // Auto-select the newest snapshot when data loads
  useEffect(() => {
    if (snapshots.length > 0 && !selectedSnapshotId) {
      // Auto-select the first snapshot (newest one)
      setSelectedSnapshotId(snapshots[0].id);
    }
  }, [snapshots, selectedSnapshotId]);

  const selectedSnapshot = selectedSnapshotId 
    ? snapshots.find(s => s.id === selectedSnapshotId)
    : null;

  // Reverse snapshots to show oldest first (left to right chronologically)
  const displaySnapshots = [...snapshots].reverse();

  return (
    <div className="bg-gradient-to-br from-rose-50/80 to-pink-50/80 dark:from-rose-950/20 dark:to-pink-950/20 p-6 rounded-lg border-2 border-red-800 dark:border-red-900 shadow-lg" data-testid="section-hercm-history">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
            HRCM History
          </h2>
          <p className="text-muted-foreground mt-1">View all your HRCM table edits with exact date and time (oldest to newest, left to right)</p>
        </div>

        {isLoading ? (
          <div className="text-center py-12 border-2 border-dashed border-red-300 dark:border-red-700 rounded-lg">
            <p className="text-muted-foreground">Loading history...</p>
          </div>
        ) : snapshots.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-red-300 dark:border-red-700 rounded-lg">
            <p className="text-muted-foreground">No history yet. Save your HRCM table to see snapshots here with date & time!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Timeline Overview */}
            <div className="space-y-3 bg-rose-50/50 dark:bg-rose-950/20 p-4 rounded-lg border border-rose-200 dark:border-rose-800">
              <h3 className="text-sm font-semibold text-rose-900 dark:text-rose-100">Snapshot Timeline (Oldest → Newest)</h3>
              <div className="flex gap-2 flex-wrap">
                {displaySnapshots.map((snapshot, index) => (
                  <Button
                    key={snapshot.id}
                    variant={selectedSnapshotId === snapshot.id ? "default" : "outline"}
                    onClick={() => setSelectedSnapshotId(snapshot.id === selectedSnapshotId ? null : snapshot.id)}
                    className={`flex flex-col items-start gap-1 h-auto py-2 px-3 ${
                      selectedSnapshotId === snapshot.id 
                        ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-red-600' 
                        : 'border-rose-300 dark:border-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                    }`}
                    data-testid={`button-snapshot-${index + 1}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">#{index + 1}</span>
                      <Badge variant="outline" className="text-xs">Week {snapshot.weekNumber}</Badge>
                      <Badge className={getProgressColor(snapshot.overallProgress)}>
                        {snapshot.overallProgress}%
                      </Badge>
                    </div>
                    <span className={`text-xs whitespace-nowrap ${selectedSnapshotId === snapshot.id ? 'text-white/80' : 'text-muted-foreground'}`}>
                      {formatDateTime(snapshot.createdAt)}
                    </span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Selected Snapshot Details */}
            {selectedSnapshot && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold">
                    Saved on {formatDateTime(selectedSnapshot.createdAt)}
                  </h3>
                  <Badge variant="outline" className="text-xs">Week {selectedSnapshot.weekNumber}</Badge>
                  <Badge className={getProgressColor(selectedSnapshot.overallProgress)}>
                    {selectedSnapshot.overallProgress}% Overall
                  </Badge>
                </div>

                {/* Snapshot Table */}
                <div className="border-2 border-red-800 dark:border-red-900 rounded-lg overflow-hidden shadow-lg">
                  <div className="px-4 py-3 border-b-2 border-red-900 dark:border-red-950" style={{ backgroundColor: '#bc0000' }}>
                    <h3 className="font-bold text-white text-xl text-center drop-shadow-md">
                      Snapshot from {formatDateTime(selectedSnapshot.createdAt)}
                    </h3>
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
                        {selectedSnapshot.areas.map((area) => (
                          <tr key={area.category} className="border-b last:border-0" data-testid={`history-row-${area.category.toLowerCase()}-${selectedSnapshot.id}`}>
                            <td className="p-3 border-r bg-muted/20 align-top">
                              <Badge variant="outline" className="font-semibold">
                                {area.category}
                              </Badge>
                            </td>
                            <td className="p-2 bg-red-50/30 dark:bg-red-950/10 align-top">
                              <div className="text-center font-medium">{area.currentRating || '-'}</div>
                            </td>
                            <td className="p-2 bg-red-50/30 dark:bg-red-950/10 align-top">
                              <div className="text-xs" data-testid={`text-problems-${area.category.toLowerCase()}`}>{area.problems || '-'}</div>
                            </td>
                            <td className="p-2 bg-red-50/30 dark:bg-red-950/10 align-top">
                              <div className="text-xs" data-testid={`text-feelings-${area.category.toLowerCase()}`}>{area.currentFeelings || '-'}</div>
                            </td>
                            <td className="p-2 bg-red-50/30 dark:bg-red-950/10 align-top">
                              <div className="text-xs">{area.currentBelief || '-'}</div>
                            </td>
                            <td className="p-2 bg-red-50/30 dark:bg-red-950/10 border-r align-top">
                              <div className="text-xs">{area.currentActions || '-'}</div>
                            </td>
                            <td className="p-2 bg-cyan-50/30 dark:bg-cyan-950/10 align-top">
                              <div className="text-xs">{area.courseSuggestion || '-'}</div>
                            </td>
                            <td className="p-2 bg-purple-50/30 dark:bg-purple-950/10 align-top">
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
                            <td className="p-2 text-center bg-emerald-50/30 dark:bg-emerald-950/10 align-top">
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

          </div>
        )}
      </div>
    </div>
  );
}
