import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';

interface UpdateProgressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseTitle: string;
  currentProgress: number;
  currentStatus: 'not_started' | 'in_progress' | 'completed';
  onUpdate: (progress: number, status: 'not_started' | 'in_progress' | 'completed') => void;
}

export default function UpdateProgressModal({
  open,
  onOpenChange,
  courseTitle,
  currentProgress,
  currentStatus,
  onUpdate
}: UpdateProgressModalProps) {
  const [progress, setProgress] = useState(currentProgress.toString());
  const [status, setStatus] = useState<'not_started' | 'in_progress' | 'completed'>(currentStatus);

  const handleSave = () => {
    const progressValue = Math.min(100, Math.max(0, parseInt(progress) || 0));
    
    let newStatus = status;
    if (progressValue === 0) {
      newStatus = 'not_started';
    } else if (progressValue === 100) {
      newStatus = 'completed';
    } else {
      newStatus = 'in_progress';
    }
    
    onUpdate(progressValue, newStatus);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update Course Progress</DialogTitle>
          <DialogDescription>{courseTitle}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="progress">Progress Percentage</Label>
            <Input
              id="progress"
              type="number"
              min="0"
              max="100"
              value={progress}
              onChange={(e) => setProgress(e.target.value)}
              placeholder="Enter 0-100"
              data-testid="input-progress"
            />
            <p className="text-xs text-muted-foreground">
              Enter a value between 0 and 100
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Course Status</Label>
            <Select value={status} onValueChange={(value: any) => setStatus(value)}>
              <SelectTrigger id="status" data-testid="select-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-progress"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
            data-testid="button-save-progress"
          >
            Save Progress
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
