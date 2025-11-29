import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Target, Calendar, Trash2, Trophy, Sparkles, Heart, Briefcase, DollarSign, Activity } from 'lucide-react';
import { format, parseISO, isPast, isToday } from 'date-fns';
import type { GoalAffirmation } from '@shared/schema';

const categoryConfig: Record<string, { color: string; bgColor: string; icon: any; label: string }> = {
  health: { 
    color: 'text-green-600 dark:text-green-400', 
    bgColor: 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800',
    icon: Activity,
    label: 'Health'
  },
  relationship: { 
    color: 'text-pink-600 dark:text-pink-400', 
    bgColor: 'bg-pink-100 dark:bg-pink-900/30 border-pink-200 dark:border-pink-800',
    icon: Heart,
    label: 'Relationship'
  },
  career: { 
    color: 'text-blue-600 dark:text-blue-400', 
    bgColor: 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
    icon: Briefcase,
    label: 'Career'
  },
  money: { 
    color: 'text-amber-600 dark:text-amber-400', 
    bgColor: 'bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800',
    icon: DollarSign,
    label: 'Money'
  },
};

// Default config for goals without category
const defaultCategoryConfig = {
  color: 'text-purple-600 dark:text-purple-400',
  bgColor: 'bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800',
  icon: Sparkles,
  label: 'General'
};

export default function GoalsAffirmationsList() {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const { data: goals = [], isLoading } = useQuery<GoalAffirmation[]>({
    queryKey: ['/api/goals'],
  });

  const updateGoalMutation = useMutation({
    mutationFn: async ({ id, text }: { id: string; text: string }) => {
      const res = await apiRequest(`/api/goals/${id}`, 'PATCH', { text });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
      setEditingId(null);
      setEditingText('');
      toast({
        title: 'Goal Updated',
        description: 'Your goal has been updated successfully.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update goal',
        variant: 'destructive',
      });
    },
  });

  const toggleCompletionMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest(`/api/goals/${id}/complete`, 'PATCH');
      return await res.json();
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['/api/goals'] });
      const previousGoals = queryClient.getQueryData<GoalAffirmation[]>(['/api/goals']);
      
      queryClient.setQueryData<GoalAffirmation[]>(['/api/goals'], (old) =>
        old?.map((goal) =>
          goal.id === id ? { ...goal, completed: !goal.completed } : goal
        )
      );
      
      return { previousGoals };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(['/api/goals'], context?.previousGoals);
      toast({
        title: 'Error',
        description: 'Failed to update goal',
        variant: 'destructive',
      });
    },
    onSuccess: (data) => {
      if (data.completed) {
        toast({
          title: 'Goal Completed!',
          description: 'Congratulations on achieving your goal!',
        });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest(`/api/goals/${id}`, 'DELETE');
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
      toast({
        title: 'Goal Deleted',
        description: 'Your goal has been removed.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete goal',
        variant: 'destructive',
      });
    },
  });

  const getDateStatus = (targetDate: string | null) => {
    if (!targetDate) return null;
    const date = parseISO(targetDate);
    if (isToday(date)) return { text: 'Due Today', color: 'text-orange-600 dark:text-orange-400' };
    if (isPast(date)) return { text: 'Overdue', color: 'text-red-600 dark:text-red-400' };
    return { text: format(date, 'MMM d, yyyy'), color: 'text-muted-foreground' };
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const activeGoals = goals.filter(g => !g.completed);
  const completedGoals = goals.filter(g => g.completed);

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
            <Target className="w-5 h-5 text-white" />
          </div>
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Goals / Affirmations
          </span>
          {goals.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {completedGoals.length}/{goals.length} Complete
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {goals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No goals or affirmations yet.</p>
            <p className="text-sm">Click "Goals / Affirmations" in the header to add one!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeGoals.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Active Goals</h4>
                <div className="space-y-2">
                  {activeGoals.map((goal) => {
                    const config = goal.category ? (categoryConfig[goal.category] || defaultCategoryConfig) : defaultCategoryConfig;
                    const CategoryIcon = config.icon;
                    const dateStatus = getDateStatus(goal.targetDate);
                    const isEditing = editingId === goal.id;

                    return (
                      <div
                        key={goal.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border ${config.bgColor} transition-all hover:shadow-sm`}
                        data-testid={`goal-item-${goal.id}`}
                      >
                        <Checkbox
                          checked={goal.completed}
                          onCheckedChange={() => toggleCompletionMutation.mutate(goal.id)}
                          className="mt-1"
                          data-testid={`checkbox-goal-${goal.id}`}
                        />
                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <Textarea
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  if (editingText.trim() && editingText.trim() !== goal.text) {
                                    updateGoalMutation.mutate({ id: goal.id, text: editingText.trim() });
                                  } else {
                                    setEditingId(null);
                                    setEditingText('');
                                  }
                                }
                              }}
                              onBlur={() => {
                                setEditingId(null);
                                setEditingText('');
                              }}
                              className="min-h-[60px] resize-none text-sm"
                              autoFocus
                              data-testid={`input-edit-goal-${goal.id}`}
                            />
                          ) : (
                            <p
                              onClick={() => {
                                setEditingId(goal.id);
                                setEditingText(goal.text);
                              }}
                              className="text-sm font-medium leading-snug cursor-pointer hover:opacity-70 transition-opacity"
                              data-testid={`text-goal-${goal.id}`}
                            >
                              {goal.text}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge variant="outline" className={`${config.color} border-current text-xs`}>
                              <CategoryIcon className="w-3 h-3 mr-1" />
                              {config.label}
                            </Badge>
                            {dateStatus && (
                              <span className={`text-xs flex items-center gap-1 ${dateStatus.color}`}>
                                <Calendar className="w-3 h-3" />
                                {dateStatus.text}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteGoalMutation.mutate(goal.id)}
                          data-testid={`button-delete-goal-${goal.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {completedGoals.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  Completed Goals
                </h4>
                <div className="space-y-2">
                  {completedGoals.map((goal) => {
                    const config = goal.category ? (categoryConfig[goal.category] || defaultCategoryConfig) : defaultCategoryConfig;
                    const CategoryIcon = config.icon;
                    const isEditing = editingId === goal.id;

                    return (
                      <div
                        key={goal.id}
                        className="flex items-start gap-3 p-3 rounded-lg border bg-muted/50 border-muted transition-all"
                        data-testid={`goal-item-${goal.id}`}
                      >
                        <Checkbox
                          checked={goal.completed}
                          onCheckedChange={() => toggleCompletionMutation.mutate(goal.id)}
                          className="mt-1"
                          data-testid={`checkbox-goal-${goal.id}`}
                        />
                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <Textarea
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  if (editingText.trim() && editingText.trim() !== goal.text) {
                                    updateGoalMutation.mutate({ id: goal.id, text: editingText.trim() });
                                  } else {
                                    setEditingId(null);
                                    setEditingText('');
                                  }
                                }
                              }}
                              onBlur={() => {
                                setEditingId(null);
                                setEditingText('');
                              }}
                              className="min-h-[60px] resize-none text-sm"
                              autoFocus
                              data-testid={`input-edit-goal-${goal.id}`}
                            />
                          ) : (
                            <p className="text-sm font-medium leading-snug line-through text-muted-foreground cursor-pointer hover:opacity-70 transition-opacity"
                              onClick={() => {
                                setEditingId(goal.id);
                                setEditingText(goal.text);
                              }}
                              data-testid={`text-goal-${goal.id}`}
                            >
                              {goal.text}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30 text-xs">
                              <CategoryIcon className="w-3 h-3 mr-1" />
                              {config.label}
                            </Badge>
                            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs border-0">
                              <Trophy className="w-3 h-3 mr-1" />
                              Achieved!
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteGoalMutation.mutate(goal.id)}
                          data-testid={`button-delete-goal-${goal.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
