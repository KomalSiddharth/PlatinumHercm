import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Target, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import GoalsAffirmationsList from './GoalsAffirmationsList';

interface GoalsAffirmationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GoalsAffirmationsDialog({ open, onOpenChange }: GoalsAffirmationsDialogProps) {
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [category, setCategory] = useState<string>('');
  const [targetDate, setTargetDate] = useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const createGoalMutation = useMutation({
    mutationFn: async (data: { text: string; targetDate: string; category: string }) => {
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
    if (!category) {
      toast({
        title: 'Missing Information',
        description: 'Please select a category.',
        variant: 'destructive',
      });
      return;
    }
    if (!targetDate) {
      toast({
        title: 'Missing Information',
        description: 'Please select a target date.',
        variant: 'destructive',
      });
      return;
    }

    createGoalMutation.mutate({
      text: text.trim(),
      targetDate: format(targetDate, 'yyyy-MM-dd'),
      category,
    });
  };

  const categoryColors: Record<string, string> = {
    health: 'bg-green-500',
    relationship: 'bg-pink-500',
    career: 'bg-blue-500',
    money: 'bg-amber-500',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
              <Target className="w-5 h-5 text-white" />
            </div>
            Goals / Affirmations
          </DialogTitle>
          <DialogDescription>
            Set your goals and affirmations with a target date. Track your progress and celebrate your achievements.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="goal-text" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Your Goal or Affirmation
            </Label>
            <Textarea
              id="goal-text"
              placeholder="Write your goal or affirmation here... (e.g., 'I will exercise 5 days a week' or 'I am becoming healthier every day') - Press Enter to add"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              className="min-h-[100px] resize-none"
              data-testid="input-goal-text"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger data-testid="select-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="health">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${categoryColors.health}`} />
                      Health
                    </div>
                  </SelectItem>
                  <SelectItem value="relationship">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${categoryColors.relationship}`} />
                      Relationship
                    </div>
                  </SelectItem>
                  <SelectItem value="career">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${categoryColors.career}`} />
                      Career
                    </div>
                  </SelectItem>
                  <SelectItem value="money">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${categoryColors.money}`} />
                      Money
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Target Date</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    data-testid="button-target-date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {targetDate ? format(targetDate, 'PPP') : 'Pick a date'}
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
            size="lg"
            data-testid="button-save-goal"
          >
            {createGoalMutation.isPending ? 'Saving...' : 'Save Goal / Affirmation'}
          </Button>

          {/* Goals List */}
          <div className="border-t pt-4 mt-4">
            <h3 className="font-semibold text-lg mb-3">Your Goals & Affirmations</h3>
            <GoalsAffirmationsList />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
