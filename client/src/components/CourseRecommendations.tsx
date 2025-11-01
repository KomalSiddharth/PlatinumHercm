import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Check, BookOpen, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';

interface Recommendation {
  id: string;
  userId: string;
  adminId: string;
  hrcmArea: string;
  courseId: string;
  courseName: string;
  lessonId?: string;
  lessonName?: string;
  lessonUrl?: string;
  reason?: string;
  status: string;
  createdAt: string;
  userEmail?: string;
}

interface CourseRecommendationsProps {
  currentWeek?: number;
}

export function CourseRecommendations({ currentWeek = 1 }: CourseRecommendationsProps) {
  const { toast } = useToast();

  const { data: recommendations = [], isLoading } = useQuery<Recommendation[]>({
    queryKey: ['/api/user/recommendations'],
  });

  const acceptMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('POST', `/api/user/recommendations/${id}/accept`, { weekNumber: currentWeek });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hercm/weeks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hercm/week', currentWeek] });
      queryClient.invalidateQueries({ queryKey: ['/api/persistent-assignments'] }); // Instant update fix
      toast({ 
        title: "Recommendation Accepted", 
        description: "The course has been added to your Assignment section" 
      });
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to accept recommendation", 
        variant: "destructive" 
      });
    }
  });

  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('POST', `/api/user/recommendations/${id}/dismiss`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/recommendations'] });
      toast({ 
        title: "Recommendation Dismissed", 
        description: "The recommendation has been removed" 
      });
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to dismiss recommendation", 
        variant: "destructive" 
      });
    }
  });

  if (isLoading) {
    return null;
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <CardTitle>Course Recommendations for You</CardTitle>
          </div>
          <CardDescription>
            Your admin has recommended these courses to help you improve
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recommendations.map((rec) => (
              <div 
                key={rec.id} 
                className="p-4 bg-background rounded-lg border border-border"
                data-testid={`recommendation-${rec.id}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen className="w-4 h-4 text-primary" />
                      <h4 className="font-semibold" data-testid="recommendation-course-name">
                        {rec.courseName}
                      </h4>
                      <Badge variant="outline" className="capitalize" data-testid="recommendation-area">
                        {rec.hrcmArea}
                      </Badge>
                    </div>
                    {rec.reason && (
                      <p className="text-sm text-muted-foreground" data-testid="recommendation-reason">
                        {rec.reason}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => acceptMutation.mutate(rec.id)}
                      disabled={acceptMutation.isPending || dismissMutation.isPending}
                      data-testid={`button-accept-${rec.id}`}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => dismissMutation.mutate(rec.id)}
                      disabled={acceptMutation.isPending || dismissMutation.isPending}
                      data-testid={`button-dismiss-${rec.id}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
