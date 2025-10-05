import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Sparkles, Check, X } from 'lucide-react';
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

interface Belief {
  id: string;
  currentBelief: string;
  nextWeekTarget: string;
  checklist: ChecklistItem[];
  courseSuggestion: string;
  affirmationSuggestion: string;
  weekNumber: number;
}

interface BeliefTableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: 'health' | 'relationship' | 'career' | 'money';
  categoryName: string;
}

export default function BeliefTableModal({
  open,
  onOpenChange,
  category,
  categoryName
}: BeliefTableModalProps) {
  const currentWeek = new Date().getWeek();
  
  const [beliefs, setBeliefs] = useState<Belief[]>([
    {
      id: '1',
      weekNumber: currentWeek,
      currentBelief: "I don't know how to make money",
      nextWeekTarget: "I am learning proven ways to create wealth",
      checklist: [
        { id: '1-1', text: "Watch 'Money Mindset Mastery' course", checked: true },
        { id: '1-2', text: "Practice daily wealth affirmations", checked: true },
        { id: '1-3', text: "Read 1 chapter on financial literacy", checked: false }
      ],
      courseSuggestion: "Money Mindset Mastery - Module 3",
      affirmationSuggestion: "Money flows to me easily and effortlessly"
    }
  ]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ currentBelief: string; nextWeekTarget: string }>({
    currentBelief: '',
    nextWeekTarget: ''
  });
  const [newBelief, setNewBelief] = useState({
    currentBelief: '',
    nextWeekTarget: ''
  });

  const handleAddBelief = () => {
    if (!newBelief.currentBelief.trim()) return;

    const belief: Belief = {
      id: Date.now().toString(),
      weekNumber: currentWeek,
      currentBelief: newBelief.currentBelief,
      nextWeekTarget: newBelief.nextWeekTarget,
      checklist: [
        { id: `${Date.now()}-1`, text: 'AI will generate checklist items...', checked: false }
      ],
      courseSuggestion: 'AI analyzing belief...',
      affirmationSuggestion: 'AI generating personalized affirmation...'
    };

    setBeliefs([...beliefs, belief]);
    setNewBelief({ currentBelief: '', nextWeekTarget: '' });
  };

  const handleDeleteBelief = (id: string) => {
    setBeliefs(beliefs.filter(b => b.id !== id));
  };

  const handleGenerateAI = (id: string) => {
    // This will be connected to OpenAI in Phase 3
    console.log('Generating AI suggestions for belief:', id);
  };

  const startEditing = (belief: Belief) => {
    setEditingId(belief.id);
    setEditValues({
      currentBelief: belief.currentBelief,
      nextWeekTarget: belief.nextWeekTarget
    });
  };

  const saveEdit = (id: string) => {
    setBeliefs(beliefs.map(b => 
      b.id === id 
        ? { ...b, currentBelief: editValues.currentBelief, nextWeekTarget: editValues.nextWeekTarget }
        : b
    ));
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({ currentBelief: '', nextWeekTarget: '' });
  };

  const calculateProgress = (checklist: ChecklistItem[]) => {
    if (checklist.length === 0) return 0;
    const checkedCount = checklist.filter(item => item.checked).length;
    return Math.round((checkedCount / checklist.length) * 100);
  };

  const handleChecklistToggle = (beliefId: string, itemId: string) => {
    setBeliefs(beliefs.map(b => {
      if (b.id === beliefId) {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-2xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {categoryName} Belief Tracker - Week {currentWeek}
          </DialogTitle>
          <DialogDescription>
            Track and transform your beliefs week by week with AI-powered suggestions
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-180px)]">
          <div className="p-6 space-y-6">
            {/* Add New Belief Row */}
            <div className="border rounded-lg p-4 bg-muted/30">
              <div className="flex items-center gap-2 mb-3">
                <Plus className="w-4 h-4" />
                <h3 className="font-semibold">Add New Belief</h3>
              </div>
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-4">
                  <Textarea
                    placeholder="Enter current limiting belief..."
                    value={newBelief.currentBelief}
                    onChange={(e) => setNewBelief({ ...newBelief, currentBelief: e.target.value })}
                    className="resize-none h-20"
                    data-testid="input-current-belief"
                  />
                </div>
                <div className="col-span-4">
                  <Textarea
                    placeholder="Enter target belief for next week..."
                    value={newBelief.nextWeekTarget}
                    onChange={(e) => setNewBelief({ ...newBelief, nextWeekTarget: e.target.value })}
                    className="resize-none h-20"
                    data-testid="input-next-week-target"
                  />
                </div>
                <div className="col-span-4 flex items-center">
                  <Button 
                    onClick={handleAddBelief} 
                    className="w-full h-20"
                    data-testid="button-add-belief"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add & Generate AI
                  </Button>
                </div>
              </div>
            </div>

            {/* Excel-Style Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[80px] font-bold">Week</TableHead>
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
                    <TableHead className="w-[100px] font-bold text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {beliefs.map((belief) => (
                    <TableRow key={belief.id} data-testid={`row-belief-${belief.id}`}>
                      {/* Week Number */}
                      <TableCell className="text-center">
                        <Badge variant="outline">W{belief.weekNumber}</Badge>
                      </TableCell>

                      {/* Current Belief */}
                      <TableCell className="p-2">
                        {editingId === belief.id ? (
                          <Textarea
                            value={editValues.currentBelief}
                            onChange={(e) => setEditValues({ ...editValues, currentBelief: e.target.value })}
                            className="resize-none h-20 text-sm"
                            data-testid={`input-edit-current-${belief.id}`}
                          />
                        ) : (
                          <div 
                            className="text-sm p-2 rounded bg-muted/30 min-h-[60px] cursor-pointer hover:bg-muted/50"
                            onClick={() => startEditing(belief)}
                            data-testid={`text-current-belief-${belief.id}`}
                          >
                            {belief.currentBelief}
                          </div>
                        )}
                      </TableCell>

                      {/* Next Week Target */}
                      <TableCell className="p-2">
                        {editingId === belief.id ? (
                          <Textarea
                            value={editValues.nextWeekTarget}
                            onChange={(e) => setEditValues({ ...editValues, nextWeekTarget: e.target.value })}
                            className="resize-none h-20 text-sm border-accent/50"
                            data-testid={`input-edit-target-${belief.id}`}
                          />
                        ) : (
                          <div 
                            className="text-sm p-2 rounded bg-accent/5 border border-accent/20 min-h-[60px] cursor-pointer hover:bg-accent/10"
                            onClick={() => startEditing(belief)}
                            data-testid={`text-next-target-${belief.id}`}
                          >
                            {belief.nextWeekTarget}
                          </div>
                        )}
                      </TableCell>

                      {/* Course Suggestion */}
                      <TableCell className="p-2">
                        <div className="text-sm p-2 rounded bg-primary/5 border border-primary/20 min-h-[60px]" data-testid={`text-course-${belief.id}`}>
                          {belief.courseSuggestion}
                        </div>
                      </TableCell>

                      {/* Affirmation */}
                      <TableCell className="p-2">
                        <div className="text-sm p-2 rounded bg-accent/5 border border-accent/20 min-h-[60px] italic" data-testid={`text-affirmation-${belief.id}`}>
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
                                data-testid={`label-checklist-item-${belief.id}-${idx}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={item.checked}
                                  onChange={() => handleChecklistToggle(belief.id, item.id)}
                                  className="mt-0.5 w-3.5 h-3.5 rounded border-chart-3 text-chart-3 focus:ring-chart-3 cursor-pointer"
                                  data-testid={`checkbox-checklist-${belief.id}-${idx}`}
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
                        <Badge className={getProgressColor(calculateProgress(belief.checklist))} data-testid={`badge-progress-${belief.id}`}>
                          {calculateProgress(belief.checklist)}%
                        </Badge>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="p-2">
                        {editingId === belief.id ? (
                          <div className="flex flex-col gap-1">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => saveEdit(belief.id)}
                              data-testid={`button-save-${belief.id}`}
                            >
                              <Check className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEdit}
                              data-testid={`button-cancel-${belief.id}`}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleGenerateAI(belief.id)}
                              data-testid={`button-regenerate-${belief.id}`}
                            >
                              <Sparkles className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteBelief(belief.id)}
                              data-testid={`button-delete-${belief.id}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {beliefs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        No beliefs added yet. Add your first belief above to start tracking!
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Info Footer */}
            <div className="bg-muted/30 rounded-lg p-4 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <strong>AI-Powered:</strong> Course, affirmation, and checklist suggestions will be automatically generated based on your belief text in Phase 3
              </p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// Helper to get week number
declare global {
  interface Date {
    getWeek(): number;
  }
}

Date.prototype.getWeek = function() {
  const d = new Date(Date.UTC(this.getFullYear(), this.getMonth(), this.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
};
