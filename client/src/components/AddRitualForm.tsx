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
  const [points, setPoints] = useState(50);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAdd({ title, recurrence, points });
    console.log('Ritual added:', { title, recurrence, points });

    setTitle('');
    setRecurrence('daily');
    setPoints(50);
  };

  return (
    <Card>
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Ritual name..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1"
            data-testid="input-ritual-title"
          />
          <Select value={recurrence} onValueChange={setRecurrence}>
            <SelectTrigger className="w-full sm:w-32" data-testid="select-recurrence">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="mon-fri">Mon-Fri</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="number"
            min="10"
            max="500"
            step="10"
            value={points}
            onChange={(e) => setPoints(parseInt(e.target.value) || 50)}
            className="w-full sm:w-24"
            data-testid="input-points"
          />
          <Button 
            type="submit" 
            className="gap-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90" 
            data-testid="button-add-ritual"
          >
            <Plus className="w-4 h-4" />
            Add
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
