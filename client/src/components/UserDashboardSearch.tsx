import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, User, ArrowLeft, TrendingUp, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import UnifiedHRCMTable from './UnifiedHRCMTable';
import AdminEmotionalTrackerView from './AdminEmotionalTrackerView';
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

export default function UserDashboardSearch() {
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
      return sum + (ritual.points || 10);
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
            data-testid="button-back-to-search-user"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Search
          </Button>
          
          <div className="flex items-center gap-4">
            {/* Points Display */}
            <Badge className="bg-gradient-to-r from-pink-500 to-blue-500 text-white px-4 py-2 text-base font-semibold" data-testid="badge-user-total-points">
              ⭐ {totalPoints} Points
            </Badge>
            
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold" data-testid="text-viewing-dashboard-user-name">{displayName}</h3>
                <p className="text-sm text-muted-foreground" data-testid="text-viewing-dashboard-user-email">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>

        <Card className="bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900">
          <CardContent className="pt-4">
            <p className="text-sm text-purple-700 dark:text-purple-300">
              👥 Team View - You are viewing <strong>{displayName}'s</strong> dashboard
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
            {/* Show all weeks history - matching admin view */}
            {dashboardData.allWeeks && dashboardData.allWeeks.length > 0 ? (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold">HRCM Weekly History (All {dashboardData.allWeeks.length} Weeks)</h3>
                {dashboardData.allWeeks.map((week: any) => (
                  <div key={week.id} className="scroll-mt-20 bg-blue-50 dark:bg-blue-950/40 p-3 sm:p-4 md:p-6 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                    <UnifiedHRCMTable 
                      weekNumber={week.weekNumber}
                      viewAsUserId={selectedUserId} 
                      isAdminView={false}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <UnifiedHRCMTable 
                weekNumber={1}
                viewAsUserId={selectedUserId} 
                isAdminView={false}
              />
            )}
            
            {/* Daily Rituals Section - Matching User Dashboard Styling */}
            <section className="scroll-mt-20 p-3 sm:p-4 md:p-6 rounded-lg border-2" style={{ backgroundColor: '#00008c', borderColor: '#0000cc' }}>
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <h2 className="text-2xl sm:text-2xl md:text-3xl font-bold text-white">Daily Rituals</h2>
                  <p className="text-sm sm:text-base text-white/80 mt-1">User's daily habits and completions (Read Only)</p>
                </div>

                {(dashboardData.rituals || []).length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      <p>No rituals added yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {(dashboardData.rituals || []).map((ritual: any) => {
                      const isCompleted = dashboardData.todayCompletions?.some((c: any) => c.ritualId === ritual.id);
                      const isPaused = !ritual.isActive;
                      
                      return (
                        <Card 
                          key={ritual.id} 
                          className={`relative ${isPaused ? 'opacity-60' : ''}`}
                          data-testid={`team-ritual-card-${ritual.id}`}
                        >
                          <CardContent className="p-3 sm:p-4">
                            <div className="flex items-start gap-2 sm:gap-3">
                              <Checkbox
                                checked={isCompleted}
                                disabled={true}
                                className="mt-0.5"
                                data-testid={`team-ritual-checkbox-${ritual.id}`}
                              />
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm sm:text-base truncate" data-testid={`team-ritual-title-${ritual.id}`}>
                                  {ritual.title}
                                </h4>
                                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1">
                                  <Badge className="text-[10px] sm:text-xs px-1.5 py-0 h-4 sm:h-5 bg-gradient-to-r from-primary to-accent text-white border-0">
                                    +{ritual.points} pts
                                  </Badge>
                                  {isPaused && (
                                    <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 py-0 h-4 sm:h-5">
                                      ⏸ Paused
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            {/* Daily Emotional Tracker - Team View */}
            <AdminEmotionalTrackerView userId={selectedUserId} />

            {/* Course Progress Section - Read-Only Team View */}
            <section className="scroll-mt-20 bg-blue-50 dark:bg-blue-950/40 p-3 sm:p-4 md:p-6 rounded-lg border-2 border-blue-200 dark:border-blue-800">
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <h2 className="text-2xl sm:text-2xl md:text-3xl font-bold">Course Progress</h2>
                  <p className="text-sm sm:text-base text-muted-foreground mt-1">Completed lessons across all courses (Read Only)</p>
                </div>

                {dashboardData.completedLessons && dashboardData.completedLessons.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Total Completed Lessons</span>
                      <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
                        {dashboardData.completedLessons.length} lessons completed
                      </Badge>
                    </div>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          {dashboardData.completedLessons.map((lesson: any, index: number) => (
                            <div 
                              key={lesson.id || index} 
                              className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/30"
                              data-testid={`team-lesson-item-${index}`}
                            >
                              <Checkbox
                                checked={true}
                                disabled={true}
                                className="mt-0.5"
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium">
                                  {lesson.videoId || lesson.id || `Lesson ${index + 1}`}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Completed {lesson.completedAt ? new Date(lesson.completedAt).toLocaleDateString() : 'N/A'}
                                </p>
                              </div>
                              <Badge className="text-[10px] px-1.5 py-0 h-5 bg-gradient-to-r from-primary to-accent text-white border-0">
                                +10 pts
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      <p>No lessons completed yet</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </section>

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
                        data-testid={`team-badge-item-${badge.id}`}
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
            Search Team Member Dashboard
          </CardTitle>
          <CardDescription>
            Enter a team member's name or email to view their dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              data-testid="input-user-dashboard-search"
              className="flex-1"
            />
            <Button 
              onClick={handleSearch}
              disabled={isSearching}
              data-testid="button-user-dashboard-search"
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
              data-testid={`card-user-search-result-${user.id}`}
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
                      <h3 className="font-semibold" data-testid={`text-search-user-name-${user.id}`}>
                        {user.firstName} {user.lastName}
                      </h3>
                      <p className="text-sm text-muted-foreground" data-testid={`text-search-user-email-${user.id}`}>
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
                        data-testid={`card-search-${label.toLowerCase()}-${user.id}`}
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
            <p className="text-sm">Enter a name or email above to search for a team member's dashboard</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
