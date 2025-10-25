import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Flame, Star, Trophy, Zap, Heart, Gift, Crown, Sparkles, Target, TrendingUp, Lock, Check } from 'lucide-react';
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
  position: number;
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
    { id: 'health', name: 'Health', emoji: '🏥', currentRating: 3, targetRating: 7, status: 'available', color: 'from-red-400 to-pink-500', position: 1 },
    { id: 'relationship', name: 'Relationships', emoji: '💑', currentRating: 6, targetRating: 8, status: 'available', color: 'from-pink-400 to-purple-500', position: 2 },
    { id: 'career', name: 'Career', emoji: '💼', currentRating: 4, targetRating: 5, status: 'current', color: 'from-blue-400 to-cyan-500', position: 3 },
    { id: 'money', name: 'Money', emoji: '💰', currentRating: 1, targetRating: 1, status: 'locked', color: 'from-yellow-400 to-orange-500', position: 4 }
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
        {/* Top Stats Bar - Playful & Colorful */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {/* Streak */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-400 via-red-400 to-pink-500 p-4 text-white shadow-lg hover-elevate cursor-pointer">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <Flame className="w-5 h-5 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wide">Streak</span>
              </div>
              <div className="text-3xl font-black">{streak}</div>
              <div className="text-xs opacity-90">days 🔥</div>
            </div>
            <div className="absolute -right-4 -bottom-4 text-6xl opacity-20">🔥</div>
          </div>

          {/* Level */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-400 via-indigo-400 to-blue-500 p-4 text-white shadow-lg hover-elevate cursor-pointer">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <Crown className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-wide">Level</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-3xl font-black">{level}</div>
                <div className="flex">
                  {Array.from({ length: Math.min(5, level) }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-300 text-yellow-300" />
                  ))}
                </div>
              </div>
              <div className="text-xs opacity-90">Champion</div>
            </div>
            <div className="absolute -right-4 -bottom-4 text-6xl opacity-20">👑</div>
          </div>

          {/* Daily XP */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-400 via-emerald-400 to-green-500 p-4 text-white shadow-lg hover-elevate cursor-pointer">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-wide">Today</span>
              </div>
              <div className="text-3xl font-black">{dailyXP}</div>
              <div className="text-xs opacity-90">/ {dailyGoal} XP</div>
              <div className="mt-1 h-1.5 bg-white/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white rounded-full transition-all"
                  style={{ width: `${(dailyXP / dailyGoal) * 100}%` }}
                />
              </div>
            </div>
            <div className="absolute -right-4 -bottom-4 text-6xl opacity-20">⚡</div>
          </div>

          {/* Hearts */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-400 via-pink-400 to-fuchsia-500 p-4 text-white shadow-lg hover-elevate cursor-pointer">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <Heart className="w-5 h-5 fill-white" />
                <span className="text-xs font-bold uppercase tracking-wide">Hearts</span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Heart key={i} className="w-6 h-6 fill-white text-white" />
                ))}
              </div>
              <div className="text-xs opacity-90 mt-1">Full health</div>
            </div>
            <div className="absolute -right-4 -bottom-4 text-6xl opacity-20">💖</div>
          </div>
        </div>

        {/* Main Title */}
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-primary via-purple-600 to-accent bg-clip-text text-transparent mb-2">
            Your Learning Path
          </h2>
          <p className="text-muted-foreground">Level up your life skills! 🚀</p>
        </div>

        {/* Vertical Learning Path - Duolingo Style */}
        <div className="relative max-w-2xl mx-auto">
          {/* Background decorative path line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-primary/20 via-purple-300/20 to-accent/20 -translate-x-1/2 rounded-full" />
          
          <div className="relative space-y-8 py-4">
            {nodes.map((node, index) => {
              const gap = node.targetRating - node.currentRating;
              const progress = node.targetRating > 0 ? Math.round((node.currentRating / node.targetRating) * 100) : 0;
              
              return (
                <div key={node.id} className="relative">
                  {/* Connecting line to next node */}
                  {index < nodes.length - 1 && (
                    <div className="absolute left-1/2 top-full w-1 h-8 bg-gradient-to-b from-primary/30 to-transparent -translate-x-1/2" />
                  )}

                  {/* Node Card */}
                  <div 
                    className={`relative ${
                      index % 2 === 0 ? 'ml-0 mr-auto' : 'ml-auto mr-0'
                    } w-full md:w-4/5`}
                  >
                    <Card
                      className={`relative overflow-hidden border-4 transition-all cursor-pointer ${
                        node.status === 'locked' 
                          ? 'opacity-50 cursor-not-allowed border-gray-300' 
                          : node.status === 'current'
                          ? 'border-yellow-400 shadow-2xl shadow-yellow-400/50 scale-105'
                          : node.status === 'completed'
                          ? 'border-green-400 shadow-xl shadow-green-400/30'
                          : 'border-primary/30 hover-elevate active-elevate-2 shadow-xl'
                      }`}
                      onClick={() => handleNodeClick(node)}
                      data-testid={`skill-node-${node.id}`}
                    >
                      <CardContent className="p-0">
                        <div className={`bg-gradient-to-r ${node.color} p-6 relative`}>
                          {/* Background emoji */}
                          <div className="absolute -right-6 -top-6 text-8xl opacity-20 select-none">
                            {node.emoji}
                          </div>
                          
                          <div className="relative z-10">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="text-5xl">{node.emoji}</div>
                                <div className="text-white">
                                  <h3 className="text-2xl font-black tracking-tight">{node.name}</h3>
                                  <div className="flex items-center gap-2 mt-1">
                                    {node.status === 'locked' && (
                                      <Badge className="bg-white/20 text-white border-0 text-xs">
                                        <Lock className="w-3 h-3 mr-1" />
                                        Locked
                                      </Badge>
                                    )}
                                    {node.status === 'current' && (
                                      <Badge className="bg-yellow-400 text-yellow-900 border-0 text-xs animate-pulse">
                                        <Target className="w-3 h-3 mr-1" />
                                        Focus Here!
                                      </Badge>
                                    )}
                                    {node.status === 'completed' && (
                                      <Badge className="bg-green-400 text-green-900 border-0 text-xs">
                                        <Check className="w-3 h-3 mr-1" />
                                        Complete
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {node.status !== 'locked' && gap > 0 && (
                              <div className="bg-white/90 backdrop-blur rounded-xl p-4 space-y-3">
                                {/* Rating Display */}
                                <div className="flex items-center justify-between">
                                  <div className="text-center">
                                    <div className="text-xs text-gray-600 font-medium mb-1">Current</div>
                                    <div className="text-3xl font-black text-gray-900">{node.currentRating}</div>
                                  </div>
                                  
                                  <div className="flex-1 mx-4">
                                    <TrendingUp className="w-6 h-6 text-gray-400 mx-auto" />
                                  </div>
                                  
                                  <div className="text-center">
                                    <div className="text-xs text-gray-600 font-medium mb-1">Target</div>
                                    <div className="text-3xl font-black bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                                      {node.targetRating}
                                    </div>
                                  </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-xs text-gray-600">
                                    <span className="font-medium">Progress</span>
                                    <span className="font-bold">{progress}%</span>
                                  </div>
                                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full bg-gradient-to-r ${node.color} transition-all duration-500`}
                                      style={{ width: `${progress}%` }}
                                    />
                                  </div>
                                </div>

                                {/* Gap Badge */}
                                <div className="flex items-center justify-between">
                                  <div className="text-xs text-gray-600 font-medium">Gap to close:</div>
                                  <Badge 
                                    variant={gap >= 4 ? 'destructive' : gap >= 2 ? 'secondary' : 'default'}
                                    className="font-bold text-sm"
                                  >
                                    {gap} point{gap !== 1 ? 's' : ''}
                                  </Badge>
                                </div>
                              </div>
                            )}

                            {node.status === 'locked' && (
                              <div className="bg-white/20 backdrop-blur rounded-xl p-4 text-center">
                                <Lock className="w-8 h-8 text-white/80 mx-auto mb-2" />
                                <p className="text-white/90 text-sm font-medium">
                                  Complete Career first! 🚀
                                </p>
                              </div>
                            )}

                            {node.status !== 'locked' && gap === 0 && (
                              <div className="bg-white/90 backdrop-blur rounded-xl p-4 text-center">
                                <Trophy className="w-10 h-10 text-yellow-500 mx-auto mb-2" />
                                <p className="text-gray-900 font-bold">On Track! 🎯</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Button */}
                        {node.status !== 'locked' && gap > 0 && (
                          <div className="p-4 bg-white">
                            <Button 
                              className="w-full h-12 text-lg font-bold shadow-lg"
                              size="lg"
                              data-testid={`button-start-${node.id}`}
                            >
                              <Sparkles className="w-5 h-5 mr-2" />
                              Start Learning
                            </Button>
                          </div>
                        )}

                        {node.status !== 'locked' && gap === 0 && (
                          <div className="p-4 bg-white">
                            <Button 
                              className="w-full h-12 text-lg font-bold"
                              variant="outline"
                              size="lg"
                            >
                              <Gift className="w-5 h-5 mr-2" />
                              Practice More
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Position indicator dot */}
                    <div 
                      className={`absolute ${
                        index % 2 === 0 ? '-right-3' : '-left-3'
                      } top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-4 border-white shadow-lg ${
                        node.status === 'completed' 
                          ? 'bg-green-500' 
                          : node.status === 'current'
                          ? 'bg-yellow-500 animate-pulse'
                          : node.status === 'locked'
                          ? 'bg-gray-400'
                          : 'bg-primary'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mascot at bottom */}
          <div className="text-center mt-12 mb-6">
            <div className="inline-block relative">
              <div className="text-8xl animate-bounce">🎯</div>
              <div className="absolute -top-2 -right-2 text-3xl animate-spin-slow">✨</div>
            </div>
            <p className="mt-4 text-lg font-bold text-muted-foreground">
              Keep going! You're doing great! 🚀
            </p>
          </div>
        </div>

        {/* Bottom Achievement Summary */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
          <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-xl">
            <div className="text-3xl font-black text-purple-600">+250</div>
            <div className="text-xs text-muted-foreground mt-1">XP This Week</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 rounded-xl">
            <div className="text-3xl font-black text-orange-600">2</div>
            <div className="text-xs text-muted-foreground mt-1">New Badges</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 rounded-xl">
            <div className="text-3xl font-black text-blue-600">12</div>
            <div className="text-xs text-muted-foreground mt-1">Lessons Done</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-teal-50 to-green-50 dark:from-teal-950/20 dark:to-green-950/20 rounded-xl">
            <div className="text-3xl font-black text-teal-600">#3</div>
            <div className="text-xs text-muted-foreground mt-1">Your Rank</div>
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
