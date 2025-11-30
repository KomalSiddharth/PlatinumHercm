import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { useQuery } from '@tanstack/react-query';
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

interface AdminEmotionalTrackerViewProps {
  userId: string;
  isAdminView?: boolean; // 🔥 Add isAdminView prop to determine if we're in team/admin view
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

const POSITIVE_REPEATING_EMOTIONS = [
  'Calm Moments', 'Motivational Spikes', 'Relief', 'Joy', 'Focus', 'Gratitude', 'Hope',
  'Confidence Bursts', 'Encouragement', 'Emotional Clarity'
];

const NEGATIVE_REPEATING_EMOTIONS = [
  'Overthinking', 'Worry', 'Stress', 'Irritation', 'Doubt', 'Fear', 'Anxiety', 'Frustration',
  'Emotional Fatigue', 'Withdrawal', 'Confusion', 'Uncertainty', 'Emotional Highs and Lows',
  'Feeling Okay Then Overwhelmed', 'Drained But Functioning', 'Wanting Connection But Pulling Away',
  'Silent Emotional Cycles', 'Mind–Body Disconnection', 'Detached But Longing', 'Busy But Unfulfilled'
];

// Function to detect emotions that appear MULTIPLE TIMES across all time slots
// Same logic as actual dashboard
const detectRepeatingEmotions = (trackerData: Record<string, EmotionalTrackerData>): Record<string, number> => {
  const emotionCount: Record<string, number> = {};
  
  // Count all emotions (positive and negative) across all time slots
  Object.values(trackerData).forEach(d => {
    if (d?.positiveEmotions && d.positiveEmotions.trim()) {
      const emotion = d.positiveEmotions.trim();
      emotionCount[emotion] = (emotionCount[emotion] || 0) + 1;
    }
    if (d?.negativeEmotions && d.negativeEmotions.trim()) {
      const emotion = d.negativeEmotions.trim();
      emotionCount[emotion] = (emotionCount[emotion] || 0) + 1;
    }
  });
  
  // Return only emotions that appear more than once
  const repeatingEmotions: Record<string, number> = {};
  Object.entries(emotionCount).forEach(([emotion, count]) => {
    if (count > 1) {
      repeatingEmotions[emotion] = count;
    }
  });
  
  return repeatingEmotions;
};

// Helper function to get local date string (NOT UTC)
const getLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function AdminEmotionalTrackerView({ userId, isAdminView = false }: AdminEmotionalTrackerViewProps) {
  const today = getLocalDateString(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const currentDateStr = getLocalDateString(selectedDate);

  // 🔥 FIX: Fetch current user to determine admin status
  const { data: currentUser } = useQuery({
    queryKey: ['/api/auth/user'],  // ✅ Correct endpoint path
    staleTime: 0, // Always fetch fresh - override default Infinity
    retry: 1, // Retry once on failure
  });

  const isActualAdmin = currentUser?.isAdmin === true;

  // Fetch emotional tracker data for the selected user and date
  // Use team endpoints for regular users, admin endpoints for admins
  const emotionalTrackerEndpoint = userId
    ? (isActualAdmin
        ? `/api/admin/emotional-trackers/${userId}/${currentDateStr}`
        : `/api/team/user/${userId}/emotional-trackers/${currentDateStr}`)
    : `/api/emotional-trackers/${currentDateStr}`;

  // 🔥 FIX: Wait for currentUser to load before enabling query (needed to determine correct endpoint)
  const shouldEnableQuery = userId 
    ? (!!userId && currentUser !== undefined) 
    : true;

  console.log('🔍 [EMOTIONAL TRACKER QUERY] userId:', userId, 'currentUser:', currentUser, 'isAdminView:', isAdminView, 'shouldEnableQuery:', shouldEnableQuery);

  const { data: existingTrackers, isLoading } = useQuery<EmotionalTrackerData[]>({
    queryKey: userId
      ? (isActualAdmin
          ? [`/api/admin/emotional-trackers/${userId}`, currentDateStr]
          : [`/api/team/user/${userId}/emotional-trackers`, currentDateStr])
      : [`/api/emotional-trackers`, currentDateStr],
    queryFn: async () => {
      console.log(`🚀 [EMOTIONAL TRACKER] Fetching data for userId: ${userId}, date: ${currentDateStr}, endpoint: ${emotionalTrackerEndpoint}`);
      const response = await fetch(emotionalTrackerEndpoint, {
        credentials: 'include',
      });
      if (!response.ok) {
        console.error(`❌ [EMOTIONAL TRACKER] Failed to fetch: ${response.status} ${response.statusText}`);
        throw new Error('Failed to fetch emotional trackers');
      }
      const data = await response.json();
      console.log(`✅ [EMOTIONAL TRACKER] Received data:`, data);
      return data;
    },
    enabled: shouldEnableQuery, // 🔥 Use computed shouldEnableQuery
    staleTime: 0, // Always consider data stale for instant updates
    refetchInterval: 2000, // Poll every 2 seconds for real-time emotional tracker updates
  });

  const trackerData: Record<string, EmotionalTrackerData> = {};
  if (existingTrackers) {
    existingTrackers.forEach((tracker) => {
      trackerData[tracker.timeSlot] = tracker;
    });
  }

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
            Daily Emotional Tracker (Admin View)
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
      <CardHeader className="p-3 sm:p-4 md:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div>
            <CardTitle className="flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent text-lg sm:text-xl md:text-2xl">
              <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Daily Emotional Tracker (Admin View - Read Only)
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-1">
              View user's emotional tracking data across 2-hour time slots (5am - 1am)
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
          <table className="w-full border-collapse table-fixed">
            <thead>
              <tr className="border-b-2 border-primary/30 dark:border-primary/50">
                <th className="p-1.5 sm:p-2 md:p-3 text-left text-xs sm:text-sm font-semibold text-primary dark:text-primary bg-primary/10 dark:bg-primary/20 w-[15%]">
                  Time Slot
                </th>
                <th className="p-1.5 sm:p-2 md:p-3 text-left text-xs sm:text-sm font-semibold text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 w-[21.25%]">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="hidden sm:inline">Positive Emotions</span>
                    <span className="sm:hidden">Positive</span>
                  </div>
                </th>
                <th className="p-1.5 sm:p-2 md:p-3 text-left text-xs sm:text-sm font-semibold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 w-[21.25%]">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Brain className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="hidden sm:inline">Negative Emotions</span>
                    <span className="sm:hidden">Negative</span>
                  </div>
                </th>
                <th className="p-1.5 sm:p-2 md:p-3 text-left text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 w-[21.25%]">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <RefreshCcw className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="hidden sm:inline">Repeating Emotions</span>
                    <span className="sm:hidden">Repeating</span>
                  </div>
                </th>
                <th className="p-1.5 sm:p-2 md:p-3 text-left text-xs sm:text-sm font-semibold text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/20 w-[21.25%]">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Heart className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="hidden sm:inline">Missing Emotions</span>
                    <span className="sm:hidden">Missing</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                // Detect emotions that appear MULTIPLE TIMES - same logic as actual dashboard
                const repeatingEmotionsCounts = detectRepeatingEmotions(trackerData);
                
                const positiveRepeating: { emotion: string; count: number }[] = [];
                const negativeRepeating: { emotion: string; count: number }[] = [];
                
                Object.entries(repeatingEmotionsCounts).forEach(([emotion, count]) => {
                  if (POSITIVE_REPEATING_EMOTIONS.includes(emotion)) {
                    positiveRepeating.push({ emotion, count });
                  } else if (NEGATIVE_REPEATING_EMOTIONS.includes(emotion)) {
                    negativeRepeating.push({ emotion, count });
                  } else {
                    // Default to positive if unclear
                    positiveRepeating.push({ emotion, count });
                  }
                });
                
                const allRepeating = [...positiveRepeating, ...negativeRepeating].map(e => e.emotion);

                return TIME_SLOTS.map((timeSlot, index) => {
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
                      <td className="p-1.5 sm:p-2 md:p-3 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 align-top" data-testid={`time-slot-${index}`}>
                        {timeSlot}
                      </td>
                      
                      {/* Positive Emotions */}
                      <td className="p-1 sm:p-1.5 md:p-2 align-top">
                        {data.positiveEmotions ? (
                          <div className="px-2 py-1.5 rounded border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/20">
                            <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 break-words">
                              {data.positiveEmotions}
                            </p>
                          </div>
                        ) : (
                          <div className="px-2 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20">
                            <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-600 italic">No data</p>
                          </div>
                        )}
                      </td>

                      {/* Negative Emotions */}
                      <td className="p-1 sm:p-1.5 md:p-2 align-top">
                        {data.negativeEmotions ? (
                          <div className="px-2 py-1.5 rounded border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/20">
                            <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 break-words">
                              {data.negativeEmotions}
                            </p>
                          </div>
                        ) : (
                          <div className="px-2 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20">
                            <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-600 italic">No data</p>
                          </div>
                        )}
                      </td>

                      {/* Repeating Emotions - Aggregated in first row with rowSpan */}
                      {index === 0 && (
                        <td 
                          className="p-2 sm:p-3 align-top bg-gradient-to-b from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-l border-blue-200 dark:border-blue-800"
                          rowSpan={TIME_SLOTS.length}
                          data-testid="display-repeating-summary"
                        >
                          <div className="flex flex-col gap-2 h-full">
                            {allRepeating.length === 0 ? (
                              <div className="text-gray-400 dark:text-gray-500 italic text-xs text-center py-4">
                                Auto-detected from emotions
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1">
                                {positiveRepeating.map(({ emotion, count }) => (
                                  <span
                                    key={`pos-${emotion}`}
                                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700 w-fit"
                                  >
                                    {emotion}
                                    {count > 1 && <span className="font-bold">-{count}</span>}
                                  </span>
                                ))}
                                
                                {negativeRepeating.map(({ emotion, count }) => (
                                  <span
                                    key={`neg-${emotion}`}
                                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700 w-fit"
                                  >
                                    {emotion}
                                    {count > 1 && <span className="font-bold">-{count}</span>}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      )}

                      {/* Missing Emotions - Aggregated in first row with rowSpan */}
                      {index === 0 && (
                        <td 
                          className="p-2 sm:p-3 align-top bg-gradient-to-b from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-l border-orange-200 dark:border-orange-800"
                          rowSpan={TIME_SLOTS.length}
                          data-testid="display-missing-emotions"
                        >
                          <div className="flex flex-col gap-2 h-full">
                            {data.missingEmotions ? (
                              <div className="flex flex-wrap gap-1.5">
                                {data.missingEmotions.split('|').filter(e => e.trim()).map((emotion) => (
                                  <span
                                    key={emotion}
                                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-700 w-fit"
                                  >
                                    {emotion}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <div className="text-gray-400 dark:text-gray-500 italic text-xs text-center py-4">
                                No data
                              </div>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
