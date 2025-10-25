import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Flame, Star, Target, Lock, Play, Trophy, Award } from 'lucide-react';
import SkillTree from './SkillTree';
import LessonPlayer from './LessonPlayer';

interface SkillArea {
  id: string;
  name: string;
  icon: string;
  currentRating: number;
  targetRating: number;
  level: number;
  progress: number;
  locked: boolean;
  skillsNeeded: number;
}

export default function SkillBuilder() {
  const [selectedArea, setSelectedArea] = useState<SkillArea | null>(null);
  const [treeOpen, setTreeOpen] = useState(false);
  const [lessonOpen, setLessonOpen] = useState(false);

  // Static dummy data for UI design
  const streak = 7;
  const currentLevel = 5;
  const dailyGoal = 10; // minutes
  const dailyProgress = 8; // minutes completed
  const xpToNextLevel = 150;
  const currentXP = 650;

  const skillAreas: SkillArea[] = [
    {
      id: 'health',
      name: 'Health',
      icon: '🏥',
      currentRating: 3,
      targetRating: 7,
      level: 3,
      progress: 30,
      locked: false,
      skillsNeeded: 3
    },
    {
      id: 'relationship',
      name: 'Relationship',
      icon: '💑',
      currentRating: 6,
      targetRating: 8,
      level: 2,
      progress: 40,
      locked: false,
      skillsNeeded: 2
    },
    {
      id: 'career',
      name: 'Career',
      icon: '💼',
      currentRating: 4,
      targetRating: 5,
      level: 1,
      progress: 20,
      locked: false,
      skillsNeeded: 1
    },
    {
      id: 'money',
      name: 'Money',
      icon: '💰',
      currentRating: 1,
      targetRating: 1,
      level: 0,
      progress: 0,
      locked: true,
      skillsNeeded: 0
    }
  ];

  const handleAreaClick = (area: SkillArea) => {
    if (!area.locked) {
      setSelectedArea(area);
      setTreeOpen(true);
    }
  };

  const handleStartLesson = () => {
    setTreeOpen(false);
    setLessonOpen(true);
  };

  const getGapColor = (gap: number) => {
    if (gap >= 4) return 'text-red-500';
    if (gap >= 2) return 'text-yellow-500';
    if (gap === 1) return 'text-green-500';
    return 'text-emerald-500';
  };

  const getGapBadgeVariant = (gap: number): "default" | "secondary" | "destructive" | "outline" => {
    if (gap >= 4) return 'destructive';
    if (gap >= 2) return 'secondary';
    return 'default';
  };

  return (
    <>
      <Card className="overflow-hidden" data-testid="card-skill-builder">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 border-b">
          <CardTitle className="text-xl md:text-2xl font-bold text-center flex items-center justify-center gap-2">
            <Trophy className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            Your Learning Path
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-4 md:p-6 space-y-6">
          {/* Streak & Progress Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
            {/* Streak */}
            <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 p-3 md:p-4 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-2 mb-1">
                <Flame className="w-5 h-5 text-orange-500" />
                <span className="text-sm font-medium text-muted-foreground">Streak</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl md:text-3xl font-bold text-orange-600 dark:text-orange-400">{streak}</span>
                <span className="text-sm text-muted-foreground">days</span>
              </div>
            </div>

            {/* Level */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 p-3 md:p-4 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2 mb-1">
                <Award className="w-5 h-5 text-purple-500" />
                <span className="text-sm font-medium text-muted-foreground">Level</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex">
                  {Array.from({ length: currentLevel }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-purple-500 text-purple-500" />
                  ))}
                </div>
                <span className="text-xl md:text-2xl font-bold text-purple-600 dark:text-purple-400">{currentLevel}</span>
              </div>
              <div className="mt-2">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>XP: {currentXP}</span>
                  <span>{xpToNextLevel} to Level {currentLevel + 1}</span>
                </div>
                <Progress value={(currentXP % 1000) / 10} className="h-1.5" />
              </div>
            </div>

            {/* Daily Goal */}
            <div className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/20 dark:to-cyan-950/20 p-3 md:p-4 rounded-lg border border-teal-200 dark:border-teal-800">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-5 h-5 text-teal-500" />
                <span className="text-sm font-medium text-muted-foreground">Today's Goal</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl md:text-3xl font-bold text-teal-600 dark:text-teal-400">{dailyProgress}</span>
                <span className="text-sm text-muted-foreground">/ {dailyGoal} min</span>
              </div>
              <Progress value={(dailyProgress / dailyGoal) * 100} className="h-2 mt-2" />
            </div>
          </div>

          {/* Skill Areas Grid */}
          <div>
            <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Choose Your Path:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {skillAreas.map((area) => {
                const gap = area.targetRating - area.currentRating;
                
                return (
                  <Card
                    key={area.id}
                    className={`relative overflow-hidden transition-all ${
                      area.locked
                        ? 'opacity-60 cursor-not-allowed'
                        : 'cursor-pointer hover-elevate active-elevate-2'
                    }`}
                    onClick={() => handleAreaClick(area)}
                    data-testid={`card-skill-${area.id}`}
                  >
                    <CardContent className="p-4 md:p-5 space-y-3">
                      {/* Icon & Name */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl md:text-3xl">{area.icon}</span>
                          <div>
                            <h4 className="font-semibold text-sm md:text-base">{area.name}</h4>
                            {area.level > 0 && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-xs text-muted-foreground">Level {area.level}</span>
                                <div className="flex">
                                  {Array.from({ length: area.level }).map((_, i) => (
                                    <Star key={i} className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        {area.locked && <Lock className="w-5 h-5 text-muted-foreground" />}
                      </div>

                      {/* Rating Progress */}
                      {!area.locked && gap > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs md:text-sm">
                            <span className="text-muted-foreground">Current</span>
                            <span className="font-semibold">{area.currentRating}</span>
                          </div>
                          <div className="relative">
                            <Progress value={(area.currentRating / 10) * 100} className="h-2" />
                            <div 
                              className="absolute top-0 h-2 rounded-full bg-accent/30"
                              style={{ left: `${(area.currentRating / 10) * 100}%`, width: `${(gap / 10) * 100}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs md:text-sm">
                            <span className="text-muted-foreground">Target</span>
                            <span className="font-semibold">{area.targetRating}</span>
                          </div>
                        </div>
                      )}

                      {/* Gap & Skills Info */}
                      {!area.locked && gap > 0 && (
                        <div className="pt-2 border-t space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Gap to close:</span>
                            <Badge variant={getGapBadgeVariant(gap)} className="text-xs">
                              {gap} point{gap !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Skills needed:</span>
                            <span className="text-xs font-semibold">{area.skillsNeeded}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Progress:</span>
                            <span className="text-xs font-semibold">{area.progress}%</span>
                          </div>
                        </div>
                      )}

                      {area.locked && (
                        <div className="text-center py-2">
                          <p className="text-xs text-muted-foreground">Complete Health first!</p>
                        </div>
                      )}

                      {!area.locked && gap === 0 && (
                        <div className="flex items-center justify-center gap-2 py-2 text-emerald-600 dark:text-emerald-400">
                          <Trophy className="w-5 h-5" />
                          <span className="text-sm font-semibold">On Track!</span>
                        </div>
                      )}

                      {/* Action Button */}
                      {!area.locked && gap > 0 && (
                        <Button 
                          className="w-full" 
                          size="sm"
                          data-testid={`button-practice-${area.id}`}
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Practice
                        </Button>
                      )}

                      {!area.locked && gap === 0 && (
                        <Button 
                          className="w-full" 
                          size="sm"
                          variant="outline"
                          data-testid={`button-maintain-${area.id}`}
                        >
                          Maintain
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* AI Tip */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                <span className="text-xl">🤖</span>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm md:text-base text-blue-900 dark:text-blue-100 mb-1">
                  AI Suggestion
                </h4>
                <p className="text-xs md:text-sm text-blue-800 dark:text-blue-200">
                  Focus on <strong>Health</strong> first! You have the biggest gap (4 points). 
                  Most users achieve their health goals in 4-6 weeks with consistent practice.
                </p>
              </div>
            </div>
          </div>

          {/* Weekly Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t">
            <div className="text-center">
              <div className="text-xl md:text-2xl font-bold text-primary">+250</div>
              <div className="text-xs text-muted-foreground">XP This Week</div>
            </div>
            <div className="text-center">
              <div className="text-xl md:text-2xl font-bold text-accent">2</div>
              <div className="text-xs text-muted-foreground">Badges Unlocked</div>
            </div>
            <div className="text-center">
              <div className="text-xl md:text-2xl font-bold text-purple-600">12</div>
              <div className="text-xs text-muted-foreground">Lessons Done</div>
            </div>
            <div className="text-center">
              <div className="text-xl md:text-2xl font-bold text-teal-600">#3</div>
              <div className="text-xs text-muted-foreground">Your Rank</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skill Tree Dialog */}
      <Dialog open={treeOpen} onOpenChange={setTreeOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <span className="text-2xl">{selectedArea?.icon}</span>
              {selectedArea?.name} Skill Path
            </DialogTitle>
          </DialogHeader>
          {selectedArea && (
            <SkillTree 
              area={selectedArea} 
              onStartLesson={handleStartLesson}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Lesson Player Dialog */}
      <Dialog open={lessonOpen} onOpenChange={setLessonOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <LessonPlayer 
            onComplete={() => {
              setLessonOpen(false);
              // Show completion toast/animation
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
