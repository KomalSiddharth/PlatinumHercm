import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, Trophy, Star, Sparkles } from 'lucide-react';
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

export default function BadgeDisplayCard() {
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
    <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/40 dark:to-orange-950/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          Achievements & Badges
        </CardTitle>
        <CardDescription>Track your platinum progress and badges</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Month Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Monthly Progress</span>
            <span className="text-sm font-bold text-primary">{progressPercentage.toFixed(0)}%</span>
          </div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${
                progressPercentage > 80 
                  ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' 
                  : 'bg-gradient-to-r from-blue-400 to-blue-600'
              }`}
              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {isEligible 
              ? '🎉 Eligible for Platinum Badge!' 
              : `${(80 - progressPercentage).toFixed(0)}% more for Platinum Badge`}
          </p>
        </div>

        {/* Badges Display */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-yellow-500" />
            Earned Badges
          </h3>
          
          {isEligible && badgeData?.badge ? (
            <div 
              className="p-3 bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 rounded-lg border-2 border-yellow-400 dark:border-yellow-600"
              data-testid="badge-platinum"
            >
              <div className="flex items-start gap-3">
                <Award className="h-8 w-8 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-bold text-yellow-900 dark:text-yellow-100">
                    {badgeData.badge.name}
                  </h4>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                    {badgeData.badge.description}
                  </p>
                  <Badge variant="secondary" className="mt-2">
                    <Star className="h-3 w-3 mr-1" />
                    {new Date(badgeData.badge.achievedAt).toLocaleDateString()}
                  </Badge>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 border-2 border-dashed rounded-lg">
              <Trophy className="h-12 w-12 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-muted-foreground">
                Achieve 80%+ monthly progress to earn Platinum Badge
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
