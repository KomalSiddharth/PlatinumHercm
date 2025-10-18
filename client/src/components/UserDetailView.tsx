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

      {/* Emotion Trends Graph */}
      {emotionTrends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Emotion Trends (1-10 Scale)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={emotionTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="weekNumber" label={{ value: 'Week Number', position: 'insideBottom', offset: -5 }} />
                <YAxis domain={[0, 10]} label={{ value: 'Emotion Score', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="healthEmotion" stroke="#10b981" name="Health" strokeWidth={2} />
                <Line type="monotone" dataKey="relationshipEmotion" stroke="#f59e0b" name="Relationship" strokeWidth={2} />
                <Line type="monotone" dataKey="careerEmotion" stroke="#3b82f6" name="Career" strokeWidth={2} />
                <Line type="monotone" dataKey="moneyEmotion" stroke="#8b5cf6" name="Money" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* HRCM Rating Trends Graph - Enhanced */}
      {hrcmTrends.length > 0 ? (
        <Card className="border-2 border-blue-200 dark:border-blue-800">
          <CardHeader className="bg-gradient-to-r from-pink-100 to-blue-100 dark:from-pink-950 dark:to-blue-950">
            <CardTitle className="text-lg font-bold">📊 HRCM Rating & Progress Trends</CardTitle>
            <p className="text-sm text-muted-foreground">
              Track ratings across Health, Relationship, Career, and Money (out of 10)
            </p>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={hrcmTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="weekNumber" 
                  label={{ value: 'Week Number', position: 'insideBottom', offset: -5 }} 
                  stroke="#6b7280"
                />
                <YAxis 
                  domain={[0, 10]} 
                  label={{ value: 'Rating (out of 10)', angle: -90, position: 'insideLeft' }} 
                  stroke="#6b7280"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '12px'
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Line 
                  type="monotone" 
                  dataKey="health" 
                  stroke="#10b981" 
                  name="💚 Health" 
                  strokeWidth={3}
                  dot={{ fill: '#10b981', r: 5 }}
                  activeDot={{ r: 7 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="relationship" 
                  stroke="#ec4899" 
                  name="❤️ Relationship" 
                  strokeWidth={3}
                  dot={{ fill: '#ec4899', r: 5 }}
                  activeDot={{ r: 7 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="career" 
                  stroke="#3b82f6" 
                  name="💼 Career" 
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', r: 5 }}
                  activeDot={{ r: 7 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="money" 
                  stroke="#8b5cf6" 
                  name="💰 Money" 
                  strokeWidth={3}
                  dot={{ fill: '#8b5cf6', r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
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

      {/* Compact Weekly Data */}
      <Card>
        <CardHeader>
          <CardTitle>All Weeks Data (Compact Format)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Week</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-center">H</TableHead>
                  <TableHead className="text-center">R</TableHead>
                  <TableHead className="text-center">C</TableHead>
                  <TableHead className="text-center">M</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                  <TableHead className="text-center">Achievement</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {compactWeeklyData.map((week: any) => (
                  <TableRow key={week.week} data-testid={`compact-week-${week.week}`}>
                    <TableCell className="font-medium">Week {week.week}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(week.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-center">{week.h}</TableCell>
                    <TableCell className="text-center">{week.r}</TableCell>
                    <TableCell className="text-center">{week.c}</TableCell>
                    <TableCell className="text-center">{week.m}</TableCell>
                    <TableCell className="text-center font-semibold">{week.score}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={week.achievement >= 70 ? 'default' : week.achievement >= 50 ? 'secondary' : 'destructive'}>
                        {week.achievement}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
