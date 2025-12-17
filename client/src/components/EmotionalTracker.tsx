import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Heart, Brain, RefreshCcw, Sparkles, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { EmotionalPreviewDialog } from './EmotionalPreviewDialog';

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

const POSITIVE_EMOTIONS = [
  'Happiness', 'Joy', 'Delight', 'Excitement', 'Peace', 'Calmness', 'Relief', 'Contentment',
  'Satisfaction', 'Comfort', 'Love', 'Affection', 'Warmth', 'Care', 'Compassion', 'Kindness',
  'Gratitude', 'Appreciation', 'Empathy', 'Trust', 'Motivation', 'Confidence', 'Courage',
  'Determination', 'Enthusiasm', 'Strength', 'Resilience', 'Hope', 'Faith', 'Willpower',
  'Clarity', 'Centeredness', 'Groundedness', 'Stability', 'Stillness', 'Harmony', 'Balance',
  'Serenity', 'Presence', 'Mindfulness', 'Inspiration', 'Creativity', 'Curiosity', 'Openness',
  'Flexibility', 'Acceptance', 'Progress', 'Renewal', 'Healing', 'Expansion', 'Pride',
  'Accomplishment', 'Productivity', 'Efficiency', 'Success', 'Empowerment', 'Mastery',
  'Capability', 'Focus', 'Drive', 'Tenderness', 'Sweetness', 'Soft Joy', 'Ease', 'Lightness',
  'Playfulness', 'Amusement', 'Cheerfulness', 'Pleasantness', 'Energy', 'Passion',
  'Zeal', 'Invigoration', 'Liveliness', 'Eagerness', 'Optimism', 'Positivity', 'Vibrancy',
];

const NEGATIVE_EMOTIONS = [
  'Sad', 'Disappointed', 'Lonely', 'Hurt', 'Empty', 'Hopeless', 'Miserable', 'Unmotivated',
  'Drained', 'Low', 'Overwhelmed', 'Stressed', 'Pressured', 'Anxious', 'Restless', 'Tense',
  'Nervous', 'Panicked', 'Uneasy', 'Worry', 'Insecure', 'Doubtful', 'Afraid', 'Uncertain',
  'Hesitant', 'Unstable', 'Sensitive', 'Fragile', 'Exposed', 'Vulnerable', 'Angry', 'Frustrated',
  'Irritated', 'Annoyed', 'Resentful', 'Rage', 'Bitter', 'Enraged', 'Infuriated', 'Agitated',
  'Numb', 'Detached', 'Lost', 'Confused', 'Foggy', 'Disconnected', 'Unfocused', 'Blank',
  'Shut Down', 'Withdrawn', 'Guilt', 'Shame', 'Regret', 'Embarrassment', 'Self-Blame', 'Self-Criticism',
  'Disgust', 'Hopelessness', 'Despair', 'Worthlessness'
];

const MISSING_EMOTIONS = [
  'Love', 'Affection', 'Care', 'Intimacy', 'Appreciation', 'Belonging', 'Trust', 'Support',
  'Acceptance', 'Understanding', 'Joy', 'Happiness', 'Playfulness', 'Cheerfulness', 'Fun',
  'Excitement', 'Delight', 'Laughter', 'Spark', 'Enjoyment', 'Peace', 'Calm', 'Balance',
  'Groundedness', 'Clarity', 'Serenity', 'Safety', 'Security', 'Confidence', 'Motivation',
  'Focus', 'Willpower', 'Determination', 'Drive', 'Persistence', 'Passion', 'Inspiration',
  'Hope', 'Courage', 'Curiosity', 'Creativity', 'Openness', 'Flexibility', 'Expansion',
  'Renewal', 'Healing', 'Progress', 'Purpose', 'Vision'
];

const REPEATING_EMOTIONS = [
  'Overthinking', 'Worry', 'Stress', 'Irritation', 'Doubt', 'Fear', 'Anxiety', 'Frustration',
  'Emotional Fatigue', 'Withdrawal', 'Calm Moments', 'Motivational Spikes', 'Relief', 'Joy',
  'Focus', 'Gratitude', 'Hope', 'Confidence Bursts', 'Encouragement', 'Emotional Clarity',
  'Confusion', 'Uncertainty', 'Emotional Highs and Lows', 'Feeling Okay Then Overwhelmed',
  'Drained But Functioning', 'Wanting Connection But Pulling Away', 'Silent Emotional Cycles',
  'Mind–Body Disconnection', 'Detached But Longing', 'Busy But Unfulfilled'
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

// Function to get repeating emotion type (positive or negative)
const getRepeatingEmotionType = (emotion: string): 'positive' | 'negative' | null => {
  if (POSITIVE_REPEATING_EMOTIONS.includes(emotion)) {
    return 'positive';
  }
  if (NEGATIVE_REPEATING_EMOTIONS.includes(emotion)) {
    return 'negative';
  }
  return null;
};

// Function to detect emotions that appear MULTIPLE TIMES across all time slots
// Returns them with their total occurrence count
const detectRepeatingEmotions = (trackerData: Record<string, EmotionalTrackerData>): Record<string, number> => {
  const emotionCount: Record<string, number> = {};
  
  // Count all emotions (positive and negative) across all time slots
  Object.values(trackerData).forEach(d => {
    // Split positive emotions by '|' and count each one
    if (d?.positiveEmotions && d.positiveEmotions.trim()) {
      const emotions = d.positiveEmotions.split('|').filter(e => e.trim());
      emotions.forEach(emotion => {
        const cleanEmotion = emotion.trim();
        emotionCount[cleanEmotion] = (emotionCount[cleanEmotion] || 0) + 1;
      });
    }
    // Split negative emotions by '|' and count each one
    if (d?.negativeEmotions && d.negativeEmotions.trim()) {
      const emotions = d.negativeEmotions.split('|').filter(e => e.trim());
      emotions.forEach(emotion => {
        const cleanEmotion = emotion.trim();
        emotionCount[cleanEmotion] = (emotionCount[cleanEmotion] || 0) + 1;
      });
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

// Function to recommend repeating emotion based on positive, negative, and missing emotions
// Returns multiple emotions separated by |
const recommendRepeatingEmotion = (positive: string, negative: string, missing: string): string => {
  const recommendedEmotions: Set<string> = new Set();
  const posneg = `${positive}|${negative}|${missing}`.toLowerCase();
  
  // Check NEGATIVE emotions and add corresponding repeating patterns
  if (negative) {
    const negLower = negative.toLowerCase();
    if (negLower.includes('overthink') || negLower.includes('worry') || negLower.includes('anxiety')) {
      recommendedEmotions.add('Overthinking');
    }
    if (negLower.includes('stress') || negLower.includes('overwhelm') || negLower.includes('pressure')) {
      recommendedEmotions.add('Stress');
    }
    if (negLower.includes('irritat') || negLower.includes('frustrat') || negLower.includes('angry') || negLower.includes('resentful')) {
      recommendedEmotions.add('Irritation');
    }
    if (negLower.includes('doubt') || negLower.includes('uncertain') || negLower.includes('confused')) {
      recommendedEmotions.add('Doubt');
    }
    if (negLower.includes('fear') || negLower.includes('afraid') || negLower.includes('panic')) {
      recommendedEmotions.add('Fear');
    }
    if (negLower.includes('withdraw') || negLower.includes('detach') || negLower.includes('numb') || negLower.includes('disconnect')) {
      recommendedEmotions.add('Withdrawal');
    }
    if (negLower.includes('drained') || negLower.includes('fatigue') || negLower.includes('low') || negLower.includes('unmotivated')) {
      recommendedEmotions.add('Emotional Fatigue');
    }
    if (negLower.includes('sad') || negLower.includes('disappointed') || negLower.includes('miserable') || negLower.includes('hurt') || negLower.includes('lonely')) {
      recommendedEmotions.add('Feeling Okay Then Overwhelmed');
    }
  }

  // Check POSITIVE emotions and add corresponding repeating patterns
  if (positive) {
    const posLower = positive.toLowerCase();
    if (posLower.includes('calm') || posLower.includes('peace') || posLower.includes('serenity') || posLower.includes('stillness')) {
      recommendedEmotions.add('Calm Moments');
    }
    if (posLower.includes('motivation') || posLower.includes('energi') || posLower.includes('enthusiasm')) {
      recommendedEmotions.add('Motivational Spikes');
    }
    if (posLower.includes('relief') || posLower.includes('peace')) {
      recommendedEmotions.add('Relief');
    }
    if (posLower.includes('joy') || posLower.includes('delight') || posLower.includes('happiness') || posLower.includes('cheerful') || posLower.includes('pleasant')) {
      recommendedEmotions.add('Joy');
    }
    if (posLower.includes('focus') || posLower.includes('clarity') || posLower.includes('determination') || posLower.includes('drive')) {
      recommendedEmotions.add('Focus');
    }
    if (posLower.includes('gratitude') || posLower.includes('appreciation') || posLower.includes('thankful')) {
      recommendedEmotions.add('Gratitude');
    }
    if (posLower.includes('hope') || posLower.includes('hopeful')) {
      recommendedEmotions.add('Hope');
    }
    if (posLower.includes('confidence') || posLower.includes('courage') || posLower.includes('empowerment')) {
      recommendedEmotions.add('Confidence Bursts');
    }
  }

  // Check MISSING emotions
  if (missing) {
    if (missing.toLowerCase().includes('love') || missing.toLowerCase().includes('affection') || missing.toLowerCase().includes('connection')) {
      recommendedEmotions.add('Wanting Connection But Pulling Away');
    }
    if (missing.toLowerCase().includes('clarity') || missing.toLowerCase().includes('purpose') || missing.toLowerCase().includes('meaning')) {
      recommendedEmotions.add('Emotional Clarity');
    }
  }

  // If we have recommendations, return them joined by |
  if (recommendedEmotions.size > 0) {
    return Array.from(recommendedEmotions).join('|');
  }

  // Fallback patterns when no specific matches found
  if (negative && positive) {
    return 'Emotional Highs and Lows';
  }
  if (negative && !positive) {
    return 'Silent Emotional Cycles';
  }
  if (missing && !positive) {
    return 'Detached But Longing';
  }
  
  return '';
};

export default function EmotionalTracker() {
  const today = getLocalDateString(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentDateStr, setCurrentDateStr] = useState<string>(today);
  const [trackerData, setTrackerData] = useState<Record<string, EmotionalTrackerData>>({});
  const [previewOpen, setPreviewOpen] = useState(false);
  
  // Dialog state for editing
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<{ timeSlot: string; field: EmotionField } | null>(null);
  const [dialogValue, setDialogValue] = useState<string>('');
  const [isCustomEmotionInput, setIsCustomEmotionInput] = useState(false);
  const [customEmotionInput, setCustomEmotionInput] = useState<string>('');
  
  // Custom emotions for inline dropdown
  const [customEmotions, setCustomEmotions] = useState<string[]>([]);
  const [customNegativeEmotions, setCustomNegativeEmotions] = useState<string[]>([]);
  const [customMissingEmotions, setCustomMissingEmotions] = useState<string[]>([]);
  const [customEmotionDialogOpen, setCustomEmotionDialogOpen] = useState(false);
  const [customEmotionValue, setCustomEmotionValue] = useState<string>('');
  const [pendingTimeSlot, setPendingTimeSlot] = useState<string>('');
  const [emotionType, setEmotionType] = useState<'positive' | 'negative' | 'missing'>('positive');

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
    setIsCustomEmotionInput(false);
    setCustomEmotionInput('');
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
      setIsCustomEmotionInput(false);
      setCustomEmotionInput('');
    }
  };

  // Handle custom emotion selection
  const handleAddCustomEmotion = () => {
    if (customEmotionInput.trim()) {
      setDialogValue(customEmotionInput);
      setCustomEmotionInput('');
      setIsCustomEmotionInput(false);
    }
  };

  // Handle inline positive emotion selection (auto-save) - MULTI-SELECT
  const handlePositiveEmotionChange = (timeSlot: string, emotion: string) => {
    if (emotion === 'ADD_CUSTOM') {
      setPendingTimeSlot(timeSlot);
      setEmotionType('positive');
      setCustomEmotionDialogOpen(true);
      return;
    }

    if (!emotion) return;

    const data = trackerData[timeSlot] || {
      timeSlot,
      date: currentDateStr,
      userId: '',
      positiveEmotions: '',
      negativeEmotions: '',
      repeatingEmotions: '',
      missingEmotions: '',
    };

    // Parse existing positive emotions as array
    const existingPositive = data?.positiveEmotions 
      ? data.positiveEmotions.split('|').filter(e => e.trim()) 
      : [];

    // Toggle emotion (add if not present, remove if present)
    let updatedPositiveEmotions: string;
    if (existingPositive.includes(emotion)) {
      updatedPositiveEmotions = existingPositive.filter(e => e !== emotion).join('|');
    } else {
      updatedPositiveEmotions = [...existingPositive, emotion].join('|');
    }

    // Update local state
    const updatedData = {
      ...data,
      positiveEmotions: updatedPositiveEmotions,
    };

    setTrackerData((prev) => ({
      ...prev,
      [timeSlot]: updatedData as EmotionalTrackerData,
    }));

    // Auto-fill repeating emotion (considering BOTH positive AND negative)
    const negativeEmotions = data?.negativeEmotions || '';
    const recommendedRepeating = recommendRepeatingEmotion(updatedPositiveEmotions, negativeEmotions, data?.missingEmotions || '');
    
    // Save to server
    saveMutation.mutate({
      date: currentDateStr,
      timeSlot,
      positiveEmotions: updatedPositiveEmotions,
      negativeEmotions: negativeEmotions,
      repeatingEmotions: recommendedRepeating || (data?.repeatingEmotions || ''),
      missingEmotions: data?.missingEmotions || '',
    });
    
    // Update local state with auto-filled repeating emotion
    setTrackerData((prev) => ({
      ...prev,
      [timeSlot]: { ...updatedData, repeatingEmotions: recommendedRepeating || (data?.repeatingEmotions || '') } as EmotionalTrackerData,
    }));
  };

  // Handle inline negative emotion selection (auto-save) - MULTI-SELECT
  const handleNegativeEmotionChange = (timeSlot: string, emotion: string) => {
    if (emotion === 'ADD_CUSTOM') {
      setPendingTimeSlot(timeSlot);
      setEmotionType('negative');
      setCustomEmotionDialogOpen(true);
      return;
    }

    if (!emotion) return;

    const data = trackerData[timeSlot] || {
      timeSlot,
      date: currentDateStr,
      userId: '',
      positiveEmotions: '',
      negativeEmotions: '',
      repeatingEmotions: '',
      missingEmotions: '',
    };

    // Parse existing negative emotions as array
    const existingNegative = data?.negativeEmotions 
      ? data.negativeEmotions.split('|').filter(e => e.trim()) 
      : [];

    // Toggle emotion (add if not present, remove if present)
    let updatedNegativeEmotions: string;
    if (existingNegative.includes(emotion)) {
      updatedNegativeEmotions = existingNegative.filter(e => e !== emotion).join('|');
    } else {
      updatedNegativeEmotions = [...existingNegative, emotion].join('|');
    }

    // Update local state
    const updatedData = {
      ...data,
      negativeEmotions: updatedNegativeEmotions,
    };

    setTrackerData((prev) => ({
      ...prev,
      [timeSlot]: updatedData as EmotionalTrackerData,
    }));

    // Auto-fill repeating emotion (considering BOTH positive AND negative)
    const positiveEmotions = data?.positiveEmotions || '';
    const recommendedRepeating = recommendRepeatingEmotion(positiveEmotions, updatedNegativeEmotions, data?.missingEmotions || '');
    
    // Save to server
    saveMutation.mutate({
      date: currentDateStr,
      timeSlot,
      positiveEmotions: positiveEmotions,
      negativeEmotions: updatedNegativeEmotions,
      repeatingEmotions: recommendedRepeating || (data?.repeatingEmotions || ''),
      missingEmotions: data?.missingEmotions || '',
    });
    
    // Update local state with auto-filled repeating emotion
    setTrackerData((prev) => ({
      ...prev,
      [timeSlot]: { ...updatedData, repeatingEmotions: recommendedRepeating || (data?.repeatingEmotions || '') } as EmotionalTrackerData,
    }));
  };

  // Handle inline missing emotion selection (auto-save) - accumulate emotions
  const handleMissingEmotionChange = (timeSlot: string, emotion: string) => {
    if (emotion === 'ADD_CUSTOM') {
      setPendingTimeSlot(timeSlot);
      setEmotionType('missing');
      setCustomEmotionDialogOpen(true);
      return;
    }

    if (!emotion) return;

    const data = trackerData[timeSlot] || {
      timeSlot,
      date: currentDateStr,
      userId: '',
      positiveEmotions: '',
      negativeEmotions: '',
      repeatingEmotions: '',
      missingEmotions: '',
    };

    // Parse existing missing emotions as array
    const existingMissing = data?.missingEmotions 
      ? data.missingEmotions.split('|').filter(e => e.trim()) 
      : [];

    // Add new emotion if not already present
    if (!existingMissing.includes(emotion)) {
      existingMissing.push(emotion);
    }

    const updatedMissingEmotions = existingMissing.join('|');

    // Update local state
    const updatedData = {
      ...data,
      missingEmotions: updatedMissingEmotions,
    };

    setTrackerData((prev) => ({
      ...prev,
      [timeSlot]: updatedData as EmotionalTrackerData,
    }));

    // Auto-fill repeating emotion
    const recommendedRepeating = recommendRepeatingEmotion(data?.positiveEmotions || '', data?.negativeEmotions || '', emotion);

    // Save to server
    saveMutation.mutate({
      date: currentDateStr,
      timeSlot,
      positiveEmotions: data?.positiveEmotions || '',
      negativeEmotions: data?.negativeEmotions || '',
      repeatingEmotions: recommendedRepeating || (data?.repeatingEmotions || ''),
      missingEmotions: updatedMissingEmotions,
    });
    
    // Update local state with auto-filled repeating emotion
    setTrackerData((prev) => ({
      ...prev,
      [timeSlot]: { ...updatedData, repeatingEmotions: recommendedRepeating || (data?.repeatingEmotions || '') } as EmotionalTrackerData,
    }));
  };

  // Remove missing emotion from list
  const handleRemoveMissingEmotion = (timeSlot: string, emotionToRemove: string) => {
    const data = trackerData[timeSlot];
    if (!data) return;

    // Parse existing emotions and filter out the one to remove
    const existingMissing = data.missingEmotions 
      ? data.missingEmotions.split('|').filter(e => e.trim() && e !== emotionToRemove) 
      : [];

    const updatedMissingEmotions = existingMissing.join('|');

    // Update local state
    const updatedData = {
      ...data,
      missingEmotions: updatedMissingEmotions,
    };

    setTrackerData((prev) => ({
      ...prev,
      [timeSlot]: updatedData as EmotionalTrackerData,
    }));

    // Save to server
    saveMutation.mutate({
      date: currentDateStr,
      timeSlot,
      positiveEmotions: data.positiveEmotions || '',
      negativeEmotions: data.negativeEmotions || '',
      repeatingEmotions: data.repeatingEmotions || '',
      missingEmotions: updatedMissingEmotions,
    });
  };


  // Handle custom emotion submission
  const handleCustomEmotionSubmit = () => {
    if (customEmotionValue.trim()) {
      const newEmotionValue = customEmotionValue.trim();
      
      if (emotionType === 'positive') {
        if (!customEmotions.includes(newEmotionValue)) {
          setCustomEmotions((prev) => [...prev, newEmotionValue]);
          if (pendingTimeSlot) {
            handlePositiveEmotionChange(pendingTimeSlot, newEmotionValue);
          }
        }
      } else if (emotionType === 'negative') {
        if (!customNegativeEmotions.includes(newEmotionValue)) {
          setCustomNegativeEmotions((prev) => [...prev, newEmotionValue]);
          if (pendingTimeSlot) {
            handleNegativeEmotionChange(pendingTimeSlot, newEmotionValue);
          }
        }
      } else if (emotionType === 'missing') {
        if (!customMissingEmotions.includes(newEmotionValue)) {
          setCustomMissingEmotions((prev) => [...prev, newEmotionValue]);
          if (pendingTimeSlot) {
            handleMissingEmotionChange(pendingTimeSlot, newEmotionValue);
          }
        }
      }
      
      setCustomEmotionValue('');
      setCustomEmotionDialogOpen(false);
      setPendingTimeSlot('');
      setEmotionType('positive');
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
          <div className="flex flex-col gap-3">
            {/* MOBILE RESPONSIVE HEADER - Stack on mobile, row on desktop */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0">
              {/* Left: Title - Full width on mobile */}
              <CardTitle className="flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent text-base sm:text-lg md:text-xl lg:text-2xl">
                <Heart className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-primary flex-shrink-0" />
                <span className="hidden xs:inline">Daily Emotional Tracker</span>
                <span className="xs:hidden"> Daily Emotional Tracker</span>
              </CardTitle>
              
              {/* Center: Date Navigation - Centered on mobile */}
              <div className="flex items-center justify-center gap-1 sm:gap-1.5 md:gap-2">
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
                      data-testid="button-date-picker"
                      className="h-8 sm:h-9 px-2 sm:px-3 md:px-4 font-semibold text-xs sm:text-sm"
                    >
                      <span className="hidden sm:inline">{format(selectedDate, 'MMMM dd, yyyy')}</span>
                      <span className="sm:hidden">{format(selectedDate, 'MMM dd, yy')}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="center">
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
              
              {/* Right: Pattern Analysis Button - Full width on mobile */}
              <Button
                variant="outline"
                onClick={() => setPreviewOpen(true)}
                data-testid="button-emotional-pattern-analysis"
                className="h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3 w-full sm:w-auto"
              >
                <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
                <span className="hidden md:inline">Emotional Pattern Analysis</span>
                <span className="md:hidden">Analysis</span>
              </Button>
            </div>
            
            {/* Description - Smaller text on mobile */}
            <CardDescription className="text-[10px] xs:text-xs sm:text-sm">
              Track your emotions throughout the day in 2-hour time slots (5am - 1am)
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="p-2 xs:p-3 sm:p-4 md:p-6">
          {/* MOBILE RESPONSIVE TABLE WRAPPER - Horizontal scroll with minimum width */}
          <div className="overflow-x-auto -mx-2 xs:-mx-3 sm:mx-0">
            <div className="min-w-[800px]">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-primary/30 dark:border-primary/50">
                    {/* Time Slot Column - Sticky on mobile for better UX */}
                    <th className="sticky left-0 z-10 bg-white dark:bg-gray-900 p-1 xs:p-1.5 sm:p-2 md:p-3 text-left text-[10px] xs:text-xs sm:text-sm font-semibold text-primary dark:text-primary bg-primary/10 dark:bg-primary/20 w-[12%] sm:w-[15%]">
                      <div className="flex items-center gap-1">
                        <span className="hidden xs:inline">Time Slot</span>
                        <span className="xs:hidden">Time</span>
                      </div>
                    </th>
                    <th className="p-1 xs:p-1.5 sm:p-2 md:p-3 text-left text-[10px] xs:text-xs sm:text-sm font-semibold text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 w-[22%]">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span className="hidden md:inline">Positive Emotions</span>
                        <span className="md:hidden">Positive</span>
                      </div>
                    </th>
                    <th className="p-1 xs:p-1.5 sm:p-2 md:p-3 text-left text-[10px] xs:text-xs sm:text-sm font-semibold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 w-[22%]">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <Brain className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span className="hidden md:inline">Negative Emotions</span>
                        <span className="md:hidden">Negative</span>
                      </div>
                    </th>
                    <th className="p-1 xs:p-1.5 sm:p-2 md:p-3 text-left text-[10px] xs:text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 w-[22%]">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <RefreshCcw className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span className="hidden md:inline">Repeating</span>
                        <span className="md:hidden">Repeat</span>
                      </div>
                    </th>
                    <th className="p-1 xs:p-1.5 sm:p-2 md:p-3 text-left text-[10px] xs:text-xs sm:text-sm font-semibold text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/20 w-[22%]">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <Heart className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span className="hidden md:inline">Missing</span>
                        <span className="md:hidden">Miss</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // Detect emotions that repeat (appear multiple times) across all time slots
                    const repeatingEmotionsCounts = detectRepeatingEmotions(trackerData);
                    
                    // Separate repeating emotions into positive and negative based on emotion lists
                    const positiveRepeating: { emotion: string; count: number }[] = [];
                    const negativeRepeating: { emotion: string; count: number }[] = [];
                    
                    Object.entries(repeatingEmotionsCounts).forEach(([emotion, count]) => {
                      // Check if this emotion is in POSITIVE or NEGATIVE lists
                      if (POSITIVE_EMOTIONS.includes(emotion) || customEmotions.includes(emotion)) {
                        positiveRepeating.push({ emotion, count });
                      } else if (NEGATIVE_EMOTIONS.includes(emotion) || customNegativeEmotions.includes(emotion)) {
                        negativeRepeating.push({ emotion, count });
                      } else {
                        // If it's a custom emotion, check which column it was last used in
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
                          className={`border-b border-primary/20 dark:border-primary/30 hover-elevate min-h-[48px] ${
                            index % 2 === 0 ? 'bg-white/50 dark:bg-gray-900/20' : 'bg-primary/5 dark:bg-primary/10'
                          }`}
                        >
                          {/* Time Slot - Sticky on mobile */}
                          <td className="sticky left-0 z-10 bg-inherit p-1 xs:p-1.5 sm:p-2 md:p-3 text-[10px] xs:text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 align-top" data-testid={`time-slot-${index}`}>
                            <span className="hidden xs:inline">{timeSlot}</span>
                            <span className="xs:hidden text-[9px]">{timeSlot.replace(' to ', '-').replace('am', '').replace('pm', '')}</span>
                          </td>
                          
                          {/* Positive Emotions - Multi-Select with Badges */}
                          <td className="p-1 xs:p-1.5 sm:p-2 align-top">
                            <div className="space-y-1 sm:space-y-1.5">
                              <Select value="" onValueChange={(value) => handlePositiveEmotionChange(timeSlot, value)}>
                                <SelectTrigger 
                                  className={`h-8 sm:h-9 md:h-10 w-full text-[10px] xs:text-xs sm:text-sm ${FIELD_COLORS.positiveEmotions.bg} ${FIELD_COLORS.positiveEmotions.border} border hover:border-green-400 dark:hover:border-green-500 transition-colors`}
                                  data-testid={`input-positive-${index}`}
                                >
                                  <SelectValue placeholder="Add..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                  <SelectItem value="ADD_CUSTOM" data-testid={`button-add-custom-emotion-${index}`}>
                                    <span className="text-primary font-semibold text-xs sm:text-sm">+ Add Custom</span>
                                  </SelectItem>
                                  <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                                  {[...POSITIVE_EMOTIONS, ...customEmotions].map((emotion) => (
                                    <SelectItem key={emotion} value={emotion} data-testid={`option-positive-${emotion}`}>
                                      {emotion}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              
                              {/* Display selected emotions as removable badges */}
                              {data.positiveEmotions && (
                                <div className="flex flex-wrap gap-0.5 sm:gap-1">
                                  {data.positiveEmotions.split('|').filter(e => e.trim()).map((emotion) => (
                                    <span
                                      key={emotion}
                                      className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] xs:text-[10px] sm:text-xs font-medium bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700 w-fit"
                                      data-testid={`badge-positive-${emotion}`}
                                    >
                                      <span className="truncate max-w-[80px] sm:max-w-none">{emotion}</span>
                                      <button
                                        onClick={() => handlePositiveEmotionChange(timeSlot, emotion)}
                                        className="ml-0.5 hover:text-green-900 dark:hover:text-green-100 font-bold text-xs sm:text-sm"
                                        data-testid={`button-remove-positive-${emotion}`}
                                      >
                                        ×
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Negative Emotions - Multi-Select with Badges */}
                          <td className="p-1 xs:p-1.5 sm:p-2 align-top">
                            <div className="space-y-1 sm:space-y-1.5">
                              <Select value="" onValueChange={(value) => handleNegativeEmotionChange(timeSlot, value)}>
                                <SelectTrigger 
                                  className={`h-8 sm:h-9 md:h-10 w-full text-[10px] xs:text-xs sm:text-sm ${FIELD_COLORS.negativeEmotions.bg} ${FIELD_COLORS.negativeEmotions.border} border hover:border-red-400 dark:hover:border-red-500 transition-colors`}
                                  data-testid={`input-negative-${index}`}
                                >
                                  <SelectValue placeholder="Add..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                  <SelectItem value="ADD_CUSTOM" data-testid={`button-add-custom-negative-emotion-${index}`}>
                                    <span className="text-primary font-semibold text-xs sm:text-sm">+ Add Custom</span>
                                  </SelectItem>
                                  <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                                  {[...NEGATIVE_EMOTIONS, ...customNegativeEmotions].map((emotion) => (
                                    <SelectItem key={emotion} value={emotion} data-testid={`option-negative-${emotion}`}>
                                      {emotion}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              
                              {/* Display selected emotions as removable badges */}
                              {data.negativeEmotions && (
                                <div className="flex flex-wrap gap-0.5 sm:gap-1">
                                  {data.negativeEmotions.split('|').filter(e => e.trim()).map((emotion) => (
                                    <span
                                      key={emotion}
                                      className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] xs:text-[10px] sm:text-xs font-medium bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700 w-fit"
                                      data-testid={`badge-negative-${emotion}`}
                                    >
                                      <span className="truncate max-w-[80px] sm:max-w-none">{emotion}</span>
                                      <button
                                        onClick={() => handleNegativeEmotionChange(timeSlot, emotion)}
                                        className="ml-0.5 hover:text-red-900 dark:hover:text-red-100 font-bold text-xs sm:text-sm"
                                        data-testid={`button-remove-negative-${emotion}`}
                                      >
                                        ×
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Repeating Emotions - Merged Cell with Aggregated Summary (only first row) */}
                          {index === 0 && (
                            <td 
                              className="p-1.5 sm:p-2 md:p-3 align-top bg-gradient-to-b from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-l border-blue-200 dark:border-blue-800"
                              rowSpan={TIME_SLOTS.length}
                              data-testid="display-repeating-summary"
                            >
                              <div className="flex flex-col gap-1 sm:gap-2 h-full">
                                {allRepeating.length === 0 ? (
                                  <div className="text-gray-400 dark:text-gray-500 italic text-[9px] xs:text-[10px] sm:text-xs text-center py-2 sm:py-4">
                                    Auto-detected
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-0.5 sm:gap-1">
                                    {/* Positive Repeating Emotions First */}
                                    {positiveRepeating.map(({ emotion, count }) => (
                                      <span
                                        key={`pos-${emotion}`}
                                        className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 rounded-full text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-medium bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700 w-fit"
                                      >
                                        <span className="truncate">{emotion}</span>
                                        {count > 1 && <span className="font-bold">-{count}</span>}
                                      </span>
                                    ))}
                                    
                                    {/* Negative Repeating Emotions Second (in Red) */}
                                    {negativeRepeating.map(({ emotion, count }) => (
                                      <span
                                        key={`neg-${emotion}`}
                                        className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 rounded-full text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-medium bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700 w-fit"
                                      >
                                        <span className="truncate">{emotion}</span>
                                        {count > 1 && <span className="font-bold">-{count}</span>}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                          )}

                          {/* Missing Emotions - Single Dropdown in First Row with rowSpan */}
                          {index === 0 && (
                            <td 
                              className="p-1.5 sm:p-2 md:p-3 align-top bg-gradient-to-b from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-l border-orange-200 dark:border-orange-800"
                              rowSpan={TIME_SLOTS.length}
                              data-testid="display-missing-emotions"
                            >
                              <div className="flex flex-col gap-1.5 sm:gap-2 h-full">
                                <Select value="" onValueChange={(value) => handleMissingEmotionChange(TIME_SLOTS[0], value)}>
                                  <SelectTrigger 
                                    className={`h-8 sm:h-9 md:h-10 w-full text-[10px] xs:text-xs sm:text-sm md:text-base ${FIELD_COLORS.missingEmotions.bg} ${FIELD_COLORS.missingEmotions.border} border hover:border-orange-400 dark:hover:border-orange-500 transition-colors`}
                                    data-testid="input-missing-dropdown"
                                  >
                                    <SelectValue placeholder="Select..." />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-[300px]">
                                    <SelectItem value="ADD_CUSTOM" data-testid="button-add-custom-missing-emotion">
                                      <span className="text-primary font-semibold text-xs sm:text-sm">+ Add Custom</span>
                                    </SelectItem>
                                    <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                                    {[...MISSING_EMOTIONS, ...customMissingEmotions].map((emotion) => (
                                      <SelectItem key={emotion} value={emotion}>
                                        {emotion}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                
                                {/* Display accumulated emotions as removable pills */}
                                {trackerData[TIME_SLOTS[0]]?.missingEmotions && (
                                  <div className="flex flex-wrap gap-1 sm:gap-1.5">
                                    {trackerData[TIME_SLOTS[0]].missingEmotions.split('|').filter(e => e.trim()).map((emotion) => (
                                      <span
                                        key={emotion}
                                        className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 rounded-full text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-medium bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-700 w-fit"
                                      >
                                        <span className="truncate max-w-[100px] sm:max-w-none">{emotion}</span>
                                        <button
                                          onClick={() => handleRemoveMissingEmotion(TIME_SLOTS[0], emotion)}
                                          className="ml-0.5 hover:text-orange-900 dark:hover:text-orange-100 font-bold"
                                          data-testid={`button-remove-missing-emotion-${emotion}`}
                                        >
                                          ×
                                        </button>
                                      </span>
                                    ))}
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
          </div>
          
          {saveMutation.isPending && (
            <div className="mt-3 sm:mt-4 text-xs sm:text-sm text-purple-600 dark:text-purple-400 flex items-center gap-2">
              <RefreshCcw className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
              Saving...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog - MOBILE RESPONSIVE */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="w-[95vw] max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              {editingField && FIELD_LABELS[editingField.field]}
            </DialogTitle>
          </DialogHeader>
          <div className="py-3 sm:py-4">
            {editingField?.field === 'positiveEmotions' ? (
              <div className="space-y-2 sm:space-y-3">
                {!isCustomEmotionInput ? (
                  <>
                    <Select value={dialogValue} onValueChange={setDialogValue}>
                      <SelectTrigger data-testid="select-positive-emotion" className="h-9 sm:h-10">
                        <SelectValue placeholder="Select an emotion..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {POSITIVE_EMOTIONS.map((emotion) => (
                          <SelectItem key={emotion} value={emotion}>
                            {emotion}
                          </SelectItem>
                        ))}
                        <div className="border-t mt-2 pt-2">
                          <button
                            onClick={() => setIsCustomEmotionInput(true)}
                            className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-accent rounded"
                            data-testid="button-add-custom-emotion"
                          >
                            + Add Custom Emotion
                          </button>
                        </div>
                      </SelectContent>
                    </Select>
                  </>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={customEmotionInput}
                      onChange={(e) => setCustomEmotionInput(e.target.value)}
                      placeholder="Type custom emotion..."
                      className="w-full px-3 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      autoFocus
                      data-testid="input-custom-emotion"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddCustomEmotion();
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleAddCustomEmotion}
                        size="sm"
                        data-testid="button-confirm-custom"
                      >
                        Add
                      </Button>
                      <Button
                        onClick={() => {
                          setIsCustomEmotionInput(false);
                          setCustomEmotionInput('');
                        }}
                        size="sm"
                        variant="outline"
                        data-testid="button-cancel-custom"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
                {dialogValue && (
                  <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded text-sm text-green-700 dark:text-green-300">
                    Selected: <strong>{dialogValue}</strong>
                  </div>
                )}
              </div>
            ) : (
              <Textarea
                value={dialogValue}
                onChange={(e) => setDialogValue(e.target.value)}
                placeholder="Enter your emotions here..."
                className="min-h-[120px] sm:min-h-[150px] resize-none text-sm"
                autoFocus
                data-testid="textarea-dialog-edit"
              />
            )}
          </div>
          <div className="flex justify-end pt-3 sm:pt-4">
            <Button
              onClick={saveDialogEdit}
              data-testid="button-save"
              className="w-full sm:w-auto"
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom Emotion Dialog - MOBILE RESPONSIVE */}
      <Dialog open={customEmotionDialogOpen} onOpenChange={(open) => {
        if (!open) {
          // Save on click outside
          if (customEmotionValue.trim()) {
            handleCustomEmotionSubmit();
          } else {
            setCustomEmotionDialogOpen(false);
            setCustomEmotionValue('');
            setPendingTimeSlot('');
          }
        }
      }}>
        <DialogContent className="w-[95vw] max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Add Custom Emotion</DialogTitle>
          </DialogHeader>
          <div className="py-3 sm:py-4 space-y-3 sm:space-y-4">
            <input
              type="text"
              value={customEmotionValue}
              onChange={(e) => setCustomEmotionValue(e.target.value)}
              placeholder="Type a custom emotion..."
              className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
              data-testid="input-custom-emotion-dialog"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCustomEmotionSubmit();
                }
              }}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Press Enter or click Save to add this emotion
            </p>
          </div>
          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-3 sm:pt-4">
            <Button
              onClick={() => {
                setCustomEmotionDialogOpen(false);
                setCustomEmotionValue('');
                setPendingTimeSlot('');
              }}
              variant="outline"
              data-testid="button-cancel-emotion-dialog"
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCustomEmotionSubmit}
              disabled={!customEmotionValue.trim()}
              data-testid="button-save-emotion-dialog"
              className="w-full sm:w-auto order-1 sm:order-2"
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <EmotionalPreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} />
    </>
  );
}
