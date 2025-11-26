import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { RefreshCcw } from 'lucide-react';

interface EmotionalStats {
  daily: number;
  weekly: number;
  monthly: number;
  yearly: number;
  dailyTrend: Array<{ date: string; percentage: number }>;
  weeklyEmotions?: Array<{
    day: string;
    emotions: {
      positive: string[];
      negative: string[];
      repeating: string[];
      missing: string[];
    };
  }>;
}

// Mood levels for the gauge
const MOOD_LEVELS = [
  { label: 'Very Poor', color: '#dc2626', range: [0, 20] },
  { label: 'Poor', color: '#ea580c', range: [20, 40] },
  { label: 'Average', color: '#eab308', range: [40, 60] },
  { label: 'Good', color: '#84cc16', range: [60, 80] },
  { label: 'Excellent', color: '#22c55e', range: [80, 100] },
];

// Color palette for dynamic emotions
const POSITIVE_COLORS = ['#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1'];
const NEGATIVE_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#dc2626', '#c026d3', '#9333ea'];

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Mood Meter Gauge Component
function MoodMeter({ percentage }: { percentage: number }) {
  const getMoodLevel = (pct: number) => {
    for (const level of MOOD_LEVELS) {
      if (pct >= level.range[0] && pct < level.range[1]) return level;
    }
    return MOOD_LEVELS[4]; // Excellent for 100%
  };

  const currentMood = getMoodLevel(percentage);
  // Map percentage to angle: 0% = -90deg (left), 100% = 90deg (right)
  const needleAngle = (percentage / 100) * 180 - 90;

  return (
    <div className="flex flex-col items-center p-6">
      <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6">Today is</h3>
      
      {/* Gauge Container - Much wider */}
      <div className="relative w-full max-w-md">
        <svg viewBox="0 0 300 180" className="w-full">
          {/* Gauge Arc Segments */}
          {/* Very Poor - Red */}
          <path
            d="M 30 150 A 120 120 0 0 1 66 54"
            fill="none"
            stroke="#dc2626"
            strokeWidth="28"
          />
          {/* Poor - Orange */}
          <path
            d="M 66 54 A 120 120 0 0 1 150 30"
            fill="none"
            stroke="#ea580c"
            strokeWidth="28"
          />
          {/* Average - Yellow */}
          <path
            d="M 150 30 A 120 120 0 0 1 234 54"
            fill="none"
            stroke="#eab308"
            strokeWidth="28"
          />
          {/* Good - Light Green */}
          <path
            d="M 234 54 A 120 120 0 0 1 270 150"
            fill="none"
            stroke="#84cc16"
            strokeWidth="28"
          />
          {/* Excellent section overlay */}
          <path
            d="M 258 110 A 120 120 0 0 1 270 150"
            fill="none"
            stroke="#22c55e"
            strokeWidth="28"
          />

          {/* Emoji faces on the arc */}
          <text x="20" y="165" fontSize="24">😢</text>
          <text x="50" y="75" fontSize="24">😟</text>
          <text x="138" y="35" fontSize="24">😐</text>
          <text x="225" y="75" fontSize="24">🙂</text>
          <text x="255" y="165" fontSize="24">😄</text>

          {/* Labels - positioned clearly below each segment */}
          <text x="15" y="178" fontSize="11" fontWeight="600" fill="#dc2626">Very Poor</text>
          <text x="62" y="95" fontSize="11" fontWeight="600" fill="#ea580c">Poor</text>
          <text x="127" y="58" fontSize="12" fontWeight="600" fill="#eab308">Average</text>
          <text x="215" y="95" fontSize="11" fontWeight="600" fill="#84cc16">Good</text>
          <text x="235" y="178" fontSize="11" fontWeight="600" fill="#22c55e">Excellent</text>

          {/* Needle - much more visible */}
          <g transform={`rotate(${needleAngle}, 150, 150)`}>
            {/* Needle shadow for depth */}
            <polygon
              points="150,45 144,150 156,150"
              fill="rgba(0,0,0,0.2)"
              transform="translate(2, 2)"
            />
            {/* Needle body */}
            <polygon
              points="150,45 144,150 156,150"
              fill="#1e293b"
            />
            {/* Needle tip highlight */}
            <polygon
              points="150,50 147,140 153,140"
              fill="#334155"
            />
            {/* Center circle */}
            <circle cx="150" cy="150" r="14" fill="#1e293b" stroke="#0f172a" strokeWidth="3" />
            <circle cx="150" cy="150" r="6" fill="#64748b" />
          </g>
        </svg>
      </div>

      {/* Current Status - Larger and more prominent */}
      <div className="mt-2 text-center">
        <div 
          className="text-4xl font-bold drop-shadow-sm"
          style={{ color: currentMood.color }}
        >
          {currentMood.label}
        </div>
        <div className="text-xl font-medium text-gray-600 dark:text-gray-400 mt-1">
          {percentage}% Positive
        </div>
      </div>
    </div>
  );
}

// Weekly Feelings Tracker Grid Component - Dynamic based on user's actual emotions
function WeeklyFeelingsTracker({ weeklyEmotions }: { weeklyEmotions?: EmotionalStats['weeklyEmotions'] }) {
  // Extract all unique emotions from the week's data
  const getUniqueEmotions = () => {
    if (!weeklyEmotions) return { positive: [], negative: [] };
    
    const positiveSet = new Set<string>();
    const negativeSet = new Set<string>();
    
    weeklyEmotions.forEach(dayData => {
      // Positive emotions from positive column
      dayData.emotions.positive.forEach(e => {
        const cleaned = e.trim();
        if (cleaned && cleaned.length < 30) positiveSet.add(cleaned);
      });
      
      // Negative emotions from negative column
      dayData.emotions.negative.forEach(e => {
        const cleaned = e.trim();
        if (cleaned && cleaned.length < 30) negativeSet.add(cleaned);
      });
    });
    
    return {
      positive: Array.from(positiveSet).slice(0, 8), // Limit to top 8
      negative: Array.from(negativeSet).slice(0, 6), // Limit to top 6
    };
  };

  const { positive: positiveEmotions, negative: negativeEmotions } = getUniqueEmotions();
  
  // Check if emotion exists for a given day
  const hasEmotionOnDay = (day: string, emotionName: string, type: 'positive' | 'negative') => {
    if (!weeklyEmotions) return false;
    const dayData = weeklyEmotions.find(d => d.day === day);
    if (!dayData) return false;
    
    const emotions = type === 'positive' ? dayData.emotions.positive : dayData.emotions.negative;
    return emotions.some(e => e.toLowerCase().trim() === emotionName.toLowerCase().trim());
  };

  // No emotions recorded
  if (positiveEmotions.length === 0 && negativeEmotions.length === 0) {
    return (
      <div className="p-4">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-2 text-center">
          Weekly Feelings Tracker
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
          No emotions recorded this week yet.<br/>
          Start tracking in the Emotional Tracker to see your patterns!
        </p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-2 text-center">
        Weekly Feelings Tracker
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 text-center">
        Your emotions across the week (from Positive & Negative columns)
      </p>
      
      <div className="overflow-x-auto max-h-[280px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white dark:bg-gray-800 z-10">
            <tr>
              <th className="py-2 px-1 text-left text-gray-700 dark:text-gray-300 text-xs">Emotion</th>
              {DAYS_OF_WEEK.map((day, idx) => (
                <th 
                  key={day} 
                  className="py-2 px-1 text-center text-xs font-medium"
                  style={{
                    backgroundColor: `hsl(${40 + idx * 5}, 100%, 85%)`,
                    color: '#374151'
                  }}
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Positive Emotions Section */}
            {positiveEmotions.length > 0 && (
              <tr className="bg-green-50 dark:bg-green-900/20">
                <td colSpan={8} className="py-1 px-2 text-xs font-semibold text-green-700 dark:text-green-400">
                  ✨ Positive
                </td>
              </tr>
            )}
            {positiveEmotions.map((emotion, idx) => (
              <tr key={`pos-${emotion}-${idx}`} className="border-b border-gray-100 dark:border-gray-700">
                <td className="py-1.5 px-1 flex items-center gap-2">
                  <span 
                    className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0"
                    style={{ backgroundColor: POSITIVE_COLORS[idx % POSITIVE_COLORS.length] }}
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300 truncate max-w-[100px]" title={emotion}>
                    {emotion}
                  </span>
                </td>
                {DAYS_OF_WEEK.map((day) => (
                  <td key={day} className="py-1.5 px-1 text-center">
                    {hasEmotionOnDay(day, emotion, 'positive') ? (
                      <span 
                        className="inline-block w-4 h-4 rounded-full"
                        style={{ backgroundColor: POSITIVE_COLORS[idx % POSITIVE_COLORS.length] }}
                      />
                    ) : (
                      <span className="inline-block w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-600 opacity-20" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
            
            {/* Negative Emotions Section */}
            {negativeEmotions.length > 0 && (
              <tr className="bg-red-50 dark:bg-red-900/20">
                <td colSpan={8} className="py-1 px-2 text-xs font-semibold text-red-700 dark:text-red-400">
                  💔 Negative
                </td>
              </tr>
            )}
            {negativeEmotions.map((emotion, idx) => (
              <tr key={`neg-${emotion}-${idx}`} className="border-b border-gray-100 dark:border-gray-700">
                <td className="py-1.5 px-1 flex items-center gap-2">
                  <span 
                    className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0"
                    style={{ backgroundColor: NEGATIVE_COLORS[idx % NEGATIVE_COLORS.length] }}
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300 truncate max-w-[100px]" title={emotion}>
                    {emotion}
                  </span>
                </td>
                {DAYS_OF_WEEK.map((day) => (
                  <td key={day} className="py-1.5 px-1 text-center">
                    {hasEmotionOnDay(day, emotion, 'negative') ? (
                      <span 
                        className="inline-block w-4 h-4 rounded-full"
                        style={{ backgroundColor: NEGATIVE_COLORS[idx % NEGATIVE_COLORS.length] }}
                      />
                    ) : (
                      <span className="inline-block w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-600 opacity-20" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function EmotionalPreviewDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [stats, setStats] = useState<EmotionalStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const fetchStats = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/emotional-stats', {
          credentials: 'include',
        });
        if (!res.ok) {
          throw new Error(`Failed to fetch: ${res.status}`);
        }
        const data = await res.json();
        console.log('Emotional stats fetched:', data);
        setStats(data);
      } catch (err) {
        console.error('Error fetching emotional stats:', err);
        setError(err instanceof Error ? err.message : 'Failed to load stats');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [open]);

  if (!open) return null;

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Your Emotional Preview</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <RefreshCcw className="h-6 w-6 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !stats) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Your Emotional Preview</DialogTitle>
          </DialogHeader>
          <div className="py-12 text-center">
            <p className="text-sm text-red-600">{error || 'Unable to load statistics'}</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const barData = [
    { period: 'Today', percentage: stats.daily },
    { period: 'Week', percentage: stats.weekly },
    { period: 'Month', percentage: stats.monthly },
    { period: 'Year', percentage: stats.yearly },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Your Emotional Preview</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 mt-4">
          {/* Row 1: Mood Meter and Weekly Feelings Tracker */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Mood Meter Gauge */}
            <div className="border rounded-lg bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
              <MoodMeter percentage={stats.daily} />
            </div>

            {/* Weekly Feelings Tracker */}
            <div className="border rounded-lg bg-white dark:bg-gray-800">
              <WeeklyFeelingsTracker weeklyEmotions={stats.weeklyEmotions} />
            </div>
          </div>

          {/* Row 2: Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Period Comparison Bar Chart */}
            <div className="border rounded-lg p-4 bg-white dark:bg-gray-800">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Positivity Across Periods</h3>
              <div style={{ width: '100%', height: 220 }}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Bar dataKey="percentage" fill="#10b981" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Weekly Trend Line Chart */}
            <div className="border rounded-lg p-4 bg-white dark:bg-gray-800">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">7-Day Positivity Trend</h3>
              <div style={{ width: '100%', height: 220 }}>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={stats.dailyTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Line
                      type="monotone"
                      dataKey="percentage"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      dot={{ fill: '#06b6d4' }}
                      name="Daily Positivity %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gradient-to-r from-emerald-50 to-cyan-50 dark:from-emerald-900/20 dark:to-cyan-900/20 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.daily}%</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Today</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-600">{stats.weekly}%</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">This Week</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.monthly}%</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">This Month</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.yearly}%</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">This Year</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
