import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, User, ArrowLeft, TrendingUp, AlertCircle, Loader2, Trophy, History as HistoryIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import UnifiedHRCMTable from './UnifiedHRCMTable';
import AdminEmotionalTrackerView from './AdminEmotionalTrackerView';
import RitualHistoryModal from './RitualHistoryModal';
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
  const [selectedWeekNumber, setSelectedWeekNumber] = useState<number>(1);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedRitual, setSelectedRitual] = useState<any | null>(null);
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

  // Set selected week to latest week when dashboard data loads
  useEffect(() => {
    if (dashboardData?.allWeeks && dashboardData.allWeeks.length > 0) {
      // Get the latest week (highest week number)
      const latestWeek = dashboardData.allWeeks.reduce((max, week) => 
        week.weekNumber > max ? week.weekNumber : max, 1
      );
      setSelectedWeekNumber(latestWeek);
    }
  }, [dashboardData?.allWeeks]);

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

  // Handle ritual history view
  const handleViewHistory = (ritual: any) => {
    if (!dashboardData?.allRitualCompletions) return;
    
    // Get current month's date range
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0);

    // Build history for each day of current month
    const history = [];
    for (let day = startOfMonth.getDate(); day <= endOfMonth.getDate(); day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const completion = dashboardData.allRitualCompletions.find((c: any) => 
        c.ritualId === ritual.id && c.date === dateStr
      );
      
      history.push({
        date: dateStr,
        completed: !!completion,
        skipped: false
      });
    }

    setSelectedRitual({
      ...ritual,
      history
    });
    setHistoryOpen(true);
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
            {/* Week Selector - only show if user has multiple weeks */}
            {dashboardData.allWeeks && dashboardData.allWeeks.length > 0 && (
              <Card className="bg-gradient-to-r from-blue-50 to-teal-50 dark:from-blue-950/40 dark:to-teal-950/40 border-blue-200 dark:border-blue-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">HRCM Weekly History</h3>
                      <p className="text-xs text-muted-foreground">
                        Total {dashboardData.allWeeks.length} {dashboardData.allWeeks.length === 1 ? 'week' : 'weeks'} of data available
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium whitespace-nowrap">Select Week:</label>
                      <Select 
                        value={selectedWeekNumber.toString()} 
                        onValueChange={(value) => setSelectedWeekNumber(parseInt(value))}
                      >
                        <SelectTrigger className="w-[140px]" data-testid="select-week-number">
                          <SelectValue placeholder="Select week" />
                        </SelectTrigger>
                        <SelectContent>
                          {dashboardData.allWeeks
                            .sort((a: any, b: any) => b.weekNumber - a.weekNumber) // Latest first
                            .map((week: any) => (
                              <SelectItem 
                                key={week.id} 
                                value={week.weekNumber.toString()}
                                data-testid={`select-week-${week.weekNumber}`}
                              >
                                Week {week.weekNumber} {week.weekNumber === dashboardData.allWeeks.reduce((max: number, w: any) => w.weekNumber > max ? w.weekNumber : max, 1) ? '(Latest)' : ''}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Display selected week's HRCM table */}
            <div className="scroll-mt-20 bg-blue-50 dark:bg-blue-950/40 p-3 sm:p-4 md:p-6 rounded-lg border-2 border-blue-200 dark:border-blue-800">
              <UnifiedHRCMTable 
                weekNumber={selectedWeekNumber}
                viewAsUserId={selectedUserId} 
                isAdminView={false}
              />
            </div>
            
            {/* Daily Rituals Section - Matching User Dashboard Styling with History Button */}
            <section className="scroll-mt-20 p-3 sm:p-4 md:p-6 rounded-lg border-2" style={{ backgroundColor: '#00008c', borderColor: '#0000cc' }}>
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <h2 className="text-2xl sm:text-2xl md:text-3xl font-bold text-white">Daily Rituals</h2>
                  <p className="text-sm sm:text-base text-white/80 mt-1">Team member's daily habits and completions (Read Only)</p>
                </div>

                {(dashboardData.rituals || []).length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      <p>No rituals added yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <div className="divide-y">
                      {(dashboardData.rituals || []).map((ritual: any) => {
                        const isCompleted = dashboardData.todayCompletions?.some((c: any) => c.ritualId === ritual.id);
                        const isPaused = !ritual.isActive;

                        return (
                          <div 
                            key={ritual.id} 
                            className={`flex items-center gap-2 sm:gap-3 md:gap-4 p-2 sm:p-3 md:p-4 hover:bg-muted/30 transition-colors ${isPaused ? 'opacity-40' : ''}`}
                            data-testid={`team-ritual-row-${ritual.id}`}
                          >
                            <Checkbox
                              checked={isCompleted}
                              disabled={true}
                              className="w-4 h-4 sm:w-5 sm:h-5"
                              data-testid={`team-ritual-checkbox-${ritual.id}`}
                            />

                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm sm:text-base" data-testid={`team-ritual-title-${ritual.id}`}>
                                {ritual.title}
                              </h4>
                              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                                {ritual.frequency === 'daily' ? 'Daily' : ritual.frequency === 'mon-fri' ? 'Mon-Fri' : 'Custom'}
                              </p>
                            </div>

                            <div className="flex items-center gap-1 sm:gap-2">
                              <Badge className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0 h-5 sm:h-6 bg-gradient-to-r from-primary to-accent text-white border-0 gap-1">
                                <Trophy className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                {ritual.points}
                              </Badge>

                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleViewHistory(ritual)}
                                      data-testid={`button-history-${ritual.id}`}
                                      className="w-7 h-7 sm:w-8 sm:h-8"
                                    >
                                      <HistoryIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>View history</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                )}
              </div>
            </section>

            {/* Daily Emotional Tracker - Team View */}
            <AdminEmotionalTrackerView userId={selectedUserId} />

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

            {/* Ritual History Modal */}
            {selectedRitual && (
              <RitualHistoryModal
                open={historyOpen}
                onOpenChange={setHistoryOpen}
                ritualTitle={selectedRitual.title}
                history={selectedRitual.history || []}
              />
            )}
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
