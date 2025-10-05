import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Clock, ExternalLink, GraduationCap } from 'lucide-react';

interface CourseCardProps {
  id: string;
  title: string;
  url?: string;
  tags: string[];
  source: string;
  estimatedHours: number;
  status: 'not_started' | 'in_progress' | 'completed';
  progressPercent: number;
  onUpdateProgress?: (id: string) => void;
}

const statusConfig = {
  not_started: { label: 'Not Started', variant: 'secondary' as const, color: 'text-muted-foreground' },
  in_progress: { label: 'In Progress', variant: 'default' as const, color: 'text-chart-4' },
  completed: { label: 'Completed', variant: 'outline' as const, color: 'text-chart-3' }
};

export default function CourseCard({
  id,
  title,
  url,
  tags,
  source,
  estimatedHours,
  status,
  progressPercent,
  onUpdateProgress = () => {}
}: CourseCardProps) {
  const config = statusConfig[status];
  const firstLetter = title.charAt(0).toUpperCase();

  return (
    <Card className="hover-elevate flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-chart-1 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-primary-foreground">{firstLetter}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg line-clamp-2">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{source}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        <div className="flex flex-wrap gap-2">
          {tags.slice(0, 3).map((tag, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {tags.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{tags.length - 3}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>{estimatedHours}h estimated</span>
        </div>

        {status !== 'not_started' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        )}
      </CardContent>

      <CardFooter className="flex gap-2 pt-4">
        <Badge variant={config.variant} className={`gap-1 ${config.color}`}>
          <GraduationCap className="w-3 h-3" />
          {config.label}
        </Badge>
        <div className="flex-1" />
        {url && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1"
            onClick={() => window.open(url, '_blank')}
            data-testid={`button-visit-${id}`}
          >
            <ExternalLink className="w-4 h-4" />
            Visit
          </Button>
        )}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            onUpdateProgress(id);
            console.log('Update progress for:', id);
          }}
          data-testid={`button-update-${id}`}
        >
          Update
        </Button>
      </CardFooter>
    </Card>
  );
}
