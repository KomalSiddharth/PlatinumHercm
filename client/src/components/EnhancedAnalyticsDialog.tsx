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

export function EnhancedAnalyticsDialog({ open, onOpenChange, currentWeek }: EnhancedAnalyticsDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewType, setViewType] = useState<'weekly' | 'monthly'>('weekly');
  const [selectedWeek, setSelectedWeek] = useState<number>(currentWeek);

  // Fetch analytics data
  const { data: analyticsData, isLoading } = useQuery<{
    weeklyData?: Array<{ week: string; Health: number; Relationship: number; Career: number; Money: number }>;
    monthlyData?: Array<{ month: string; Health: number; Relationship: number; Career: number; Money: number }>;
  }>({
    queryKey: ['/api/analytics/progress', viewType, selectedDate.getFullYear(), selectedDate.getMonth() + 1, selectedWeek],
    enabled: open,
  });

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // Generate weekly data for bar/line charts
  const weeklyData = analyticsData?.weeklyData || [
    { week: 'W1', Health: 65, Relationship: 70, Career: 75, Money: 60 },
    { week: 'W2', Health: 70, Relationship: 75, Career: 80, Money: 65 },
    { week: 'W3', Health: 75, Relationship: 80, Career: 85, Money: 70 },
    { week: 'W4', Health: 80, Relationship: 85, Career: 90, Money: 75 },
  ];

  // Generate monthly data
  const monthlyData = analyticsData?.monthlyData || [
    { month: 'Jan', Health: 70, Relationship: 75, Career: 80, Money: 65 },
    { month: 'Feb', Health: 72, Relationship: 77, Career: 82, Money: 68 },
    { month: 'Mar', Health: 75, Relationship: 80, Career: 85, Money: 72 },
    { month: 'Apr', Health: 78, Relationship: 83, Career: 88, Money: 75 },
  ];

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

            {/* Month Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-64" data-testid="button-select-month">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, 'MMMM yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {/* Week Selector (for weekly view) */}
            {viewType === 'weekly' && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Week:</span>
                <Select value={selectedWeek.toString()} onValueChange={(v) => setSelectedWeek(Number(v))}>
                  <SelectTrigger className="w-24" data-testid="select-week">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((w) => (
                      <SelectItem key={w} value={w.toString()}>
                        Week {w}
                      </SelectItem>
                    ))}
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
                    <YAxis />
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

            {/* Line Chart */}
            <TabsContent value="line" className="space-y-4">
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={currentData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey={viewType === 'weekly' ? 'week' : 'month'} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="Health" stroke="#ef4444" strokeWidth={2} />
                    <Line type="monotone" dataKey="Relationship" stroke="#3b82f6" strokeWidth={2} />
                    <Line type="monotone" dataKey="Career" stroke="#a855f7" strokeWidth={2} />
                    <Line type="monotone" dataKey="Money" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            {/* Summary Tab */}
            <TabsContent value="summary" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['Health', 'Relationship', 'Career', 'Money'].map((category, idx) => {
                  const colors = ['from-red-500 to-orange-500', 'from-blue-500 to-cyan-500', 'from-purple-500 to-pink-500', 'from-green-500 to-emerald-500'];
                  const avgProgress = Math.round(currentData.reduce((sum: number, d: any) => sum + (d[category as keyof typeof d] as number), 0) / currentData.length);
                  
                  return (
                    <div key={category} className="p-6 bg-muted/30 rounded-lg space-y-3">
                      <h3 className="text-sm font-medium text-muted-foreground">{category}</h3>
                      <div className={`text-3xl font-bold bg-gradient-to-r ${colors[idx]} bg-clip-text text-transparent`}>
                        {avgProgress}%
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div 
                          className={`h-full bg-gradient-to-r ${colors[idx]}`}
                          style={{ width: `${avgProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {viewType === 'weekly' ? 'Weekly' : 'Monthly'} Average
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Overall Stats */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="text-center p-4 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {Math.round(currentData.reduce((sum: number, d: any) => sum + (d.Health as number) + (d.Relationship as number) + (d.Career as number) + (d.Money as number), 0) / (currentData.length * 4))}%
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
                    {currentData.length}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{viewType === 'weekly' ? 'Weeks' : 'Months'} Tracked</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
