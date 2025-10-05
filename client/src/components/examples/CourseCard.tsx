import CourseCard from '../CourseCard';

export default function CourseCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8 max-w-4xl">
      <CourseCard
        id="1"
        title="Advanced React Patterns"
        url="https://example.com/react"
        tags={['React', 'JavaScript', 'Frontend']}
        source="Udemy"
        estimatedHours={12}
        status="in_progress"
        progressPercent={45}
        onUpdateProgress={(id) => console.log('Update:', id)}
      />
      <CourseCard
        id="2"
        title="Financial Planning Fundamentals"
        url="https://example.com/finance"
        tags={['Finance', 'Investment', 'Money Management', 'Budgeting']}
        source="Coursera"
        estimatedHours={8}
        status="not_started"
        progressPercent={0}
        onUpdateProgress={(id) => console.log('Update:', id)}
      />
      <CourseCard
        id="3"
        title="Mindfulness and Meditation"
        url="https://example.com/meditation"
        tags={['Health', 'Mental Wellness']}
        source="Headspace"
        estimatedHours={6}
        status="completed"
        progressPercent={100}
        onUpdateProgress={(id) => console.log('Update:', id)}
      />
    </div>
  );
}
