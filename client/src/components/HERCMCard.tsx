import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ListChecks, Lock, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface HERCMCardProps {
  category: 'health' | 'relationship' | 'career' | 'money';
  current: number;
  target: number;
  onCurrentChange?: (value: number) => void;
  onTargetChange?: (value: number) => void;
  onViewChecklist?: () => void;
}

const categoryConfig = {
  health: {
    label: 'Health',
    color: 'hsl(142 57% 37%)',
    bgGradient: 'from-white to-green-50 dark:from-card dark:to-green-950/20'
  },
  relationship: {
    label: 'Relationship',
    color: 'hsl(265 85% 58%)',
    bgGradient: 'from-white to-purple-50 dark:from-card dark:to-purple-950/20'
  },
  career: {
    label: 'Career',
    color: 'hsl(221 83% 53%)',
    bgGradient: 'from-white to-blue-50 dark:from-card dark:to-blue-950/20'
  },
  money: {
    label: 'Money',
    color: 'hsl(45 93% 47%)',
    bgGradient: 'from-white to-yellow-50 dark:from-card dark:to-yellow-950/20'
  }
};

export default function HERCMCard({
  category,
  current,
  target,
  onCurrentChange = () => {},
  onTargetChange = () => {},
  onViewChecklist = () => {}
}: HERCMCardProps) {
  const config = categoryConfig[category];
  const [tempCurrent, setTempCurrent] = useState(current);
  const [tempTarget, setTempTarget] = useState(target);

  const circumference = 2 * Math.PI * 45;
  const progress = (current / 10) * circumference;

  return (
    <Card className={`bg-gradient-to-br ${config.bgGradient} border-l-4 hover-elevate`} style={{ borderLeftColor: config.color }}>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold flex items-center justify-between">
          {config.label}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-4 h-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm max-w-xs">
                  Rate your {config.label.toLowerCase()} on a scale of 1-10 for this week
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-32 h-32">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="45"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-muted/20"
              />
              <circle
                cx="64"
                cy="64"
                r="45"
                stroke={config.color}
                strokeWidth="8"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - progress}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl font-bold" style={{ color: config.color }}>
                  {current}
                </div>
                <div className="text-xs text-muted-foreground">/ 10</div>
              </div>
            </div>
          </div>

          <div className="w-full space-y-3">
            <div className="space-y-2">
              <Label htmlFor={`${category}-current`} className="text-sm font-medium">
                Current Score
              </Label>
              <Input
                id={`${category}-current`}
                type="number"
                min="1"
                max="10"
                value={tempCurrent}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  setTempCurrent(val);
                  onCurrentChange(val);
                }}
                data-testid={`input-${category}-current`}
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${category}-target`} className="text-sm font-medium flex items-center gap-2">
                Next Week Target
                <Badge variant="outline" className="gap-1 text-xs">
                  <Lock className="w-3 h-3" />
                  +1 only
                </Badge>
              </Label>
              <Input
                id={`${category}-target`}
                type="number"
                min={current}
                max={current + 1}
                value={tempTarget}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  setTempTarget(val);
                  onTargetChange(val);
                }}
                data-testid={`input-${category}-target`}
                className="h-10"
                disabled={current === 10}
              />
              <p className="text-xs text-muted-foreground">
                Server enforces +1 rule for audit integrity
              </p>
            </div>
          </div>

          <Button
            variant="secondary"
            className="w-full gap-2"
            onClick={onViewChecklist}
            data-testid={`button-${category}-checklist`}
          >
            <ListChecks className="w-4 h-4" />
            View Checklist
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
