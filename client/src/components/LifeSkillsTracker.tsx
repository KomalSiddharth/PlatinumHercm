import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { GraduationCap, BookOpen } from 'lucide-react';

interface LifeSkill {
  id: string;
  title: string;
  category: string;
  completed: boolean;
}

interface LifeSkillsTrackerProps {
  onSkillsChange?: (skills: LifeSkill[]) => void;
}

export default function LifeSkillsTracker({ onSkillsChange }: LifeSkillsTrackerProps) {
  const [skills, setSkills] = useState<LifeSkill[]>([
    // Basic LOA
    { id: 's1', title: 'Memorise The Science of Win LOA Works', category: 'Basic LOA', completed: false },
    { id: 's2', title: 'Master Changing Attention to Tune Frequency', category: 'Basic LOA', completed: false },
    { id: 's3', title: 'Follow Routine of LOA - TORG, Water Bottle, Affirmations, Double Happiness, Cancel Cancel & Keep Filling up Magic Plan', category: 'Basic LOA', completed: false },
    
    // Health Mastery
    { id: 's4', title: 'Master Understanding Health', category: 'Health Mastery', completed: false },
    { id: 's5', title: 'Creating Limiting Health Habits', category: 'Health Mastery', completed: false },
    { id: 's6', title: 'Master the Lifestyle Diet Plans', category: 'Health Mastery', completed: false },
    { id: 's7', title: 'Master the 7 Steps to Love Exercising', category: 'Health Mastery', completed: false },
    { id: 's8', title: 'Master Designing your Own Workouts', category: 'Health Mastery', completed: false },
    
    // Advance LOA
    { id: 's9', title: 'Master Your Emotional Frequency', category: 'Advance LOA', completed: false },
    { id: 's10', title: '4 Steps of LOA Lifestyle', category: 'Advance LOA', completed: false },
    { id: 's11', title: 'Washing Taking Affirmations', category: 'Advance LOA', completed: false },
    { id: 's12', title: 'Clear your Values & Priorities', category: 'Advance LOA', completed: false },
    { id: 's13', title: 'Aligning your FIBA Frequency', category: 'Advance LOA', completed: false },
    { id: 's14', title: 'Master Rules of Emotions', category: 'Advance LOA', completed: false },
    { id: 's15', title: 'Align your 6 Needs with Your Goals', category: 'Advance LOA', completed: false },
    { id: 's16', title: 'Create Magic Miracles Plans', category: 'Advance LOA', completed: false },
  ]);

  const toggleSkill = (id: string) => {
    const updated = skills.map(s => 
      s.id === id ? { ...s, completed: !s.completed } : s
    );
    setSkills(updated);
    onSkillsChange?.(updated);
  };

  const categories = [
    { name: 'Basic LOA', color: 'from-blue-500 to-cyan-500' },
    { name: 'Health Mastery', color: 'from-green-500 to-emerald-500' },
    { name: 'Advance LOA', color: 'from-purple-500 to-pink-500' }
  ];

  const completedCount = skills.filter(s => s.completed).length;
  const totalCount = skills.length;
  const progressPercent = (completedCount / totalCount) * 100;

  return (
    <Card className="border-2 border-chart-3/20">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-xl flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-chart-3" />
            Life Skills Modules
          </CardTitle>
          <Badge className="bg-gradient-to-r from-primary to-accent text-white gap-1 border-0">
            <BookOpen className="w-3 h-3" />
            <span className="font-bold">{completedCount}/{totalCount}</span> Completed
          </Badge>
        </div>
        <div className="pt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-semibold">{progressPercent.toFixed(0)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {categories.map(category => {
          const categorySkills = skills.filter(s => s.category === category.name);
          const categoryCompleted = categorySkills.filter(s => s.completed).length;
          const categoryProgress = (categoryCompleted / categorySkills.length) * 100;
          
          return (
            <div key={category.name} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className={`font-semibold text-sm bg-gradient-to-r ${category.color} bg-clip-text text-transparent uppercase tracking-wide`}>
                  {category.name}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {categoryCompleted}/{categorySkills.length}
                  </span>
                  <Progress value={categoryProgress} className="h-1.5 w-20" />
                </div>
              </div>
              
              <div className="space-y-2">
                {categorySkills.map(skill => (
                  <div
                    key={skill.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover-elevate active-elevate-2 transition-all border border-border/50"
                    data-testid={`skill-${skill.id}`}
                  >
                    <Checkbox
                      checked={skill.completed}
                      onCheckedChange={() => toggleSkill(skill.id)}
                      className="mt-0.5"
                      data-testid={`checkbox-${skill.id}`}
                    />
                    <label
                      onClick={() => toggleSkill(skill.id)}
                      className={`flex-1 text-sm cursor-pointer transition-all ${
                        skill.completed 
                          ? 'line-through text-muted-foreground' 
                          : 'text-foreground'
                      }`}
                    >
                      {skill.title}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Weekly Target:</p>
            <Badge variant={completedCount >= 2 ? "default" : "secondary"} className={completedCount >= 2 ? "bg-chart-3 hover:bg-chart-3" : ""}>
              {completedCount >= 2 ? "✓ Target Met" : "2+ Required"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Complete at least 2 Life Skills modules per week for Platinum qualification. Check off modules as you finish them.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
