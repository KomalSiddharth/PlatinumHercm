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

  const pieData = [
    { name: 'Positive', value: stats.daily, fill: '#10b981' },
    { name: 'Other', value: Math.max(0, 100 - stats.daily), fill: '#e5e7eb' },
  ];

  const barData = [
    { period: 'Today', percentage: stats.daily },
    { period: 'Week', percentage: stats.weekly },
    { period: 'Month', percentage: stats.monthly },
    { period: 'Year', percentage: stats.yearly },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Your Emotional Preview</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 mt-6">
          {/* Daily Pie Chart */}
          <div className="border rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Today's Positivity</h3>
            <div className="flex flex-col items-center">
              <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value}%`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 text-2xl font-bold text-green-600">{stats.daily}%</div>
            </div>
          </div>

          {/* Period Comparison Bar Chart */}
          <div className="border rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Positivity Across Periods</h3>
            <div style={{ width: '100%', height: 250 }}>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Bar dataKey="percentage" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Weekly Trend Line Chart */}
          <div className="border rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">7-Day Positivity Trend</h3>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={stats.dailyTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Legend />
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

          {/* Stats Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-primary/5 dark:bg-primary/10 rounded-lg">
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
