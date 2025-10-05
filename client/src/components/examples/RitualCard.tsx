import RitualCard from '../RitualCard';

export default function RitualCardExample() {
  return (
    <div className="space-y-4 p-8 max-w-2xl">
      <RitualCard
        id="1"
        title="Morning meditation"
        recurrence="daily"
        points={50}
        active={true}
        completed={false}
        onToggleComplete={(id) => console.log('Toggle complete:', id)}
        onToggleActive={(id) => console.log('Toggle active:', id)}
        onViewHistory={(id) => console.log('View history:', id)}
      />
      <RitualCard
        id="2"
        title="Read for 30 minutes"
        recurrence="daily"
        points={75}
        active={true}
        completed={true}
        onToggleComplete={(id) => console.log('Toggle complete:', id)}
        onToggleActive={(id) => console.log('Toggle active:', id)}
        onViewHistory={(id) => console.log('View history:', id)}
      />
      <RitualCard
        id="3"
        title="Exercise routine"
        recurrence="mon-fri"
        points={100}
        active={false}
        completed={false}
        onToggleComplete={(id) => console.log('Toggle complete:', id)}
        onToggleActive={(id) => console.log('Toggle active:', id)}
        onViewHistory={(id) => console.log('View history:', id)}
      />
    </div>
  );
}
