import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Target } from 'lucide-react';

interface PlatinumStandardsProps {
  onRatingsChange?: (ratings: StandardRatings) => void;
  initialRatings?: StandardRatings;
}

export interface StandardRatings {
  feelingsEmotional: number;
  beliefsPattern: number;
  humanNeeds: {
    contribution: number;
    loveConnection: number;
    growth: number;
    significance: number;
    change: number;
    comfort: number;
  };
}

const DEFAULT_RATINGS: StandardRatings = {
  feelingsEmotional: 5,
  beliefsPattern: 5,
  humanNeeds: {
    contribution: 5,
    loveConnection: 5,
    growth: 5,
    significance: 5,
    change: 5,
    comfort: 5
  }
};

export default function PlatinumStandards({ onRatingsChange, initialRatings }: PlatinumStandardsProps) {
  const [ratings, setRatings] = useState<StandardRatings>(initialRatings || DEFAULT_RATINGS);

  // Load initial ratings from prop when they become available
  useEffect(() => {
    if (initialRatings) {
      setRatings(initialRatings);
    }
  }, [initialRatings]);

  const updateRating = (key: keyof StandardRatings | string, value: number) => {
    const newRatings = { ...ratings };
    
    if (key === 'feelingsEmotional' || key === 'beliefsPattern') {
      newRatings[key] = value;
    } else if (key.startsWith('humanNeeds.')) {
      const needKey = key.split('.')[1] as keyof typeof ratings.humanNeeds;
      newRatings.humanNeeds[needKey] = value;
    }
    
    setRatings(newRatings);
    onRatingsChange?.(newRatings);
  };

  const getColorClass = (rating: number) => {
    if (rating >= 7) return 'text-chart-3';
    if (rating >= 5) return 'text-yellow-500';
    return 'text-destructive';
  };

  const averageHumanNeeds = Object.values(ratings.humanNeeds).reduce((a, b) => a + b, 0) / 6;
  const overallAverage = (ratings.feelingsEmotional + ratings.beliefsPattern + averageHumanNeeds) / 3;

  return (
    <Card className="border-2 border-chart-2/20">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-xl flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Platinum Standards Self-Rating
          </CardTitle>
          <Badge className="bg-gradient-to-r from-primary to-accent text-white gap-1 border-0">
            <TrendingUp className="w-3 h-3" />
            <span className="font-bold">{overallAverage.toFixed(1)}/10</span> Overall
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base">Feelings/Emotional Pattern</h3>
              <span className={`text-2xl font-bold ${getColorClass(ratings.feelingsEmotional)}`}>
                {ratings.feelingsEmotional}/10
              </span>
            </div>
            <Slider
              value={[ratings.feelingsEmotional]}
              onValueChange={(value) => updateRating('feelingsEmotional', value[0])}
              min={1}
              max={10}
              step={1}
              className="w-full"
              data-testid="slider-feelings-emotional"
            />
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• Master Taking Responsibility for your Feelings</p>
              <p>• Master Being Satisfied with Everything in your Life</p>
              <p>• Master the Science of Motivation</p>
            </div>
          </div>

          <div className="h-px bg-border" />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base">Beliefs Pattern</h3>
              <span className={`text-2xl font-bold ${getColorClass(ratings.beliefsPattern)}`}>
                {ratings.beliefsPattern}/10
              </span>
            </div>
            <Slider
              value={[ratings.beliefsPattern]}
              onValueChange={(value) => updateRating('beliefsPattern', value[0])}
              min={1}
              max={10}
              step={1}
              className="w-full"
              data-testid="slider-beliefs-pattern"
            />
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• Unshakable Belief in yourself</p>
              <p>• Believe in Law of Attraction Scientifically</p>
              <p>• Master Identifying & Breaking Limiting Beliefs</p>
            </div>
          </div>

          <div className="h-px bg-border" />

          <div className="space-y-4">
            <h3 className="font-semibold text-base">Your 6 Human Needs</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { key: 'contribution', label: 'Contribution' },
                { key: 'loveConnection', label: 'Love & Connection' },
                { key: 'growth', label: 'Growth' },
                { key: 'significance', label: 'Significance' },
                { key: 'change', label: 'Change' },
                { key: 'comfort', label: 'Comfort' }
              ].map((need) => (
                <div key={need.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">{need.label}</label>
                    <span className={`text-lg font-bold ${getColorClass(ratings.humanNeeds[need.key as keyof typeof ratings.humanNeeds])}`}>
                      {ratings.humanNeeds[need.key as keyof typeof ratings.humanNeeds]}/10
                    </span>
                  </div>
                  <Slider
                    value={[ratings.humanNeeds[need.key as keyof typeof ratings.humanNeeds]]}
                    onValueChange={(value) => updateRating(`humanNeeds.${need.key}`, value[0])}
                    min={1}
                    max={10}
                    step={1}
                    className="w-full"
                    data-testid={`slider-${need.key}`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Platinum Target:</p>
            <Badge variant={overallAverage >= 7 ? "default" : "secondary"} className={overallAverage >= 7 ? "bg-chart-3 hover:bg-chart-3" : ""}>
              {overallAverage >= 7 ? "✓ Target Met" : "7+ Required"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Rate yourself honestly (1-10) across all standards. Aim for 7+ in each area for Platinum qualification.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
