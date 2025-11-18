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
  const [viewType, setViewType] = useState<'monthly'>('monthly'); // Default to monthly view only

  // Fetch analytics data - no week filtering
  const { data: analyticsData, isLoading } = useQuery<{
    weeklyData?: Array<{ week: string; Health: number; Relationship: number; Career: number; Money: number }>;
    monthlyData?: Array<{ date: string; Health: number; Relationship: number; Career: number; Money: number }>;
  }>({
    queryKey: [`/api/analytics/progress?viewType=${viewType}&year=${selectedDate.getFullYear()}&month=${selectedDate.getMonth() + 1}`],
    enabled: open,
  });

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // Use REAL data from API - no fake fallback data
  const dailyData = analyticsData?.monthlyData || [];

  // Calculate monthly averages for bar chart
  const barChartData = dailyData.length > 0 ? [{
    category: monthNames[selectedDate.getMonth()],
    Health: Math.round(dailyData.reduce((sum: number, d: any) => sum + (d.Health || 0), 0) / dailyData.length),
    Relationship: Math.round(dailyData.reduce((sum: number, d: any) => sum + (d.Relationship || 0), 0) / dailyData.length),
    Career: Math.round(dailyData.reduce((sum: number, d: any) => sum + (d.Career || 0), 0) / dailyData.length),
    Money: Math.round(dailyData.reduce((sum: number, d: any) => sum + (d.Money || 0), 0) / dailyData.length),
  }] : [];

  // Debug logging
  console.log('[ANALYTICS DIALOG] isLoading:', isLoading);
  console.log('[ANALYTICS DIALOG] analyticsData:', analyticsData);
  console.log('[ANALYTICS DIALOG] dailyData:', dailyData);
  console.log('[ANALYTICS DIALOG] barChartData:', barChartData);

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
          {/* Controls - Month Selector Only */}
          <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Select Month:</span>
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
          </div>

          {/* Chart Tabs */}
          <Tabs defaultValue="bar" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="bar" data-testid="tab-bar-chart">Bar Chart</TabsTrigger>
              <TabsTrigger value="line" data-testid="tab-line-chart">Line Chart</TabsTrigger>
              <TabsTrigger value="summary" data-testid="tab-summary">Summary</TabsTrigger>
            </TabsList>

            {/* Bar Chart - Monthly Averages */}
            <TabsContent value="bar" className="space-y-4">
              {isLoading ? (
                <div className="h-96 flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
                    <p className="text-sm text-muted-foreground">Loading analytics...</p>
                  </div>
                </div>
              ) : barChartData.length === 0 ? (
                <div className="h-96 flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto opacity-50" />
                    <p className="text-lg font-semibold text-muted-foreground">No Data Available</p>
                    <p className="text-sm text-muted-foreground">Start tracking your HRCM progress to see analytics</p>
                  </div>
                </div>
              ) : (
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
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
              )}
            </TabsContent>

            {/* Line Chart - Daily Progress Trend */}
            <TabsContent value="line" className="space-y-4">
              {isLoading ? (
                <div className="h-96 flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
                    <p className="text-sm text-muted-foreground">Loading analytics...</p>
                  </div>
                </div>
              ) : dailyData.length === 0 ? (
                <div className="h-96 flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <TrendingUp className="w-16 h-16 text-muted-foreground mx-auto opacity-50" />
                    <p className="text-lg font-semibold text-muted-foreground">No Data Available</p>
                    <p className="text-sm text-muted-foreground">Start tracking your HRCM progress to see analytics</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Scroll instruction */}
                  <div className="flex items-center justify-between px-4 py-2 bg-muted/30 rounded-md">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      <span className="font-medium">Monthly Progress Trend</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Scroll horizontally to view complete month →
                    </p>
                  </div>
                  
                  {/* Scrollable chart container */}
                  <div className="h-96 overflow-x-auto overflow-y-hidden border rounded-lg bg-background">
                    <div style={{ width: `${Math.max(1200, dailyData.length * 40)}px`, height: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart 
                          data={dailyData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                          <XAxis 
                            dataKey="date" 
                            label={{ 
                              value: 'Day of Month', 
                              position: 'insideBottom', 
                              offset: -10,
                              style: { fontSize: '14px', fontWeight: 500 }
                            }}
                            tick={{ fontSize: 12 }}
                            interval={Math.floor(dailyData.length / 15)} // Show ~15 labels max
                            angle={0}
                            height={60}
                          />
                          <YAxis 
                            domain={[0, 100]} 
                            label={{ 
                              value: 'Progress %', 
                              angle: -90, 
                              position: 'insideLeft',
                              style: { fontSize: '14px', fontWeight: 500 }
                            }}
                            tick={{ fontSize: 12 }}
                          />
                          <Tooltip 
                            contentStyle={{
                              backgroundColor: 'hsl(var(--background))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                              padding: '12px'
                            }}
                            labelStyle={{ fontWeight: 600, marginBottom: '4px' }}
                            formatter={(value: any) => [`${value}%`, '']}
                            labelFormatter={(label) => `Day ${label}`}
                          />
                          <Legend 
                            wrapperStyle={{ paddingTop: '20px' }}
                            iconType="line"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="Health" 
                            stroke="#ef4444" 
                            strokeWidth={3}
                            dot={{ r: 3, fill: "#ef4444", strokeWidth: 2, stroke: "#fff" }}
                            activeDot={{ r: 6, strokeWidth: 2 }}
                            name="Health"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="Relationship" 
                            stroke="#3b82f6" 
                            strokeWidth={3}
                            dot={{ r: 3, fill: "#3b82f6", strokeWidth: 2, stroke: "#fff" }}
                            activeDot={{ r: 6, strokeWidth: 2 }}
                            name="Relationship"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="Career" 
                            stroke="#a855f7" 
                            strokeWidth={3}
                            dot={{ r: 3, fill: "#a855f7", strokeWidth: 2, stroke: "#fff" }}
                            activeDot={{ r: 6, strokeWidth: 2 }}
                            name="Career"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="Money" 
                            stroke="#10b981" 
                            strokeWidth={3}
                            dot={{ r: 3, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }}
                            activeDot={{ r: 6, strokeWidth: 2 }}
                            name="Money"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Summary Tab */}
            <TabsContent value="summary" className="space-y-4">
              {isLoading ? (
                <div className="h-96 flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
                    <p className="text-sm text-muted-foreground">Loading analytics...</p>
                  </div>
                </div>
              ) : dailyData.length === 0 ? (
                <div className="h-96 flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto opacity-50" />
                    <p className="text-lg font-semibold text-muted-foreground">No Data Available</p>
                    <p className="text-sm text-muted-foreground">Start tracking your HRCM progress to see analytics</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {['Health', 'Relationship', 'Career', 'Money'].map((category, idx) => {
                      const colors = ['from-red-500 to-orange-500', 'from-blue-500 to-cyan-500', 'from-purple-500 to-pink-500', 'from-green-500 to-emerald-500'];
                      
                      // Calculate average progress for the selected month
                      let progress = 0;
                      if (dailyData.length > 0) {
                        const categorySum = dailyData.reduce((sum: number, d: any) => sum + (d[category] || 0), 0);
                        progress = categorySum / dailyData.length;
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
                            {monthNames[selectedDate.getMonth()]} Progress
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Overall Stats for selected month */}
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                    <div className="text-center p-4 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg">
                      <div className="text-2xl font-bold text-primary">
                        {(() => {
                          if (dailyData.length === 0) return 0;
                          const avgHealth = dailyData.reduce((sum: number, d: any) => sum + (d.Health || 0), 0) / dailyData.length;
                          const avgRelationship = dailyData.reduce((sum: number, d: any) => sum + (d.Relationship || 0), 0) / dailyData.length;
                          const avgCareer = dailyData.reduce((sum: number, d: any) => sum + (d.Career || 0), 0) / dailyData.length;
                          const avgMoney = dailyData.reduce((sum: number, d: any) => sum + (d.Money || 0), 0) / dailyData.length;
                          return Math.round((avgHealth + avgRelationship + avgCareer + avgMoney) / 4);
                        })()}%
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Overall Progress</p>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg">
                      <div className="text-2xl font-bold text-accent flex items-center justify-center gap-1">
                        <TrendingUp className="w-5 h-5" />
                        {dailyData.length}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Days Tracked</p>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg">
                      <div className="text-2xl font-bold text-primary">
                        {monthNames[selectedDate.getMonth()]}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Selected Month</p>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
