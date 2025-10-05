import Leaderboard from '../Leaderboard';

export default function LeaderboardExample() {
  const entries = [
    { rank: 1, userId: '1', name: 'Alice Johnson', points: 2450 },
    { rank: 2, userId: '2', name: 'Bob Smith', points: 2380, isCurrentUser: true },
    { rank: 3, userId: '3', name: 'Charlie Davis', points: 2210 },
    { rank: 4, userId: '4', name: 'Diana Martinez', points: 2100 },
    { rank: 5, userId: '5', name: 'Ethan Brown', points: 1950 },
    { rank: 6, userId: '6', name: 'Fiona Wilson', points: 1820 },
    { rank: 7, userId: '7', name: 'George Taylor', points: 1750 }
  ];

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <Leaderboard entries={entries} period="week" currentUserId="2" />
      <Leaderboard entries={entries.slice(0, 5)} period="month" />
    </div>
  );
}
