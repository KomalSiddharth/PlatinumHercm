import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Trophy, Sparkles, TrendingUp, Lock, ArrowDown, Lightbulb, Target } from 'lucide-react';
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
  currentProblems: string[]; // Pointwise problems from current week
  skillsNeeded: string[]; // What skills will solve it?
}

interface BeliefData {
  category: string;
  currentRating: number;
  targetRating: number;
  currentBelief: string;
  problems: string;
}

interface HRCMWeekData {
  currentH: number;
  currentR: number;
  currentC: number;
  currentM: number;
  beliefs?: BeliefData[];
}

// Helper function to parse problems into bullet points from currentBelief field
function parseProblems(beliefText: string | null): string[] {
  if (!beliefText || beliefText.trim().length === 0) {
    return ['Working on improvements'];
  }
  
  const trimmed = beliefText.trim();
  
  // Split by common delimiters (., |, newlines, semicolons)
  const problems = trimmed
    .split(/[.\n|;]/)
    .map(p => p.trim())
    .filter(p => p.length > 5) // Filter very short fragments
    .slice(0, 4); // Max 4 problems
  
  return problems.length > 0 ? problems : [trimmed];
}

// Helper function to generate skills based on problems
function generateSkills(problems: string[]): string[] {
  const skillMap: { [key: string]: string[] } = {
    // Health-related
    'diet': ['Meal Planning', 'Nutrition Basics'],
    'food': ['Healthy Eating', 'Portion Control'],
    'eating': ['Meal Planning', 'Nutrition Awareness'],
    'exercise': ['Workout Routine', 'Fitness Habits'],
    'workout': ['Exercise Planning', 'Physical Activity'],
    'sleep': ['Sleep Hygiene', 'Rest Optimization'],
    'energy': ['Energy Management', 'Vitality Practices'],
    'health': ['Wellness Planning', 'Self-Care'],
    'water': ['Hydration Habits', 'Health Awareness'],
    'stress': ['Stress Management', 'Relaxation Techniques'],
    
    // Relationship-related
    'communication': ['Active Listening', 'Clear Expression'],
    'conflict': ['Conflict Resolution', 'Emotional Intelligence'],
    'relationship': ['Relationship Building', 'Connection Skills'],
    'family': ['Family Bonding', 'Quality Time'],
    'friends': ['Friendship Skills', 'Social Connection'],
    'trust': ['Trust Building', 'Vulnerability'],
    'empathy': ['Empathetic Communication', 'Understanding'],
    
    // Career-related
    'career': ['Career Planning', 'Professional Growth'],
    'work': ['Work-Life Balance', 'Productivity'],
    'job': ['Job Skills', 'Performance'],
    'time': ['Time Management', 'Prioritization'],
    'focus': ['Concentration', 'Deep Work'],
    'skill': ['Skill Development', 'Learning'],
    'project': ['Project Management', 'Organization'],
    
    // Money-related
    'money': ['Financial Planning', 'Money Mindset'],
    'saving': ['Saving Habits', 'Investment Basics'],
    'spending': ['Expense Tracking', 'Budget Management'],
    'budget': ['Budgeting Skills', 'Financial Control'],
    'income': ['Income Generation', 'Earning Strategies'],
    'debt': ['Debt Management', 'Financial Freedom'],
    'invest': ['Investment Knowledge', 'Wealth Building']
  };

  const skills = new Set<string>();
  const problemText = problems.join(' ').toLowerCase();

  // Match keywords and add relevant skills
  Object.entries(skillMap).forEach(([keyword, relatedSkills]) => {
    if (problemText.includes(keyword)) {
      relatedSkills.forEach(skill => skills.add(skill));
    }
  });

  // Default skills if none matched
  if (skills.size === 0) {
    return ['Self-Awareness', 'Habit Building', 'Goal Setting'];
  }

  return Array.from(skills).slice(0, 4); // Max 4 skills
}

// Human Avatar Component - Realistic CSS Person
function HumanAvatar({ progress = 0 }: { progress: number }) {
  // Different stages based on progress
  const getAvatarStage = () => {
    if (progress < 20) return { skin: '#FFD4A3', shirt: '#9CA3AF', mood: 'tired' }; // Gray shirt, tired
    if (progress < 40) return { skin: '#FFCB9A', shirt: '#60A5FA', mood: 'awake' }; // Blue shirt, awake
    if (progress < 70) return { skin: '#FFC491', shirt: '#34D399', mood: 'happy' }; // Green shirt, happy
    if (progress < 90) return { skin: '#FFBD88', shirt: '#F59E0B', mood: 'fit' }; // Orange shirt, fit
    return { skin: '#FFB67F', shirt: '#8B5CF6', mood: 'champion' }; // Purple shirt, champion
  };

  const stage = getAvatarStage();
  
  return (
    <div className="relative inline-block" style={{ width: '60px', height: '80px' }}>
      {/* Head */}
      <div 
        className="absolute rounded-full"
        style={{
          width: '28px',
          height: '28px',
          top: '0px',
          left: '16px',
          backgroundColor: stage.skin,
          border: '2px solid rgba(0,0,0,0.1)'
        }}
      >
        {/* Hair */}
        <div 
          className="absolute rounded-t-full"
          style={{
            width: '32px',
            height: '18px',
            top: '-8px',
            left: '-2px',
            backgroundColor: '#4A3728',
            borderRadius: '50% 50% 0 0'
          }}
        />
        
        {/* Eyes */}
        <div className="absolute flex gap-1.5" style={{ top: '10px', left: '7px' }}>
          <div className="w-1.5 h-1.5 bg-black rounded-full" />
          <div className="w-1.5 h-1.5 bg-black rounded-full" />
        </div>
        
        {/* Smile (for happy stages) */}
        {stage.mood !== 'tired' && (
          <div 
            className="absolute"
            style={{
              width: '10px',
              height: '5px',
              top: '18px',
              left: '9px',
              borderBottom: '2px solid rgba(0,0,0,0.6)',
              borderRadius: '0 0 50% 50%'
            }}
          />
        )}
      </div>

      {/* Neck */}
      <div
        className="absolute"
        style={{
          width: '10px',
          height: '8px',
          top: '26px',
          left: '25px',
          backgroundColor: stage.skin
        }}
      />

      {/* Body/Shirt */}
      <div
        className="absolute rounded-lg"
        style={{
          width: '32px',
          height: '30px',
          top: '32px',
          left: '14px',
          backgroundColor: stage.shirt,
          border: '2px solid rgba(0,0,0,0.1)'
        }}
      >
        {/* Collar */}
        <div className="absolute w-full h-2 top-0 bg-white/20 rounded-t-lg" />
      </div>

      {/* Arms */}
      <div
        className="absolute rounded-full"
        style={{
          width: '8px',
          height: '22px',
          top: '36px',
          left: '6px',
          backgroundColor: stage.shirt,
          transform: 'rotate(-10deg)'
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: '8px',
          height: '22px',
          top: '36px',
          right: '6px',
          backgroundColor: stage.shirt,
          transform: 'rotate(10deg)'
        }}
      />

      {/* Legs */}
      <div
        className="absolute rounded-full"
        style={{
          width: '10px',
          height: '20px',
          top: '60px',
          left: '18px',
          backgroundColor: '#1F2937'
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: '10px',
          height: '20px',
          top: '60px',
          right: '18px',
          backgroundColor: '#1F2937'
        }}
      />
      
      {/* Champion Badge */}
      {stage.mood === 'champion' && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-2xl animate-bounce">
          👑
        </div>
      )}
    </div>
  );
}

export default function SkillBuilder() {
  const [selectedNode, setSelectedNode] = useState<SkillNode | null>(null);
  const [treeOpen, setTreeOpen] = useState(false);
  const [lessonOpen, setLessonOpen] = useState(false);

  // Fetch current week data
  const { data: weekData } = useQuery<HRCMWeekData>({
    queryKey: ['/api/hercm/week/1']
  });

  // Build nodes from current week data using beliefs array
  const nodes: SkillNode[] = weekData?.beliefs ? 
    weekData.beliefs.map((belief) => {
      const problems = parseProblems(belief.currentBelief);
      return {
        id: belief.category.toLowerCase(),
        name: belief.category === 'Relationship' ? 'Relationships' : belief.category,
        emoji: belief.category === 'Health' ? '🏥' : 
               belief.category === 'Relationship' ? '💑' : 
               belief.category === 'Career' ? '💼' : '💰',
        currentRating: belief.currentRating || 0,
        targetRating: 7, // Fixed target
        status: 'available' as const,
        color: 'from-pink-400 to-purple-500',
        currentProblems: problems,
        skillsNeeded: generateSkills(problems)
      };
    }) : [];

  const handleNodeClick = (node: SkillNode) => {
    if (node.status !== 'locked') {
      setSelectedNode(node);
      setTreeOpen(true);
    }
  };
  
  // Calculate overall progress for avatar
  const overallProgress = nodes.length > 0 
    ? Math.round(nodes.reduce((sum, n) => sum + (n.currentRating / n.targetRating * 100), 0) / nodes.length)
    : 0;

  return (
    <>
      <div className="relative">
        {/* Main Title */}
        <div className="text-center mb-6">
          <h2 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-primary via-purple-600 to-accent bg-clip-text text-transparent mb-1">
            Your Skills Map
          </h2>
          <p className="text-sm text-muted-foreground">Close the gap with focused learning! 🎯</p>
        </div>

        {/* Human Avatar - Overall Progress */}
        <div className="flex flex-col items-center mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-xl border border-purple-200 dark:border-purple-800">
          <div className="mb-3">
            <HumanAvatar progress={overallProgress} />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-purple-900 dark:text-purple-100">
              Your Journey: {overallProgress}% Complete
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {overallProgress < 20 && "Starting your transformation... 💪"}
              {overallProgress >= 20 && overallProgress < 40 && "You're waking up! Keep going! 🌅"}
              {overallProgress >= 40 && overallProgress < 70 && "Great progress! You're thriving! 🌟"}
              {overallProgress >= 70 && overallProgress < 90 && "You're becoming unstoppable! 🔥"}
              {overallProgress >= 90 && "You're a true champion! 👑"}
            </p>
          </div>
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
                        {/* Problem Statement - Pointwise */}
                        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <Lightbulb className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <div className="text-xs font-semibold text-red-900 dark:text-red-100 mb-2">
                                Current Problems:
                              </div>
                              <ul className="space-y-1 text-xs text-red-800 dark:text-red-200">
                                {node.currentProblems.map((problem, idx) => (
                                  <li key={idx} className="flex items-start gap-1">
                                    <span className="text-red-600 mt-0.5">•</span>
                                    <span className="flex-1">{problem}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>

                        {/* Arrow Pointing Down */}
                        <div className="flex justify-center">
                          <ArrowDown className="w-5 h-5 text-primary animate-bounce" />
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
                        <p className="text-sm text-muted-foreground font-medium">
                          {node.currentProblems.join('. ')}
                        </p>
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
