import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import DashboardHeader from "@/components/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, TrendingUp, Award, BarChart3, Eye, X } from "lucide-react";
import type { User } from "@shared/schema";

export default function AdminPortal() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, isAdmin, user } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Redirect to home if not admin
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !isAdmin)) {
      toast({
        title: "Unauthorized",
        description: "Admin access required. Redirecting...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, isAdmin, toast]);

  const { data: allUsers = [], isLoading: loadingUsers } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: isAdmin,
  });

  // Fetch selected user's detailed analytics
  const { data: userAnalytics, isLoading: loadingAnalytics } = useQuery({
    queryKey: ["/api/admin/user", selectedUserId, "analytics"],
    enabled: !!selectedUserId && isAdmin,
  });

  if (isLoading || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Admin Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Admin Portal
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage users and monitor platform performance
              </p>
            </div>
            <Button 
              variant="outline"
              onClick={() => window.location.href = '/dashboard'}
              data-testid="button-view-my-dashboard"
            >
              <Eye className="w-4 h-4 mr-2" />
              View My Dashboard
            </Button>
          </div>

          {/* Stats Overview */}
          <div className="grid md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Total Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold" data-testid="stat-total-users">
                  {allUsers.length}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Active This Week
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold" data-testid="stat-active-users">
                  {Math.floor(allUsers.length * 0.7)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-600" />
                  Badges Earned
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold" data-testid="stat-badges">
                  {allUsers.length * 3}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  Avg Completion
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold" data-testid="stat-avg-completion">
                  67%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Users List */}
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <p className="text-center text-muted-foreground py-8">Loading users...</p>
              ) : allUsers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No users yet</p>
              ) : (
                <div className="space-y-4">
                  {allUsers.map((u) => (
                    <div 
                      key={u.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover-elevate"
                      data-testid={`user-card-${u.id}`}
                    >
                      <div className="flex items-center gap-4">
                        {u.profileImageUrl ? (
                          <img 
                            src={u.profileImageUrl} 
                            alt={`${u.firstName} ${u.lastName}`}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="w-6 h-6 text-primary" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold" data-testid={`user-name-${u.id}`}>
                            {u.firstName} {u.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground" data-testid={`user-email-${u.id}`}>
                            {u.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {u.isAdmin && (
                          <Badge variant="default" data-testid={`badge-admin-${u.id}`}>
                            Admin
                          </Badge>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setSelectedUserId(u.id)}
                          data-testid={`button-view-user-${u.id}`}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Progress
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* User Analytics Modal */}
      <Dialog open={!!selectedUserId} onOpenChange={() => setSelectedUserId(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" data-testid="modal-user-analytics">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>User Analytics - {userAnalytics?.user?.firstName} {userAnalytics?.user?.lastName}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedUserId(null)}
                data-testid="button-close-analytics"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          {loadingAnalytics ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading analytics...</p>
            </div>
          ) : userAnalytics ? (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Total Weeks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold" data-testid="user-total-weeks">
                      {userAnalytics.weeks?.length || 0}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Ritual Points (Today)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold" data-testid="user-ritual-points">
                      {userAnalytics.ritualPoints || 0}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Badges Earned</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold" data-testid="user-badges">
                      {userAnalytics.platinumProgress?.badges?.length || 0}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Current Streak</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold" data-testid="user-streak">
                      {userAnalytics.platinumProgress?.currentStreak || 0}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* HRCM Weekly Progress */}
              <Card>
                <CardHeader>
                  <CardTitle>HRCM Weekly Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  {userAnalytics.weeks && userAnalytics.weeks.length > 0 ? (
                    <div className="space-y-3">
                      {userAnalytics.weeks.map((week: any) => (
                        <div 
                          key={week.weekNumber} 
                          className="flex items-center justify-between p-3 border rounded-lg"
                          data-testid={`week-analytics-${week.weekNumber}`}
                        >
                          <div>
                            <p className="font-semibold">Week {week.weekNumber}</p>
                            <p className="text-sm text-muted-foreground">
                              H:{week.currentH || 0} | R:{week.currentE || 0} | C:{week.currentR || 0} | M:{week.currentC || 0}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{week.achievementRate || 0}%</p>
                            <p className="text-sm text-muted-foreground">Achievement</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No weeks data yet</p>
                  )}
                </CardContent>
              </Card>

              {/* Daily Rituals */}
              <Card>
                <CardHeader>
                  <CardTitle>Daily Rituals</CardTitle>
                </CardHeader>
                <CardContent>
                  {userAnalytics.rituals && userAnalytics.rituals.length > 0 ? (
                    <div className="space-y-2">
                      {userAnalytics.rituals.map((ritual: any) => (
                        <div 
                          key={ritual.id} 
                          className="flex items-center justify-between p-3 border rounded-lg"
                          data-testid={`ritual-${ritual.id}`}
                        >
                          <div>
                            <p className="font-semibold">{ritual.title}</p>
                            <p className="text-sm text-muted-foreground capitalize">{ritual.frequency}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {ritual.completed && (
                              <Badge variant="default">✓ Completed Today</Badge>
                            )}
                            {!ritual.isActive && (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No rituals yet</p>
                  )}
                </CardContent>
              </Card>

              {/* Badges */}
              <Card>
                <CardHeader>
                  <CardTitle>Badges & Achievements</CardTitle>
                </CardHeader>
                <CardContent>
                  {userAnalytics.platinumProgress?.badges && userAnalytics.platinumProgress.badges.length > 0 ? (
                    <div className="grid md:grid-cols-2 gap-3">
                      {userAnalytics.platinumProgress.badges.map((badge: any) => (
                        <div 
                          key={badge.id} 
                          className="flex items-start gap-3 p-3 border rounded-lg"
                          data-testid={`badge-${badge.id}`}
                        >
                          <Award className="w-8 h-8 text-amber-600" />
                          <div>
                            <p className="font-semibold">{badge.name}</p>
                            <p className="text-sm text-muted-foreground">{badge.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Achieved: {new Date(badge.achievedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No badges earned yet</p>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
