import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';

interface AddRitualFormProps {
  onAdd?: (ritual: { title: string; recurrence: string; points: number }) => void;
}

export default function AddRitualForm({ onAdd = () => {} }: AddRitualFormProps) {
  const [title, setTitle] = useState('');
  const [recurrence, setRecurrence] = useState('daily');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAdd({ title, recurrence, points: 1 });
    console.log('Ritual added:', { title, recurrence, points: 1 });

    setTitle('');
    setRecurrence('daily');
  };

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Ritual name..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 min-w-0"
            data-testid="input-ritual-title"
          />
          <Button 
            type="submit" 
            className="gap-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 flex-shrink-0" 
            data-testid="button-add-ritual"
          >
            <Plus className="w-4 h-4" />
            Add (1 pt)
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
