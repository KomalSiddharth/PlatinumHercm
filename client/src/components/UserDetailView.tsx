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
        <div className="grid md:grid-cols-5 gap-4">
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
                <Activity className="w-4 h-4 text-orange-600" />
                Current Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold" data-testid="progress-current-streak">
                {progressSummary.currentStreak} weeks
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

      {/* Regularity/Irregularity Tracking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Activity Regularity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completion Rate</p>
                <p className="text-2xl font-bold" data-testid="regularity-percentage">
                  {regularity.percentage}%
                </p>
              </div>
              <Badge 
                variant={regularity.status === 'regular' ? 'default' : regularity.status === 'semi-regular' ? 'secondary' : 'destructive'}
                data-testid="regularity-status"
              >
                {regularity.status === 'regular' ? 'Regular' : regularity.status === 'semi-regular' ? 'Semi-Regular' : 'Irregular'}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total Weeks</p>
                <p className="font-semibold" data-testid="regularity-total-weeks">{regularity.totalWeeks}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Expected Weeks</p>
                <p className="font-semibold" data-testid="regularity-expected-weeks">{regularity.expectedWeeks}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Missed Weeks</p>
                <p className="font-semibold text-destructive" data-testid="regularity-missed-weeks">
                  {regularity.missedWeeks}
                </p>
              </div>
            </div>

            {regularity.gaps.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  Activity Gaps
                </p>
                <div className="space-y-2">
                  {regularity.gaps.map((gap: any, idx: number) => (
                    <div key={idx} className="text-sm p-2 bg-muted rounded-lg">
                      <span className="text-muted-foreground">
                        {gap.gapSize} week{gap.gapSize > 1 ? 's' : ''} gap between Week {gap.afterWeek} and Week {gap.beforeWeek}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Emotion Trends Graph - Stock Market Style */}
      {emotionTrends.length > 0 && (
        <Card className="border-2 border-purple-200 dark:border-purple-800">
          <CardHeader className="bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-950 dark:to-purple-950">
            <CardTitle className="text-lg font-bold">💝 Emotional Market Tracker</CardTitle>
            <p className="text-sm text-muted-foreground">
              Track how you feel across all 4 life areas - Stock market style
            </p>
          </CardHeader>
          <CardContent className="pt-6 bg-gradient-to-b from-purple-50 to-white dark:from-purple-950 dark:to-slate-950">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={emotionTrends} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                <defs>
                  <linearGradient id="healthEmotionGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="relationshipEmotionGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="careerEmotionGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="moneyEmotionGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" opacity={0.5} />
                <XAxis 
                  dataKey="weekNumber" 
                  label={{ value: 'Week Number', position: 'insideBottom', offset: -10, style: { fontWeight: 'bold' } }} 
                  stroke="#374151"
                  tick={{ fill: '#6b7280' }}
                />
                <YAxis 
                  domain={[1, 10]} 
                  ticks={[1, 3, 5, 7, 10]}
                  label={{ value: 'Emotional State', angle: -90, position: 'insideLeft', style: { fontWeight: 'bold' } }} 
                  stroke="#374151"
                  tick={{ fill: '#6b7280' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.9)', 
                    border: 'none',
                    borderRadius: '8px',
                    padding: '16px',
                    color: '#fff'
                  }}
                  labelStyle={{ color: '#fff', fontWeight: 'bold', marginBottom: '8px' }}
                  formatter={(value: any, name: string) => {
                    const emotions = ['😞', '😐', '🙂', '😊', '😄'];
                    const emojiIndex = Math.min(Math.floor((value - 1) / 2.5), 4);
                    return [`${value}/10 ${emotions[emojiIndex]}`, name];
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }} 
                  iconType="line"
                  iconSize={20}
                />
                <Line 
                  type="monotone" 
                  dataKey="healthEmotion" 
                  stroke="#10b981" 
                  name="💚 Health" 
                  strokeWidth={3}
                  dot={{ fill: '#10b981', r: 5, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 7, strokeWidth: 3 }}
                  fill="url(#healthEmotionGradient)"
                />
                <Line 
                  type="monotone" 
                  dataKey="relationshipEmotion" 
                  stroke="#ec4899" 
                  name="❤️ Relationship" 
                  strokeWidth={3}
                  dot={{ fill: '#ec4899', r: 5, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 7, strokeWidth: 3 }}
                  fill="url(#relationshipEmotionGradient)"
                />
                <Line 
                  type="monotone" 
                  dataKey="careerEmotion" 
                  stroke="#f59e0b" 
                  name="🌟 Career" 
                  strokeWidth={3}
                  dot={{ fill: '#f59e0b', r: 5, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 7, strokeWidth: 3 }}
                  fill="url(#careerEmotionGradient)"
                />
                <Line 
                  type="monotone" 
                  dataKey="moneyEmotion" 
                  stroke="#8b5cf6" 
                  name="💰 Money" 
                  strokeWidth={3}
                  dot={{ fill: '#8b5cf6', r: 5, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 7, strokeWidth: 3 }}
                  fill="url(#moneyEmotionGradient)"
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 rounded-lg border-2 border-purple-200 dark:border-purple-800">
              <p className="font-bold mb-3 text-base flex items-center gap-2">
                <span>💝</span> How to Read Your Emotional Market
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded-full bg-green-500 mt-0.5"></div>
                  <div>
                    <p className="font-semibold text-green-700 dark:text-green-400">Health Feelings</p>
                    <p className="text-xs text-muted-foreground">Body & mind emotions</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded-full bg-pink-500 mt-0.5"></div>
                  <div>
                    <p className="font-semibold text-pink-700 dark:text-pink-400">Love Feelings</p>
                    <p className="text-xs text-muted-foreground">Relationship emotions</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded-full bg-amber-500 mt-0.5"></div>
                  <div>
                    <p className="font-semibold text-amber-700 dark:text-amber-400">Work Feelings</p>
                    <p className="text-xs text-muted-foreground">Career satisfaction</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded-full bg-purple-500 mt-0.5"></div>
                  <div>
                    <p className="font-semibold text-purple-700 dark:text-purple-400">Money Feelings</p>
                    <p className="text-xs text-muted-foreground">Financial emotions</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-purple-300 dark:border-purple-700 space-y-2">
                <p className="text-xs text-muted-foreground">
                  <strong>📈 Rising Lines =</strong> Feeling better, more positive emotions
                </p>
                <p className="text-xs text-muted-foreground">
                  <strong>📉 Falling Lines =</strong> Feeling worse, need attention
                </p>
                <p className="text-xs text-muted-foreground font-semibold text-purple-700 dark:text-purple-400">
                  Target: Keep all lines above 7 for consistent happiness! 😊
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* HRCM Rating Trends Graph - Stock Market Style */}
      {hrcmTrends.length > 0 ? (
        <Card className="border-2 border-blue-200 dark:border-blue-800">
          <CardHeader className="bg-gradient-to-r from-pink-100 to-blue-100 dark:from-pink-950 dark:to-blue-950">
            <CardTitle className="text-lg font-bold">📈 HRCM Growth & Loss Tracker</CardTitle>
            <p className="text-sm text-muted-foreground">
              Stock market style view: All 4 life areas tracked week by week
            </p>
          </CardHeader>
          <CardContent className="pt-6 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={hrcmTrends} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                <defs>
                  <linearGradient id="healthGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="relationshipGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="careerGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="moneyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" opacity={0.5} />
                <XAxis 
                  dataKey="weekNumber" 
                  label={{ value: 'Week Number', position: 'insideBottom', offset: -10, style: { fontWeight: 'bold' } }} 
                  stroke="#374151"
                  tick={{ fill: '#6b7280' }}
                />
                <YAxis 
                  domain={[0, 10]} 
                  ticks={[0, 2, 4, 6, 8, 10]}
                  label={{ value: 'Performance Rating', angle: -90, position: 'insideLeft', style: { fontWeight: 'bold' } }} 
                  stroke="#374151"
                  tick={{ fill: '#6b7280' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.9)', 
                    border: 'none',
                    borderRadius: '8px',
                    padding: '16px',
                    color: '#fff'
                  }}
                  labelStyle={{ color: '#fff', fontWeight: 'bold', marginBottom: '8px' }}
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
                  wrapperStyle={{ paddingTop: '20px' }} 
                  iconType="line"
                  iconSize={20}
                />
                <Line 
                  type="monotone" 
                  dataKey="health" 
                  stroke="#10b981" 
                  name="💚 Health" 
                  strokeWidth={3}
                  dot={{ fill: '#10b981', r: 5, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 7, strokeWidth: 3 }}
                  fill="url(#healthGradient)"
                />
                <Line 
                  type="monotone" 
                  dataKey="relationship" 
                  stroke="#ec4899" 
                  name="❤️ Relationship" 
                  strokeWidth={3}
                  dot={{ fill: '#ec4899', r: 5, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 7, strokeWidth: 3 }}
                  fill="url(#relationshipGradient)"
                />
                <Line 
                  type="monotone" 
                  dataKey="career" 
                  stroke="#f59e0b" 
                  name="🌟 Career" 
                  strokeWidth={3}
                  dot={{ fill: '#f59e0b', r: 5, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 7, strokeWidth: 3 }}
                  fill="url(#careerGradient)"
                />
                <Line 
                  type="monotone" 
                  dataKey="money" 
                  stroke="#8b5cf6" 
                  name="💰 Money" 
                  strokeWidth={3}
                  dot={{ fill: '#8b5cf6', r: 5, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 7, strokeWidth: 3 }}
                  fill="url(#moneyGradient)"
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg border-2 border-blue-200 dark:border-blue-800">
              <p className="font-bold mb-3 text-base flex items-center gap-2">
                <span>📊</span> Reading Your Growth & Loss Chart
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded-full bg-green-500 mt-0.5"></div>
                  <div>
                    <p className="font-semibold text-green-700 dark:text-green-400">Health</p>
                    <p className="text-xs text-muted-foreground">Physical & mental wellness</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded-full bg-pink-500 mt-0.5"></div>
                  <div>
                    <p className="font-semibold text-pink-700 dark:text-pink-400">Relationship</p>
                    <p className="text-xs text-muted-foreground">Connections & love</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded-full bg-amber-500 mt-0.5"></div>
                  <div>
                    <p className="font-semibold text-amber-700 dark:text-amber-400">Career</p>
                    <p className="text-xs text-muted-foreground">Professional growth</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded-full bg-purple-500 mt-0.5"></div>
                  <div>
                    <p className="font-semibold text-purple-700 dark:text-purple-400">Money</p>
                    <p className="text-xs text-muted-foreground">Financial stability</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-blue-300 dark:border-blue-700">
                <p className="text-xs text-muted-foreground">
                  <strong>Like Stock Trading:</strong> Lines going up 📈 = Growth. Lines going down 📉 = Loss. 
                  Track which areas are trending up or down to focus your efforts!
                </p>
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
