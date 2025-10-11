import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, TrendingDown, Minus, Check, X } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface HERCMRatingTrackerProps {
  weekNumber: number;
  year: number;
  userId: string;
}

export function HERCMRatingTracker({ weekNumber, year, userId }: HERCMRatingTrackerProps) {
  const { toast } = useToast();
  
  // Current Week Ratings
  const [currentH, setCurrentH] = useState<number>(3);
  const [currentE, setCurrentE] = useState<number>(3);
  const [currentR, setCurrentR] = useState<number>(3);
  const [currentC, setCurrentC] = useState<number>(3);
  const [currentM, setCurrentM] = useState<number>(3);
  
  // Next Week Goals (auto-fillable)
  const [nextWeekH, setNextWeekH] = useState<number>(3);
  const [nextWeekE, setNextWeekE] = useState<number>(3);
  const [nextWeekR, setNextWeekR] = useState<number>(3);
  const [nextWeekC, setNextWeekC] = useState<number>(3);
  const [nextWeekM, setNextWeekM] = useState<number>(3);
  
  // Comparison Data (if previous week exists)
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonData, setComparisonData] = useState<any>(null);
  
  const [saving, setSaving] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);

  // Auto-fill next week goals based on current ratings
  const handleAutoFill = async () => {
    setAutoFilling(true);
    try {
      const suggestions: any = await apiRequest('POST', '/api/hercm/auto-fill-goals', {
        currentH,
        currentE,
        currentR,
        currentC,
        currentM,
      });
      
      setNextWeekH(suggestions.nextWeekH);
      setNextWeekE(suggestions.nextWeekE);
      setNextWeekR(suggestions.nextWeekR);
      setNextWeekC(suggestions.nextWeekC);
      setNextWeekM(suggestions.nextWeekM);
      
      toast({
        title: "Goals Auto-Filled!",
        description: "Next week goals have been suggested based on your current ratings.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to auto-fill goals",
        variant: "destructive",
      });
    } finally {
      setAutoFilling(false);
    }
  };

  // Save current week with comparison
  const handleSave = async () => {
    setSaving(true);
    try {
      // Fetch previous week to get targets
      const previousWeeks: any = await apiRequest('GET', '/api/hercm/weeks');
      let targetH = null, targetE = null, targetR = null, targetC = null, targetM = null;
      
      if (previousWeeks && previousWeeks.length > 0) {
        const prevWeek = previousWeeks[previousWeeks.length - 1];
        // Previous week's next week goals become this week's targets
        targetH = prevWeek.nextWeekH;
        targetE = prevWeek.nextWeekE;
        targetR = prevWeek.nextWeekR;
        targetC = prevWeek.nextWeekC;
        targetM = prevWeek.nextWeekM;
      }
      
      const weekData = {
        userId,
        weekNumber,
        year,
        currentH,
        currentE,
        currentR,
        currentC,
        currentM,
        targetH,
        targetE,
        targetR,
        targetC,
        targetM,
        nextWeekH,
        nextWeekE,
        nextWeekR,
        nextWeekC,
        nextWeekM,
        weekStatus: 'active',
      };
      
      const savedWeek: any = await apiRequest('POST', '/api/hercm/save-with-comparison', weekData);
      
      toast({
        title: "Week Saved!",
        description: "Your weekly progress has been saved successfully.",
      });
      
      // Load comparison if targets existed
      if (targetH !== null) {
        const comparison: any = await apiRequest('GET', `/api/hercm/comparison/${savedWeek.id}`);
        setComparisonData(comparison);
        setShowComparison(true);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save week data",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Rating slider component
  const RatingSlider = ({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        <Badge variant="outline" className="text-lg font-bold">{value}</Badge>
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            onClick={() => onChange(rating)}
            className={`flex-1 h-10 rounded-md transition-all ${
              value === rating
                ? 'bg-blue-600 text-white shadow-md scale-105'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
            data-testid={`rating-${label.toLowerCase()}-${rating}`}
          >
            {rating}
          </button>
        ))}
      </div>
    </div>
  );

  // Comparison indicator
  const ComparisonBadge = ({ improvement }: { improvement: number }) => {
    if (improvement > 0) {
      return (
        <Badge className="bg-green-500">
          <TrendingUp className="w-3 h-3 mr-1" />
          +{improvement}
        </Badge>
      );
    } else if (improvement < 0) {
      return (
        <Badge variant="destructive">
          <TrendingDown className="w-3 h-3 mr-1" />
          {improvement}
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary">
          <Minus className="w-3 h-3 mr-1" />
          0
        </Badge>
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Week Section */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          📅 Week {weekNumber} - Current Feelings
        </h3>
        <div className="space-y-4">
          <RatingSlider value={currentH} onChange={setCurrentH} label="😊 Hope" />
          <RatingSlider value={currentE} onChange={setCurrentE} label="⚡ Energy" />
          <RatingSlider value={currentR} onChange={setCurrentR} label="🤝 Respect" />
          <RatingSlider value={currentC} onChange={setCurrentC} label="💪 Courage" />
          <RatingSlider value={currentM} onChange={setCurrentM} label="❤️ Maturity" />
        </div>
        
        <div className="mt-6 flex gap-3">
          <Button
            onClick={handleAutoFill}
            disabled={autoFilling}
            variant="outline"
            className="flex-1"
            data-testid="button-auto-fill"
          >
            {autoFilling ? (
              <>Loading...</>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Auto-Fill Next Week Goals
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Next Week Goals Section */}
      <Card className="p-6 border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          🎯 Next Week Goals
          <Badge variant="outline">Editable</Badge>
        </h3>
        <div className="space-y-4">
          <RatingSlider value={nextWeekH} onChange={setNextWeekH} label="😊 Hope Target" />
          <RatingSlider value={nextWeekE} onChange={setNextWeekE} label="⚡ Energy Target" />
          <RatingSlider value={nextWeekR} onChange={setNextWeekR} label="🤝 Respect Target" />
          <RatingSlider value={nextWeekC} onChange={setNextWeekC} label="💪 Courage Target" />
          <RatingSlider value={nextWeekM} onChange={setNextWeekM} label="❤️ Maturity Target" />
        </div>
      </Card>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full h-12 text-lg"
        data-testid="button-save-week"
      >
        {saving ? 'Saving...' : '💾 Save This Week'}
      </Button>

      {/* Comparison Section (shows after save if previous week exists) */}
      {showComparison && comparisonData && (
        <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
          <h3 className="text-lg font-semibold mb-4">📊 Weekly Progress Comparison</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">😊 Hope:</span>
              <div className="flex items-center gap-2">
                <span className="text-sm">Target {comparisonData.Hope.target} → Actual {comparisonData.Hope.actual}</span>
                <ComparisonBadge improvement={comparisonData.Hope.improvement} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">⚡ Energy:</span>
              <div className="flex items-center gap-2">
                <span className="text-sm">Target {comparisonData.Energy.target} → Actual {comparisonData.Energy.actual}</span>
                <ComparisonBadge improvement={comparisonData.Energy.improvement} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">🤝 Respect:</span>
              <div className="flex items-center gap-2">
                <span className="text-sm">Target {comparisonData.Respect.target} → Actual {comparisonData.Respect.actual}</span>
                <ComparisonBadge improvement={comparisonData.Respect.improvement} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">💪 Courage:</span>
              <div className="flex items-center gap-2">
                <span className="text-sm">Target {comparisonData.Courage.target} → Actual {comparisonData.Courage.actual}</span>
                <ComparisonBadge improvement={comparisonData.Courage.improvement} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">❤️ Maturity:</span>
              <div className="flex items-center gap-2">
                <span className="text-sm">Target {comparisonData.Maturity.target} → Actual {comparisonData.Maturity.actual}</span>
                <ComparisonBadge improvement={comparisonData.Maturity.improvement} />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Overall Achievement:</span>
                <Badge className="text-lg">{comparisonData.achievementRate}%</Badge>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
