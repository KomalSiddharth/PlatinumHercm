import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, User, ArrowLeft, TrendingUp, AlertCircle, Loader2, Trophy, History as HistoryIcon, Trash2, Pause, ChevronDown, Check, ChevronsUpDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import UnifiedHRCMTable from './UnifiedHRCMTable';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import AdminEmotionalTrackerView from './AdminEmotionalTrackerView';
import RitualHistoryModal from './RitualHistoryModal';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

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

interface ApprovedEmail {
  id: string;
  name: string | null;
  email: string;
}

interface AdminUserDashboardViewerProps {
  approvedEmails: ApprovedEmail[];
}

export default function AdminUserDashboardViewer({ approvedEmails }: AdminUserDashboardViewerProps) {
  const [selectedUserEmail, setSelectedUserEmail] = useState('');
  const [userPopoverOpen, setUserPopoverOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedWeekNumber, setSelectedWeekNumber] = useState<number>(1);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedRitual, setSelectedRitual] = useState<any | null>(null);
  const { toast } = useToast();

  // Get selected user's dashboard data
  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery<UserDashboardData>({
    queryKey: [`/api/admin/user/${selectedUserId}/dashboard`],
    enabled: !!selectedUserId,
  });

  // Auto-select latest week when dashboard data loads
  useEffect(() => {
    if (dashboardData?.allWeeks && dashboardData.allWeeks.length > 0) {
      const latestWeek = Math.max(...dashboardData.allWeeks.map((w: any) => w.weekNumber));
      setSelectedWeekNumber(latestWeek);
    }
  }, [dashboardData]);

  const handleViewDashboard = () => {
    if (!selectedUserEmail) {
      toast({
        title: "Select User",
        description: "Please select a user to view their dashboard",
        variant: "destructive",
      });
      return;
    }
    // CRITICAL FIX: In this system, users.id = email (not UUID from approved_emails.id)
    // Set the email as the user ID for proper data fetching
    setSelectedUserId(selectedUserEmail);
  };

  const handleBackToSearch = () => {
    setSelectedUserId(null);
    setSelectedUserEmail('');
  };

  const handleViewHistory = (ritual: any) => {
    // Set selected ritual - modal will build history from allRitualCompletions
    setSelectedRitual(ritual);
    setHistoryOpen(true);
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
            {/* Progress Comparison: Week 1 vs Latest Week */}
            {dashboardData.allWeeks && dashboardData.allWeeks.length > 0 && (
              <>
                <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30">
                  <CardContent className="pt-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          📊 Progress Comparison - First Week vs Latest Week
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                          Total {dashboardData.allWeeks.length} {dashboardData.allWeeks.length === 1 ? 'week' : 'weeks'} of data available
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Side-by-Side Comparison: Week 1 and Latest Week */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Week 1 (First Week) */}
                  <div className="scroll-mt-20 bg-green-50 dark:bg-green-950/40 p-3 sm:p-4 md:p-6 rounded-lg border-2 border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className="bg-green-600 text-white" data-testid="badge-week-1">
                        Week 1 - Starting Point
                      </Badge>
                    </div>
                    <UnifiedHRCMTable 
                      weekNumber={1}
                      viewAsUserId={selectedUserId} 
                      isAdminView={true}
                    />
                  </div>

                  {/* Latest Week */}
                  <div className="scroll-mt-20 bg-blue-50 dark:bg-blue-950/40 p-3 sm:p-4 md:p-6 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className="bg-blue-600 text-white" data-testid="badge-latest-week">
                        Week {Math.max(...dashboardData.allWeeks.map((w: any) => w.weekNumber))} - Latest Progress
                      </Badge>
                      <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <UnifiedHRCMTable 
                      weekNumber={Math.max(...dashboardData.allWeeks.map((w: any) => w.weekNumber))}
                      viewAsUserId={selectedUserId} 
                      isAdminView={true}
                    />
                  </div>
                </div>

                {/* Additional Week Selector (Optional) */}
                <Collapsible>
                  <Card className="bg-amber-50 dark:bg-amber-950/30">
                    <CardContent className="pt-4">
                      <CollapsibleTrigger asChild>
                        <Button variant="outline" className="w-full justify-between" data-testid="button-toggle-custom-week">
                          <span className="flex items-center gap-2">
                            <HistoryIcon className="w-4 h-4" />
                            View Other Weeks (Optional)
                          </span>
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                      </CollapsibleTrigger>
                    </CardContent>
                  </Card>
                  
                  <CollapsibleContent className="mt-4">
                    <Card className="bg-amber-50 dark:bg-amber-950/30">
                      <CardContent className="pt-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                          <div>
                            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                              Custom Week Selection
                            </p>
                            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                              Select any specific week to view detailed data
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
                                  .sort((a: any, b: any) => b.weekNumber - a.weekNumber)
                                  .map((week: any) => (
                                    <SelectItem 
                                      key={week.id} 
                                      value={week.weekNumber.toString()}
                                      data-testid={`option-week-${week.weekNumber}`}
                                    >
                                      Week {week.weekNumber} {week.weekNumber === Math.max(...dashboardData.allWeeks.map((w: any) => w.weekNumber)) ? '(Latest)' : ''}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Display custom selected week */}
                        <div className="scroll-mt-20 bg-amber-100 dark:bg-amber-950/60 p-3 sm:p-4 md:p-6 rounded-lg border-2 border-amber-300 dark:border-amber-700">
                          <div className="flex items-center gap-2 mb-3">
                            <Badge className="bg-amber-600 text-white" data-testid="badge-custom-week">
                              Week {selectedWeekNumber} - Custom View
                            </Badge>
                          </div>
                          <UnifiedHRCMTable 
                            weekNumber={selectedWeekNumber}
                            viewAsUserId={selectedUserId} 
                            isAdminView={true}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </CollapsibleContent>
                </Collapsible>
              </>
            )}
            
            {/* Daily Rituals Section - Matching User Dashboard */}
            <section className="scroll-mt-20 p-3 sm:p-4 md:p-6 rounded-lg border-2" style={{ backgroundColor: '#00008c', borderColor: '#0000cc' }}>
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <h2 className="text-2xl sm:text-2xl md:text-3xl font-bold text-white">
                    Daily Rituals
                  </h2>
                  <p className="text-sm sm:text-base text-white/80 mt-1">User's daily habits and completions (Admin View - Read Only)</p>
                </div>

                {(dashboardData.rituals || []).length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg border-white/30">
                    <p className="text-white/80">No rituals yet</p>
                  </div>
                ) : (
                  <Card>
                    <div className="divide-y">
                      {(dashboardData.rituals || []).map((ritual: any) => {
                        const isCompleted = dashboardData.todayCompletions?.some((c: any) => c.ritualId === ritual.id);
                        return (
                          <div 
                            key={ritual.id} 
                            className={`flex items-center gap-2 sm:gap-3 md:gap-4 p-2 sm:p-3 md:p-4 hover:bg-muted/30 transition-colors ${!ritual.isActive ? 'opacity-40' : ''}`}
                            data-testid={`ritual-row-${ritual.id}`}
                          >
                            <Checkbox
                              checked={isCompleted}
                              disabled={true}
                              className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0"
                              data-testid={`checkbox-ritual-${ritual.id}`}
                            />
                            
                            <div className="flex-1 min-w-0">
                              <h3 className={`text-sm sm:text-base font-medium ${isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                {ritual.title}
                              </h3>
                            </div>
                            
                            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                              {!ritual.isActive && (
                                <Badge variant="secondary" className="text-[10px] sm:text-xs gap-0.5 sm:gap-1 px-1 sm:px-2">
                                  <Pause className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                  <span className="hidden sm:inline">Paused</span>
                                </Badge>
                              )}
                              
                              <Badge className="gap-0.5 sm:gap-1 bg-gradient-to-r from-primary to-accent text-white border-0 smooth-transition text-xs px-1.5 sm:px-2">
                                <Trophy className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                <span className="text-[10px] sm:text-xs">{ritual.points}</span>
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

            {/* Daily Emotional Tracker (Admin View) - Placed right after Daily Rituals */}
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

            {/* Ritual History Modal */}
            {selectedRitual && (
              <RitualHistoryModal
                open={historyOpen}
                onOpenChange={setHistoryOpen}
                ritualTitle={selectedRitual.title}
                ritualId={selectedRitual.id}
                allCompletions={dashboardData?.allRitualCompletions || []}
              />
            )}
          </>
        )}
      </div>
    );
  }

  // User selection interface
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            View User Dashboard
          </CardTitle>
          <CardDescription>
            Select a user to view their complete HRCM dashboard, rituals, and progress
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Select User</label>
            <Popover open={userPopoverOpen} onOpenChange={setUserPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={userPopoverOpen}
                  className="w-full justify-between"
                  data-testid="button-select-dashboard-user"
                >
                  {selectedUserEmail ? (
                    <span className="truncate">
                      {(() => {
                        const user = approvedEmails.find(e => e.email === selectedUserEmail);
                        return user ? `${user.name || 'No Name'} (${user.email})` : selectedUserEmail;
                      })()}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Search and select user...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search by name or email..." data-testid="input-search-dashboard-user" />
                  <CommandList>
                    <CommandEmpty>No user found.</CommandEmpty>
                    <CommandGroup>
                      {approvedEmails.map((user) => (
                        <CommandItem
                          key={user.email}
                          value={`${user.name || ''} ${user.email}`}
                          onSelect={() => {
                            setSelectedUserEmail(user.email);
                            setUserPopoverOpen(false);
                          }}
                          data-testid={`option-dashboard-user-${user.email}`}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${
                              selectedUserEmail === user.email ? 'opacity-100' : 'opacity-0'
                            }`}
                          />
                          <div className="flex flex-col">
                            <span className="font-medium">{user.name || 'No Name'}</span>
                            <span className="text-xs text-muted-foreground">{user.email}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <Button 
            onClick={handleViewDashboard}
            disabled={!selectedUserEmail || isDashboardLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold"
            data-testid="button-view-dashboard"
          >
            {isDashboardLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading Dashboard...
              </>
            ) : (
              <>
                <User className="w-4 h-4 mr-2" />
                View Dashboard
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
