import WeeklySummary from '../WeeklySummary';

export default function WeeklySummaryExample() {
  return (
    <div className="p-8 max-w-2xl space-y-4">
      <WeeklySummary
        weekStart="Feb 3"
        weekEnd="Feb 9"
        completionPercent={75}
        areasCompleted={3}
        totalAreas={4}
      />
      <WeeklySummary
        weekStart="Feb 10"
        weekEnd="Feb 16"
        completionPercent={100}
        areasCompleted={4}
        totalAreas={4}
      />
    </div>
  );
}
