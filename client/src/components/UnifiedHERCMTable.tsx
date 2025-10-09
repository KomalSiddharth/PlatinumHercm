import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Check, X, TrendingUp, History } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

interface HERCMBelief {
  category: 'Health' | 'Relationship' | 'Career' | 'Money';
  currentBelief: string;
  nextWeekTarget: string;
  checklist: ChecklistItem[];
  courseSuggestion: string;
  affirmationSuggestion: string;
}

interface UnifiedHERCMTableProps {
  weekNumber: number;
  onGenerateNextWeek: () => void;
  onViewHistory: () => void;
}

// Week-specific belief data generator
const getWeekBeliefs = (week: number): HERCMBelief[] => {
  if (week === 1) {
    return [
      {
        category: 'Health',
        currentBelief: "I can't stick to a routine",
        nextWeekTarget: "I create simple, sustainable habits",
        checklist: [
          { id: 'h1', text: "Walk 10 min daily", checked: false },
          { id: 'h2', text: "Drink 8 glasses water", checked: false },
          { id: 'h3', text: "Sleep by 11 PM", checked: false }
        ],
        courseSuggestion: "Health Foundations - Module 1",
        affirmationSuggestion: "I am disciplined and consistent"
      },
      {
        category: 'Relationship',
        currentBelief: "I'm not good at relationships",
        nextWeekTarget: "I build meaningful connections",
        checklist: [
          { id: 'e1', text: "Daily check-in with partner", checked: false },
          { id: 'e2', text: "Express gratitude 3x", checked: false },
          { id: 'e3', text: "Quality time 30 min", checked: false }
        ],
        courseSuggestion: "Relationship Basics - Module 1",
        affirmationSuggestion: "I am worthy of love and connection"
      },
      {
        category: 'Career',
        currentBelief: "I'm stuck in my career",
        nextWeekTarget: "I take steps toward my goals",
        checklist: [
          { id: 'r1', text: "Update resume", checked: false },
          { id: 'r2', text: "Network with 2 people", checked: false },
          { id: 'r3', text: "Learn new skill 30 min", checked: false }
        ],
        courseSuggestion: "Career Growth - Module 1",
        affirmationSuggestion: "I am capable of achieving my dreams"
      },
      {
        category: 'Money',
        currentBelief: "I'll never be financially free",
        nextWeekTarget: "I manage money wisely",
        checklist: [
          { id: 'c1', text: "Track all expenses", checked: false },
          { id: 'c2', text: "Save 10% income", checked: false },
          { id: 'c3', text: "Review budget weekly", checked: false }
        ],
        courseSuggestion: "Financial Literacy - Module 1",
        affirmationSuggestion: "Money flows to me naturally"
      }
    ];
  } else if (week === 2) {
    return [
      {
        category: 'Health',
        currentBelief: "I create simple, sustainable habits",
        nextWeekTarget: "I prioritize my health consistently",
        checklist: [
          { id: 'h1', text: "20 min morning walk", checked: false },
          { id: 'h2', text: "Meal prep Sunday", checked: false },
          { id: 'h3', text: "Yoga 3x per week", checked: false }
        ],
        courseSuggestion: "Health Mastery - Module 2",
        affirmationSuggestion: "My body is my temple"
      },
      {
        category: 'Relationship',
        currentBelief: "I build meaningful connections",
        nextWeekTarget: "I communicate with love and clarity",
        checklist: [
          { id: 'e1', text: "Daily gratitude practice", checked: false },
          { id: 'e2', text: "Plan date night", checked: false },
          { id: 'e3', text: "Active listening 15 min", checked: false }
        ],
        courseSuggestion: "Relationship Mastery - Communication",
        affirmationSuggestion: "I express love freely"
      },
      {
        category: 'Career',
        currentBelief: "I take steps toward my goals",
        nextWeekTarget: "I am worthy of success and recognition",
        checklist: [
          { id: 'r1', text: "Complete project milestone", checked: false },
          { id: 'r2', text: "Speak up in meetings", checked: false },
          { id: 'r3', text: "Request feedback", checked: false }
        ],
        courseSuggestion: "Career Excellence - Leadership",
        affirmationSuggestion: "I deserve success"
      },
      {
        category: 'Money',
        currentBelief: "I manage money wisely",
        nextWeekTarget: "Money flows to me with ease",
        checklist: [
          { id: 'c1', text: "Automate savings", checked: false },
          { id: 'c2', text: "Research investments", checked: false },
          { id: 'c3', text: "Cut 2 unnecessary expenses", checked: false }
        ],
        courseSuggestion: "Wealth Building - Module 2",
        affirmationSuggestion: "I attract abundance"
      }
    ];
  } else {
    // Week 3+: Further progression
    return [
      {
        category: 'Health',
        currentBelief: "I prioritize my health consistently",
        nextWeekTarget: "I am a fitness role model",
        checklist: [
          { id: 'h1', text: "30 min workout daily", checked: false },
          { id: 'h2', text: "Cook healthy meals 5x", checked: false },
          { id: 'h3', text: "Meditation 10 min", checked: false }
        ],
        courseSuggestion: "Advanced Health - Module 3",
        affirmationSuggestion: "I radiate health and vitality"
      },
      {
        category: 'Relationship',
        currentBelief: "I communicate with love and clarity",
        nextWeekTarget: "I am a master at deep connections",
        checklist: [
          { id: 'e1', text: "Deep conversation daily", checked: false },
          { id: 'e2', text: "Show appreciation 5x", checked: false },
          { id: 'e3', text: "Quality time 1 hour", checked: false }
        ],
        courseSuggestion: "Relationship Mastery - Advanced",
        affirmationSuggestion: "Love flows through me"
      },
      {
        category: 'Career',
        currentBelief: "I am worthy of success and recognition",
        nextWeekTarget: "I am a leader in my field",
        checklist: [
          { id: 'r1', text: "Lead team project", checked: false },
          { id: 'r2', text: "Mentor junior colleague", checked: false },
          { id: 'r3', text: "Deliver presentation", checked: false }
        ],
        courseSuggestion: "Leadership Mastery - Module 3",
        affirmationSuggestion: "I am a respected leader"
      },
      {
        category: 'Money',
        currentBelief: "Money flows to me with ease",
        nextWeekTarget: "I am financially abundant",
        checklist: [
          { id: 'c1', text: "Invest 20% income", checked: false },
          { id: 'c2', text: "Create passive income stream", checked: false },
          { id: 'c3', text: "Financial review weekly", checked: false }
        ],
        courseSuggestion: "Wealth Mastery - Advanced",
        affirmationSuggestion: "Abundance is my birthright"
      }
    ];
  }
};

export default function UnifiedHERCMTable({
  weekNumber,
  onGenerateNextWeek,
  onViewHistory
}: UnifiedHERCMTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ currentBelief: string; nextWeekTarget: string }>({
    currentBelief: '',
    nextWeekTarget: ''
  });

  const [beliefs, setBeliefs] = useState<HERCMBelief[]>(getWeekBeliefs(weekNumber));

  // Update beliefs when week changes
  useEffect(() => {
    setBeliefs(getWeekBeliefs(weekNumber));
  }, [weekNumber]);

  const calculateProgress = (checklist: ChecklistItem[]) => {
    if (checklist.length === 0) return 0;
    const checkedCount = checklist.filter(item => item.checked).length;
    return Math.round((checkedCount / checklist.length) * 100);
  };

  const handleChecklistToggle = (category: string, itemId: string) => {
    setBeliefs(beliefs.map(b => {
      if (b.category === category) {
        const updatedChecklist = b.checklist.map(item =>
          item.id === itemId ? { ...item, checked: !item.checked } : item
        );
        return { ...b, checklist: updatedChecklist };
      }
      return b;
    }));
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-chart-3 text-white';
    if (progress >= 50) return 'bg-yellow-500 text-white';
    return 'bg-muted text-muted-foreground';
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'Health': 'text-chart-1',
      'Relationship': 'text-chart-2', 
      'Career': 'text-chart-4',
      'Money': 'text-chart-5'
    };
    return colors[category as keyof typeof colors] || 'text-foreground';
  };

  const startEditing = (category: string) => {
    const belief = beliefs.find(b => b.category === category);
    if (belief) {
      setEditingId(category);
      setEditValues({
        currentBelief: belief.currentBelief,
        nextWeekTarget: belief.nextWeekTarget
      });
    }
  };

  const saveEdit = (category: string) => {
    setBeliefs(beliefs.map(b => 
      b.category === category 
        ? { ...b, currentBelief: editValues.currentBelief, nextWeekTarget: editValues.nextWeekTarget }
        : b
    ));
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({ currentBelief: '', nextWeekTarget: '' });
  };

  const handleRegenerateAI = (category: string) => {
    console.log('Regenerating AI suggestions for:', category);
  };

  const weeklyProgress = Math.round(
    beliefs.reduce((sum, b) => sum + calculateProgress(b.checklist), 0) / beliefs.length
  );

  return (
    <div className="space-y-6">
      {/* Week Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Week {weekNumber} - HERCM Tracker
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Track all 4 life areas in one unified view
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={getProgressColor(weeklyProgress)} data-testid="badge-weekly-progress">
            {weeklyProgress}% Weekly Progress
          </Badge>
          <Button 
            variant="outline" 
            onClick={onViewHistory}
            data-testid="button-view-history"
          >
            <History className="w-4 h-4 mr-2" />
            View History
          </Button>
          <Button 
            onClick={onGenerateNextWeek}
            className="bg-gradient-to-r from-primary to-accent"
            data-testid="button-generate-next-week"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Generate Next Week
          </Button>
        </div>
      </div>

      {/* Unified Excel-Style Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[120px] font-bold">HERCM Area</TableHead>
              <TableHead className="w-[250px] font-bold">Current Belief</TableHead>
              <TableHead className="w-[250px] font-bold">Next Week Target</TableHead>
              <TableHead className="w-[200px] font-bold">
                <div className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-primary" />
                  Course Suggestion
                </div>
              </TableHead>
              <TableHead className="w-[200px] font-bold">
                <div className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-accent" />
                  Affirmation
                </div>
              </TableHead>
              <TableHead className="w-[200px] font-bold">
                <div className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-chart-3" />
                  Action Checklist
                </div>
              </TableHead>
              <TableHead className="w-[100px] font-bold text-center">Progress</TableHead>
              <TableHead className="w-[80px] font-bold text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {beliefs.map((belief) => (
              <TableRow key={belief.category} data-testid={`row-hercm-${belief.category.toLowerCase()}`}>
                {/* HERCM Category */}
                <TableCell className="font-semibold">
                  <div className={`${getCategoryColor(belief.category)}`}>
                    {belief.category}
                  </div>
                </TableCell>

                {/* Current Belief */}
                <TableCell className="p-2">
                  {editingId === belief.category ? (
                    <Textarea
                      value={editValues.currentBelief}
                      onChange={(e) => setEditValues({ ...editValues, currentBelief: e.target.value })}
                      className="resize-none h-20 text-sm"
                      data-testid={`input-edit-current-${belief.category.toLowerCase()}`}
                    />
                  ) : (
                    <div 
                      className="text-sm p-2 rounded bg-muted/30 min-h-[60px] cursor-pointer hover-elevate"
                      onClick={() => startEditing(belief.category)}
                      data-testid={`text-current-belief-${belief.category.toLowerCase()}`}
                    >
                      {belief.currentBelief}
                    </div>
                  )}
                </TableCell>

                {/* Next Week Target */}
                <TableCell className="p-2">
                  {editingId === belief.category ? (
                    <Textarea
                      value={editValues.nextWeekTarget}
                      onChange={(e) => setEditValues({ ...editValues, nextWeekTarget: e.target.value })}
                      className="resize-none h-20 text-sm border-accent/50"
                      data-testid={`input-edit-target-${belief.category.toLowerCase()}`}
                    />
                  ) : (
                    <div 
                      className="text-sm p-2 rounded bg-accent/5 border border-accent/20 min-h-[60px] cursor-pointer hover-elevate"
                      onClick={() => startEditing(belief.category)}
                      data-testid={`text-next-target-${belief.category.toLowerCase()}`}
                    >
                      {belief.nextWeekTarget}
                    </div>
                  )}
                </TableCell>

                {/* Course Suggestion */}
                <TableCell className="p-2">
                  <div className="text-sm p-2 rounded bg-primary/5 border border-primary/20 min-h-[60px]" data-testid={`text-course-${belief.category.toLowerCase()}`}>
                    {belief.courseSuggestion}
                  </div>
                </TableCell>

                {/* Affirmation */}
                <TableCell className="p-2">
                  <div className="text-sm p-2 rounded bg-accent/5 border border-accent/20 min-h-[60px] italic" data-testid={`text-affirmation-${belief.category.toLowerCase()}`}>
                    "{belief.affirmationSuggestion}"
                  </div>
                </TableCell>

                {/* Checklist */}
                <TableCell className="p-2">
                  <div className="text-sm p-2 rounded bg-chart-3/5 border border-chart-3/20 min-h-[60px]">
                    <div className="space-y-2">
                      {belief.checklist.map((item, idx) => (
                        <label 
                          key={item.id} 
                          className="flex items-start gap-2 text-xs cursor-pointer hover-elevate rounded p-1"
                          data-testid={`label-checklist-${belief.category.toLowerCase()}-${idx}`}
                        >
                          <input
                            type="checkbox"
                            checked={item.checked}
                            onChange={() => handleChecklistToggle(belief.category, item.id)}
                            className="mt-0.5 w-3.5 h-3.5 rounded border-chart-3 text-chart-3 focus:ring-chart-3 cursor-pointer"
                            data-testid={`checkbox-checklist-${belief.category.toLowerCase()}-${idx}`}
                          />
                          <span className={item.checked ? 'line-through text-muted-foreground' : ''}>
                            {item.text}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </TableCell>

                {/* Progress */}
                <TableCell className="text-center p-2">
                  <Badge className={getProgressColor(calculateProgress(belief.checklist))} data-testid={`badge-progress-${belief.category.toLowerCase()}`}>
                    {calculateProgress(belief.checklist)}%
                  </Badge>
                </TableCell>

                {/* Actions */}
                <TableCell className="p-2">
                  {editingId === belief.category ? (
                    <div className="flex flex-col gap-1">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => saveEdit(belief.category)}
                        data-testid={`button-save-${belief.category.toLowerCase()}`}
                      >
                        <Check className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelEdit}
                        data-testid={`button-cancel-${belief.category.toLowerCase()}`}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRegenerateAI(belief.category)}
                      data-testid={`button-regenerate-${belief.category.toLowerCase()}`}
                    >
                      <Sparkles className="w-3 h-3" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Info Footer */}
      <div className="bg-muted/30 rounded-lg p-4 text-sm text-muted-foreground">
        <p className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <strong>AI-Powered Weekly Progression:</strong> When you click "Generate Next Week", AI analyzes your progress and creates next week's targets. 80%+ completion transforms your belief!
        </p>
      </div>
    </div>
  );
}
