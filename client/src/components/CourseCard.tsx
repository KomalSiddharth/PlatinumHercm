import { Card } from '@/components/ui/card';
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
  onVisit?: (id: string) => void;
  category?: string;
}

const statusConfig = {
  not_started: { label: 'Not Started', variant: 'secondary' as const, color: 'text-muted-foreground' },
  in_progress: { label: 'In Progress', variant: 'default' as const, color: 'text-chart-4' },
  completed: { label: 'Completed', variant: 'outline' as const, color: 'text-chart-3' }
};

// Bright colorful gradients for each category
const categoryColors = {
  Health: 'bg-gradient-to-r from-pink-500 to-rose-500',
  Relationship: 'bg-gradient-to-r from-purple-500 to-indigo-500',
  Career: 'bg-gradient-to-r from-blue-500 to-cyan-500',
  Money: 'bg-gradient-to-r from-emerald-500 to-teal-500',
  default: 'bg-gradient-to-r from-orange-500 to-amber-500'
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
  onUpdateProgress = () => {},
  onVisit = () => {},
  category = 'default'
}: CourseCardProps) {
  const config = statusConfig[status];
  const firstLetter = title.charAt(0).toUpperCase();
  const gradientClass = categoryColors[category as keyof typeof categoryColors] || categoryColors.default;

  return (
    <Card className="hover-elevate">
      <div className="flex items-center gap-4 p-4">
        {/* Colorful Icon */}
        <div className={`w-16 h-16 rounded-xl ${gradientClass} flex items-center justify-center flex-shrink-0 shadow-lg`}>
          <span className="text-3xl font-bold text-white">{firstLetter}</span>
        </div>

        {/* Course Info */}
        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <h3 className="font-semibold text-lg line-clamp-1">{title}</h3>
            <p className="text-sm text-muted-foreground">{source}</p>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{estimatedHours}h</span>
            </div>
            
            <Badge variant={config.variant} className={`gap-1 ${config.color}`}>
              <GraduationCap className="w-3 h-3" />
              {config.label}
            </Badge>

            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 2).map((tag, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {tags.length > 2 && (
                <Badge variant="secondary" className="text-xs">
                  +{tags.length - 2}
                </Badge>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {status !== 'not_started' && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 flex-shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onUpdateProgress(id)}
            className="bg-gradient-to-r from-primary/10 to-accent/10 hover:from-primary/20 hover:to-accent/20 border border-primary/30"
            data-testid={`button-update-${id}`}
          >
            Update
          </Button>
          {url && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={() => {
                window.open(url, '_blank');
                onVisit(id);
              }}
              data-testid={`button-visit-${id}`}
            >
              <ExternalLink className="w-4 h-4" />
              Visit
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
