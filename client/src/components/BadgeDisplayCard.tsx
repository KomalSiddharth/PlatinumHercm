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
    <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-900 dark:text-yellow-100">
          <Trophy className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          Achievements & Badges
        </CardTitle>
        <CardDescription className="text-yellow-700 dark:text-yellow-300">Track your platinum progress and badges</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Month Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Monthly Progress</span>
            <span className="text-sm font-bold text-yellow-700 dark:text-yellow-300">{progressPercentage.toFixed(0)}%</span>
          </div>
          <div className="h-3 bg-yellow-200/50 dark:bg-yellow-950/50 rounded-full overflow-hidden border border-yellow-300 dark:border-yellow-700">
            <div 
              className={`h-full transition-all duration-500 ${
                progressPercentage > 80 
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500 dark:from-yellow-500 dark:to-orange-600' 
                  : 'bg-gradient-to-r from-blue-400 to-blue-600 dark:from-blue-500 dark:to-blue-700'
              }`}
              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
            />
          </div>
          <p className="text-xs text-yellow-600 dark:text-yellow-400">
            {isEligible 
              ? '🎉 Eligible for Platinum Badge!' 
              : `${(80 - progressPercentage).toFixed(0)}% more for Platinum Badge`}
          </p>
        </div>

        {/* Badges Display */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
            <Sparkles className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            Earned Badges
          </h3>
          
          {isEligible && badgeData?.badge ? (
            <div 
              className="p-4 bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/40 dark:to-orange-900/40 rounded-lg border-2 border-yellow-500 dark:border-yellow-600"
              data-testid="badge-platinum"
            >
              <div className="flex items-start gap-3">
                <Award className="h-8 w-8 text-yellow-600 dark:text-yellow-300 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-bold text-yellow-900 dark:text-yellow-100">
                    {badgeData.badge.name}
                  </h4>
                  <p className="text-xs text-yellow-800 dark:text-yellow-200 mt-1">
                    {badgeData.badge.description}
                  </p>
                  <Badge variant="secondary" className="mt-2 bg-yellow-200 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100">
                    <Star className="h-3 w-3 mr-1" />
                    {new Date(badgeData.badge.achievedAt).toLocaleDateString()}
                  </Badge>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 border-2 border-dashed border-yellow-300 dark:border-yellow-700 rounded-lg bg-yellow-50/50 dark:bg-yellow-950/20">
              <Trophy className="h-12 w-12 mx-auto text-yellow-400 dark:text-yellow-600 mb-2" />
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Achieve 80%+ monthly progress to earn Platinum Badge
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
