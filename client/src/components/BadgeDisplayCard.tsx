import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Award, Trophy, Star, Sparkles, Medal, Crown } from 'lucide-react';
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

  const getMedalIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case 2:
        return <Medal className="w-4 h-4 text-gray-400" />;
      case 3:
        return <Award className="w-4 h-4 text-amber-600" />;
      default:
        return <span className="text-xs font-semibold text-yellow-600/60">{rank}</span>;
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-black to-gray-900 dark:from-black dark:to-gray-950 border-yellow-600 dark:border-yellow-500 border-2">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-yellow-500 dark:text-yellow-400 text-lg">
            <Trophy className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Current Month Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-yellow-400 dark:text-yellow-300">Monthly Progress</span>
              <span className="text-xs font-bold text-yellow-500 dark:text-yellow-400">{progressPercentage.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-gray-800 dark:bg-gray-950 rounded-full overflow-hidden border border-yellow-600/50 dark:border-yellow-500/50">
              <div 
                className={`h-full transition-all duration-500 ${
                  progressPercentage > 80 
                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 dark:from-yellow-400 dark:to-yellow-500' 
                    : 'bg-gradient-to-r from-gray-600 to-gray-500 dark:from-gray-500 dark:to-gray-600'
                }`}
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-yellow-500/90 dark:text-yellow-400/90">
              {isEligible 
                ? '🎉 Platinum Eligible!' 
                : `${(80 - progressPercentage).toFixed(0)}% to Platinum`}
            </p>
          </div>

          {/* Badges Display */}
          <div className="space-y-2">
            <h3 className="text-xs font-medium flex items-center gap-1 text-yellow-400 dark:text-yellow-300">
              <Sparkles className="h-3 w-3 text-yellow-500 dark:text-yellow-400" />
              Badges
            </h3>
            
            {isEligible && badgeData?.badge ? (
              <div 
                className="p-2 bg-gradient-to-r from-yellow-600/20 to-yellow-700/20 dark:from-yellow-500/20 dark:to-yellow-600/20 rounded-md border border-yellow-500 dark:border-yellow-400"
                data-testid="badge-platinum"
              >
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-yellow-500 dark:text-yellow-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-yellow-400 dark:text-yellow-300 truncate">
                      {badgeData.badge.name}
                    </h4>
                    <p className="text-[10px] text-yellow-500/90 dark:text-yellow-400/90">
                      {new Date(badgeData.badge.achievedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-3 border border-dashed border-yellow-600/50 dark:border-yellow-500/50 rounded-md bg-gray-900/50 dark:bg-black/50">
                <Trophy className="h-6 w-6 mx-auto text-yellow-600/60 dark:text-yellow-500/60 mb-1" />
                <p className="text-[10px] text-yellow-500/80 dark:text-yellow-400/80">
                  80%+ for Platinum
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard */}
      <Card className="bg-gradient-to-br from-black to-gray-900 dark:from-black dark:to-gray-950 border-yellow-600 dark:border-yellow-500 border-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-yellow-500 dark:text-yellow-400 text-lg">
              <Trophy className="h-5 w-5" />
              Leaderboard
            </CardTitle>
            <Badge variant="outline" className="text-[10px] border-yellow-600/50 text-yellow-500">
              Top 5
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {leaderboardEntries.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-[10px] text-yellow-500/60">No entries yet</p>
              </div>
            ) : leaderboardEntries.slice(0, 5).map((entry) => {
              const isCurrentUser = entry.userId === currentUserId || entry.isCurrentUser;
              return (
                <div
                  key={entry.userId}
                  className={`flex items-center gap-2 p-2 rounded-md transition-all ${
                    isCurrentUser ? 'bg-yellow-600/20 border border-yellow-600/30' : 'hover:bg-gray-800/50'
                  }`}
                  data-testid={`leaderboard-entry-${entry.rank}`}
                >
                  <div className="w-5 flex items-center justify-center">
                    {getMedalIcon(entry.rank)}
                  </div>

                  <Avatar className="w-6 h-6">
                    <AvatarFallback className={`text-[10px] ${isCurrentUser ? 'bg-yellow-600/30 text-yellow-400' : 'bg-gray-700 text-gray-400'}`}>
                      {(entry.name || entry.email || 'U').split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium truncate ${isCurrentUser ? 'text-yellow-400' : 'text-gray-300'}`}>
                      {entry.name || entry.email || 'Unknown'}
                      {isCurrentUser && <span className="ml-1 text-[10px]">(You)</span>}
                    </p>
                  </div>

                  <Badge className="bg-yellow-600/30 text-yellow-400 border-yellow-600/50 text-[10px] px-1.5 py-0">
                    {entry.points}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
