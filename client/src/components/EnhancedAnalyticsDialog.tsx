import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CalendarIcon, BarChart3, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';

interface EnhancedAnalyticsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentWeek: number;
}

interface HercmWeek {
  id: string;
  weekNumber: number;
  year: number;
}

export function EnhancedAnalyticsDialog({ open, onOpenChange, currentWeek }: EnhancedAnalyticsDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewType, setViewType] = useState<'weekly' | 'monthly'>('weekly');
  const [selectedWeek, setSelectedWeek] = useState<number>(currentWeek);

  // Fetch available weeks from database
  const { data: availableWeeks } = useQuery<HercmWeek[]>({
    queryKey: ['/api/hercm/weeks'],
    enabled: open,
  });

  // Get unique week numbers from available weeks
  const weekNumbers = availableWeeks 
    ? Array.from(new Set(availableWeeks.map(w => w.weekNumber))).sort((a, b) => a - b)
    : [];

  // Fetch analytics data for selected week only
  const { data: analyticsData, isLoading } = useQuery<{
    weeklyData?: Array<{ week: string; Health: number; Relationship: number; Career: number; Money: number }>;
    monthlyData?: Array<{ month: string; Health: number; Relationship: number; Career: number; Money: number }>;
  }>({
    queryKey: [`/api/analytics/progress?viewType=${viewType}&year=${selectedDate.getFullYear()}&month=${selectedDate.getMonth() + 1}&week=${selectedWeek}`],
    enabled: open,
  });

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // Use REAL data from API - no fake fallback data
  const weeklyData = analyticsData?.weeklyData || [];
  const monthlyData = analyticsData?.monthlyData || [];

  const currentData = viewType === 'weekly' ? weeklyData : monthlyData;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            HRCM Progress Analytics
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/30 rounded-lg">
            {/* View Type Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">View:</span>
              <Select value={viewType} onValueChange={(v) => setViewType(v as 'weekly' | 'monthly')}>
                <SelectTrigger className="w-32" data-testid="select-view-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Month Selector (only for monthly view) */}
            {viewType === 'monthly' && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Month:</span>
                <Select 
                  value={selectedDate.getMonth().toString()} 
                  onValueChange={(v) => {
                    const newDate = new Date(selectedDate);
                    newDate.setMonth(Number(v));
                    setSelectedDate(newDate);
                  }}
                >
                  <SelectTrigger className="w-40" data-testid="select-month">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthNames.map((month, idx) => (
                      <SelectItem key={idx} value={idx.toString()}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Week Selector (for weekly view) - DYNAMIC based on user's filled weeks */}
            {viewType === 'weekly' && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Week:</span>
                <Select value={selectedWeek.toString()} onValueChange={(v) => setSelectedWeek(Number(v))}>
                  <SelectTrigger className="w-24" data-testid="select-week">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {weekNumbers.length > 0 ? (
                      weekNumbers.map((w) => (
                        <SelectItem key={w} value={w.toString()}>
                          Week {w}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="1" disabled>No weeks available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Chart Tabs */}
          <Tabs defaultValue="bar" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="bar" data-testid="tab-bar-chart">Bar Chart</TabsTrigger>
              <TabsTrigger value="line" data-testid="tab-line-chart">Line Chart</TabsTrigger>
              <TabsTrigger value="summary" data-testid="tab-summary">Summary</TabsTrigger>
            </TabsList>

            {/* Bar Chart */}
            <TabsContent value="bar" className="space-y-4">
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={currentData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey={viewType === 'weekly' ? 'week' : 'month'} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Health" fill="#ef4444" />
                    <Bar dataKey="Relationship" fill="#3b82f6" />
                    <Bar dataKey="Career" fill="#a855f7" />
                    <Bar dataKey="Money" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            {/* Line Chart - Shows dots for single week, lines for multiple weeks */}
            <TabsContent value="line" className="space-y-4">
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={currentData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey={viewType === 'weekly' ? 'week' : 'month'} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="Health" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      dot={{ r: 4, fill: "#ef4444" }}
                      name="Health"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="Relationship" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ r: 4, fill: "#3b82f6" }}
                      name="Relationship"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="Career" 
                      stroke="#a855f7" 
                      strokeWidth={2}
                      dot={{ r: 4, fill: "#a855f7" }}
                      name="Career"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="Money" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={{ r: 4, fill: "#10b981" }}
                      name="Money"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            {/* Summary Tab */}
            <TabsContent value="summary" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['Health', 'Relationship', 'Career', 'Money'].map((category, idx) => {
                  const colors = ['from-red-500 to-orange-500', 'from-blue-500 to-cyan-500', 'from-purple-500 to-pink-500', 'from-green-500 to-emerald-500'];
                  
                  // Show specific week/month data instead of average
                  let progress = 0;
                  if (viewType === 'weekly') {
                    const weekData = currentData.find((d: any) => d.week === `W${selectedWeek}`);
                    progress = weekData ? (weekData[category as keyof typeof weekData] as number) : 0;
                  } else {
                    const monthData = currentData.find((d: any) => d.month === monthNames[selectedDate.getMonth()].substring(0, 3));
                    progress = monthData ? (monthData[category as keyof typeof monthData] as number) : 0;
                  }
                  
                  return (
                    <div key={category} className="p-6 bg-muted/30 rounded-lg space-y-3">
                      <h3 className="text-sm font-medium text-muted-foreground">{category}</h3>
                      <div className={`text-3xl font-bold bg-gradient-to-r ${colors[idx]} bg-clip-text text-transparent`}>
                        {Math.round(progress)}%
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div 
                          className={`h-full bg-gradient-to-r ${colors[idx]}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {viewType === 'weekly' ? `Week ${selectedWeek}` : monthNames[selectedDate.getMonth()]} Progress
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Overall Stats for specific period */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="text-center p-4 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {(() => {
                      let total = 0;
                      if (viewType === 'weekly') {
                        const weekData = currentData.find((d: any) => d.week === `W${selectedWeek}`);
                        if (weekData) {
                          total = Math.round(((weekData.Health as number) + (weekData.Relationship as number) + (weekData.Career as number) + (weekData.Money as number)) / 4);
                        }
                      } else {
                        const monthData = currentData.find((d: any) => d.month === monthNames[selectedDate.getMonth()].substring(0, 3));
                        if (monthData) {
                          total = Math.round(((monthData.Health as number) + (monthData.Relationship as number) + (monthData.Career as number) + (monthData.Money as number)) / 4);
                        }
                      }
                      return total;
                    })()}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Overall Progress</p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg">
                  <div className="text-2xl font-bold text-accent flex items-center justify-center gap-1">
                    <TrendingUp className="w-5 h-5" />
                    +12%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Growth</p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {viewType === 'weekly' ? `Week ${selectedWeek}` : monthNames[selectedDate.getMonth()]}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Selected Period</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
