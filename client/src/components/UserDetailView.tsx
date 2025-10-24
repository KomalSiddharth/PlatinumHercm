import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Calendar, Award, Activity, AlertCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface UserDetailViewProps {
  userId: string;
}

export default function UserDetailView({ userId }: UserDetailViewProps) {
  const { data: analytics, isLoading } = useQuery({
    queryKey: [`/api/admin/user/${userId}/detailed-analytics`],
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading user analytics...</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">No analytics data available</p>
      </div>
    );
  }

  const { user, progressSummary, emotionTrends, hrcmTrends, regularity, compactWeeklyData, badges, rituals } = analytics as any;

  return (
    <div className="space-y-6" data-testid="user-detail-view">
      {/* User Header with Gradient */}
      <div className="bg-gradient-to-r from-pink-500 to-blue-500 text-white p-6 rounded-lg">
        <h2 className="text-3xl font-bold mb-2" data-testid="user-detail-name">
          {user.firstName && user.lastName 
            ? `${user.firstName} ${user.lastName}` 
            : user.firstName || user.lastName || 'User Profile'}
        </h2>
        <p className="text-sm opacity-90" data-testid="user-detail-email">
          📧 {user.email || user.id}
        </p>
        <p className="text-xs opacity-75 mt-1">
          Complete progress report with HRCM analytics, trends, and achievements
        </p>
      </div>

      {/* Progress Report Summary */}
      {progressSummary && (
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Current Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold" data-testid="progress-current-week">
                Week {progressSummary.currentWeek}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                Overall Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold" data-testid="progress-overall-score">
                {progressSummary.overallScore}/10
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Achievement Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold" data-testid="progress-achievement-rate">
                {progressSummary.achievementRate}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-600" />
                Total Badges
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold" data-testid="progress-total-badges">
                {progressSummary.totalBadges}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* HRCM Rating Trends Graph - Stock Market Style */}
      {hrcmTrends.length > 0 ? (
        <Card className="border-2 border-blue-200 dark:border-blue-800 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-pink-100 to-blue-100 dark:from-pink-950 dark:to-blue-950">
            <CardTitle className="text-lg font-bold">📈 HRCM Growth & Loss Tracker</CardTitle>
            <p className="text-sm text-muted-foreground">
              Stock market style view: All 4 life areas tracked week by week
            </p>
          </CardHeader>
          <CardContent className="pt-6 bg-black dark:bg-black">
            <ResponsiveContainer width="100%" height={450}>
              <LineChart data={hrcmTrends} margin={{ top: 20, right: 40, left: 0, bottom: 20 }}>
                <defs>
                  <linearGradient id="healthGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="relationshipGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f472b6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f472b6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="careerGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fb923c" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#fb923c" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="moneyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a3e635" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#a3e635" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="1 1" stroke="#1f2937" opacity={0.3} vertical={false} />
                <XAxis 
                  dataKey="weekNumber" 
                  stroke="#4b5563"
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  axisLine={{ stroke: '#374151' }}
                />
                <YAxis 
                  domain={[0, 10]} 
                  ticks={[0, 2, 4, 6, 8, 10]}
                  stroke="#4b5563"
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  axisLine={{ stroke: '#374151' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#18181b', 
                    border: '1px solid #3f3f46',
                    borderRadius: '6px',
                    padding: '12px',
                    color: '#fff'
                  }}
                  labelStyle={{ color: '#a1a1aa', fontSize: '12px', marginBottom: '6px' }}
                  formatter={(value: any, name: string) => {
                    const nameMap: any = {
                      '💚 Health': `${value}/10`,
                      '❤️ Relationship': `${value}/10`,
                      '🌟 Career': `${value}/10`,
                      '💰 Money': `${value}/10`
                    };
                    return [nameMap[name] || `${value}/10`, name];
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '16px' }} 
                  iconType="line"
                  iconSize={18}
                />
                <Line 
                  type="monotone" 
                  dataKey="health" 
                  stroke="#22d3ee" 
                  name="💚 Health" 
                  strokeWidth={3}
                  dot={{ fill: '#22d3ee', r: 4 }}
                  activeDot={{ r: 7, fill: '#22d3ee', stroke: '#000', strokeWidth: 2 }}
                  strokeOpacity={1}
                />
                <Line 
                  type="monotone" 
                  dataKey="relationship" 
                  stroke="#f472b6" 
                  name="❤️ Relationship" 
                  strokeWidth={3}
                  dot={{ fill: '#f472b6', r: 4 }}
                  activeDot={{ r: 7, fill: '#f472b6', stroke: '#000', strokeWidth: 2 }}
                  strokeOpacity={1}
                />
                <Line 
                  type="monotone" 
                  dataKey="career" 
                  stroke="#fb923c" 
                  name="🌟 Career" 
                  strokeWidth={3}
                  dot={{ fill: '#fb923c', r: 4 }}
                  activeDot={{ r: 7, fill: '#fb923c', stroke: '#000', strokeWidth: 2 }}
                  strokeOpacity={1}
                />
                <Line 
                  type="monotone" 
                  dataKey="money" 
                  stroke="#a3e635" 
                  name="💰 Money" 
                  strokeWidth={3}
                  dot={{ fill: '#a3e635', r: 4 }}
                  activeDot={{ r: 7, fill: '#a3e635', stroke: '#000', strokeWidth: 2 }}
                  strokeOpacity={1}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 p-4 bg-zinc-900 rounded-lg border border-zinc-700">
              <div className="grid grid-cols-4 gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-cyan-400"></div>
                  <span className="text-gray-300 font-medium">💚 Health</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-pink-400"></div>
                  <span className="text-gray-300 font-medium">❤️ Relationship</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-400"></div>
                  <span className="text-gray-300 font-medium">🌟 Career</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-lime-400"></div>
                  <span className="text-gray-300 font-medium">💰 Money</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-zinc-700 flex items-center justify-between text-xs">
                <span className="text-green-400">📈 Growth = Lines going up</span>
                <span className="text-red-400">📉 Loss = Lines going down</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">No HRCM data available yet. Start tracking to see progress!</p>
          </CardContent>
        </Card>
      )}

      {/* Badges */}
      {badges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Achievements & Badges
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {badges.map((badge: any) => (
                <Badge key={badge.id} variant="secondary" className="text-sm">
                  {badge.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Compact Weekly Data - Only Week 1 and Most Recent */}
      <Card>
        <CardHeader>
          <CardTitle>Key Weeks Summary</CardTitle>
          <p className="text-sm text-muted-foreground">Comparing your first week with your most recent week</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Week</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-center">💚 H</TableHead>
                  <TableHead className="text-center">❤️ R</TableHead>
                  <TableHead className="text-center">💼 C</TableHead>
                  <TableHead className="text-center">💰 M</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                  <TableHead className="text-center">Achievement</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {compactWeeklyData.length > 0 && (
                  <>
                    {/* First Week */}
                    {(() => {
                      const firstWeek = compactWeeklyData[0];
                      return (
                        <TableRow key={`first-${firstWeek.week}`} data-testid={`compact-week-${firstWeek.week}`} className="bg-blue-50 dark:bg-blue-950/20">
                          <TableCell className="font-bold">Week {firstWeek.week}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(firstWeek.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-center font-medium">{firstWeek.h}</TableCell>
                          <TableCell className="text-center font-medium">{firstWeek.r}</TableCell>
                          <TableCell className="text-center font-medium">{firstWeek.c}</TableCell>
                          <TableCell className="text-center font-medium">{firstWeek.m}</TableCell>
                          <TableCell className="text-center font-bold">{firstWeek.score.toFixed(1)}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={firstWeek.achievement >= 70 ? 'default' : firstWeek.achievement >= 50 ? 'secondary' : 'destructive'}>
                              {firstWeek.achievement}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })()}
                    
                    {/* Most Recent Week (if different from first) */}
                    {compactWeeklyData.length > 1 && (() => {
                      const lastWeek = compactWeeklyData[compactWeeklyData.length - 1];
                      return (
                        <TableRow key={`latest-${lastWeek.week}`} data-testid={`compact-week-latest-${lastWeek.week}`} className="bg-green-50 dark:bg-green-950/20">
                          <TableCell className="font-bold">Week {lastWeek.week} (Latest)</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(lastWeek.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-center font-medium">{lastWeek.h}</TableCell>
                          <TableCell className="text-center font-medium">{lastWeek.r}</TableCell>
                          <TableCell className="text-center font-medium">{lastWeek.c}</TableCell>
                          <TableCell className="text-center font-medium">{lastWeek.m}</TableCell>
                          <TableCell className="text-center font-bold">{lastWeek.score.toFixed(1)}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={lastWeek.achievement >= 70 ? 'default' : lastWeek.achievement >= 50 ? 'secondary' : 'destructive'}>
                              {lastWeek.achievement}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })()}
                  </>
                )}
                {compactWeeklyData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No tracking data available yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 p-4 bg-muted rounded-lg text-sm">
            <p className="text-muted-foreground">
              <strong>Progress Snapshot:</strong> Compare where you started (blue) vs. where you are now (green). 
              Watch your scores improve over time! 🚀
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
