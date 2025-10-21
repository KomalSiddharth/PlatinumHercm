import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
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

export default function EmotionalTracker() {
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentDateStr, setCurrentDateStr] = useState<string>(today);
  const [trackerData, setTrackerData] = useState<Record<string, EmotionalTrackerData>>({});
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  // Update currentDateStr when selectedDate changes
  useEffect(() => {
    if (selectedDate) {
      const dateStr = selectedDate.toISOString().split('T')[0];
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
      const response = await apiRequest('POST', '/api/emotional-trackers', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/emotional-trackers', currentDateStr] });
    },
  });

  const handleFieldChange = (timeSlot: string, field: keyof EmotionalTrackerData, value: string) => {
    setTrackerData((prev) => ({
      ...prev,
      [timeSlot]: {
        ...(prev[timeSlot] || { timeSlot, date: currentDateStr, userId: '', positiveEmotions: '', negativeEmotions: '', repeatingEmotions: '', missingEmotions: '' }),
        [field]: value,
      },
    }));
  };

  const handleFieldFocus = (timeSlot: string, field: string) => {
    setFocusedInput(`${timeSlot}-${field}`);
  };

  const handleFieldBlur = (timeSlot: string, field: keyof EmotionalTrackerData) => {
    setFocusedInput(null);
    const data = trackerData[timeSlot];
    if (data) {
      // Auto-save on blur
      saveMutation.mutate({
        date: currentDateStr,
        timeSlot,
        positiveEmotions: data.positiveEmotions || '',
        negativeEmotions: data.negativeEmotions || '',
        repeatingEmotions: data.repeatingEmotions || '',
        missingEmotions: data.missingEmotions || '',
      });
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 1);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setSelectedDate(newDate);
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
    <Card className="border-2 border-primary/30 dark:border-primary/50 bg-gradient-to-br from-primary/5 to-accent/5 dark:from-primary/10 dark:to-accent/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              <Heart className="h-5 w-5 text-primary" />
              Daily Emotional Tracker
            </CardTitle>
            <CardDescription>
              Track your emotions throughout the day in 2-hour time slots
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateDate('prev')}
              data-testid="button-prev-day"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  data-testid="button-date-picker"
                >
                  <CalendarIcon className="h-4 w-4" />
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
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-primary/30 dark:border-primary/50">
                <th className="p-3 text-left font-semibold text-primary dark:text-primary bg-primary/10 dark:bg-primary/20 min-w-[120px]">
                  Time Slot
                </th>
                <th className="p-3 text-left font-semibold text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 min-w-[200px]">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Positive Emotions
                  </div>
                </th>
                <th className="p-3 text-left font-semibold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 min-w-[200px]">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    Negative Emotions
                  </div>
                </th>
                <th className="p-3 text-left font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 min-w-[200px]">
                  <div className="flex items-center gap-2">
                    <RefreshCcw className="h-4 w-4" />
                    Repeating Emotions
                  </div>
                </th>
                <th className="p-3 text-left font-semibold text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/20 min-w-[200px]">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4" />
                    Missing Emotions
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
                    className={`border-b border-primary/20 dark:border-primary/30 hover-elevate ${
                      index % 2 === 0 ? 'bg-white/50 dark:bg-gray-900/20' : 'bg-primary/5 dark:bg-primary/10'
                    }`}
                  >
                    <td className="p-3 font-medium text-gray-700 dark:text-gray-300" data-testid={`time-slot-${index}`}>
                      {timeSlot}
                    </td>
                    
                    {/* Positive Emotions */}
                    <td className="p-2">
                      {data.positiveEmotions && focusedInput !== `${timeSlot}-positiveEmotions` ? (
                        <HoverCard openDelay={200}>
                          <HoverCardTrigger asChild>
                            <div className="cursor-pointer">
                              <Input
                                type="text"
                                value={data.positiveEmotions}
                                onChange={(e) => handleFieldChange(timeSlot, 'positiveEmotions', e.target.value)}
                                onFocus={() => handleFieldFocus(timeSlot, 'positiveEmotions')}
                                onBlur={() => handleFieldBlur(timeSlot, 'positiveEmotions')}
                                className="border-green-200 focus:border-green-400 dark:border-green-800 dark:focus:border-green-600"
                                data-testid={`input-positive-${index}`}
                              />
                            </div>
                          </HoverCardTrigger>
                          <HoverCardContent 
                            side="top" 
                            align="center" 
                            className="w-96 bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700 z-[100]"
                          >
                            <div className="space-y-2">
                              <h4 className="text-sm font-semibold text-green-700 dark:text-green-300">Positive Emotions</h4>
                              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{data.positiveEmotions}</p>
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                      ) : (
                        <Input
                          type="text"
                          value={data.positiveEmotions}
                          onChange={(e) => handleFieldChange(timeSlot, 'positiveEmotions', e.target.value)}
                          onFocus={() => handleFieldFocus(timeSlot, 'positiveEmotions')}
                          onBlur={() => handleFieldBlur(timeSlot, 'positiveEmotions')}
                          className="border-green-200 focus:border-green-400 dark:border-green-800 dark:focus:border-green-600"
                          data-testid={`input-positive-${index}`}
                        />
                      )}
                    </td>

                    {/* Negative Emotions */}
                    <td className="p-2">
                      {data.negativeEmotions && focusedInput !== `${timeSlot}-negativeEmotions` ? (
                        <HoverCard openDelay={200}>
                          <HoverCardTrigger asChild>
                            <div className="cursor-pointer">
                              <Input
                                type="text"
                                value={data.negativeEmotions}
                                onChange={(e) => handleFieldChange(timeSlot, 'negativeEmotions', e.target.value)}
                                onFocus={() => handleFieldFocus(timeSlot, 'negativeEmotions')}
                                onBlur={() => handleFieldBlur(timeSlot, 'negativeEmotions')}
                                className="border-red-200 focus:border-red-400 dark:border-red-800 dark:focus:border-red-600"
                                data-testid={`input-negative-${index}`}
                              />
                            </div>
                          </HoverCardTrigger>
                          <HoverCardContent 
                            side="top" 
                            align="center" 
                            className="w-96 bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700 z-[100]"
                          >
                            <div className="space-y-2">
                              <h4 className="text-sm font-semibold text-red-700 dark:text-red-300">Negative Emotions</h4>
                              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{data.negativeEmotions}</p>
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                      ) : (
                        <Input
                          type="text"
                          value={data.negativeEmotions}
                          onChange={(e) => handleFieldChange(timeSlot, 'negativeEmotions', e.target.value)}
                          onFocus={() => handleFieldFocus(timeSlot, 'negativeEmotions')}
                          onBlur={() => handleFieldBlur(timeSlot, 'negativeEmotions')}
                          className="border-red-200 focus:border-red-400 dark:border-red-800 dark:focus:border-red-600"
                          data-testid={`input-negative-${index}`}
                        />
                      )}
                    </td>

                    {/* Repeating Emotions */}
                    <td className="p-2">
                      {data.repeatingEmotions && focusedInput !== `${timeSlot}-repeatingEmotions` ? (
                        <HoverCard openDelay={200}>
                          <HoverCardTrigger asChild>
                            <div className="cursor-pointer">
                              <Input
                                type="text"
                                value={data.repeatingEmotions}
                                onChange={(e) => handleFieldChange(timeSlot, 'repeatingEmotions', e.target.value)}
                                onFocus={() => handleFieldFocus(timeSlot, 'repeatingEmotions')}
                                onBlur={() => handleFieldBlur(timeSlot, 'repeatingEmotions')}
                                className="border-blue-200 focus:border-blue-400 dark:border-blue-800 dark:focus:border-blue-600"
                                data-testid={`input-repeating-${index}`}
                              />
                            </div>
                          </HoverCardTrigger>
                          <HoverCardContent 
                            side="top" 
                            align="center" 
                            className="w-96 bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 z-[100]"
                          >
                            <div className="space-y-2">
                              <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-300">Repeating Emotions</h4>
                              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{data.repeatingEmotions}</p>
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                      ) : (
                        <Input
                          type="text"
                          value={data.repeatingEmotions}
                          onChange={(e) => handleFieldChange(timeSlot, 'repeatingEmotions', e.target.value)}
                          onFocus={() => handleFieldFocus(timeSlot, 'repeatingEmotions')}
                          onBlur={() => handleFieldBlur(timeSlot, 'repeatingEmotions')}
                          className="border-blue-200 focus:border-blue-400 dark:border-blue-800 dark:focus:border-blue-600"
                          data-testid={`input-repeating-${index}`}
                        />
                      )}
                    </td>

                    {/* Missing Emotions */}
                    <td className="p-2">
                      {data.missingEmotions && focusedInput !== `${timeSlot}-missingEmotions` ? (
                        <HoverCard openDelay={200}>
                          <HoverCardTrigger asChild>
                            <div className="cursor-pointer">
                              <Input
                                type="text"
                                value={data.missingEmotions}
                                onChange={(e) => handleFieldChange(timeSlot, 'missingEmotions', e.target.value)}
                                onFocus={() => handleFieldFocus(timeSlot, 'missingEmotions')}
                                onBlur={() => handleFieldBlur(timeSlot, 'missingEmotions')}
                                className="border-orange-200 focus:border-orange-400 dark:border-orange-800 dark:focus:border-orange-600"
                                data-testid={`input-missing-${index}`}
                              />
                            </div>
                          </HoverCardTrigger>
                          <HoverCardContent 
                            side="top" 
                            align="center" 
                            className="w-96 bg-orange-50 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700 z-[100]"
                          >
                            <div className="space-y-2">
                              <h4 className="text-sm font-semibold text-orange-700 dark:text-orange-300">Missing Emotions</h4>
                              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{data.missingEmotions}</p>
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                      ) : (
                        <Input
                          type="text"
                          value={data.missingEmotions}
                          onChange={(e) => handleFieldChange(timeSlot, 'missingEmotions', e.target.value)}
                          onFocus={() => handleFieldFocus(timeSlot, 'missingEmotions')}
                          onBlur={() => handleFieldBlur(timeSlot, 'missingEmotions')}
                          className="border-orange-200 focus:border-orange-400 dark:border-orange-800 dark:focus:border-orange-600"
                          data-testid={`input-missing-${index}`}
                        />
                      )}
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
  );
}
