import PlatinumProgress from '../PlatinumProgress';

export default function PlatinumProgressExample() {
  const weekStatuses = [
    { week: 1, hercmCompleted: true, checklistCompleted: true, ritualRate: 85 },
    { week: 2, hercmCompleted: true, checklistCompleted: true, ritualRate: 90 },
    { week: 3, hercmCompleted: true, checklistCompleted: false, ritualRate: 75 },
    { week: 4, hercmCompleted: false, checklistCompleted: false, ritualRate: 0 }
  ];

  return (
    <div className="p-8 max-w-4xl">
      <PlatinumProgress currentWeek={3} weekStatuses={weekStatuses} />
    </div>
  );
}
