import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfWeek, startOfMonth, startOfYear } from 'date-fns';
import { RefreshCcw } from 'lucide-react';

interface EmotionalStats {
  daily: number;
  weekly: number;
  monthly: number;
  yearly: number;
  dailyTrend: Array<{ date: string; percentage: number }>;
}

export function EmotionalPreviewDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['/api/emotional-stats'],
    enabled: open,
    staleTime: 30000,
  });

  if (isLoading || !stats) {
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

  const pieData = [
    { name: 'Positive', value: stats.daily, fill: '#10b981' },
    { name: 'Other', value: 100 - stats.daily, fill: '#e5e7eb' },
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
          <DialogTitle className="flex items-center gap-2">
            <span>✨ Your Emotional Preview</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Daily Pie Chart */}
          <div className="flex flex-col items-center">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Today's Positivity</h3>
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
            <div className="mt-2 text-2xl font-bold text-green-600">{stats.daily}%</div>
          </div>

          {/* Period Comparison Bar Chart */}
          <div className="flex flex-col items-center">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Positivity Across Periods</h3>
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

          {/* Weekly Trend Line Chart */}
          <div className="lg:col-span-2 flex flex-col items-center">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">7-Day Positivity Trend</h3>
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 p-4 bg-primary/5 dark:bg-primary/10 rounded-lg">
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
      </DialogContent>
    </Dialog>
  );
}
