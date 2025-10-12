import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Trophy, Medal, Award } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  points: number;
  isCurrentUser?: boolean;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  period: 'week' | 'month';
  currentUserId?: string;
}

export default function Leaderboard({ entries, period, currentUserId }: LeaderboardProps) {
  const getMedalIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Leaderboard</CardTitle>
          <Badge variant="outline" className="capitalize">
            {period === 'week' ? 'This Week' : 'This Month'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {entries.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No users yet. Be the first to earn points!</p>
            </div>
          ) : entries.length === 1 && entries[0].isCurrentUser ? (
            <div className="space-y-4">
              <div
                className="flex items-center gap-3 p-3 rounded-lg border bg-primary/10 border-primary/20"
                data-testid="leaderboard-entry-1"
              >
                <div className="w-8 text-center">
                  <Trophy className="w-5 h-5 text-yellow-500 mx-auto" />
                </div>

                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-primary/20 text-primary text-sm font-medium">
                    {entries[0].name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-primary truncate">
                    {entries[0].name}
                    <span className="ml-2 text-xs text-primary font-normal">(You)</span>
                  </p>
                </div>

                <Badge className="bg-gradient-to-r from-primary to-accent text-white gap-1 border-0">
                  <Trophy className="w-3 h-3" />
                  {entries[0].points.toLocaleString()}
                </Badge>
              </div>
              <div className="text-center py-4 bg-muted/30 rounded-lg border border-dashed">
                <p className="text-sm text-muted-foreground">
                  You're currently in 1st place! 🎉
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Other users will appear here as they join and earn points
                </p>
              </div>
            </div>
          ) : (
            entries.map((entry) => {
            const isCurrentUser = entry.userId === currentUserId || entry.isCurrentUser;
            const medalIcon = getMedalIcon(entry.rank);

            return (
              <div
                key={entry.userId}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all hover-elevate ${
                  isCurrentUser ? 'bg-primary/10 border border-primary/20' : 'border border-transparent'
                }`}
                data-testid={`leaderboard-entry-${entry.rank}`}
              >
                <div className="w-8 text-center">
                  {medalIcon || (
                    <span className="text-sm font-semibold text-muted-foreground">
                      {entry.rank}
                    </span>
                  )}
                </div>

                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-primary/20 text-primary text-sm font-medium">
                    {(entry.name || entry.email || 'U').split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className={`font-medium truncate ${isCurrentUser ? 'text-primary' : 'text-foreground'}`}>
                    {entry.name || entry.email || 'Unknown User'}
                    {isCurrentUser && (
                      <span className="ml-2 text-xs text-primary font-normal">(You)</span>
                    )}
                  </p>
                </div>

                <Badge className="bg-gradient-to-r from-primary to-accent text-white gap-1 border-0">
                  <Trophy className="w-3 h-3" />
                  {entry.points.toLocaleString()}
                </Badge>
              </div>
            );
          }))}
        </div>
      </CardContent>
    </Card>
  );
}
