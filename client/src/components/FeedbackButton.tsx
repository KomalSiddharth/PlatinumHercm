import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PenSquare, Send } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const { toast } = useToast();

  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('/api/feedback', 'POST', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feedback'] });
      toast({
        title: '✅ Thank You!',
        description: 'Your feedback has been submitted successfully. We\'ll review it soon!',
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: '❌ Error',
        description: error.message || 'Failed to submit feedback. Please try again.',
      });
    },
  });

  const handleClose = () => {
    setIsOpen(false);
    setFeedbackType('');
    setTitle('');
    setDescription('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!feedbackType || !title || !description) {
      toast({
        variant: 'destructive',
        title: '⚠️ Required Fields',
        description: 'Please fill in all required fields.',
      });
      return;
    }

    submitMutation.mutate({
      feedbackType,
      relatedFeature: null,
      title,
      description,
      priority: 'medium',
      status: 'pending',
    });
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="h-14 w-14 rounded-full shadow-lg hover-elevate active-elevate-2"
        style={{ 
          position: 'fixed',
          bottom: '24px',
          left: '24px',
          zIndex: 9999,
          background: 'hsl(var(--primary))',
          color: 'white',
        }}
        data-testid="button-feedback"
        aria-label="Share Feedback"
      >
        <PenSquare className="h-5 w-5" />
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) handleClose();
        else setIsOpen(true);
      }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" data-testid="dialog-feedback">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Share Your Feedback
            </DialogTitle>
            <DialogDescription>
              Help us improve! Share bugs, suggestions, or general feedback.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="feedbackType" className="text-sm font-medium">
                Feedback Type <span className="text-red-500">*</span>
              </Label>
              <Select value={feedbackType} onValueChange={setFeedbackType} required>
                <SelectTrigger id="feedbackType" data-testid="select-feedback-type">
                  <SelectValue placeholder="Select feedback type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bug">🐛 Report a Bug</SelectItem>
                  <SelectItem value="feature">💡 Suggest a Feature</SelectItem>
                  <SelectItem value="course">📚 Course Content Feedback</SelectItem>
                  <SelectItem value="gratitude">🙏 Express Your Gratitude</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">
                Title <span className="text-red-500">*</span>
                <span className="text-xs text-muted-foreground ml-2">
                  ({title.length}/100)
                </span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 100))}
                placeholder="Brief summary of your feedback"
                maxLength={100}
                required
                data-testid="input-feedback-title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide details about your feedback..."
                className="min-h-[120px] resize-none"
                required
                data-testid="textarea-feedback-description"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
                data-testid="button-cancel-feedback"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 gap-2"
                disabled={submitMutation.isPending}
                data-testid="button-submit-feedback"
              >
                {submitMutation.isPending ? (
                  <>Submitting...</>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Submit
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
