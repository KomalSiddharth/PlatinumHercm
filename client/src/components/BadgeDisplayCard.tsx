import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
      const response = await apiRequest('POST', '/api/badges/check-platinum', {
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

  return (
    <Card className="bg-gradient-to-br from-black to-gray-900 dark:from-black dark:to-gray-950 border-yellow-600 dark:border-yellow-500 border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-500 dark:text-yellow-400">
          <Trophy className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />
          Achievements & Badges
        </CardTitle>
        <CardDescription className="text-yellow-600/80 dark:text-yellow-500/80">Track your platinum progress and badges</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Month Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-yellow-400 dark:text-yellow-300">Monthly Progress</span>
            <span className="text-sm font-bold text-yellow-500 dark:text-yellow-400">{progressPercentage.toFixed(0)}%</span>
          </div>
          <div className="h-3 bg-gray-800 dark:bg-gray-950 rounded-full overflow-hidden border-2 border-yellow-600/50 dark:border-yellow-500/50">
            <div 
              className={`h-full transition-all duration-500 ${
                progressPercentage > 80 
                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 dark:from-yellow-400 dark:to-yellow-500' 
                  : 'bg-gradient-to-r from-gray-600 to-gray-500 dark:from-gray-500 dark:to-gray-600'
              }`}
              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
            />
          </div>
          <p className="text-xs text-yellow-500/90 dark:text-yellow-400/90">
            {isEligible 
              ? '🎉 Eligible for Platinum Badge!' 
              : `${(80 - progressPercentage).toFixed(0)}% more for Platinum Badge`}
          </p>
        </div>

        {/* Badges Display */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium flex items-center gap-2 text-yellow-400 dark:text-yellow-300">
            <Sparkles className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />
            Earned Badges
          </h3>
          
          {isEligible && badgeData?.badge ? (
            <div 
              className="p-4 bg-gradient-to-r from-yellow-600/20 to-yellow-700/20 dark:from-yellow-500/20 dark:to-yellow-600/20 rounded-lg border-2 border-yellow-500 dark:border-yellow-400"
              data-testid="badge-platinum"
            >
              <div className="flex items-start gap-3">
                <Award className="h-8 w-8 text-yellow-500 dark:text-yellow-400 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-bold text-yellow-400 dark:text-yellow-300">
                    {badgeData.badge.name}
                  </h4>
                  <p className="text-xs text-yellow-500/90 dark:text-yellow-400/90 mt-1">
                    {badgeData.badge.description}
                  </p>
                  <Badge variant="secondary" className="mt-2 bg-yellow-600 dark:bg-yellow-700 text-white border-yellow-500">
                    <Star className="h-3 w-3 mr-1" />
                    {new Date(badgeData.badge.achievedAt).toLocaleDateString()}
                  </Badge>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 border-2 border-dashed border-yellow-600/50 dark:border-yellow-500/50 rounded-lg bg-gray-900/50 dark:bg-black/50">
              <Trophy className="h-12 w-12 mx-auto text-yellow-600/60 dark:text-yellow-500/60 mb-2" />
              <p className="text-sm text-yellow-500/80 dark:text-yellow-400/80">
                Achieve 80%+ monthly progress to earn Platinum Badge
              </p>
            </div>
          )}
        </div>

        {/* Leaderboard Section */}
        <div className="space-y-3 pt-4 border-t border-yellow-600/30 dark:border-yellow-500/30">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium flex items-center gap-2 text-yellow-400 dark:text-yellow-300">
              <Trophy className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />
              Leaderboard
            </h3>
            <Badge variant="outline" className="capitalize text-xs bg-yellow-600/20 dark:bg-yellow-500/20 text-yellow-400 dark:text-yellow-300 border-yellow-600/50 dark:border-yellow-500/50">
              This Week
            </Badge>
          </div>
          
          <div className="space-y-2">
            {leaderboardEntries.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-yellow-600/50 dark:border-yellow-500/50 rounded-lg bg-gray-900/50 dark:bg-black/50">
                <p className="text-sm text-yellow-500/80 dark:text-yellow-400/80">
                  No users yet. Be the first to earn points!
                </p>
              </div>
            ) : leaderboardEntries.length === 1 && leaderboardEntries[0].isCurrentUser ? (
              <div className="space-y-3">
                <div
                  className="flex items-center gap-3 p-3 rounded-lg bg-yellow-600/20 dark:bg-yellow-500/20 border border-yellow-500/50 dark:border-yellow-400/50"
                  data-testid="leaderboard-entry-1"
                >
                  <div className="w-8 text-center">
                    <Trophy className="w-5 h-5 text-yellow-500 dark:text-yellow-400 mx-auto" />
                  </div>

                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-yellow-600/30 dark:bg-yellow-500/30 text-yellow-400 dark:text-yellow-300 text-sm font-medium">
                      {leaderboardEntries[0].name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-yellow-400 dark:text-yellow-300 truncate">
                      {leaderboardEntries[0].name}
                      <span className="ml-2 text-xs text-yellow-500/80 dark:text-yellow-400/80 font-normal">(You)</span>
                    </p>
                  </div>

                  <Badge className="bg-gradient-to-r from-yellow-500 to-yellow-600 dark:from-yellow-400 dark:to-yellow-500 text-white gap-1 border-0">
                    <Trophy className="w-3 h-3" />
                    {leaderboardEntries[0].points.toLocaleString()}
                  </Badge>
                </div>
                <div className="text-center py-3 bg-gray-900/50 dark:bg-black/50 rounded-lg border border-dashed border-yellow-600/30 dark:border-yellow-500/30">
                  <p className="text-xs text-yellow-500/80 dark:text-yellow-400/80">
                    You're currently in 1st place! 🎉
                  </p>
                  <p className="text-xs text-yellow-500/70 dark:text-yellow-400/70 mt-1">
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
                      return <Trophy className="w-5 h-5 text-yellow-500 dark:text-yellow-400" />;
                    case 2:
                      return <Medal className="w-5 h-5 text-gray-400" />;
                    case 3:
                      return <Award className="w-5 h-5 text-amber-600" />;
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
                        ? 'bg-yellow-600/20 dark:bg-yellow-500/20 border border-yellow-500/50 dark:border-yellow-400/50' 
                        : 'bg-gray-900/50 dark:bg-black/50 border border-yellow-600/20 dark:border-yellow-500/20'
                    }`}
                    data-testid={`leaderboard-entry-${entry.rank}`}
                  >
                    <div className="w-8 text-center">
                      {medalIcon || (
                        <span className="text-sm font-semibold text-yellow-500/60 dark:text-yellow-400/60">
                          {entry.rank}
                        </span>
                      )}
                    </div>

                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-yellow-600/30 dark:bg-yellow-500/30 text-yellow-400 dark:text-yellow-300 text-sm font-medium">
                        {(entry.name || entry.email || 'U').split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${isCurrentUser ? 'text-yellow-400 dark:text-yellow-300' : 'text-yellow-500/90 dark:text-yellow-400/90'}`}>
                        {entry.name || entry.email || 'Unknown User'}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs text-yellow-500/80 dark:text-yellow-400/80 font-normal">(You)</span>
                        )}
                      </p>
                    </div>

                    <Badge className="bg-gradient-to-r from-yellow-500 to-yellow-600 dark:from-yellow-400 dark:to-yellow-500 text-white gap-1 border-0">
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
  );
}
