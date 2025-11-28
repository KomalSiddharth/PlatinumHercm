import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Award, Trophy, Star, Sparkles, Medal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface PlatinumBadge {
  id: string;
  name: string;
  achievedAt: string;
  description: string;
}

interface BadgeCheckResponse {
  eligible: boolean;
  progress: number;
  badge?: PlatinumBadge;
  alreadyAwarded?: boolean;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  email?: string;
  points: number;
  isCurrentUser?: boolean;
}

interface BadgeDisplayCardProps {
  leaderboardEntries?: LeaderboardEntry[];
  currentUserId?: string;
}

export default function BadgeDisplayCard({ leaderboardEntries = [], currentUserId }: BadgeDisplayCardProps) {
  const { toast } = useToast();
  const [badges, setBadges] = useState<PlatinumBadge[]>([]);
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // Check for platinum badge
  const { data: badgeData } = useQuery<BadgeCheckResponse>({
    queryKey: ['/api/badges/check-platinum', currentMonth, currentYear],
    queryFn: async () => {
      const response = await apiRequest('/api/badges/check-platinum', 'POST', {
        month: currentMonth,
        year: currentYear
      });
      return response.json();
    },
    refetchInterval: 30000, // Check every 30 seconds
  });

  useEffect(() => {
    if (badgeData?.badge && badgeData.eligible && !badgeData.alreadyAwarded) {
      // New badge earned!
      setBadges(prev => [...prev, badgeData.badge!]);
      toast({
        title: "🏆 Platinum Badge Earned!",
        description: `Congratulations! You achieved ${badgeData.progress.toFixed(0)}% monthly progress!`,
      });
    }
  }, [badgeData, toast]);

  const progressPercentage = badgeData?.progress || 0;
  const isEligible = badgeData?.eligible || false;
  // A user is "new" only if they have 0 weeks of data
  // Users with 1+ weeks should see progress, even if they haven't met the 4-week requirement
  const weeksCount = (badgeData as any)?.weeksCount ?? -1; // -1 means API didn't return this field (old response)
  const isNewUser = weeksCount === 0;

  return (
    <>
    <Card className="border-2" style={{ backgroundColor: '#00008c', borderColor: '#0000cc' }}>
      <CardHeader>
        <CardTitle className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Platinum Growth
        </CardTitle>
        <CardDescription className="text-white/80">Track your platinum progress and badges</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Show empty state for new users */}
        {isNewUser ? (
          <div className="text-center py-8 space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 mb-2">
              <Trophy className="h-8 w-8 text-white/60" />
            </div>
            <h3 className="text-lg font-semibold text-white">Start Your Journey!</h3>
            <p className="text-sm text-white/70 max-w-md mx-auto">
              Complete your weekly HRCM ratings and daily rituals to earn points and unlock achievements.
            </p>
            <div className="grid grid-cols-2 gap-3 mt-4 text-left max-w-md mx-auto">
              <div className="bg-white/10 p-3 rounded-lg">
                <p className="text-xs font-medium text-white mb-1">🎯 Goal</p>
                <p className="text-xs text-white/70">Maintain 8+ rating for 4 weeks</p>
              </div>
              <div className="bg-white/10 p-3 rounded-lg">
                <p className="text-xs font-medium text-white mb-1">🏆 Reward</p>
                <p className="text-xs text-white/70">Earn Platinum Badge</p>
              </div>
            </div>
          </div>
        ) : (
          /* Current Progress - Consecutive Weeks */
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white">Avg Rating (Last 4 Weeks)</span>
              <span className="text-sm font-bold text-white">{progressPercentage.toFixed(1)}/10</span>
            </div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden border-2 border-white/30">
              <div 
                className="h-full transition-all duration-500 bg-white"
                style={{ width: `${Math.min((progressPercentage / 10) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-white/70">
              {isEligible 
                ? '🎉 Eligible for Platinum Badge!' 
                : (badgeData as any)?.message || `Need 8+ rating for 4 consecutive weeks`}
            </p>
          </div>
        )}

        {/* Badges Display */}
        <div className="space-y-2 bg-white p-4 rounded-lg">
          <h3 className="text-sm font-medium flex items-center gap-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            <Sparkles className="h-4 w-4 text-primary" />
            Earned Badges
          </h3>
          
          {isEligible && badgeData?.badge ? (
            <div 
              className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200"
              data-testid="badge-platinum"
            >
              <div className="flex items-start gap-3">
                <Award className="h-8 w-8 text-primary flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-bold text-gray-800">
                    {badgeData.badge.name}
                  </h4>
                  <p className="text-xs text-gray-600 mt-1">
                    {badgeData.badge.description}
                  </p>
                  <Badge variant="secondary" className="mt-2 bg-gradient-to-r from-primary to-accent text-white border-0">
                    <Star className="h-3 w-3 mr-1" />
                    {new Date(badgeData.badge.achievedAt).toLocaleDateString()}
                  </Badge>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
              <Trophy className="h-12 w-12 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">
                Maintain 8+ rating for 4 consecutive weeks to earn Platinum Badge
              </p>
            </div>
          )}
        </div>

        {/* Leaderboard Section */}
        <div className="space-y-3 pt-4 border-t border-white/20">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium flex items-center gap-2 text-red-600">
              <Trophy className="h-4 w-4 text-red-600" />
              Leaderboard
            </h3>
            <Badge variant="outline" className="capitalize text-xs bg-white/10 text-white border-white/30">
              This Week
            </Badge>
          </div>
          
          <div className="space-y-2">
            {leaderboardEntries.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-white/30 rounded-lg bg-white/5">
                <p className="text-sm text-white/70">
                  No users yet. Be the first to earn points!
                </p>
              </div>
            ) : leaderboardEntries.length === 1 && leaderboardEntries[0].isCurrentUser ? (
              <div className="space-y-3">
                <div
                  className="flex items-center gap-3 p-3 rounded-lg bg-white border border-white/30"
                  data-testid="leaderboard-entry-1"
                >
                  <div className="w-8 text-center">
                    <Trophy className="w-5 h-5 text-primary mx-auto" />
                  </div>

                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-sm font-medium">
                      {leaderboardEntries[0].name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">
                      {leaderboardEntries[0].name}
                      <span className="ml-2 text-xs text-gray-600 font-normal">(You)</span>
                    </p>
                  </div>

                  <Badge className="bg-gradient-to-r from-primary to-accent text-white gap-1 border-0">
                    <Trophy className="w-3 h-3" />
                    {leaderboardEntries[0].points.toLocaleString()}
                  </Badge>
                </div>
                <div className="text-center py-3 bg-white/5 rounded-lg border border-dashed border-white/20">
                  <p className="text-xs text-white/80">
                    You're currently in 1st place! 🎉
                  </p>
                  <p className="text-xs text-white/60 mt-1">
                    Other users will appear here as they join and earn points
                  </p>
                </div>
              </div>
            ) : (
              leaderboardEntries.map((entry) => {
                const isCurrentUser = entry.userId === currentUserId || entry.isCurrentUser;
                const getMedalIcon = (rank: number) => {
                  switch (rank) {
                    case 1:
                      return <Trophy className="w-5 h-5 text-primary" />;
                    case 2:
                      return <Medal className="w-5 h-5 text-gray-400" />;
                    case 3:
                      return <Award className="w-5 h-5 text-accent" />;
                    default:
                      return null;
                  }
                };
                const medalIcon = getMedalIcon(entry.rank);

                return (
                  <div
                    key={entry.userId}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                      isCurrentUser 
                        ? 'bg-white border border-blue-400' 
                        : 'bg-white border border-gray-200'
                    }`}
                    data-testid={`leaderboard-entry-${entry.rank}`}
                  >
                    <div className="w-8 text-center">
                      {medalIcon || (
                        <span className="text-sm font-semibold text-gray-500">
                          {entry.rank}
                        </span>
                      )}
                    </div>

                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-sm font-medium">
                        {(entry.name || entry.email || 'U').split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${isCurrentUser ? 'text-gray-900' : 'text-gray-800'}`}>
                        {entry.name || entry.email || 'Unknown User'}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs text-gray-600 font-normal">(You)</span>
                        )}
                      </p>
                    </div>

                    <Badge className="bg-gradient-to-r from-primary to-accent text-white gap-1 border-0">
                      <Trophy className="w-3 h-3" />
                      {entry.points.toLocaleString()}
                    </Badge>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </CardContent>
    </Card>
    </>
  );
}
