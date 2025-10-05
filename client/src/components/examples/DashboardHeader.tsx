import DashboardHeader from '../DashboardHeader';

export default function DashboardHeaderExample() {
  return (
    <div className="min-h-screen">
      <DashboardHeader
        userName="John Doe"
        userPoints={1250}
        isAdmin={true}
        activeSection="hercm"
        onNavigate={(section) => console.log('Navigate to:', section)}
      />
      <div className="p-8">
        <p className="text-muted-foreground">Content below header...</p>
      </div>
    </div>
  );
}
