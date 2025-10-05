import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface Problem {
  id: string;
  text: string;
  category: string;
  addressed: boolean;
}

interface ProblemsTrackerProps {
  onProblemsChange?: (problems: Problem[]) => void;
}

export default function ProblemsTracker({ onProblemsChange }: ProblemsTrackerProps) {
  const [problems, setProblems] = useState<Problem[]>([
    // Frequency & Energy
    { id: 'p1', text: 'Tuning Frequency To Attract Goals', category: 'Frequency & Energy', addressed: false },
    { id: 'p2', text: 'Attract Any Goal by Tuning your Frequency', category: 'Frequency & Energy', addressed: false },
    { id: 'p3', text: 'Maintaining your Frequency Throughout the day', category: 'Frequency & Energy', addressed: false },
    { id: 'p4', text: 'Cleaning Negative Energy', category: 'Frequency & Energy', addressed: false },
    { id: 'p5', text: 'Sub-Conscious Programming', category: 'Frequency & Energy', addressed: false },
    
    // Vision & Goals
    { id: 'p6', text: 'Ultimate Life Vision', category: 'Vision & Goals', addressed: false },
    { id: 'p7', text: 'Short Term Life Vision', category: 'Vision & Goals', addressed: false },
    
    // Health
    { id: 'p8', text: 'Health Problems', category: 'Health', addressed: false },
    { id: 'p9', text: 'Money & Cash Issues', category: 'Health', addressed: false },
    { id: 'p10', text: 'Weight Loss & Gain: How to Create a Diet Plan', category: 'Health', addressed: false },
    { id: 'p11', text: 'Motivation for Weight Loss', category: 'Health', addressed: false },
    { id: 'p12', text: 'What Workouts to Do', category: 'Health', addressed: false },
    
    // Emotional & Mental
    { id: 'p13', text: 'Any Emotional Problems', category: 'Emotional & Mental', addressed: false },
    { id: 'p14', text: 'Fast LOA Attraction', category: 'Emotional & Mental', addressed: false },
    { id: 'p15', text: 'Unable to Take Action, Lack of Motivation', category: 'Emotional & Mental', addressed: false },
    { id: 'p16', text: 'Internal Conflicts, Creating Perfectly Tuned Frequency', category: 'Emotional & Mental', addressed: false },
    { id: 'p17', text: 'Feeling Negative Emotions Easily, Feeling Positive', category: 'Emotional & Mental', addressed: false },
  ]);

  const toggleProblem = (id: string) => {
    const updated = problems.map(p => 
      p.id === id ? { ...p, addressed: !p.addressed } : p
    );
    setProblems(updated);
    onProblemsChange?.(updated);
  };

  const categories = Array.from(new Set(problems.map(p => p.category)));
  const addressedCount = problems.filter(p => p.addressed).length;
  const totalCount = problems.length;

  return (
    <Card className="border-2 border-destructive/20">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-xl flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-destructive" />
            Problems to Address
          </CardTitle>
          <Badge className="bg-gradient-to-r from-primary to-accent text-white gap-1 border-0">
            <CheckCircle2 className="w-3 h-3" />
            <span className="font-bold">{addressedCount}/{totalCount}</span> Addressed
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {categories.map(category => {
          const categoryProblems = problems.filter(p => p.category === category);
          const categoryAddressed = categoryProblems.filter(p => p.addressed).length;
          
          return (
            <div key={category} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  {category}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {categoryAddressed}/{categoryProblems.length}
                </span>
              </div>
              
              <div className="space-y-2">
                {categoryProblems.map(problem => (
                  <div
                    key={problem.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover-elevate active-elevate-2 transition-all border border-border/50"
                    data-testid={`problem-${problem.id}`}
                  >
                    <Checkbox
                      checked={problem.addressed}
                      onCheckedChange={() => toggleProblem(problem.id)}
                      className="mt-0.5"
                      data-testid={`checkbox-${problem.id}`}
                    />
                    <label
                      onClick={() => toggleProblem(problem.id)}
                      className={`flex-1 text-sm cursor-pointer transition-all ${
                        problem.addressed 
                          ? 'line-through text-muted-foreground' 
                          : 'text-foreground'
                      }`}
                    >
                      {problem.text}
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
            <Badge variant={addressedCount >= 3 ? "default" : "secondary"} className={addressedCount >= 3 ? "bg-chart-3 hover:bg-chart-3" : ""}>
              {addressedCount >= 3 ? "✓ Target Met" : "3+ Required"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Address at least 3 problems per week for Platinum qualification. Check off problems as you work on them.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
