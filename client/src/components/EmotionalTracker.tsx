import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Heart, Brain, RefreshCcw, Sparkles, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

interface EmotionalTrackerData {
  id?: string;
  userId: string;
  date: string;
  timeSlot: string;
  positiveEmotions: string;
  negativeEmotions: string;
  repeatingEmotions: string;
  missingEmotions: string;
}

const TIME_SLOTS = [
  '5am - 7am',
  '7am - 9am',
  '9am - 11am',
  '11am to 1pm',
  '1pm to 3pm',
  '3pm to 5pm',
  '5pm to 7pm',
  '7pm to 9pm',
  '9pm to 11pm',
  '11pm to 01am',
];

// Helper function to get local date string (NOT UTC)
const getLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

type EmotionField = 'positiveEmotions' | 'negativeEmotions' | 'repeatingEmotions' | 'missingEmotions';

const FIELD_LABELS: Record<EmotionField, string> = {
  positiveEmotions: 'Positive Emotions',
  negativeEmotions: 'Negative Emotions',
  repeatingEmotions: 'Repeating Emotions',
  missingEmotions: 'Missing Emotions',
};

const FIELD_COLORS: Record<EmotionField, { bg: string; text: string; border: string }> = {
  positiveEmotions: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-800' },
  negativeEmotions: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800' },
  repeatingEmotions: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  missingEmotions: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800' },
};

export default function EmotionalTracker() {
  const today = getLocalDateString(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentDateStr, setCurrentDateStr] = useState<string>(today);
  const [trackerData, setTrackerData] = useState<Record<string, EmotionalTrackerData>>({});
  
  // Dialog state for editing
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<{ timeSlot: string; field: EmotionField } | null>(null);
  const [dialogValue, setDialogValue] = useState<string>('');

  // Update currentDateStr when selectedDate changes (using LOCAL time, not UTC)
  useEffect(() => {
    if (selectedDate) {
      const dateStr = getLocalDateString(selectedDate);
      setCurrentDateStr(dateStr);
    }
  }, [selectedDate]);

  // Fetch emotional tracker data for the selected date
  const { data: existingTrackers, isLoading } = useQuery<EmotionalTrackerData[]>({
    queryKey: ['/api/emotional-trackers', currentDateStr],
    queryFn: async () => {
      const response = await fetch(`/api/emotional-trackers/${currentDateStr}`);
      if (!response.ok) throw new Error('Failed to fetch emotional trackers');
      return response.json();
    },
  });

  // Initialize tracker data from server
  useEffect(() => {
    if (existingTrackers) {
      const dataMap: Record<string, EmotionalTrackerData> = {};
      existingTrackers.forEach((tracker) => {
        dataMap[tracker.timeSlot] = tracker;
      });
      setTrackerData(dataMap);
    } else {
      setTrackerData({});
    }
  }, [existingTrackers]);

  // Mutation for saving/updating tracker data
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<EmotionalTrackerData>) => {
      const response = await apiRequest('/api/emotional-trackers', 'POST', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/emotional-trackers', currentDateStr] });
    },
  });

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 1);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setSelectedDate(newDate);
  };

  // Open dialog for editing
  const openEditDialog = (timeSlot: string, field: EmotionField) => {
    const data = trackerData[timeSlot];
    const currentValue = data?.[field] as string || '';
    setEditingField({ timeSlot, field });
    setDialogValue(currentValue);
    setDialogOpen(true);
  };

  // Save dialog changes
  const saveDialogEdit = () => {
    if (!editingField) return;
    
    const { timeSlot, field } = editingField;
    const data = trackerData[timeSlot] || {
      timeSlot,
      date: currentDateStr,
      userId: '',
      positiveEmotions: '',
      negativeEmotions: '',
      repeatingEmotions: '',
      missingEmotions: '',
    };
    
    // Update local state
    const updatedData = {
      ...data,
      [field]: dialogValue,
    };
    
    setTrackerData((prev) => ({
      ...prev,
      [timeSlot]: updatedData as EmotionalTrackerData,
    }));
    
    // Save to server
    saveMutation.mutate({
      date: currentDateStr,
      timeSlot,
      positiveEmotions: field === 'positiveEmotions' ? dialogValue : (data?.positiveEmotions || ''),
      negativeEmotions: field === 'negativeEmotions' ? dialogValue : (data?.negativeEmotions || ''),
      repeatingEmotions: field === 'repeatingEmotions' ? dialogValue : (data?.repeatingEmotions || ''),
      missingEmotions: field === 'missingEmotions' ? dialogValue : (data?.missingEmotions || ''),
    });
    
    // Close dialog
    setDialogOpen(false);
    setEditingField(null);
    setDialogValue('');
  };

  // Handle dialog close - auto-save on close
  const handleDialogClose = (open: boolean) => {
    if (!open && editingField) {
      // Dialog is closing - auto-save the data
      saveDialogEdit();
    } else {
      setDialogOpen(open);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-2 border-primary/30 dark:border-primary/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            <Heart className="h-5 w-5 text-primary" />
            Daily Emotional Tracker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCcw className="h-6 w-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-2 border-primary/30 dark:border-primary/50 bg-gradient-to-br from-primary/5 to-accent/5 dark:from-primary/10 dark:to-accent/10">
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div>
              <CardTitle className="flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent text-lg sm:text-xl md:text-2xl">
                <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Daily Emotional Tracker
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-1">
                Track your emotions throughout the day in 2-hour time slots (5am - 1am)
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateDate('prev')}
                data-testid="button-prev-day"
                className="h-8 w-8 sm:h-9 sm:w-9"
              >
                <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    data-testid="button-date-picker"
                    className="h-8 w-8 sm:h-9 sm:w-9"
                  >
                    <CalendarIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (date) {
                        setSelectedDate(date);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateDate('next')}
                data-testid="button-next-day"
                className="h-8 w-8 sm:h-9 sm:w-9"
              >
                <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-primary/30 dark:border-primary/50">
                  <th className="p-1.5 sm:p-2 md:p-3 text-left text-xs sm:text-sm font-semibold text-primary dark:text-primary bg-primary/10 dark:bg-primary/20 min-w-[100px] sm:min-w-[120px]">
                    Time Slot
                  </th>
                  <th className="p-1.5 sm:p-2 md:p-3 text-left text-xs sm:text-sm font-semibold text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 min-w-[160px] sm:min-w-[200px]">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span className="hidden sm:inline">Positive Emotions</span>
                      <span className="sm:hidden">Positive</span>
                    </div>
                  </th>
                  <th className="p-1.5 sm:p-2 md:p-3 text-left text-xs sm:text-sm font-semibold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 min-w-[160px] sm:min-w-[200px]">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Brain className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span className="hidden sm:inline">Negative Emotions</span>
                      <span className="sm:hidden">Negative</span>
                    </div>
                  </th>
                  <th className="p-1.5 sm:p-2 md:p-3 text-left text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 min-w-[160px] sm:min-w-[200px]">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <RefreshCcw className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span className="hidden sm:inline">Repeating Emotions</span>
                      <span className="sm:hidden">Repeating</span>
                    </div>
                  </th>
                  <th className="p-1.5 sm:p-2 md:p-3 text-left text-xs sm:text-sm font-semibold text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/20 min-w-[160px] sm:min-w-[200px]">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Heart className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span className="hidden sm:inline">Missing Emotions</span>
                      <span className="sm:hidden">Missing</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {TIME_SLOTS.map((timeSlot, index) => {
                  const data = trackerData[timeSlot] || {
                    timeSlot,
                    date: currentDateStr,
                    userId: '',
                    positiveEmotions: '',
                    negativeEmotions: '',
                    repeatingEmotions: '',
                    missingEmotions: '',
                  };

                  return (
                    <tr
                      key={timeSlot}
                      className={`border-b border-primary/20 dark:border-primary/30 hover-elevate h-[52px] ${
                        index % 2 === 0 ? 'bg-white/50 dark:bg-gray-900/20' : 'bg-primary/5 dark:bg-primary/10'
                      }`}
                    >
                      <td className="p-1.5 sm:p-2 md:p-3 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 align-top w-[100px] sm:w-[120px]" data-testid={`time-slot-${index}`}>
                        {timeSlot}
                      </td>
                      
                      {/* Positive Emotions */}
                      <td className="p-1 sm:p-1.5 md:p-2 align-top w-[160px] sm:w-[200px]">
                        <div
                          onClick={() => openEditDialog(timeSlot, 'positiveEmotions')}
                          className={`cursor-pointer h-[36px] w-full overflow-hidden rounded px-3 py-2 text-sm ${FIELD_COLORS.positiveEmotions.bg} ${FIELD_COLORS.positiveEmotions.border} border hover:border-green-400 dark:hover:border-green-500 transition-colors flex items-center`}
                          data-testid={`input-positive-${index}`}
                        >
                          {data.positiveEmotions ? (
                            <span className="text-gray-700 dark:text-gray-200 truncate block">{data.positiveEmotions}</span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500 italic truncate block">Click to add...</span>
                          )}
                        </div>
                      </td>

                      {/* Negative Emotions */}
                      <td className="p-1 sm:p-1.5 md:p-2 align-top w-[160px] sm:w-[200px]">
                        <div
                          onClick={() => openEditDialog(timeSlot, 'negativeEmotions')}
                          className={`cursor-pointer h-[36px] w-full overflow-hidden rounded px-3 py-2 text-sm ${FIELD_COLORS.negativeEmotions.bg} ${FIELD_COLORS.negativeEmotions.border} border hover:border-red-400 dark:hover:border-red-500 transition-colors flex items-center`}
                          data-testid={`input-negative-${index}`}
                        >
                          {data.negativeEmotions ? (
                            <span className="text-gray-700 dark:text-gray-200 truncate block">{data.negativeEmotions}</span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500 italic truncate block">Click to add...</span>
                          )}
                        </div>
                      </td>

                      {/* Repeating Emotions */}
                      <td className="p-1 sm:p-1.5 md:p-2 align-top w-[160px] sm:w-[200px]">
                        <div
                          onClick={() => openEditDialog(timeSlot, 'repeatingEmotions')}
                          className={`cursor-pointer h-[36px] w-full overflow-hidden rounded px-3 py-2 text-sm ${FIELD_COLORS.repeatingEmotions.bg} ${FIELD_COLORS.repeatingEmotions.border} border hover:border-blue-400 dark:hover:border-blue-500 transition-colors flex items-center`}
                          data-testid={`input-repeating-${index}`}
                        >
                          {data.repeatingEmotions ? (
                            <span className="text-gray-700 dark:text-gray-200 truncate block">{data.repeatingEmotions}</span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500 italic truncate block">Click to add...</span>
                          )}
                        </div>
                      </td>

                      {/* Missing Emotions */}
                      <td className="p-1 sm:p-1.5 md:p-2 align-top w-[160px] sm:w-[200px]">
                        <div
                          onClick={() => openEditDialog(timeSlot, 'missingEmotions')}
                          className={`cursor-pointer h-[36px] w-full overflow-hidden rounded px-3 py-2 text-sm ${FIELD_COLORS.missingEmotions.bg} ${FIELD_COLORS.missingEmotions.border} border hover:border-orange-400 dark:hover:border-orange-500 transition-colors flex items-center`}
                          data-testid={`input-missing-${index}`}
                        >
                          {data.missingEmotions ? (
                            <span className="text-gray-700 dark:text-gray-200 truncate block">{data.missingEmotions}</span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500 italic truncate block">Click to add...</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {saveMutation.isPending && (
            <div className="mt-4 text-sm text-purple-600 dark:text-purple-400 flex items-center gap-2">
              <RefreshCcw className="h-4 w-4 animate-spin" />
              Saving...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingField && FIELD_LABELS[editingField.field]}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={dialogValue}
              onChange={(e) => setDialogValue(e.target.value)}
              placeholder="Enter your emotions here..."
              className="min-h-[150px] resize-none"
              autoFocus
              data-testid="textarea-dialog-edit"
            />
          </div>
          <div className="flex justify-end pt-4">
            <Button
              onClick={saveDialogEdit}
              data-testid="button-save"
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
