import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Flame, Star, Trophy, Zap, Heart, Crown, Sparkles, TrendingUp, Lock, ArrowRight, Lightbulb, Target } from 'lucide-react';
import SkillTree from './SkillTree';
import LessonPlayer from './LessonPlayer';

interface SkillNode {
  id: string;
  name: string;
  emoji: string;
  currentRating: number;
  targetRating: number;
  status: 'locked' | 'available' | 'current' | 'completed';
  color: string;
  currentProblem: string; // What's the current issue?
  skillsNeeded: string[]; // What skills will solve it?
}

export default function SkillBuilder() {
  const [selectedNode, setSelectedNode] = useState<SkillNode | null>(null);
  const [treeOpen, setTreeOpen] = useState(false);
  const [lessonOpen, setLessonOpen] = useState(false);

  // Static dummy data
  const streak = 7;
  const dailyXP = 80;
  const dailyGoal = 100;
  const level = 5;

  const nodes: SkillNode[] = [
    { 
      id: 'health', 
      name: 'Health', 
      emoji: '🏥', 
      currentRating: 3, 
      targetRating: 7, 
      status: 'available', 
      color: 'from-red-400 to-pink-500',
      currentProblem: 'No consistent diet or exercise routine',
      skillsNeeded: ['Meal Planning', 'Exercise Basics', 'Habit Building']
    },
    { 
      id: 'relationship', 
      name: 'Relationships', 
      emoji: '💑', 
      currentRating: 6, 
      targetRating: 8, 
      status: 'current', 
      color: 'from-pink-400 to-purple-500',
      currentProblem: 'Need better communication skills',
      skillsNeeded: ['Active Listening', 'Conflict Management']
    },
    { 
      id: 'career', 
      name: 'Career', 
      emoji: '💼', 
      currentRating: 4, 
      targetRating: 5, 
      status: 'available', 
      color: 'from-blue-400 to-cyan-500',
      currentProblem: 'Lack of focus and productivity',
      skillsNeeded: ['Time Management']
    },
    { 
      id: 'money', 
      name: 'Money', 
      emoji: '💰', 
      currentRating: 1, 
      targetRating: 1, 
      status: 'locked', 
      color: 'from-yellow-400 to-orange-500',
      currentProblem: 'Complete Health first!',
      skillsNeeded: []
    }
  ];

  const handleNodeClick = (node: SkillNode) => {
    if (node.status !== 'locked') {
      setSelectedNode(node);
      setTreeOpen(true);
    }
  };

  return (
    <>
      <div className="relative">
        {/* Top Stats Bar - Compact Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {/* Streak */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-400 to-red-500 p-3 text-white shadow-lg hover-elevate cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1 mb-0.5">
                  <Flame className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase">Streak</span>
                </div>
                <div className="text-2xl font-black">{streak}</div>
                <div className="text-[10px] opacity-90">days</div>
              </div>
              <div className="text-3xl opacity-20">🔥</div>
            </div>
          </div>

          {/* Level */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-400 to-indigo-500 p-3 text-white shadow-lg hover-elevate cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1 mb-0.5">
                  <Crown className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase">Level</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="text-2xl font-black">{level}</div>
                  <Star className="w-4 h-4 fill-yellow-300 text-yellow-300" />
                </div>
              </div>
              <div className="text-3xl opacity-20">👑</div>
            </div>
          </div>

          {/* Daily XP */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 p-3 text-white shadow-lg hover-elevate cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-1 mb-0.5">
                  <Zap className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase">Today</span>
                </div>
                <div className="text-2xl font-black">{dailyXP}</div>
                <div className="h-1 bg-white/30 rounded-full overflow-hidden mt-1">
                  <div 
                    className="h-full bg-white rounded-full"
                    style={{ width: `${(dailyXP / dailyGoal) * 100}%` }}
                  />
                </div>
              </div>
              <div className="text-3xl opacity-20">⚡</div>
            </div>
          </div>

          {/* Hearts */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 p-3 text-white shadow-lg hover-elevate cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1 mb-0.5">
                  <Heart className="w-4 h-4 fill-white" />
                  <span className="text-[10px] font-bold uppercase">Hearts</span>
                </div>
                <div className="flex gap-0.5 mt-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Heart key={i} className="w-3 h-3 fill-white text-white" />
                  ))}
                </div>
              </div>
              <div className="text-3xl opacity-20">💖</div>
            </div>
          </div>
        </div>

        {/* Main Title */}
        <div className="text-center mb-6">
          <h2 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-primary via-purple-600 to-accent bg-clip-text text-transparent mb-1">
            Your Skills Map
          </h2>
          <p className="text-sm text-muted-foreground">Close the gap with focused learning! 🎯</p>
        </div>

        {/* HRCM Cards Grid - 2x2 Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {nodes.map((node) => {
            const gap = node.targetRating - node.currentRating;
            const progress = node.targetRating > 0 ? Math.round((node.currentRating / node.targetRating) * 100) : 0;
            
            return (
              <Card
                key={node.id}
                className={`relative overflow-hidden border-3 transition-all cursor-pointer ${
                  node.status === 'locked' 
                    ? 'opacity-60 cursor-not-allowed border-gray-300' 
                    : node.status === 'current'
                    ? 'border-yellow-400 shadow-2xl shadow-yellow-400/30 scale-[1.02]'
                    : 'border-primary/20 hover-elevate active-elevate-2 shadow-lg'
                }`}
                onClick={() => handleNodeClick(node)}
                data-testid={`skill-node-${node.id}`}
              >
                {/* Status Badge - Top Right */}
                {node.status === 'current' && (
                  <div className="absolute top-3 right-3 z-10">
                    <Badge className="bg-yellow-400 text-yellow-900 border-0 text-xs animate-pulse">
                      <Target className="w-3 h-3 mr-1" />
                      Focus!
                    </Badge>
                  </div>
                )}

                <CardContent className="p-0">
                  {/* Header with Gradient */}
                  <div className={`bg-gradient-to-r ${node.color} p-4 relative`}>
                    <div className="absolute -right-4 -top-4 text-6xl opacity-20">{node.emoji}</div>
                    <div className="relative z-10 flex items-center gap-3">
                      <div className="text-4xl">{node.emoji}</div>
                      <div className="text-white flex-1">
                        <h3 className="text-xl font-black">{node.name}</h3>
                        <div className="flex items-center gap-2 text-sm mt-0.5">
                          <span className="font-bold">{node.currentRating}</span>
                          <TrendingUp className="w-3 h-3" />
                          <span className="font-bold">{node.targetRating}</span>
                          {gap > 0 && (
                            <Badge className="bg-white/20 text-white border-0 text-xs ml-1">
                              Gap: {gap}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Content Area */}
                  <div className="p-4 space-y-3">
                    {node.status !== 'locked' && gap > 0 && (
                      <>
                        {/* Problem Statement */}
                        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <Lightbulb className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <div className="text-xs font-semibold text-red-900 dark:text-red-100 mb-1">
                                Current Problem:
                              </div>
                              <div className="text-xs text-red-800 dark:text-red-200">
                                {node.currentProblem}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Arrow */}
                        <div className="flex justify-center">
                          <ArrowRight className="w-5 h-5 text-primary animate-pulse" />
                        </div>

                        {/* Skills Needed */}
                        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <Trophy className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <div className="text-xs font-semibold text-green-900 dark:text-green-100 mb-2">
                                Skills You'll Learn:
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {node.skillsNeeded.map((skill, idx) => (
                                  <Badge 
                                    key={idx}
                                    variant="outline" 
                                    className="text-xs bg-white dark:bg-gray-900 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300"
                                  >
                                    {skill}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Progress</span>
                            <span className="font-bold">{progress}%</span>
                          </div>
                          <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full bg-gradient-to-r ${node.color} transition-all`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {node.status === 'locked' && (
                      <div className="text-center py-4">
                        <Lock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground font-medium">{node.currentProblem}</p>
                      </div>
                    )}

                    {node.status !== 'locked' && gap === 0 && (
                      <div className="text-center py-4">
                        <Trophy className="w-10 h-10 text-yellow-500 mx-auto mb-2" />
                        <p className="font-bold">You're On Track! 🎯</p>
                      </div>
                    )}

                    {/* Action Button */}
                    {node.status !== 'locked' && gap > 0 && (
                      <Button 
                        className="w-full font-bold"
                        data-testid={`button-start-${node.id}`}
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Start Learning
                      </Button>
                    )}

                    {node.status !== 'locked' && gap === 0 && (
                      <Button 
                        className="w-full font-bold"
                        variant="outline"
                      >
                        Practice More
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Bottom Stats - Compact */}
        <div className="grid grid-cols-4 gap-3 max-w-2xl mx-auto">
          <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-lg">
            <div className="text-2xl font-black text-purple-600">+250</div>
            <div className="text-[10px] text-muted-foreground">XP Week</div>
          </div>
          <div className="text-center p-3 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 rounded-lg">
            <div className="text-2xl font-black text-orange-600">2</div>
            <div className="text-[10px] text-muted-foreground">Badges</div>
          </div>
          <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 rounded-lg">
            <div className="text-2xl font-black text-blue-600">12</div>
            <div className="text-[10px] text-muted-foreground">Lessons</div>
          </div>
          <div className="text-center p-3 bg-gradient-to-br from-teal-50 to-green-50 dark:from-teal-950/20 dark:to-green-950/20 rounded-lg">
            <div className="text-2xl font-black text-teal-600">#3</div>
            <div className="text-[10px] text-muted-foreground">Rank</div>
          </div>
        </div>
      </div>

      {/* Skill Tree Dialog */}
      <Dialog open={treeOpen} onOpenChange={setTreeOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedNode && (
            <SkillTree 
              area={selectedNode} 
              onStartLesson={() => {
                setTreeOpen(false);
                setLessonOpen(true);
              }}
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
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
