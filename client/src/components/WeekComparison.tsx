import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react';

interface ComparisonData {
  category: string;
  previousTarget: string;
  currentActual: string;
  matchPercentage: number;
}

interface WeekComparisonProps {
  comparisons: ComparisonData[];
}

export default function WeekComparison({ comparisons }: WeekComparisonProps) {
  const getComparisonIcon = (percentage: number) => {
    if (percentage >= 70) return <TrendingUp className="w-5 h-5 text-green-600" />;
    if (percentage >= 40) return <Minus className="w-5 h-5 text-amber-600" />;
    return <TrendingDown className="w-5 h-5 text-red-600" />;
  };

  const getComparisonColor = (percentage: number) => {
    if (percentage >= 70) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (percentage >= 40) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  };

  const overallProgress = comparisons.length > 0
    ? Math.round(comparisons.reduce((sum, c) => sum + c.matchPercentage, 0) / comparisons.length)
    : 0;

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Week-over-Week Progress</h3>
        <Badge className={getComparisonColor(overallProgress)} data-testid="badge-overall-progress">
          {overallProgress}% Overall Achievement
        </Badge>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {comparisons.map((comparison) => (
          <div key={comparison.category} className="p-4 border rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">{comparison.category}</h4>
              {getComparisonIcon(comparison.matchPercentage)}
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <div className="flex-1">
                <p className="text-muted-foreground">Previous Target:</p>
                <p className="font-medium">{comparison.previousTarget}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1">
                <p className="text-muted-foreground">Current Actual:</p>
                <p className="font-medium">{comparison.currentActual}</p>
              </div>
            </div>
            
            <Badge className={getComparisonColor(comparison.matchPercentage)} data-testid={`badge-comparison-${comparison.category.toLowerCase()}`}>
              {comparison.matchPercentage}% Match
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}
