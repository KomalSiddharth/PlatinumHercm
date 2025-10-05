import { useState } from 'react';
import ChecklistModal from '../ChecklistModal';
import { Button } from '@/components/ui/button';

export default function ChecklistModalExample() {
  const [open, setOpen] = useState(false);

  const sampleItems = [
    { id: 1, text: 'Exercise for 30 minutes', completed: false },
    { id: 2, text: 'Drink 8 glasses of water', completed: true, completedAt: '2025-02-05 14:30' },
    { id: 3, text: 'Get 7-8 hours of sleep', completed: false },
    { id: 4, text: 'Eat at least 3 servings of vegetables', completed: false },
    { id: 5, text: 'Practice meditation or mindfulness', completed: true, completedAt: '2025-02-05 08:15' }
  ];

  return (
    <div className="p-8">
      <Button onClick={() => setOpen(true)}>Open Health Checklist</Button>
      <ChecklistModal
        open={open}
        onOpenChange={setOpen}
        title="Health Improvement Checklist"
        description="Complete these items to improve your health score this week"
        items={sampleItems}
        onItemToggle={(id) => console.log('Toggle item:', id)}
        onComplete={() => {
          console.log('Checklist marked complete!');
          setOpen(false);
        }}
      />
    </div>
  );
}
