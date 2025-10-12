import HRCMCard from '../HRCMCard';

export default function HRCMCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8 max-w-4xl">
      <HRCMCard
        category="health"
        current={7}
        target={8}
        onCurrentChange={(val) => console.log('Health current:', val)}
        onTargetChange={(val) => console.log('Health target:', val)}
        onViewChecklist={() => console.log('View health checklist')}
      />
      <HRCMCard
        category="relationship"
        current={6}
        target={7}
        onCurrentChange={(val) => console.log('Relationship current:', val)}
        onTargetChange={(val) => console.log('Relationship target:', val)}
        onViewChecklist={() => console.log('View relationship checklist')}
      />
      <HRCMCard
        category="career"
        current={8}
        target={9}
        onCurrentChange={(val) => console.log('Career current:', val)}
        onTargetChange={(val) => console.log('Career target:', val)}
        onViewChecklist={() => console.log('View career checklist')}
      />
      <HRCMCard
        category="money"
        current={5}
        target={6}
        onCurrentChange={(val) => console.log('Money current:', val)}
        onTargetChange={(val) => console.log('Money target:', val)}
        onViewChecklist={() => console.log('View money checklist')}
      />
    </div>
  );
}
