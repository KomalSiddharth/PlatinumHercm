import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Check } from 'lucide-react';

interface ChecklistItem {
  id: number;
  text: string;
  completed: boolean;
  completedAt?: string;
}

interface ChecklistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  items: ChecklistItem[];
  onItemToggle?: (itemId: number) => void;
  onComplete?: () => void;
}

export default function ChecklistModal({
  open,
  onOpenChange,
  title,
  description = '',
  items,
  onItemToggle = () => {},
  onComplete = () => {}
}: ChecklistModalProps) {
  const [checkedItems, setCheckedItems] = useState<Set<number>>(
    new Set(items.filter(item => item.completed).map(item => item.id))
  );

  const totalItems = items.length;
  const completedCount = checkedItems.size;
  const progressPercent = (completedCount / totalItems) * 100;
  const allCompleted = completedCount === totalItems;

  const handleToggle = (itemId: number) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(itemId)) {
      newChecked.delete(itemId);
    } else {
      newChecked.add(itemId);
    }
    setCheckedItems(newChecked);
    onItemToggle(itemId);
    console.log('Item toggled:', itemId, 'Completed:', !checkedItems.has(itemId));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Progress</span>
              <span className="text-muted-foreground">
                {completedCount} of {totalItems} completed
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          <div className="space-y-3">
            {items.map((item) => {
              const isChecked = checkedItems.has(item.id);
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-4 rounded-lg border hover-elevate active-elevate-2 transition-all"
                  data-testid={`checklist-item-${item.id}`}
                >
                  <Checkbox
                    id={`item-${item.id}`}
                    checked={isChecked}
                    onCheckedChange={() => handleToggle(item.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <label
                      htmlFor={`item-${item.id}`}
                      className={`block cursor-pointer ${
                        isChecked ? 'line-through text-muted-foreground' : 'text-foreground'
                      }`}
                    >
                      {item.text}
                    </label>
                    {item.completedAt && isChecked && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Check className="w-3 h-3 text-chart-3" />
                        Completed: {item.completedAt}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              data-testid="button-cancel"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                onComplete();
                console.log('Checklist completed!');
              }}
              className="flex-1"
              disabled={!allCompleted}
              data-testid="button-complete-checklist"
            >
              {allCompleted ? 'Complete Checklist' : `Complete (${completedCount}/${totalItems})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
