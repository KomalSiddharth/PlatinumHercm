import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Target, Calendar, Heart, Briefcase, DollarSign, Activity, Trophy, X } from 'lucide-react';
import { format, parseISO, isPast, isToday } from 'date-fns';
import type { GoalAffirmation } from '@shared/schema';

interface TeamGoalsViewerProps {
  goals: GoalAffirmation[];
}

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

const defaultCategoryConfig = {
  color: 'text-purple-600 dark:text-purple-400',
  bgColor: 'bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800',
  icon: Target,
  label: 'General'
};

export default function TeamGoalsViewer({ goals }: TeamGoalsViewerProps) {
  const [selectedGoal, setSelectedGoal] = useState<GoalAffirmation | null>(null);

  const getDateStatus = (targetDate: string | null) => {
    if (!targetDate) return null;
    const date = parseISO(targetDate);
    if (isToday(date)) return { text: 'Due Today', color: 'text-orange-600 dark:text-orange-400' };
    if (isPast(date)) return { text: 'Overdue', color: 'text-red-600 dark:text-red-400' };
    return { text: format(date, 'MMM d, yyyy'), color: 'text-muted-foreground' };
  };

  const activeGoals = goals.filter(g => !g.completed);
  const completedGoals = goals.filter(g => g.completed);

  return (
    <>
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
              <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No goals or affirmations yet.</p>
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

                      return (
                        <div
                          key={goal.id}
                          onClick={() => setSelectedGoal(goal)}
                          className={`flex items-start gap-3 p-3 rounded-lg border ${config.bgColor} transition-all hover:shadow-sm cursor-pointer hover:opacity-80`}
                          data-testid={`team-goal-item-${goal.id}`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-snug">
                              {goal.text}
                            </p>
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

                      return (
                        <div
                          key={goal.id}
                          onClick={() => setSelectedGoal(goal)}
                          className="flex items-start gap-3 p-3 rounded-lg border bg-muted/50 border-muted transition-all cursor-pointer hover:opacity-80"
                          data-testid={`team-goal-completed-${goal.id}`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-snug line-through text-muted-foreground">
                              {goal.text}
                            </p>
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

      {/* Read-only Goal Detail Dialog */}
      {selectedGoal && (
        <Dialog open={!!selectedGoal} onOpenChange={() => setSelectedGoal(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Goal Details (Read-Only)
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Goal Text */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Goal Text</label>
                <div className="bg-muted/50 p-3 rounded-lg border border-muted text-sm leading-relaxed">
                  {selectedGoal.text}
                </div>
              </div>

              {/* Category and Target Date */}
              <div className="grid grid-cols-2 gap-4">
                {selectedGoal.category && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-2 block">Category</label>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const config = categoryConfig[selectedGoal.category!] || defaultCategoryConfig;
                        const Icon = config.icon;
                        return (
                          <>
                            <Icon className="w-4 h-4" />
                            <span className="text-sm">{config.label}</span>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}
                
                {selectedGoal.targetDate && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-2 block">Target Date</label>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4" />
                      {format(parseISO(selectedGoal.targetDate), 'MMM d, yyyy')}
                    </div>
                  </div>
                )}
              </div>

              {/* Status */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Status</label>
                <Badge className={selectedGoal.completed ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white" : "bg-green-500 text-white"}>
                  {selectedGoal.completed ? 'Completed' : 'Active'}
                </Badge>
              </div>

              {/* Close Button */}
              <Button 
                onClick={() => setSelectedGoal(null)}
                className="w-full"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
