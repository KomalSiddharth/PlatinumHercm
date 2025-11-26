import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { RefreshCcw } from 'lucide-react';

interface EmotionalStats {
  daily: number;
  weekly: number;
  monthly: number;
  yearly: number;
  hasData?: {
    daily: boolean;
    weekly: boolean;
    monthly: boolean;
    yearly: boolean;
  };
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
  console.log('[WeeklyTracker] weeklyEmotions:', weeklyEmotions);
  
  // Extract all unique emotions from the week's data
  const getUniqueEmotions = () => {
    if (!weeklyEmotions || !Array.isArray(weeklyEmotions)) return { positive: [], negative: [] };
    
    const positiveSet = new Set<string>();
    const negativeSet = new Set<string>();
    
    weeklyEmotions.forEach(dayData => {
      if (!dayData?.emotions) return;
      
      // Positive emotions from positive column
      if (Array.isArray(dayData.emotions.positive)) {
        dayData.emotions.positive.forEach(e => {
          if (typeof e === 'string') {
            const cleaned = e.trim();
            // Only add short, single-word or simple emotions (not long descriptions)
            if (cleaned && cleaned.length > 1 && cleaned.length < 25 && !cleaned.includes(' — ')) {
              positiveSet.add(cleaned);
            }
          }
        });
      }
      
      // Negative emotions from negative column  
      if (Array.isArray(dayData.emotions.negative)) {
        dayData.emotions.negative.forEach(e => {
          if (typeof e === 'string') {
            const cleaned = e.trim();
            if (cleaned && cleaned.length > 1 && cleaned.length < 25 && !cleaned.includes(' — ')) {
              negativeSet.add(cleaned);
            }
          }
        });
      }
    });
    
    return {
      positive: Array.from(positiveSet).slice(0, 8), // Limit to top 8
      negative: Array.from(negativeSet).slice(0, 6), // Limit to top 6
    };
  };

  const { positive: positiveEmotions, negative: negativeEmotions } = getUniqueEmotions();
  console.log('[WeeklyTracker] Extracted emotions:', { positive: positiveEmotions, negative: negativeEmotions });
  
  // Check if emotion exists for a given day
  const hasEmotionOnDay = (day: string, emotionName: string, type: 'positive' | 'negative') => {
    if (!weeklyEmotions || !Array.isArray(weeklyEmotions)) return false;
    const dayData = weeklyEmotions.find(d => d.day === day);
    if (!dayData?.emotions) return false;
    
    const emotions = type === 'positive' ? dayData.emotions.positive : dayData.emotions.negative;
    if (!Array.isArray(emotions)) return false;
    
    return emotions.some(e => 
      typeof e === 'string' && e.toLowerCase().trim() === emotionName.toLowerCase().trim()
    );
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

  // Bar data with both positive and negative percentages - only include periods with data
  const hasData = stats.hasData || { daily: true, weekly: true, monthly: true, yearly: true };
  
  const barData = [
    { 
      period: 'Today', 
      positive: hasData.daily ? stats.daily : 0, 
      negative: hasData.daily ? 100 - stats.daily : 0,
      hasData: hasData.daily 
    },
    { 
      period: 'Week', 
      positive: hasData.weekly ? stats.weekly : 0, 
      negative: hasData.weekly ? 100 - stats.weekly : 0,
      hasData: hasData.weekly 
    },
    { 
      period: 'Month', 
      positive: hasData.monthly ? stats.monthly : 0, 
      negative: hasData.monthly ? 100 - stats.monthly : 0,
      hasData: hasData.monthly 
    },
    { 
      period: 'Year', 
      positive: hasData.yearly ? stats.yearly : 0, 
      negative: hasData.yearly ? 100 - stats.yearly : 0,
      hasData: hasData.yearly 
    },
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

          {/* Row 2: Positivity vs Negativity Chart - Full Width */}
          <div className="border rounded-lg p-4 bg-white dark:bg-gray-800">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Positivity vs Negativity Across Periods</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Cumulative count of positive vs negative emotions. Today = today only, Week = last 7 days, Month = last 30 days
            </p>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="period" 
                    tick={({ x, y, payload }: any) => {
                      const item = barData.find(d => d.period === payload.value);
                      return (
                        <g transform={`translate(${x},${y})`}>
                          <text 
                            x={0} y={0} dy={16} 
                            textAnchor="middle" 
                            fill={item?.hasData ? '#374151' : '#9ca3af'}
                            fontSize={12}
                          >
                            {payload.value}
                          </text>
                          {!item?.hasData && (
                            <text 
                              x={0} y={0} dy={30} 
                              textAnchor="middle" 
                              fill="#9ca3af"
                              fontSize={9}
                            >
                              (No data)
                            </text>
                          )}
                        </g>
                      );
                    }}
                  />
                  <YAxis domain={[0, 100]} tickFormatter={(val) => `${val}%`} />
                  <Tooltip 
                    formatter={(value: number, name: string, props: any) => {
                      if (!props.payload.hasData) return ['No data', ''];
                      return [`${value}%`, name === 'positive' ? 'Positive' : 'Negative'];
                    }}
                    contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: '8px' }}
                  />
                  <Legend 
                    formatter={(value) => value === 'positive' ? '✨ Positive' : '💔 Negative'}
                  />
                  <Bar 
                    dataKey="positive" 
                    fill="#10b981" 
                    radius={[8, 8, 0, 0]} 
                    name="positive"
                  />
                  <Bar 
                    dataKey="negative" 
                    fill="#ef4444" 
                    radius={[8, 8, 0, 0]} 
                    name="negative"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stats Summary - Positive and Negative */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gradient-to-r from-emerald-50 to-red-50 dark:from-emerald-900/20 dark:to-red-900/20 rounded-lg">
            <div className="text-center">
              {hasData.daily ? (
                <div className="flex justify-center gap-2 items-baseline">
                  <span className="text-2xl font-bold text-green-600">{stats.daily}%</span>
                  <span className="text-lg font-medium text-red-500">/ {100 - stats.daily}%</span>
                </div>
              ) : (
                <div className="text-lg text-gray-400">No data</div>
              )}
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Today (Positive / Negative)</div>
            </div>
            <div className="text-center">
              {hasData.weekly ? (
                <div className="flex justify-center gap-2 items-baseline">
                  <span className="text-2xl font-bold text-green-600">{stats.weekly}%</span>
                  <span className="text-lg font-medium text-red-500">/ {100 - stats.weekly}%</span>
                </div>
              ) : (
                <div className="text-lg text-gray-400">No data</div>
              )}
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">This Week (7 days)</div>
            </div>
            <div className="text-center">
              {hasData.monthly ? (
                <div className="flex justify-center gap-2 items-baseline">
                  <span className="text-2xl font-bold text-green-600">{stats.monthly}%</span>
                  <span className="text-lg font-medium text-red-500">/ {100 - stats.monthly}%</span>
                </div>
              ) : (
                <div className="text-lg text-gray-400">No data</div>
              )}
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">This Month (30 days)</div>
            </div>
            <div className="text-center">
              {hasData.yearly ? (
                <div className="flex justify-center gap-2 items-baseline">
                  <span className="text-2xl font-bold text-green-600">{stats.yearly}%</span>
                  <span className="text-lg font-medium text-red-500">/ {100 - stats.yearly}%</span>
                </div>
              ) : (
                <div className="text-lg text-gray-400">No data yet</div>
              )}
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">This Year</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
