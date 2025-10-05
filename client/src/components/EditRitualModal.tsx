import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EditRitualModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ritual: {
    id: string;
    title: string;
    recurrence: string;
    points: number;
  };
  onSave?: (ritual: { id: string; title: string; recurrence: string; points: number }) => void;
}

export default function EditRitualModal({
  open,
  onOpenChange,
  ritual,
  onSave = () => {}
}: EditRitualModalProps) {
  const [title, setTitle] = useState(ritual.title);
  const [recurrence, setRecurrence] = useState(ritual.recurrence);
  const [points, setPoints] = useState(ritual.points);

  const handleSave = () => {
    onSave({
      id: ritual.id,
      title,
      recurrence,
      points
    });
    onOpenChange(false);
    console.log('Ritual updated:', { id: ritual.id, title, recurrence, points });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Ritual</DialogTitle>
          <DialogDescription>Update your ritual details</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Ritual Name</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Morning meditation..."
              data-testid="input-edit-title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-recurrence">Recurrence</Label>
            <Select value={recurrence} onValueChange={setRecurrence}>
              <SelectTrigger id="edit-recurrence" data-testid="select-edit-recurrence">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="mon-fri">Mon-Fri</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-points">Points</Label>
            <Input
              id="edit-points"
              type="number"
              min="10"
              max="500"
              step="10"
              value={points}
              onChange={(e) => setPoints(parseInt(e.target.value) || 50)}
              data-testid="input-edit-points"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-edit-ritual"
          >
            Cancel
          </Button>
          <Button onClick={handleSave} data-testid="button-save-ritual">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
