import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Target, Sparkles, X } from 'lucide-react';
import { format } from 'date-fns';
import GoalsAffirmationsList from './GoalsAffirmationsList';

interface GoalsAffirmationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isChatBubbleOpen?: boolean;
}

export function GoalsAffirmationsDialog({ open, onOpenChange, isChatBubbleOpen = false }: GoalsAffirmationsDialogProps) {
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [category, setCategory] = useState<string>('');
  const [targetDate, setTargetDate] = useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const createGoalMutation = useMutation({
    mutationFn: async (data: { text: string; targetDate: string | null; category: string | null }) => {
      const res = await apiRequest('/api/goals', 'POST', data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
      toast({
        title: 'Goal Added!',
        description: 'Your goal has been saved successfully.',
      });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add goal',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setText('');
    setCategory('');
    setTargetDate(undefined);
  };

  const handleSubmit = () => {
    if (!text.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please enter your goal or affirmation.',
        variant: 'destructive',
      });
      return;
    }

    createGoalMutation.mutate({
      text: text.trim(),
      targetDate: targetDate ? format(targetDate, 'yyyy-MM-dd') : null,
      category: category || null,
    });
  };

  const categoryColors: Record<string, string> = {
    health: 'bg-green-500',
    relationship: 'bg-pink-500',
    career: 'bg-blue-500',
    money: 'bg-amber-500',
  };

  const FormContent = useCallback(() => (
    <div className="space-y-4">
      {/* Input Section */}
      <div className="space-y-2">
        <Label htmlFor="goal-text" className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Your Goal or Affirmation
        </Label>
        <Textarea
          id="goal-text"
          placeholder="Write your goal or affirmation here... (Ctrl+Enter to save)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          className="min-h-[80px] resize-none"
          autoFocus
          data-testid="input-goal-text"
        />
      </div>

      {/* Optional Fields */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Category (Optional)</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger data-testid="select-category" className="h-9">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="health">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${categoryColors.health}`} />
                  Health
                </div>
              </SelectItem>
              <SelectItem value="relationship">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${categoryColors.relationship}`} />
                  Relationship
                </div>
              </SelectItem>
              <SelectItem value="career">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${categoryColors.career}`} />
                  Career
                </div>
              </SelectItem>
              <SelectItem value="money">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${categoryColors.money}`} />
                  Money
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Target Date (Optional)</Label>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full h-9 justify-start text-left font-normal"
                data-testid="button-target-date"
              >
                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                <span className="text-sm">{targetDate ? format(targetDate, 'MMM d, yyyy') : 'Pick date'}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={targetDate}
                onSelect={(date) => {
                  setTargetDate(date);
                  setCalendarOpen(false);
                }}
                disabled={(date) => date < new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Save Button */}
      <Button
        onClick={handleSubmit}
        disabled={createGoalMutation.isPending}
        className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
        data-testid="button-save-goal"
      >
        {createGoalMutation.isPending ? 'Saving...' : 'Add Goal / Affirmation'}
      </Button>

      {/* Goals List */}
      <div className="border-t pt-4">
        <h3 className="font-semibold text-sm mb-3">Your Goals & Affirmations</h3>
        <GoalsAffirmationsList />
      </div>
    </div>
  ), [text, category, targetDate, calendarOpen, createGoalMutation.isPending, handleSubmit]);

  // When ChatBubble is open, use Sheet (side panel)
  if (isChatBubbleOpen) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
        <SheetContent 
          side="left"
          className="w-[420px] sm:w-[480px] p-0 overflow-hidden border-none shadow-2xl"
          hideOverlay={true}
          hideCloseButton={true}
        >
          <div className="h-full flex flex-col bg-gradient-to-br from-background via-background to-muted/30">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary/10 to-accent/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Goals / Affirmations</h2>
                  <p className="text-xs text-muted-foreground">Set goals, track progress, celebrate achievements</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="hover:bg-destructive/10"
                data-testid="button-close-goals"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4">
              <FormContent />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // When ChatBubble is closed, use Dialog (popup)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="p-4 border-b bg-gradient-to-r from-primary/10 to-accent/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">Goals / Affirmations</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Set goals, track progress, celebrate achievements
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          <FormContent />
        </div>
      </DialogContent>
    </Dialog>
  );
}
