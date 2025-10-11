import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Check, X, TrendingUp, History, Edit2, Save } from 'lucide-react';

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
  currentBelief: string;
  currentActions: string;
  // Next Week Data
  targetRating: number;
  result: string;
  nextFeelings: string;
  nextWeekTarget: string;
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
    return [
      {
        category: 'Health',
        currentRating: 6,
        problems: "Lost 500gms, Anxiety controlled",
        currentFeelings: "Energetic, Peaceful, Strong",
        currentBelief: "I prioritize my health consistently",
        currentActions: "Morning walks, Meal prepping, Yoga 3x",
        targetRating: 7,
        result: "Reached ideal weight, Completely anxiety-free",
        nextFeelings: "Vibrant, Balanced, Healthy",
        nextWeekTarget: "I love and care for my body",
        nextActions: "Gym 4x week, Healthy meal plan",
        checklist: [
          { id: 'h1', text: "Gym 4x per week", checked: false },
          { id: 'h2', text: "Follow meal plan", checked: false },
          { id: 'h3', text: "Sleep 8 hours daily", checked: false }
        ],
        courseSuggestion: "Advanced Health Optimization",
        affirmationSuggestion: "I am the healthiest version of myself"
      },
      {
        category: 'Relationship',
        currentRating: 7,
        problems: "Strong bond with all relationships",
        currentFeelings: "Loved, Appreciated, Joyful",
        currentBelief: "I communicate with love and clarity",
        currentActions: "Date nights, Gratitude practice, Active listening",
        targetRating: 8,
        result: "Deep connection with family and colleagues",
        nextFeelings: "Fulfilled, Cherished, Peaceful",
        nextWeekTarget: "I attract loving relationships",
        nextActions: "Family time 3x week, Resolve conflicts peacefully",
        checklist: [
          { id: 'e1', text: "Family bonding activities", checked: false },
          { id: 'e2', text: "Weekly date night", checked: false },
          { id: 'e3', text: "Practice empathy daily", checked: false }
        ],
        courseSuggestion: "Deep Connection Mastery",
        affirmationSuggestion: "I am surrounded by love"
      },
      {
        category: 'Career',
        currentRating: 6,
        problems: "Got promotion, recognized at work",
        currentFeelings: "Successful, Fulfilled, Proud",
        currentBelief: "I am worthy of success and recognition",
        currentActions: "Taking initiative, Networking, Upskilling",
        targetRating: 7,
        result: "Leading important projects, Becoming expert",
        nextFeelings: "Accomplished, Confident, Respected",
        nextWeekTarget: "I create value and impact",
        nextActions: "Lead team project, Mentor junior colleagues",
        checklist: [
          { id: 'r1', text: "Lead team meeting", checked: false },
          { id: 'r2', text: "Complete certification", checked: false },
          { id: 'r3', text: "Mentor 2 colleagues", checked: false }
        ],
        courseSuggestion: "Leadership Excellence",
        affirmationSuggestion: "I am a natural leader"
      },
      {
        category: 'Money',
        currentRating: 5,
        problems: "Saved 15%, Started emergency fund",
        currentFeelings: "Wealthy, Grateful, Free",
        currentBelief: "Money flows to me with ease",
        currentActions: "Automated savings, Researching investments",
        targetRating: 6,
        result: "Built 3-month emergency fund, First investment",
        nextFeelings: "Prosperous, Abundant, Secure",
        nextWeekTarget: "I build lasting wealth",
        nextActions: "Open investment account, Increase income",
        checklist: [
          { id: 'c1', text: "Start investment portfolio", checked: false },
          { id: 'c2', text: "Side income stream", checked: false },
          { id: 'c3', text: "Financial planning session", checked: false }
        ],
        courseSuggestion: "Investment Foundations",
        affirmationSuggestion: "Wealth flows to me effortlessly"
      }
    ];
  }
};

const getCategoryColor = (category: string) => {
  const colors = {
    Health: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900',
    Relationship: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900',
    Career: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900',
    Money: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900'
  };
  return colors[category as keyof typeof colors] || '';
};

const getCategoryBadgeColor = (category: string) => {
  const colors = {
    Health: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    Relationship: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    Career: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    Money: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
  };
  return colors[category as keyof typeof colors] || '';
};

export default function UnifiedHERCMTable({ weekNumber, onGenerateNextWeek, onViewHistory }: UnifiedHERCMTableProps) {
  const [beliefs, setBeliefs] = useState<HERCMBelief[]>([]);
  const [editingField, setEditingField] = useState<{ category: string; field: string } | null>(null);

  useEffect(() => {
    setBeliefs(getWeekBeliefs(weekNumber));
  }, [weekNumber]);

  const handleToggleChecklist = (category: string, itemId: string) => {
    setBeliefs(prev => prev.map(belief => {
      if (belief.category === category) {
        return {
          ...belief,
          checklist: belief.checklist.map(item =>
            item.id === itemId ? { ...item, checked: !item.checked } : item
          )
        };
      }
      return belief;
    }));
  };

  const handleFieldEdit = (category: string, field: keyof HERCMBelief, value: string | number) => {
    setBeliefs(prev => prev.map(belief => {
      if (belief.category === category) {
        return { ...belief, [field]: value };
      }
      return belief;
    }));
  };

  const handleRatingChange = (category: string, newRating: number) => {
    setBeliefs(prev => prev.map(belief => {
      if (belief.category === category) {
        return {
          ...belief,
          currentRating: newRating,
          targetRating: newRating + 1 // Auto-increment by 1
        };
      }
      return belief;
    }));
  };


  const startEdit = (category: string, field: string) => {
    setEditingField({ category, field });
  };

  const stopEdit = () => {
    setEditingField(null);
  };

  const isEditing = (category: string, field: string) => {
    return editingField?.category === category && editingField?.field === field;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Badge className="text-lg px-4 py-1.5" data-testid="badge-week-number">
            Week {weekNumber}
          </Badge>
          <h2 className="text-2xl font-semibold">HERCM Belief Tracker</h2>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onViewHistory}
            data-testid="button-view-history"
          >
            <History className="w-4 h-4 mr-2" />
            History
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={onGenerateNextWeek}
            data-testid="button-generate-next-week"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Generate Next Week
          </Button>
        </div>
      </div>

      {/* HERCM Categories */}
      <div className="grid gap-6">
        {beliefs.map((belief) => (
          <Card 
            key={belief.category} 
            className={`${getCategoryColor(belief.category)} border-2`}
            data-testid={`card-hercm-${belief.category.toLowerCase()}`}
          >
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge className={`${getCategoryBadgeColor(belief.category)} text-base px-3 py-1`}>
                    {belief.category}
                  </Badge>
                  <span className="text-sm font-normal text-muted-foreground">
                    Rating: {belief.currentRating}/10 → {belief.targetRating}/10
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Week Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-red-300 dark:border-red-800">
                  <h3 className="font-semibold text-red-700 dark:text-red-400">Current Week</h3>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Current Rating */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Rating</label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={belief.currentRating}
                      onChange={(e) => handleRatingChange(belief.category, parseInt(e.target.value) || 1)}
                      className="mt-1"
                      data-testid={`input-current-rating-${belief.category.toLowerCase()}`}
                    />
                  </div>

                  {/* Problems */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                      Problems
                      {!isEditing(belief.category, 'problems') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(belief.category, 'problems')}
                          className="h-6 w-6 p-0"
                          data-testid={`button-edit-problems-${belief.category.toLowerCase()}`}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                      )}
                    </label>
                    {isEditing(belief.category, 'problems') ? (
                      <div className="flex gap-2 mt-1">
                        <Textarea
                          value={belief.problems}
                          onChange={(e) => handleFieldEdit(belief.category, 'problems', e.target.value)}
                          className="min-h-[80px]"
                          data-testid={`textarea-problems-${belief.category.toLowerCase()}`}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={stopEdit}
                          className="h-8 w-8 p-0"
                          data-testid={`button-save-problems-${belief.category.toLowerCase()}`}
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <p className="mt-1 text-sm p-2 bg-background rounded-md" data-testid={`text-problems-${belief.category.toLowerCase()}`}>
                        {belief.problems}
                      </p>
                    )}
                  </div>

                  {/* Current Feelings */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                      Feelings
                      {!isEditing(belief.category, 'currentFeelings') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(belief.category, 'currentFeelings')}
                          className="h-6 w-6 p-0"
                          data-testid={`button-edit-current-feelings-${belief.category.toLowerCase()}`}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                      )}
                    </label>
                    {isEditing(belief.category, 'currentFeelings') ? (
                      <div className="flex gap-2 mt-1">
                        <Input
                          value={belief.currentFeelings}
                          onChange={(e) => handleFieldEdit(belief.category, 'currentFeelings', e.target.value)}
                          data-testid={`input-current-feelings-${belief.category.toLowerCase()}`}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={stopEdit}
                          className="h-8 w-8 p-0"
                          data-testid={`button-save-current-feelings-${belief.category.toLowerCase()}`}
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <p className="mt-1 text-sm p-2 bg-background rounded-md" data-testid={`text-current-feelings-${belief.category.toLowerCase()}`}>
                        {belief.currentFeelings}
                      </p>
                    )}
                  </div>

                  {/* Current Beliefs/Reasons */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                      Beliefs/Reasons
                      {!isEditing(belief.category, 'currentBelief') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(belief.category, 'currentBelief')}
                          className="h-6 w-6 p-0"
                          data-testid={`button-edit-current-belief-${belief.category.toLowerCase()}`}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                      )}
                    </label>
                    {isEditing(belief.category, 'currentBelief') ? (
                      <div className="flex gap-2 mt-1">
                        <Textarea
                          value={belief.currentBelief}
                          onChange={(e) => handleFieldEdit(belief.category, 'currentBelief', e.target.value)}
                          className="min-h-[80px]"
                          data-testid={`textarea-current-belief-${belief.category.toLowerCase()}`}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={stopEdit}
                          className="h-8 w-8 p-0"
                          data-testid={`button-save-current-belief-${belief.category.toLowerCase()}`}
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <p className="mt-1 text-sm p-2 bg-background rounded-md" data-testid={`text-current-belief-${belief.category.toLowerCase()}`}>
                        {belief.currentBelief}
                      </p>
                    )}
                  </div>

                  {/* Current Actions */}
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                      Actions
                      {!isEditing(belief.category, 'currentActions') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(belief.category, 'currentActions')}
                          className="h-6 w-6 p-0"
                          data-testid={`button-edit-current-actions-${belief.category.toLowerCase()}`}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                      )}
                    </label>
                    {isEditing(belief.category, 'currentActions') ? (
                      <div className="flex gap-2 mt-1">
                        <Textarea
                          value={belief.currentActions}
                          onChange={(e) => handleFieldEdit(belief.category, 'currentActions', e.target.value)}
                          className="min-h-[80px]"
                          data-testid={`textarea-current-actions-${belief.category.toLowerCase()}`}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={stopEdit}
                          className="h-8 w-8 p-0"
                          data-testid={`button-save-current-actions-${belief.category.toLowerCase()}`}
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <p className="mt-1 text-sm p-2 bg-background rounded-md" data-testid={`text-current-actions-${belief.category.toLowerCase()}`}>
                        {belief.currentActions}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Next Week Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-green-300 dark:border-green-800">
                  <h3 className="font-semibold text-green-700 dark:text-green-400">Next Week</h3>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Target Rating */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Target Rating (auto +1)</label>
                    <Input
                      type="number"
                      value={belief.targetRating}
                      disabled
                      className="mt-1 bg-muted/50 cursor-not-allowed"
                      data-testid={`input-target-rating-${belief.category.toLowerCase()}`}
                    />
                  </div>

                  {/* Result */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                      Result
                      {!isEditing(belief.category, 'result') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(belief.category, 'result')}
                          className="h-6 w-6 p-0"
                          data-testid={`button-edit-result-${belief.category.toLowerCase()}`}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                      )}
                    </label>
                    {isEditing(belief.category, 'result') ? (
                      <div className="flex gap-2 mt-1">
                        <Textarea
                          value={belief.result}
                          onChange={(e) => handleFieldEdit(belief.category, 'result', e.target.value)}
                          className="min-h-[80px]"
                          data-testid={`textarea-result-${belief.category.toLowerCase()}`}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={stopEdit}
                          className="h-8 w-8 p-0"
                          data-testid={`button-save-result-${belief.category.toLowerCase()}`}
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <p className="mt-1 text-sm p-2 bg-background rounded-md" data-testid={`text-result-${belief.category.toLowerCase()}`}>
                        {belief.result}
                      </p>
                    )}
                  </div>

                  {/* Next Feelings */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                      Feelings
                      {!isEditing(belief.category, 'nextFeelings') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(belief.category, 'nextFeelings')}
                          className="h-6 w-6 p-0"
                          data-testid={`button-edit-next-feelings-${belief.category.toLowerCase()}`}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                      )}
                    </label>
                    {isEditing(belief.category, 'nextFeelings') ? (
                      <div className="flex gap-2 mt-1">
                        <Input
                          value={belief.nextFeelings}
                          onChange={(e) => handleFieldEdit(belief.category, 'nextFeelings', e.target.value)}
                          data-testid={`input-next-feelings-${belief.category.toLowerCase()}`}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={stopEdit}
                          className="h-8 w-8 p-0"
                          data-testid={`button-save-next-feelings-${belief.category.toLowerCase()}`}
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <p className="mt-1 text-sm p-2 bg-background rounded-md" data-testid={`text-next-feelings-${belief.category.toLowerCase()}`}>
                        {belief.nextFeelings}
                      </p>
                    )}
                  </div>

                  {/* Next Week Beliefs */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                      Beliefs
                      {!isEditing(belief.category, 'nextWeekTarget') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(belief.category, 'nextWeekTarget')}
                          className="h-6 w-6 p-0"
                          data-testid={`button-edit-next-belief-${belief.category.toLowerCase()}`}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                      )}
                    </label>
                    {isEditing(belief.category, 'nextWeekTarget') ? (
                      <div className="flex gap-2 mt-1">
                        <Textarea
                          value={belief.nextWeekTarget}
                          onChange={(e) => handleFieldEdit(belief.category, 'nextWeekTarget', e.target.value)}
                          className="min-h-[80px]"
                          data-testid={`textarea-next-belief-${belief.category.toLowerCase()}`}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={stopEdit}
                          className="h-8 w-8 p-0"
                          data-testid={`button-save-next-belief-${belief.category.toLowerCase()}`}
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <p className="mt-1 text-sm p-2 bg-background rounded-md" data-testid={`text-next-belief-${belief.category.toLowerCase()}`}>
                        {belief.nextWeekTarget}
                      </p>
                    )}
                  </div>

                  {/* Next Actions */}
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                      Actions
                      {!isEditing(belief.category, 'nextActions') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(belief.category, 'nextActions')}
                          className="h-6 w-6 p-0"
                          data-testid={`button-edit-next-actions-${belief.category.toLowerCase()}`}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                      )}
                    </label>
                    {isEditing(belief.category, 'nextActions') ? (
                      <div className="flex gap-2 mt-1">
                        <Textarea
                          value={belief.nextActions}
                          onChange={(e) => handleFieldEdit(belief.category, 'nextActions', e.target.value)}
                          className="min-h-[80px]"
                          data-testid={`textarea-next-actions-${belief.category.toLowerCase()}`}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={stopEdit}
                          className="h-8 w-8 p-0"
                          data-testid={`button-save-next-actions-${belief.category.toLowerCase()}`}
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <p className="mt-1 text-sm p-2 bg-background rounded-md" data-testid={`text-next-actions-${belief.category.toLowerCase()}`}>
                        {belief.nextActions}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* AI & Progress Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-blue-300 dark:border-blue-800">
                  <h3 className="font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    AI & Progress
                  </h3>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Course Suggestion */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Course Suggestion</label>
                    <p className="mt-1 text-sm p-2 bg-blue-50 dark:bg-blue-950/30 rounded-md" data-testid={`text-course-${belief.category.toLowerCase()}`}>
                      {belief.courseSuggestion}
                    </p>
                  </div>

                  {/* Affirmation */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Affirmation</label>
                    <p className="mt-1 text-sm p-2 bg-blue-50 dark:bg-blue-950/30 rounded-md italic" data-testid={`text-affirmation-${belief.category.toLowerCase()}`}>
                      "{belief.affirmationSuggestion}"
                    </p>
                  </div>

                  {/* Action Checklist */}
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">Action Checklist</label>
                    <div className="mt-2 space-y-2">
                      {belief.checklist.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-2 rounded-md hover-elevate active-elevate-2 cursor-pointer"
                          onClick={() => handleToggleChecklist(belief.category, item.id)}
                          data-testid={`checklist-item-${item.id}`}
                        >
                          <div className={`flex items-center justify-center w-5 h-5 rounded border-2 transition-colors ${
                            item.checked 
                              ? 'bg-primary border-primary' 
                              : 'border-muted-foreground/30'
                          }`}>
                            {item.checked && <Check className="w-3 h-3 text-primary-foreground" />}
                          </div>
                          <span className={`text-sm flex-1 ${item.checked ? 'line-through text-muted-foreground' : ''}`}>
                            {item.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
