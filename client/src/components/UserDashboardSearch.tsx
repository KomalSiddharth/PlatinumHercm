import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, User, ArrowLeft, TrendingUp, AlertCircle, Loader2, Trophy, History as HistoryIcon, ChevronsUpDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import UnifiedHRCMTable from './UnifiedHRCMTable';
import AdminEmotionalTrackerView from './AdminEmotionalTrackerView';
import RitualHistoryModal from './RitualHistoryModal';
import TeamGoalsViewer from './TeamGoalsViewer';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

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

interface UserDashboardSearchProps {
  isAdmin?: boolean; // Optional prop to determine endpoint
}

export default function UserDashboardSearch({ isAdmin = false }: UserDashboardSearchProps) {
  // 🔥 NEW DROPDOWN VERSION - v3.0 (Admin/Team endpoint support)
  console.log('🔥 UserDashboardSearch v3.0 - isAdmin:', isAdmin);
  
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedRitual, setSelectedRitual] = useState<any | null>(null);
  const { toast } = useToast();

  // 🔥 FIX: Use correct endpoint based on admin status
  const searchEndpoint = isAdmin ? '/api/admin/search-user-by-name' : '/api/team/search-users';
  const dashboardEndpointBase = isAdmin ? '/api/admin/user' : '/api/team/user';

  // Search users by name or email (live search as user types)
  const { data: searchResults, isLoading: isSearching, error: searchError } = useQuery<UserSearchResult[]>({
    queryKey: [searchEndpoint, searchQuery],
    queryFn: async () => {
      if (searchQuery.length < 2) return [];
      console.log(`🔍 Searching for: "${searchQuery}" using endpoint: ${searchEndpoint}`);
      const response = await fetch(`${searchEndpoint}?name=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) {
        if (response.status === 404) {
          console.log('❌ No users found for:', searchQuery);
          return []; // Return empty array instead of throwing error
        }
        console.error('❌ Search failed:', response.status, response.statusText);
        throw new Error('Search failed');
      }
      const data = await response.json();
      console.log('✅ Search results:', data.length, 'users');
      return data;
    },
    enabled: searchQuery.length >= 2, // Only search when 2+ characters typed
    retry: false, // Don't retry on 404
  });

  // Get selected user's dashboard data - LIVE with instant updates on ritual changes
  const { data: dashboardData, isLoading: isDashboardLoading, error: dashboardError } = useQuery<UserDashboardData>({
    queryKey: [`${dashboardEndpointBase}/${selectedUserId}/dashboard`],
    enabled: !!selectedUserId,
    retry: false, // Don't retry on 404 errors
    staleTime: 0, // Always consider data stale for instant updates
    refetchInterval: 2000, // Poll every 2 seconds for real-time ritual updates
  });

  // Fetch selected user's goals
  const { data: userGoals = [] } = useQuery<any[]>({
    queryKey: [`/api/team/user/${selectedUserId}/goals`],
    enabled: !!selectedUserId,
    retry: false,
  });

  // Fetch selected user's total points (matches their actual dashboard) - LIVE with instant updates
  const { data: userTotalPointsData } = useQuery<{
    totalPoints: number;
    ritualPoints: number;
    lessonPoints: number;
    ritualCount: number;
    lessonCount: number;
  }>({
    queryKey: [`/api/team/user/${selectedUserId}/total-points`],
    enabled: !!selectedUserId,
    retry: false,
    staleTime: 0, // Always consider data stale for instant updates
    refetchInterval: 2000, // Poll every 2 seconds for real-time updates
  });

  // Auto-detect latest week (no manual selection needed)
  const latestWeekNumber = dashboardData?.allWeeks && dashboardData.allWeeks.length > 0
    ? dashboardData.allWeeks.reduce((max, week) => 
        week.weekNumber > max ? week.weekNumber : max, 1
      )
    : 1;

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    setOpen(false);
    setSearchQuery(''); // Clear search after selection
  };

  const handleBackToSearch = () => {
    setSelectedUserId(null);
    setSearchQuery('');
  };

  // Get selected user name for display
  const selectedUser = searchResults?.find(u => u.id === selectedUserId);

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (rating >= 5) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  };

  // Handle ritual history view
  const handleViewHistory = (ritual: any) => {
    setSelectedRitual(ritual);
    setHistoryOpen(true);
  };

  // 🔥 Handle placeholder users (approved but not logged in)
  if (selectedUserId && dashboardError) {
    const selectedUserInfo = searchResults?.find(u => u.id === selectedUserId);
    return (
      <div className="space-y-4">
        <Button 
          variant="outline" 
          onClick={handleBackToSearch}
          data-testid="button-back-to-search-user"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Search
        </Button>
        
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="text-amber-700 dark:text-amber-400 flex items-center gap-2">
              <User className="w-5 h-5" />
              User Not Available
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              <strong>{selectedUserInfo?.email || 'This user'}</strong> is approved to access the platform but hasn't logged in yet.
            </p>
            <p className="text-sm text-muted-foreground">
              Once they log in and start using the dashboard, their progress will be available here.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
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
      return sum + (ritual.points || 1);
    }, 0);
    
    const lessonPoints = (dashboardData.completedLessons || []).length * 1; // 1 point per lesson
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
            {/* Display Week 1 HRCM table (always show Week 1) */}
            <div className="scroll-mt-20 bg-blue-50 dark:bg-blue-950/40 p-3 sm:p-4 md:p-6 rounded-lg border-2 border-blue-200 dark:border-blue-800">
              <UnifiedHRCMTable 
                weekNumber={1}
                viewAsUserId={selectedUserId} 
                isAdminView={isAdmin}
              />
            </div>
            
            {/* Daily Rituals Section - Matching User Dashboard Styling with History Button */}
            <section className="scroll-mt-20 p-3 sm:p-4 md:p-6 rounded-lg border-2" style={{ backgroundColor: '#00008c', borderColor: '#0000cc' }}>
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <h2 className="text-2xl sm:text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
                    Daily Rituals
                    <Badge className="gap-1.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white border-0 text-base px-3 py-1">
                      <Trophy className="w-4 h-4" />
                      {userTotalPointsData?.totalPoints || 0} Points
                    </Badge>
                  </h2>
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
            <AdminEmotionalTrackerView userId={selectedUserId} isAdminView={isAdmin} />

            {/* Team Goals & Affirmations - Read-Only View */}
            <TeamGoalsViewer goals={userGoals} />

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
                ritualId={selectedRitual.id}
                allCompletions={dashboardData.allRitualCompletions || []}
              />
            )}
          </>
        )}
      </div>
    );
  }

  // Search interface with Select User dropdown
  return (
    <div className="space-y-4">
      {/* 🔥 DROPDOWN SEARCH DESIGN */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Select User</h3>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between h-12 text-muted-foreground"
              data-testid="button-select-user-dropdown"
            >
              {selectedUserId && selectedUser
                ? `${selectedUser.firstName} ${selectedUser.lastName}`
                : "Search and select user..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[500px] p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Search by name..."
                value={searchQuery}
                onValueChange={setSearchQuery}
                data-testid="input-user-search"
                className="h-12"
              />
              <CommandList className="max-h-[400px]">
                <CommandEmpty>
                  {isSearching ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mr-2" />
                      <span className="text-sm text-muted-foreground">Searching...</span>
                    </div>
                  ) : searchQuery.length < 2 ? (
                    <div className="text-center py-6 text-sm text-muted-foreground">
                      Type at least 2 characters to search
                    </div>
                  ) : (
                    <div className="text-center py-6 text-sm text-muted-foreground">
                      No users found
                    </div>
                  )}
                </CommandEmpty>
                {searchResults && searchResults.length > 0 && (
                  <CommandGroup>
                    {searchResults.map((user) => {
                      const displayName = `${user.firstName || 'No'} ${user.lastName || 'Name'}`;
                      return (
                        <CommandItem
                          key={user.id}
                          value={`${user.firstName} ${user.lastName}`}
                          onSelect={() => handleSelectUser(user.id)}
                          className="flex items-center py-3 cursor-pointer"
                          data-testid={`option-user-${user.id}`}
                        >
                          <div className="font-semibold text-base">{displayName}</div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Empty state when no user selected */}
      {!selectedUserId && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-muted-foreground">
            <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Select a user from the dropdown above to view their dashboard</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
