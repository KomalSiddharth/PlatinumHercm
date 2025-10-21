import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Heart, Brain, RefreshCcw, Sparkles } from 'lucide-react';

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
  const [trackerData, setTrackerData] = useState<Record<string, EmotionalTrackerData>>({});

  // Fetch today's emotional tracker data
  const { data: existingTrackers, isLoading } = useQuery<EmotionalTrackerData[]>({
    queryKey: ['/api/emotional-trackers', today],
    queryFn: async () => {
      const response = await fetch(`/api/emotional-trackers/${today}`);
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
    }
  }, [existingTrackers]);

  // Mutation for saving/updating tracker data
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<EmotionalTrackerData>) => {
      const response = await apiRequest('POST', '/api/emotional-trackers', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/emotional-trackers', today] });
    },
  });

  const handleFieldChange = (timeSlot: string, field: keyof EmotionalTrackerData, value: string) => {
    setTrackerData((prev) => ({
      ...prev,
      [timeSlot]: {
        ...(prev[timeSlot] || { timeSlot, date: today, userId: '', positiveEmotions: '', negativeEmotions: '', repeatingEmotions: '', missingEmotions: '' }),
        [field]: value,
      },
    }));
  };

  const handleFieldBlur = (timeSlot: string, field: keyof EmotionalTrackerData) => {
    const data = trackerData[timeSlot];
    if (data) {
      // Auto-save on blur
      saveMutation.mutate({
        date: today,
        timeSlot,
        positiveEmotions: data.positiveEmotions || '',
        negativeEmotions: data.negativeEmotions || '',
        repeatingEmotions: data.repeatingEmotions || '',
        missingEmotions: data.missingEmotions || '',
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="border-2 border-purple-200 dark:border-purple-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            <Heart className="h-5 w-5 text-purple-600" />
            Daily Emotional Tracker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCcw className="h-6 w-6 animate-spin text-purple-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-950/20 dark:to-pink-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          <Heart className="h-5 w-5 text-purple-600" />
          Daily Emotional Tracker
        </CardTitle>
        <CardDescription>
          Track your emotions throughout the day in 2-hour time slots
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-purple-200 dark:border-purple-800">
                <th className="p-3 text-left font-semibold text-purple-900 dark:text-purple-100 bg-purple-100 dark:bg-purple-900/30 min-w-[120px]">
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
                  date: today,
                  userId: '',
                  positiveEmotions: '',
                  negativeEmotions: '',
                  repeatingEmotions: '',
                  missingEmotions: '',
                };

                return (
                  <tr
                    key={timeSlot}
                    className={`border-b border-purple-100 dark:border-purple-900/50 hover-elevate ${
                      index % 2 === 0 ? 'bg-white/50 dark:bg-gray-900/20' : 'bg-purple-50/30 dark:bg-purple-950/10'
                    }`}
                  >
                    <td className="p-3 font-medium text-gray-700 dark:text-gray-300" data-testid={`time-slot-${index}`}>
                      {timeSlot}
                    </td>
                    <td className="p-2">
                      <Input
                        type="text"
                        placeholder="e.g., Joy, Gratitude..."
                        value={data.positiveEmotions}
                        onChange={(e) => handleFieldChange(timeSlot, 'positiveEmotions', e.target.value)}
                        onBlur={() => handleFieldBlur(timeSlot, 'positiveEmotions')}
                        className="border-green-200 focus:border-green-400 dark:border-green-800 dark:focus:border-green-600"
                        data-testid={`input-positive-${index}`}
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="text"
                        placeholder="e.g., Anxiety, Anger..."
                        value={data.negativeEmotions}
                        onChange={(e) => handleFieldChange(timeSlot, 'negativeEmotions', e.target.value)}
                        onBlur={() => handleFieldBlur(timeSlot, 'negativeEmotions')}
                        className="border-red-200 focus:border-red-400 dark:border-red-800 dark:focus:border-red-600"
                        data-testid={`input-negative-${index}`}
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="text"
                        placeholder="e.g., Worry, Doubt..."
                        value={data.repeatingEmotions}
                        onChange={(e) => handleFieldChange(timeSlot, 'repeatingEmotions', e.target.value)}
                        onBlur={() => handleFieldBlur(timeSlot, 'repeatingEmotions')}
                        className="border-blue-200 focus:border-blue-400 dark:border-blue-800 dark:focus:border-blue-600"
                        data-testid={`input-repeating-${index}`}
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="text"
                        placeholder="e.g., Peace, Love..."
                        value={data.missingEmotions}
                        onChange={(e) => handleFieldChange(timeSlot, 'missingEmotions', e.target.value)}
                        onBlur={() => handleFieldBlur(timeSlot, 'missingEmotions')}
                        className="border-orange-200 focus:border-orange-400 dark:border-orange-800 dark:focus:border-orange-600"
                        data-testid={`input-missing-${index}`}
                      />
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
