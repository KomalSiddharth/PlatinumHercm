import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, User, ArrowLeft, TrendingUp, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import UnifiedHRCMTable from './UnifiedHRCMTable';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface UserSearchResult {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  latestWeek: {
    weekNumber: number;
    healthRating: number;
    relationshipRating: number;
    careerRating: number;
    moneyRating: number;
    overallScore: number;
  } | null;
  totalWeeks: number;
}

interface UserDashboardData {
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  currentWeek?: any;
  allWeeks: any[];
  platinumProgress?: any;
  completedLessons: any[];
  rituals: any[];
  todayCompletions: any[];
  allRitualCompletions: any[];
  platinumBadges: any[];
}

export default function AdminUserDashboardViewer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const { toast } = useToast();

  // Search users by name or email
  const { data: searchResults, isLoading: isSearching, error: searchError } = useQuery<UserSearchResult[]>({
    queryKey: [`/api/admin/search-user-by-name?name=${searchTerm}`],
    enabled: !!searchTerm,
  });

  // Get selected user's dashboard data
  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery<UserDashboardData>({
    queryKey: [`/api/admin/user/${selectedUserId}/dashboard`],
    enabled: !!selectedUserId,
  });

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Search Required",
        description: "Please enter a name or email to search",
        variant: "destructive",
      });
      return;
    }
    setSearchTerm(searchQuery.trim());
    setSelectedUserId(null); // Reset selection when searching
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
  };

  const handleBackToSearch = () => {
    setSelectedUserId(null);
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (rating >= 5) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  };

  // If viewing a user's dashboard
  if (selectedUserId && dashboardData) {
    const user = dashboardData.user;
    const displayName = user?.firstName && user?.lastName 
      ? `${user.firstName} ${user.lastName}` 
      : user?.email || 'User';

    // Calculate ALL-TIME total points (same as leaderboard)
    const ritualPoints = (dashboardData.allRitualCompletions || []).reduce((sum: number, completion: any) => {
      const ritual = dashboardData.rituals?.find((r: any) => r.id === completion.ritualId);
      if (!ritual || !ritual.isActive) return sum;
      return sum + (ritual.points || 10); // Use ritual points or default to 10
    }, 0);
    
    const lessonPoints = (dashboardData.completedLessons || []).length * 10; // 10 points per lesson
    const totalPoints = ritualPoints + lessonPoints;

    return (
      <div className="space-y-4">
        {/* Header with back button and points */}
        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={handleBackToSearch}
            data-testid="button-back-to-search"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Search
          </Button>
          
          <div className="flex items-center gap-4">
            {/* Points Display */}
            <Badge className="bg-gradient-to-r from-pink-500 to-blue-500 text-white px-4 py-2 text-base font-semibold" data-testid="badge-total-points">
              ⭐ {totalPoints} Points
            </Badge>
            
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold" data-testid="text-viewing-user-name">{displayName}</h3>
                <p className="text-sm text-muted-foreground" data-testid="text-viewing-user-email">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>

        <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900">
          <CardContent className="pt-4">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              🔍 Admin View - You are viewing <strong>{displayName}'s</strong> dashboard exactly as they see it
            </p>
          </CardContent>
        </Card>

        {/* User's HRCM Dashboard */}
        {isDashboardLoading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
              <p className="text-muted-foreground">Loading dashboard...</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <UnifiedHRCMTable 
              weekNumber={dashboardData.currentWeek?.weekNumber || 1}
              viewAsUserId={selectedUserId} 
              isAdminView={true}
            />
            
            {/* Daily Rituals Section */}
            <Card className="bg-blue-900 border-blue-700">
              <CardHeader>
                <CardTitle className="text-white text-2xl">Daily Rituals</CardTitle>
                <CardDescription className="text-white/80">
                  User's daily habits and completions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(dashboardData.rituals || []).length === 0 ? (
                  <p className="text-white/70 text-center py-8">No rituals added yet</p>
                ) : (
                  <div className="space-y-3">
                    {(dashboardData.rituals || []).map((ritual: any) => {
                      const isCompleted = dashboardData.todayCompletions?.some((c: any) => c.ritualId === ritual.id);
                      return (
                        <div 
                          key={ritual.id} 
                          className="bg-white dark:bg-gray-800 p-4 rounded-lg flex items-center justify-between"
                          data-testid={`ritual-item-${ritual.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isCompleted ? 'bg-green-500' : 'bg-gray-300'}`}>
                              {isCompleted && <span className="text-white text-sm">✓</span>}
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white">{ritual.title}</h4>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {ritual.frequency === 'daily' ? 'Daily' : 'Mon-Fri'} • {ritual.points} points
                              </p>
                            </div>
                          </div>
                          <Badge variant={isCompleted ? "default" : "outline"}>
                            {isCompleted ? 'Completed' : 'Pending'}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Badges Section */}
            <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-yellow-200 dark:border-yellow-800">
              <CardHeader>
                <CardTitle className="text-2xl bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                  Earned Badges
                </CardTitle>
                <CardDescription className="text-gray-700 dark:text-gray-300">
                  Achievements and milestones
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(dashboardData.platinumBadges || []).length === 0 ? (
                  <p className="text-gray-600 dark:text-gray-400 text-center py-8">No badges earned yet</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(dashboardData.platinumBadges || []).map((badge: any) => (
                      <div 
                        key={badge.id}
                        className="bg-white dark:bg-gray-800 p-4 rounded-lg border-2 border-yellow-400 dark:border-yellow-600"
                        data-testid={`badge-item-${badge.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-4xl">🏆</span>
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white">{badge.badgeName}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Achieved {new Date(badge.achievedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    );
  }

  // Search interface
  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search User Dashboard
          </CardTitle>
          <CardDescription>
            Enter a user's name or email to view their complete dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              data-testid="input-dashboard-search"
              className="flex-1"
            />
            <Button 
              onClick={handleSearch}
              disabled={isSearching}
              data-testid="button-dashboard-search"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Searching
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {isSearching && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            Searching for users...
          </CardContent>
        </Card>
      )}

      {searchError && (
        <Card>
          <CardContent className="p-6 flex items-center justify-center gap-2 text-destructive">
            <AlertCircle className="w-5 h-5" />
            <span>No users found matching "{searchTerm}"</span>
          </CardContent>
        </Card>
      )}

      {searchResults && searchResults.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Found {searchResults.length} user{searchResults.length > 1 ? 's' : ''}
          </p>
          
          {searchResults.map((user) => (
            <Card 
              key={user.id} 
              className="hover-elevate cursor-pointer transition-all" 
              onClick={() => handleSelectUser(user.id)}
              data-testid={`card-search-result-${user.id}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {user.firstName?.[0]}{user.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold" data-testid={`text-user-name-${user.id}`}>
                        {user.firstName} {user.lastName}
                      </h3>
                      <p className="text-sm text-muted-foreground" data-testid={`text-user-email-${user.id}`}>
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="mb-1">
                      Week {user.latestWeek?.weekNumber || 0}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {user.totalWeeks} total weeks
                    </p>
                  </div>
                </div>
              </CardHeader>
              
              {user.latestWeek && (
                <CardContent className="pt-0">
                  <div className="mb-3 p-2 bg-muted/50 rounded-md flex items-center justify-between">
                    <span className="text-sm font-medium flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" />
                      Overall Score
                    </span>
                    <Badge className={getRatingColor(user.latestWeek.overallScore)}>
                      {user.latestWeek.overallScore}/10
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Health', value: user.latestWeek.healthRating, icon: '💪' },
                      { label: 'Relationship', value: user.latestWeek.relationshipRating, icon: '❤️' },
                      { label: 'Career', value: user.latestWeek.careerRating, icon: '💼' },
                      { label: 'Money', value: user.latestWeek.moneyRating, icon: '💰' },
                    ].map(({ label, value, icon }) => (
                      <div 
                        key={label} 
                        className="p-2 border rounded-md"
                        data-testid={`card-${label.toLowerCase()}-${user.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium flex items-center gap-1">
                            <span>{icon}</span>
                            {label}
                          </span>
                          <Badge className={`${getRatingColor(value)} text-xs h-5`}>
                            {value}/10
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
              
              {!user.latestWeek && (
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground text-center">No activity data available</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Empty state when no search performed */}
      {!searchTerm && !isSearching && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-muted-foreground">
            <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Enter a name or email above to search for a user's dashboard</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
