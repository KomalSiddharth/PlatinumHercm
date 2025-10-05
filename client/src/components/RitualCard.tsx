import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Trophy, Pause, Play } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface RitualCardProps {
  id: string;
  title: string;
  recurrence: 'daily' | 'mon-fri' | 'custom';
  points: number;
  active: boolean;
  completed?: boolean;
  onToggleComplete?: (id: string) => void;
  onToggleActive?: (id: string) => void;
  onViewHistory?: (id: string) => void;
}

const recurrenceLabels = {
  daily: 'Daily',
  'mon-fri': 'Mon-Fri',
  custom: 'Custom'
};

export default function RitualCard({
  id,
  title,
  recurrence,
  points,
  active,
  completed = false,
  onToggleComplete = () => {},
  onToggleActive = () => {},
  onViewHistory = () => {}
}: RitualCardProps) {
  const [isCompleted, setIsCompleted] = useState(completed);

  const handleToggle = () => {
    setIsCompleted(!isCompleted);
    onToggleComplete(id);
    console.log(`Ritual ${id} ${!isCompleted ? 'completed' : 'uncompleted'}`);
  };

  return (
    <Card className={`hover-elevate transition-all ${!active ? 'opacity-40' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={isCompleted}
            onCheckedChange={handleToggle}
            disabled={!active}
            className="w-5 h-5"
            data-testid={`checkbox-ritual-${id}`}
          />

          <div className="flex-1 min-w-0">
            <h3 className={`font-medium ${isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
              {title}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {recurrenceLabels[recurrence]}
              </Badge>
              {!active && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Pause className="w-3 h-3" />
                  Paused
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge className="gap-1 bg-chart-2 text-white">
              <Trophy className="w-3 h-3" />
              {points}
            </Badge>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onViewHistory(id)}
                    data-testid={`button-history-${id}`}
                    className="w-8 h-8"
                  >
                    <Clock className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View 7-day history</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      onToggleActive(id);
                      console.log(`Ritual ${id} ${active ? 'paused' : 'resumed'}`);
                    }}
                    data-testid={`button-toggle-${id}`}
                    className="w-8 h-8"
                  >
                    {active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{active ? 'Pause ritual' : 'Resume ritual'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
