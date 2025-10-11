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
  // Current Week Data
  currentRating: number;
  problems: string;
  currentFeelings: string;
  currentBelief: string; // Beliefs/Reasons
  currentActions: string;
  // Next Week Data
  targetRating: number;
  result: string;
  nextFeelings: string;
  nextWeekTarget: string; // Next Beliefs
  nextActions: string;
  // AI Suggestions & Checklist
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
        currentRating: 4,
        problems: "Overweight 2kgs, Anxiety, Panick Attacks",
        currentFeelings: "Lazy, Tensed, Anxiety",
        currentBelief: "I have anxiety because of financial problems",
        currentActions: "I overeat, I don't exercise",
        targetRating: 5,
        result: "I will lose 200 gms, reduced anxiety attacks",
        nextFeelings: "Active, Relaxed, Calm",
        nextWeekTarget: "I create healthy habits that reduce my anxiety",
        nextActions: "Walk 2000 steps 3/week, Practice ALOA breathing",
        checklist: [
          { id: 'h1', text: "ALOA breathing 2x daily", checked: false },
          { id: 'h2', text: "Walk 2000 steps 3/week", checked: false },
          { id: 'h3', text: "Stop overeating", checked: false }
        ],
        courseSuggestion: "Health Foundations - Module 1",
        affirmationSuggestion: "I am disciplined and consistent"
      },
      {
        category: 'Relationship',
        currentRating: 5,
        problems: "Conflicts with Boss, Not getting along with Life partner",
        currentFeelings: "Lonely, Angry, Sad",
        currentBelief: "I get angry at my family. My boss is not supporting me",
        currentActions: "I get angry at my family, I shout a lot, I am not a good listener",
        targetRating: 6,
        result: "I am now getting along with my Boss, Better communication with partner",
        nextFeelings: "Happy, Peaceful, Connected",
        nextWeekTarget: "My boss and I have mutual respect. I communicate with love",
        nextActions: "Daily gratitude, Active listening 15min, Quality time with partner",
        checklist: [
          { id: 'e1', text: "Daily gratitude practice", checked: false },
          { id: 'e2', text: "Active listening 15 min", checked: false },
          { id: 'e3', text: "Quality time 30 min", checked: false }
        ],
        courseSuggestion: "Relationship Basics - Module 1",
        affirmationSuggestion: "I am worthy of love and connection"
      },
      {
        category: 'Career',
        currentRating: 4,
        problems: "No job, stuck in a unsatisfied job",
        currentFeelings: "Helpless, Failure",
        currentBelief: "I am not skilled enough for better opportunities",
        currentActions: "Not giving interviews, not making videos, procrastinating",
        targetRating: 5,
        result: "I got a job offer, I feel satisfied with my progress",
        nextFeelings: "Confident, Motivated",
        nextWeekTarget: "I am worthy of success and recognition",
        nextActions: "Apply to 5 jobs, Update resume, Practice interviews",
        checklist: [
          { id: 'r1', text: "Apply to 5 jobs", checked: false },
          { id: 'r2', text: "Update resume", checked: false },
          { id: 'r3', text: "Practice mock interview", checked: false }
        ],
        courseSuggestion: "Career Growth - Module 1",
        affirmationSuggestion: "I am capable of achieving my dreams"
      },
      {
        category: 'Money',
        currentRating: 3,
        problems: "Not able to Save money",
        currentFeelings: "Small, Poor",
        currentBelief: "I don't earn enough to save",
        currentActions: "Not tracking expenses, impulse buying, no budget",
        targetRating: 4,
        result: "I saved 10% of income successfully",
        nextFeelings: "Abundant, Secure",
        nextWeekTarget: "Money flows to me naturally",
        nextActions: "Track expenses daily, Save 10%, Cut unnecessary expenses",
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
        currentRating: 5,
        problems: "Weight reduced by 200gms, Less anxiety",
        currentFeelings: "Active, Relaxed, Calm",
        currentBelief: "I am building healthy habits",
        currentActions: "Walking 2000 steps, practicing ALOA",
        targetRating: 6,
        result: "I will lose 500 gms, Anxiety under control",
        nextFeelings: "Energetic, Peaceful, Strong",
        nextWeekTarget: "I prioritize my health consistently",
        nextActions: "20 min morning walk, Meal prep Sunday",
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
        currentRating: 6,
        problems: "Better communication with Boss",
        currentFeelings: "Happy, Peaceful, Connected",
        currentBelief: "I build meaningful connections",
        currentActions: "Daily gratitude, Active listening",
        targetRating: 7,
        result: "Strong bond with partner and boss",
        nextFeelings: "Loved, Appreciated, Joyful",
        nextWeekTarget: "I communicate with love and clarity",
        nextActions: "Plan date night, Express gratitude 5x",
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
        currentRating: 5,
        problems: "Got job interview calls",
        currentFeelings: "Confident, Motivated",
        currentBelief: "I take steps toward my goals",
        currentActions: "Applied to 5 jobs, Updated resume",
        targetRating: 6,
        result: "Received job offer",
        nextFeelings: "Successful, Fulfilled, Proud",
        nextWeekTarget: "I am worthy of success and recognition",
        nextActions: "Complete project milestone, Network actively",
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
        currentRating: 4,
        problems: "Saved 10% of income successfully",
        currentFeelings: "Abundant, Secure",
        currentBelief: "I manage money wisely",
        currentActions: "Tracking expenses, Saving 10%",
        targetRating: 5,
        result: "Saved 15% of income, Created emergency fund",
        nextFeelings: "Wealthy, Grateful, Free",
        nextWeekTarget: "Money flows to me with ease",
        nextActions: "Increase savings, Explore investments",
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
        currentRating: 6,
        problems: "Lost 500gms, Anxiety controlled",
        currentFeelings: "Energetic, Peaceful, Strong",
        currentBelief: "I prioritize my health consistently",
        currentActions: "Morning walks, Meal prepping, Yoga 3x",
        targetRating: 7,
        result: "Achieve ideal weight, Complete mental peace",
        nextFeelings: "Vibrant, Confident, Healthy",
        nextWeekTarget: "I am a fitness role model",
        nextActions: "30 min workout daily, Cook healthy meals 5x",
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
        currentRating: 7,
        problems: "Strong relationship with all",
        currentFeelings: "Loved, Appreciated, Joyful",
        currentBelief: "I communicate with love and clarity",
        currentActions: "Date nights, Gratitude practice, Active listening",
        targetRating: 8,
        result: "Deep connection with loved ones",
        nextFeelings: "Fulfilled, Connected, Blessed",
        nextWeekTarget: "I am a master at deep connections",
        nextActions: "Deep conversations daily, Show appreciation 5x",
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
        currentRating: 6,
        problems: "Got the job, Performing well",
        currentFeelings: "Successful, Fulfilled, Proud",
        currentBelief: "I am worthy of success and recognition",
        currentActions: "Project completion, Networking, Seeking feedback",
        targetRating: 7,
        result: "Promotion, Recognition as leader",
        nextFeelings: "Accomplished, Respected, Inspired",
        nextWeekTarget: "I am a leader in my field",
        nextActions: "Lead team project, Mentor colleagues",
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
        currentRating: 5,
        problems: "Saved 15%, Emergency fund created",
        currentFeelings: "Wealthy, Grateful, Free",
        currentBelief: "Money flows to me with ease",
        currentActions: "Automated savings, Researching investments",
        targetRating: 6,
        result: "Passive income started, 20% savings",
        nextFeelings: "Abundant, Prosperous, Generous",
        nextWeekTarget: "I am financially abundant",
        nextActions: "Invest 20% income, Create passive income",
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
      'Health': 'text-emerald-700 dark:text-emerald-400',
      'Relationship': 'text-pink-700 dark:text-pink-400', 
      'Career': 'text-blue-700 dark:text-blue-400',
      'Money': 'text-amber-700 dark:text-amber-400'
    };
    return colors[category as keyof typeof colors] || 'text-foreground';
  };

  const getCategoryBadgeStyle = (category: string) => {
    const styles = {
      'Health': 'bg-emerald-100 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700',
      'Relationship': 'bg-pink-100 dark:bg-pink-950 border-pink-300 dark:border-pink-700',
      'Career': 'bg-blue-100 dark:bg-blue-950 border-blue-300 dark:border-blue-700',
      'Money': 'bg-amber-100 dark:bg-amber-950 border-amber-300 dark:border-amber-700'
    };
    return styles[category as keyof typeof styles] || 'bg-muted';
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
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            {/* Section Headers Row */}
            <TableRow className="bg-muted/50">
              <TableHead className="font-bold border-r" rowSpan={2}>HERCM Area</TableHead>
              <TableHead className="bg-red-100 dark:bg-red-950/40 font-bold text-center border-r" colSpan={5}>
                <span className="text-red-700 dark:text-red-400">Current Week</span>
              </TableHead>
              <TableHead className="bg-emerald-100 dark:bg-emerald-950/40 font-bold text-center border-r" colSpan={5}>
                <span className="text-emerald-700 dark:text-emerald-400">Next Week</span>
              </TableHead>
              <TableHead className="bg-blue-100 dark:bg-blue-950/40 font-bold text-center" colSpan={4}>
                <span className="text-blue-700 dark:text-blue-400">AI & Progress</span>
              </TableHead>
            </TableRow>
            {/* Column Headers Row */}
            <TableRow className="bg-muted/50">
              {/* Current Week Columns */}
              <TableHead className="w-[80px] bg-red-50 dark:bg-red-950/20 font-semibold">Rating</TableHead>
              <TableHead className="w-[180px] bg-red-50 dark:bg-red-950/20 font-semibold">Problems</TableHead>
              <TableHead className="w-[150px] bg-red-50 dark:bg-red-950/20 font-semibold">Feelings</TableHead>
              <TableHead className="w-[180px] bg-red-50 dark:bg-red-950/20 font-semibold">Beliefs/Reasons</TableHead>
              <TableHead className="w-[180px] bg-red-50 dark:bg-red-950/20 font-semibold border-r">Actions</TableHead>
              
              {/* Next Week Columns */}
              <TableHead className="w-[80px] bg-emerald-50 dark:bg-emerald-950/20 font-semibold">Target</TableHead>
              <TableHead className="w-[180px] bg-emerald-50 dark:bg-emerald-950/20 font-semibold">Result</TableHead>
              <TableHead className="w-[150px] bg-emerald-50 dark:bg-emerald-950/20 font-semibold">Feelings</TableHead>
              <TableHead className="w-[180px] bg-emerald-50 dark:bg-emerald-950/20 font-semibold">Beliefs</TableHead>
              <TableHead className="w-[180px] bg-emerald-50 dark:bg-emerald-950/20 font-semibold border-r">Actions</TableHead>
              
              {/* AI & Progress Columns */}
              <TableHead className="w-[180px] bg-blue-50 dark:bg-blue-950/20 font-semibold">
                <div className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Course
                </div>
              </TableHead>
              <TableHead className="w-[180px] bg-blue-50 dark:bg-blue-950/20 font-semibold">
                <div className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Affirmation
                </div>
              </TableHead>
              <TableHead className="w-[150px] bg-blue-50 dark:bg-blue-950/20 font-semibold">Checklist</TableHead>
              <TableHead className="w-[100px] bg-blue-50 dark:bg-blue-950/20 font-semibold text-center">Progress</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {beliefs.map((belief) => (
              <TableRow key={belief.category} data-testid={`row-hercm-${belief.category.toLowerCase()}`}>
                {/* HERCM Category */}
                <TableCell className="font-semibold border-r">
                  <Badge className={`${getCategoryBadgeStyle(belief.category)} ${getCategoryColor(belief.category)} border`}>
                    {belief.category}
                  </Badge>
                </TableCell>

                {/* Current Week Section */}
                <TableCell className="p-2 bg-red-50/30 dark:bg-red-950/10 text-center">
                  <div className="text-2xl font-bold text-red-700 dark:text-red-400" data-testid={`text-current-rating-${belief.category.toLowerCase()}`}>
                    {belief.currentRating}
                  </div>
                </TableCell>
                <TableCell className="p-2 bg-red-50/30 dark:bg-red-950/10">
                  <div className="text-sm" data-testid={`text-problems-${belief.category.toLowerCase()}`}>
                    {belief.problems}
                  </div>
                </TableCell>
                <TableCell className="p-2 bg-red-50/30 dark:bg-red-950/10">
                  <div className="text-sm text-red-700 dark:text-red-400" data-testid={`text-current-feelings-${belief.category.toLowerCase()}`}>
                    {belief.currentFeelings}
                  </div>
                </TableCell>
                <TableCell className="p-2 bg-red-50/30 dark:bg-red-950/10">
                  <div className="text-sm" data-testid={`text-current-belief-${belief.category.toLowerCase()}`}>
                    {belief.currentBelief}
                  </div>
                </TableCell>
                <TableCell className="p-2 bg-red-50/30 dark:bg-red-950/10 border-r">
                  <div className="text-sm" data-testid={`text-current-actions-${belief.category.toLowerCase()}`}>
                    {belief.currentActions}
                  </div>
                </TableCell>

                {/* Next Week Section */}
                <TableCell className="p-2 bg-emerald-50/30 dark:bg-emerald-950/10 text-center">
                  <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400" data-testid={`text-target-rating-${belief.category.toLowerCase()}`}>
                    {belief.targetRating}
                  </div>
                </TableCell>
                <TableCell className="p-2 bg-emerald-50/30 dark:bg-emerald-950/10">
                  <div className="text-sm" data-testid={`text-result-${belief.category.toLowerCase()}`}>
                    {belief.result}
                  </div>
                </TableCell>
                <TableCell className="p-2 bg-emerald-50/30 dark:bg-emerald-950/10">
                  <div className="text-sm text-emerald-700 dark:text-emerald-400" data-testid={`text-next-feelings-${belief.category.toLowerCase()}`}>
                    {belief.nextFeelings}
                  </div>
                </TableCell>
                <TableCell className="p-2 bg-emerald-50/30 dark:bg-emerald-950/10">
                  <div className="text-sm" data-testid={`text-next-target-${belief.category.toLowerCase()}`}>
                    {belief.nextWeekTarget}
                  </div>
                </TableCell>
                <TableCell className="p-2 bg-emerald-50/30 dark:bg-emerald-950/10 border-r">
                  <div className="text-sm" data-testid={`text-next-actions-${belief.category.toLowerCase()}`}>
                    {belief.nextActions}
                  </div>
                </TableCell>

                {/* AI & Progress Section */}
                <TableCell className="p-2 bg-blue-50/30 dark:bg-blue-950/10">
                  <div className="text-sm" data-testid={`text-course-${belief.category.toLowerCase()}`}>
                    {belief.courseSuggestion}
                  </div>
                </TableCell>
                <TableCell className="p-2 bg-blue-50/30 dark:bg-blue-950/10">
                  <div className="text-sm italic" data-testid={`text-affirmation-${belief.category.toLowerCase()}`}>
                    "{belief.affirmationSuggestion}"
                  </div>
                </TableCell>
                <TableCell className="p-2 bg-blue-50/30 dark:bg-blue-950/10">
                  <div className="space-y-1">
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
                          className="mt-0.5 w-3.5 h-3.5 rounded border-blue-500 text-blue-500 focus:ring-blue-500 cursor-pointer"
                          data-testid={`checkbox-checklist-${belief.category.toLowerCase()}-${idx}`}
                        />
                        <span className={item.checked ? 'line-through text-muted-foreground' : ''}>
                          {item.text}
                        </span>
                      </label>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-center p-2 bg-blue-50/30 dark:bg-blue-950/10">
                  <Badge className={getProgressColor(calculateProgress(belief.checklist))} data-testid={`badge-progress-${belief.category.toLowerCase()}`}>
                    {calculateProgress(belief.checklist)}%
                  </Badge>
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
