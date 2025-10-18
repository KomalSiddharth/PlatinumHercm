import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  Users, 
  Upload, 
  Plus, 
  HelpCircle, 
  LogOut, 
  ArrowLeft,
  Search,
  Download,
  Trash2,
  RefreshCw,
  Edit,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Eye,
  BarChart3,
  Pencil
} from 'lucide-react';
import type { ApprovedEmail, AdminUser, AccessLog } from '@shared/schema';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import UserDetailView from '@/components/UserDetailView';
import UserActivitySearch from '@/components/UserActivitySearch';
import AdminUserDashboardViewer from '@/components/AdminUserDashboardViewer';

export default function AdminPanel() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<'approved' | 'team' | 'logs' | 'analytics' | 'dashboard-viewer' | 'team-analytics' | 'recommendations' | 'platinum-standards'>('approved');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [bulkEmails, setBulkEmails] = useState('');
  const [editingEmail, setEditingEmail] = useState<ApprovedEmail | null>(null);
  
  // Team Management states
  const [showAddAdminDialog, setShowAddAdminDialog] = useState(false);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  
  // Analytics states
  const [selectedUserForDetail, setSelectedUserForDetail] = useState<string | null>(null);
  const [emailSearchQuery, setEmailSearchQuery] = useState('');
  const [searchedUser, setSearchedUser] = useState<any>(null);
  
  // Course recommendation states
  const [recUserEmail, setRecUserEmail] = useState('');
  const [recHrcmArea, setRecHrcmArea] = useState('health');
  const [recCourseName, setRecCourseName] = useState('');
  const [recReason, setRecReason] = useState('');
  
  // Team analytics period state
  const [teamAnalyticsPeriod, setTeamAnalyticsPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  
  // Platinum standards states
  const [selectedPlatinumCategory, setSelectedPlatinumCategory] = useState<'health' | 'relationship' | 'career' | 'money'>('health');
  const [newStandardText, setNewStandardText] = useState('');
  const [editingStandard, setEditingStandard] = useState<any>(null);
  
  const { toast } = useToast();

  // Check if user is logged in (admin restrictions removed)
  const { data: currentUser, isLoading: userLoading } = useQuery<{ id: string; email: string; firstName?: string; lastName?: string; isAdmin?: boolean }>({
    queryKey: ['/api/auth/user'],
    retry: false,
  });

  const { data: approvedEmails = [], isLoading } = useQuery<ApprovedEmail[]>({
    queryKey: ['/api/admin/approved-emails'],
  });

  const { data: stats = { totalUsers: 0, activeUsers: 0, totalAccess: 0, failedAttempts: 0 } } = useQuery<{
    totalUsers: number;
    activeUsers: number;
    totalAccess: number;
    failedAttempts: number;
  }>({
    queryKey: ['/api/admin/stats'],
  });

  const { data: adminInfo } = useQuery<{ email: string; firstName?: string; lastName?: string }>({
    queryKey: ['/api/auth/me'],
  });

  const { data: adminUsers = [], isLoading: isLoadingAdmins } = useQuery<AdminUser[]>({
    queryKey: ['/api/admin/team'],
    enabled: activeTab === 'team',
  });

  const { data: accessLogs = [], isLoading: isLoadingLogs } = useQuery<AccessLog[]>({
    queryKey: ['/api/admin/access-logs'],
    enabled: activeTab === 'logs',
  });

  const { data: userAnalytics = [], isLoading: isLoadingAnalytics } = useQuery<any[]>({
    queryKey: ['/api/admin/users-analytics'],
    enabled: activeTab === 'analytics',
  });

  // Team analytics with period filter
  const { data: teamAnalytics, isLoading: isLoadingTeamAnalytics } = useQuery<{
    totalUsers: number;
    activeUsers: number;
    averageRatings: { health: number; relationship: number; career: number; money: number };
    growthMetrics: { newUsers: number; percentChange: number };
    topPerformers: Array<{ userId: string; email: string; firstName?: string; lastName?: string; averageRating: number }>;
    completionRates: { courses: number; rituals: number };
  }>({
    queryKey: [`/api/admin/team-analytics?period=${teamAnalyticsPeriod}`],
    enabled: activeTab === 'team-analytics',
  });

  const searchUserMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await fetch(`/api/admin/search-user?email=${encodeURIComponent(email)}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'User not found');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setSearchedUser(data);
      setSelectedUserForDetail(data.id);
    },
    onError: (error: any) => {
      toast({ 
        title: "User Not Found", 
        description: error.message || "No user found with this email",
        variant: "destructive" 
      });
      setSearchedUser(null);
    }
  });

  const handleEmailSearch = () => {
    if (!emailSearchQuery.trim()) {
      toast({ 
        title: "Email Required", 
        description: "Please enter an email address to search",
        variant: "destructive" 
      });
      return;
    }
    searchUserMutation.mutate(emailSearchQuery.trim());
  };

  const addEmailMutation = useMutation({
    mutationFn: async (data: { email: string; name?: string }) => {
      return apiRequest('POST', '/api/admin/approved-emails', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/approved-emails'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({ title: "Email Added", description: "Email has been approved successfully" });
      setShowAddDialog(false);
      setNewEmail('');
      setNewName('');
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to add email",
        variant: "destructive" 
      });
    }
  });

  const bulkUploadMutation = useMutation({
    mutationFn: async (emails: string[]) => {
      return apiRequest('POST', '/api/admin/bulk-upload', { emails });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/approved-emails'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({ title: "Bulk Upload Complete", description: "Emails have been added successfully" });
      setShowBulkDialog(false);
      setBulkEmails('');
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to upload emails",
        variant: "destructive" 
      });
    }
  });

  const deleteEmailMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/admin/approved-emails/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/approved-emails'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({ title: "Email Deleted", description: "Email has been removed" });
    }
  });

  const updateEmailMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { email: string; status: string } }) => {
      return apiRequest('PUT', `/api/admin/approved-emails/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/approved-emails'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      setEditingEmail(null);
      toast({ title: "Email Updated", description: "Email has been updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Update Failed", 
        description: error.message || "Failed to update email",
        variant: "destructive" 
      });
    }
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('DELETE', '/api/admin/approved-emails/all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/approved-emails'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      setSelectedEmails([]);
      toast({ title: "All Emails Deleted", description: "All approved emails have been removed" });
    }
  });

  // Team Management mutations
  const addAdminMutation = useMutation({
    mutationFn: async (data: { name: string; email: string }) => {
      return apiRequest('POST', '/api/admin/team', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/team'] });
      toast({ title: "Admin Added", description: "Admin user has been added successfully" });
      setShowAddAdminDialog(false);
      setNewAdminName('');
      setNewAdminEmail('');
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to add admin",
        variant: "destructive" 
      });
    }
  });

  const updateAdminMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string; email: string; status?: string } }) => {
      return apiRequest('PUT', `/api/admin/team/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/team'] });
      toast({ title: "Admin Updated", description: "Admin user has been updated successfully" });
      setEditingAdmin(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update admin",
        variant: "destructive" 
      });
    }
  });

  const deleteAdminMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/admin/team/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/team'] });
      toast({ title: "Admin Deleted", description: "Admin user has been removed" });
    }
  });

  // Course Recommendations query and mutation
  const { data: recommendations = [] } = useQuery<any[]>({
    queryKey: ['/api/admin/recommendations'],
    enabled: activeTab === 'recommendations',
  });

  const { data: platinumStandards = [], isLoading: isLoadingPlatinumStandards } = useQuery<any[]>({
    queryKey: ['/api/admin/platinum-standards'],
    enabled: activeTab === 'platinum-standards',
  });

  const addRecommendationMutation = useMutation({
    mutationFn: async (data: { userEmail: string; hrcmArea: string; courseName: string; reason?: string }) => {
      return apiRequest('POST', '/api/admin/recommendations', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/recommendations'] });
      toast({ title: "Recommendation Added", description: "Course recommendation has been sent to user" });
      setRecUserEmail('');
      setRecHrcmArea('health');
      setRecCourseName('');
      setRecReason('');
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to add recommendation",
        variant: "destructive" 
      });
    }
  });

  const deleteRecommendationMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/admin/recommendations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/recommendations'] });
      toast({ title: "Recommendation Deleted", description: "Course recommendation has been removed" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete recommendation",
        variant: "destructive" 
      });
    }
  });

  const clearAllRecommendationsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('DELETE', '/api/admin/recommendations/all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/recommendations'] });
      toast({ 
        title: "All Recommendations Cleared", 
        description: "All course recommendations have been deleted successfully" 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to clear recommendations",
        variant: "destructive" 
      });
    }
  });

  // Platinum standards mutations
  const addPlatinumStandardMutation = useMutation({
    mutationFn: async (data: { category: string; standardText: string }) => {
      return apiRequest('POST', '/api/admin/platinum-standards', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/platinum-standards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/platinum-standards'] });
      setNewStandardText('');
      toast({ title: "Success", description: "Platinum standard added successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to add platinum standard", variant: "destructive" });
    }
  });

  const updatePlatinumStandardMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { standardText?: string; isActive?: boolean; orderIndex?: number } }) => {
      return apiRequest('PUT', `/api/admin/platinum-standards/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/platinum-standards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/platinum-standards'] });
      setEditingStandard(null);
      toast({ title: "Success", description: "Platinum standard updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update platinum standard", variant: "destructive" });
    }
  });

  const deletePlatinumStandardMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/admin/platinum-standards/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/platinum-standards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/platinum-standards'] });
      toast({ title: "Success", description: "Platinum standard deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete platinum standard", variant: "destructive" });
    }
  });

  const clearAllLogsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('DELETE', '/api/admin/access-logs');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/access-logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({ title: "Logs Cleared", description: "All access logs have been deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to clear access logs",
        variant: "destructive" 
      });
    }
  });

  // Show loading while checking authentication (after ALL hooks)
  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  const handleAddEmail = () => {
    if (!newEmail.trim()) {
      toast({ title: "Error", description: "Please enter an email", variant: "destructive" });
      return;
    }
    addEmailMutation.mutate({ 
      email: newEmail.trim(), 
      name: newName.trim() || undefined 
    });
  };

  const handleBulkUpload = () => {
    const emails = bulkEmails.split('\n').map(e => e.trim()).filter(e => e);
    if (emails.length === 0) {
      toast({ title: "Error", description: "Please enter at least one email", variant: "destructive" });
      return;
    }
    bulkUploadMutation.mutate(emails);
  };

  const handleLogout = () => {
    setLocation('/admin/login');
  };

  const filteredEmails = approvedEmails.filter((email: ApprovedEmail) =>
    email.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSelectAll = () => {
    if (selectedEmails.length === filteredEmails.length) {
      setSelectedEmails([]);
    } else {
      setSelectedEmails(filteredEmails.map((e: ApprovedEmail) => e.id));
    }
  };

  // Team Management handlers
  const handleAddAdmin = () => {
    if (!newAdminName.trim() || !newAdminEmail.trim()) {
      toast({ title: "Error", description: "Please enter both name and email", variant: "destructive" });
      return;
    }
    addAdminMutation.mutate({ 
      name: newAdminName.trim(), 
      email: newAdminEmail.trim() 
    });
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">MK</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white" data-testid="text-admin-title">Admin Panel</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">IMK Email Verification System</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              onClick={() => setShowBulkDialog(true)} 
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-bulk-upload"
            >
              <Upload className="w-4 h-4 mr-2" />
              Bulk Upload
            </Button>
            <Button 
              onClick={() => setShowAddDialog(true)} 
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-add-email"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Email
            </Button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Welcome, {adminInfo?.firstName || 'Admin'}
            </span>
            <Button 
              onClick={handleLogout} 
              variant="destructive"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
            <Button 
              variant="outline"
              onClick={() => setLocation('/dashboard')}
              data-testid="button-back-portal"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Portal
            </Button>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Users</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="text-total-users">
                  {stats?.totalUsers || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active Users</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="text-active-users">
                  {stats?.activeUsers || 0}
                  <span className="text-sm font-normal text-gray-500"> (on this page)</span>
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <ExternalLink className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Access</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="text-total-access">
                  {stats?.totalAccess || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Failed Attempts</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="text-failed-attempts">
                  {stats?.failedAttempts || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Email Management Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex gap-6 px-6 pt-4">
              <button 
                onClick={() => setActiveTab('approved')}
                className={`pb-3 border-b-2 transition-colors ${
                  activeTab === 'approved' 
                    ? 'border-blue-600 text-blue-600 font-medium' 
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                data-testid="tab-approved"
              >
                Approved Emails
              </button>
              <button 
                onClick={() => setActiveTab('team')}
                className={`pb-3 border-b-2 transition-colors ${
                  activeTab === 'team' 
                    ? 'border-blue-600 text-blue-600 font-medium' 
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                data-testid="tab-team"
              >
                Team Management
              </button>
              <button 
                onClick={() => setActiveTab('logs')}
                className={`pb-3 border-b-2 transition-colors ${
                  activeTab === 'logs' 
                    ? 'border-blue-600 text-blue-600 font-medium' 
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                data-testid="tab-logs"
              >
                Access Logs
              </button>
              <button 
                onClick={() => setActiveTab('analytics')}
                className={`pb-3 border-b-2 transition-colors ${
                  activeTab === 'analytics' 
                    ? 'border-blue-600 text-blue-600 font-medium' 
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                data-testid="tab-analytics"
              >
                User Analytics
              </button>
              <button 
                onClick={() => setActiveTab('dashboard-viewer')}
                className={`pb-3 border-b-2 transition-colors ${
                  activeTab === 'dashboard-viewer' 
                    ? 'border-blue-600 text-blue-600 font-medium' 
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                data-testid="tab-dashboard-viewer"
              >
                User Dashboards
              </button>
              <button 
                onClick={() => setActiveTab('team-analytics')}
                className={`pb-3 border-b-2 transition-colors ${
                  activeTab === 'team-analytics' 
                    ? 'border-blue-600 text-blue-600 font-medium' 
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                data-testid="tab-team-analytics"
              >
                Team Analytics
              </button>
              <button 
                onClick={() => setActiveTab('recommendations')}
                className={`pb-3 border-b-2 transition-colors ${
                  activeTab === 'recommendations' 
                    ? 'border-blue-600 text-blue-600 font-medium' 
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                data-testid="tab-recommendations"
              >
                Course Recommendations
              </button>
              <button 
                onClick={() => setActiveTab('platinum-standards')}
                className={`pb-3 border-b-2 transition-colors ${
                  activeTab === 'platinum-standards' 
                    ? 'border-blue-600 text-blue-600 font-medium' 
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                data-testid="tab-platinum-standards"
              >
                ⭐ Platinum Standards
              </button>
            </div>
          </div>

          {/* Approved Emails Tab Content */}
          {activeTab === 'approved' && (
            <>
              {/* Search and Actions */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search by email or name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="input-search"
                    />
                  </div>
                  <Button variant="outline" data-testid="button-export">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={() => deleteAllMutation.mutate()}
                    disabled={deleteAllMutation.isPending}
                    data-testid="button-delete-all"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete All
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/approved-emails'] })}
                    data-testid="button-refresh"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <Checkbox
                      checked={selectedEmails.length === filteredEmails.length && filteredEmails.length > 0}
                      onCheckedChange={toggleSelectAll}
                      data-testid="checkbox-select-all"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">USER</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">STATUS</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">ACCESS COUNT</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading...</td>
                  </tr>
                ) : filteredEmails.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No approved emails found</td>
                  </tr>
                ) : (
                  filteredEmails.map((email: ApprovedEmail) => (
                    <tr key={email.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30" data-testid={`row-email-${email.id}`}>
                      <td className="px-6 py-4">
                        <Checkbox
                          checked={selectedEmails.includes(email.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedEmails([...selectedEmails, email.id]);
                            } else {
                              setSelectedEmails(selectedEmails.filter(id => id !== email.id));
                            }
                          }}
                          data-testid={`checkbox-email-${email.id}`}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 dark:text-blue-400 text-sm font-medium">
                              {email.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="text-sm text-gray-900 dark:text-white" data-testid={`text-email-${email.id}`}>
                            {email.email}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge 
                          variant={email.status === 'active' ? 'default' : 'secondary'}
                          className={email.status === 'active' ? 'bg-green-500 hover:bg-green-600' : ''}
                          data-testid={`badge-status-${email.id}`}
                        >
                          {email.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900 dark:text-white" data-testid={`text-access-${email.id}`}>
                          {email.accessCount}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setEditingEmail(email)}
                            data-testid={`button-edit-${email.id}`}
                          >
                            <Edit className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => deleteEmailMutation.mutate(email.id)}
                            disabled={deleteEmailMutation.isPending}
                            data-testid={`button-delete-${email.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Total: {filteredEmails.length} emails
                </p>
              </div>
            </>
          )}

          {/* Team Management Tab Content */}
          {activeTab === 'team' && (
            <>
              {/* Actions Bar */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Admin Users</h3>
                  <Button 
                    onClick={() => setShowAddAdminDialog(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                    data-testid="button-add-admin"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Admin
                  </Button>
                </div>
              </div>

              {/* Admin Users Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">NAME</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">EMAIL</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">ROLE</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">STATUS</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {isLoadingAdmins ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading...</td>
                      </tr>
                    ) : adminUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No admin users found</td>
                      </tr>
                    ) : (
                      adminUsers.map((admin: AdminUser) => (
                        <tr key={admin.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30" data-testid={`row-admin-${admin.id}`}>
                          <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{admin.name}</td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{admin.email}</td>
                          <td className="px-6 py-4">
                            <Badge variant="outline" className="capitalize">{admin.role}</Badge>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant={admin.status === 'active' ? 'default' : 'secondary'}>
                              {admin.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => setEditingAdmin(admin)}
                                data-testid={`button-edit-admin-${admin.id}`}
                              >
                                <Edit className="w-4 h-4 text-blue-600" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => deleteAdminMutation.mutate(admin.id)}
                                disabled={deleteAdminMutation.isPending}
                                data-testid={`button-delete-admin-${admin.id}`}
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Total: {adminUsers.length} admin users
                </p>
              </div>
            </>
          )}

          {/* Access Logs Tab Content */}
          {activeTab === 'logs' && (
            <>
              {/* Header with Clear All Button */}
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Access Logs</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Showing last {accessLogs.length} login attempts
                  </p>
                </div>
                {accessLogs.length > 0 && (
                  <Button 
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete all access logs? This action cannot be undone.')) {
                        clearAllLogsMutation.mutate();
                      }
                    }}
                    disabled={clearAllLogsMutation.isPending}
                    data-testid="button-clear-all-logs"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {clearAllLogsMutation.isPending ? 'Clearing...' : 'Clear All'}
                  </Button>
                )}
              </div>

              {/* Access Logs Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">EMAIL</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">STATUS</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">IP ADDRESS</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">TIME</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {isLoadingLogs ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">Loading...</td>
                      </tr>
                    ) : accessLogs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No access logs found</td>
                      </tr>
                    ) : (
                      accessLogs.map((log: AccessLog) => (
                        <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30" data-testid={`row-log-${log.id}`}>
                          <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{log.email}</td>
                          <td className="px-6 py-4">
                            <Badge variant={log.status === 'success' ? 'default' : 'destructive'} className="capitalize">
                              {log.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{log.ipAddress || 'N/A'}</td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                            {log.createdAt ? new Date(log.createdAt).toLocaleString() : 'N/A'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* User Analytics Tab Content - Redesigned for Clarity */}
          {activeTab === 'analytics' && (
            <div className="p-6 space-y-6">
              {/* Info Banner */}
              <div className="bg-gradient-to-r from-pink-500 to-blue-500 text-white p-6 rounded-lg">
                <h2 className="text-2xl font-bold mb-2">📊 User Analytics Overview</h2>
                <p className="text-sm opacity-90">
                  Track individual user progress across all HRCM areas. Search for specific users or browse the complete list below.
                </p>
              </div>

              {/* Search User Section */}
              <Card className="border-2 border-blue-200 dark:border-blue-800">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Search className="w-5 h-5" />
                    Quick User Lookup
                  </CardTitle>
                  <CardDescription>
                    Enter a user's email address to view their detailed analytics and progress report
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="example@email.com"
                      value={emailSearchQuery}
                      onChange={(e) => setEmailSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleEmailSearch()}
                      data-testid="input-email-search"
                      className="flex-1 text-base"
                    />
                    <Button 
                      onClick={handleEmailSearch}
                      disabled={searchUserMutation.isPending}
                      data-testid="button-search-user"
                      className="bg-gradient-to-r from-pink-500 to-blue-500 text-white"
                    >
                      <Search className="w-4 h-4 mr-2" />
                      {searchUserMutation.isPending ? 'Searching...' : 'Search User'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Understanding Metrics Card */}
              <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-blue-600" />
                    Understanding the Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                    <div className="space-y-1">
                      <div className="font-semibold text-blue-700 dark:text-blue-300">📈 Overall Score</div>
                      <div className="text-gray-700 dark:text-gray-300">
                        Average rating (out of 10) across Health, Relationship, Career, and Money areas
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="font-semibold text-blue-700 dark:text-blue-300">🎯 Achievement Rate</div>
                      <div className="text-gray-700 dark:text-gray-300">
                        Percentage of targets completed for the week (70%+ = Excellent, 50-69% = Good, below 50% = Needs Support)
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="font-semibold text-blue-700 dark:text-blue-300">📊 Trend</div>
                      <div className="text-gray-700 dark:text-gray-300">
                        Change in score compared to previous week (↑ Improving, ↓ Declining, — Stable)
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="font-semibold text-blue-700 dark:text-blue-300">🗓️ Total Weeks</div>
                      <div className="text-gray-700 dark:text-gray-300">
                        Number of weeks the user has been actively tracking their HRCM progress
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="font-semibold text-blue-700 dark:text-blue-300">✅ Status</div>
                      <div className="text-gray-700 dark:text-gray-300">
                        <span className="text-green-600 font-medium">Excellent</span> (70%+) | 
                        <span className="text-blue-600 font-medium"> Good</span> (50-69%) | 
                        <span className="text-orange-600 font-medium"> Needs Support</span> (below 50%)
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="font-semibold text-blue-700 dark:text-blue-300">👁️ View Details</div>
                      <div className="text-gray-700 dark:text-gray-300">
                        Opens complete progress report with weekly data, HRCM breakdown, and course completions
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {isLoadingAnalytics ? (
                <div className="text-center py-16">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-500 font-medium">Loading user analytics...</p>
                </div>
              ) : userAnalytics.length === 0 ? (
                <Card className="text-center py-16">
                  <BarChart3 className="w-20 h-20 mx-auto text-gray-400" />
                  <h3 className="mt-4 text-xl font-semibold text-gray-600 dark:text-gray-400">No User Data Available</h3>
                  <p className="mt-2 text-gray-500">Users will appear here once they start tracking their HRCM progress.</p>
                </Card>
              ) : (
                <>
                  {/* Quick Stats Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="border-l-4 border-l-blue-500">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users Tracking</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-4xl font-bold text-blue-600">{userAnalytics.length}</div>
                        <p className="text-xs text-gray-500 mt-1">Active participants</p>
                      </CardContent>
                    </Card>
                    
                    <Card className="border-l-4 border-l-purple-500">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Average Achievement</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-4xl font-bold text-purple-600">
                          {userAnalytics.length > 0 
                            ? Math.round(userAnalytics.reduce((sum: number, u: any) => sum + (u.achievementRate || 0), 0) / userAnalytics.length)
                            : 0}%
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Team performance</p>
                      </CardContent>
                    </Card>
                    
                    <Card className="border-l-4 border-l-green-500">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Top Performers</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-4xl font-bold text-green-600">
                          {userAnalytics.filter((u: any) => u.status === 'excellent').length}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Excellent status (≥70%)</p>
                      </CardContent>
                    </Card>
                    
                    <Card className="border-l-4 border-l-orange-500">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Need Attention</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-4xl font-bold text-orange-600">
                          {userAnalytics.filter((u: any) => u.status === 'needs_support').length}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Below 50% achievement</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* All Users Table */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">All Users Performance Summary</CardTitle>
                      <CardDescription>
                        Complete list of all users with their current progress and status
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-100 dark:bg-gray-800">
                            <tr>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">User</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">Weeks Tracked</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">Overall Score</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">Achievement</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">Weekly Trend</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">Status</th>
                              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {userAnalytics.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                                  No users have started tracking yet
                                </td>
                              </tr>
                            ) : (
                              userAnalytics.map((user: any) => (
                                <tr key={user.userId} className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
                                  <td className="px-4 py-4">
                                    <div>
                                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                        {user.firstName || user.lastName 
                                          ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                                          : user.email}
                                      </div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="text-sm font-medium">{user.totalWeeks || 0} weeks</div>
                                  </td>
                                  <td className="px-4 py-4">
                                    <Badge variant="outline" className="font-bold text-base">
                                      {(user.overallScore || 0).toFixed(1)}/10
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-4">
                                    <Badge 
                                      variant={(user.achievementRate || 0) >= 70 ? 'default' : (user.achievementRate || 0) >= 50 ? 'secondary' : 'destructive'}
                                      className="font-semibold"
                                    >
                                      {user.achievementRate || 0}%
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-4">
                                    {(user.trend || 0) > 0 ? (
                                      <div className="flex items-center gap-1 text-green-600 font-medium">
                                        <TrendingUp className="w-4 h-4" />
                                        <span>+{(user.trend || 0).toFixed(1)}</span>
                                      </div>
                                    ) : (user.trend || 0) < 0 ? (
                                      <div className="flex items-center gap-1 text-red-600 font-medium">
                                        <TrendingDown className="w-4 h-4" />
                                        <span>{(user.trend || 0).toFixed(1)}</span>
                                      </div>
                                    ) : (
                                      <span className="text-gray-400 font-medium">—</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-4">
                                    <Badge 
                                      className={
                                        user.status === 'excellent' 
                                          ? 'bg-green-600 hover:bg-green-700' 
                                          : user.status === 'good' 
                                          ? 'bg-blue-600 hover:bg-blue-700' 
                                          : 'bg-orange-600 hover:bg-orange-700'
                                      }
                                    >
                                      {user.status === 'excellent' ? '🌟 Excellent' : 
                                       user.status === 'good' ? '✓ Good' : 
                                       '⚠ Needs Support'}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-4 text-center">
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => setSelectedUserForDetail(user.userId)}
                                      data-testid={`button-view-user-${user.userId}`}
                                      className="hover-elevate"
                                    >
                                      <Eye className="w-4 h-4 mr-1" />
                                      View Full Report
                                    </Button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}


          {/* User Dashboard Viewer Tab */}
          {activeTab === 'dashboard-viewer' && (
            <div className="p-6">
              <AdminUserDashboardViewer />
            </div>
          )}

          {/* Team Analytics Tab */}
          {activeTab === 'team-analytics' && (
            <div className="p-6">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold">Team Analytics & Growth</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Performance metrics for the selected time period
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant={teamAnalyticsPeriod === 'weekly' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setTeamAnalyticsPeriod('weekly')}
                      data-testid="button-period-weekly"
                    >
                      Weekly
                    </Button>
                    <Button 
                      variant={teamAnalyticsPeriod === 'monthly' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setTeamAnalyticsPeriod('monthly')}
                      data-testid="button-period-monthly"
                    >
                      Monthly
                    </Button>
                    <Button 
                      variant={teamAnalyticsPeriod === 'yearly' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setTeamAnalyticsPeriod('yearly')}
                      data-testid="button-period-yearly"
                    >
                      Yearly
                    </Button>
                  </div>
                </div>

                {isLoadingTeamAnalytics ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : teamAnalytics ? (
                  <>
                    {/* HRCM Average Ratings Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <span className="text-2xl">💪</span>
                            Health
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-coral-600" data-testid="metric-avg-health">
                            {teamAnalytics.averageRatings.health.toFixed(1)}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Average rating</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <span className="text-2xl">❤️</span>
                            Relationship
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-pink-600" data-testid="metric-avg-relationship">
                            {teamAnalytics.averageRatings.relationship.toFixed(1)}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Average rating</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <span className="text-2xl">💼</span>
                            Career
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-lavender-600" data-testid="metric-avg-career">
                            {teamAnalytics.averageRatings.career.toFixed(1)}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Average rating</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <span className="text-2xl">💰</span>
                            Money
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-teal-600" data-testid="metric-avg-money">
                            {teamAnalytics.averageRatings.money.toFixed(1)}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Average rating</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Total Users</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-primary" data-testid="metric-total-users">
                            {teamAnalytics.totalUsers}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">In the system</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Active Users</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-blue-600" data-testid="metric-active-users">
                            {teamAnalytics.activeUsers}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {teamAnalyticsPeriod === 'weekly' ? 'This week' : teamAnalyticsPeriod === 'monthly' ? 'This month' : 'This year'}
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Growth Rate</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-2">
                            <div className="text-3xl font-bold text-green-600" data-testid="metric-growth-rate">
                              {teamAnalytics.growthMetrics.percentChange > 0 ? '+' : ''}{teamAnalytics.growthMetrics.percentChange}%
                            </div>
                            {teamAnalytics.growthMetrics.percentChange > 0 ? (
                              <TrendingUp className="w-6 h-6 text-green-600" />
                            ) : (
                              <TrendingDown className="w-6 h-6 text-red-600" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {teamAnalytics.growthMetrics.newUsers} new users in period
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Top Performers */}
                    <Card>
                      <CardHeader>
                        <CardTitle>🏆 Top Performers</CardTitle>
                        <CardDescription>
                          Users with highest average HRCM ratings in the {teamAnalyticsPeriod} period
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {teamAnalytics.topPerformers.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            No active users in this period
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {teamAnalytics.topPerformers.map((user, index) => (
                              <div 
                                key={user.userId} 
                                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover-elevate"
                                data-testid={`top-performer-${index + 1}`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                                    index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                                    index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
                                    index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600' :
                                    'bg-gradient-to-br from-teal-500 to-blue-600'
                                  }`}>
                                    #{index + 1}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium truncate" data-testid={`performer-name-${index + 1}`}>
                                      {user.firstName && user.lastName 
                                        ? `${user.firstName} ${user.lastName}`
                                        : user.firstName || user.email
                                      }
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate" data-testid={`performer-email-${index + 1}`}>
                                      {user.email}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-xl font-bold text-primary" data-testid={`performer-rating-${index + 1}`}>
                                    {user.averageRating.toFixed(1)}
                                  </div>
                                  <div className="text-xs text-muted-foreground">avg rating</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      No analytics data available
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Course Recommendations Tab */}
          {activeTab === 'recommendations' && (
            <div className="p-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Recommend Courses to Users</h3>
                <p className="text-sm text-gray-500">Add personalized course recommendations to any user's assignment section</p>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Add Course Recommendation</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">User Email</label>
                      <Input
                        placeholder="user@example.com"
                        value={recUserEmail}
                        onChange={(e) => setRecUserEmail(e.target.value)}
                        data-testid="input-recommendation-email"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">HRCM Area</label>
                      <select 
                        className="w-full border rounded-md p-2" 
                        value={recHrcmArea}
                        onChange={(e) => setRecHrcmArea(e.target.value)}
                        data-testid="select-hrcm-area"
                      >
                        <option value="health">Health</option>
                        <option value="relationship">Relationship</option>
                        <option value="career">Career</option>
                        <option value="money">Money</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Course Name</label>
                      <Input 
                        placeholder="Enter course name" 
                        value={recCourseName}
                        onChange={(e) => setRecCourseName(e.target.value)}
                        data-testid="input-course-name" 
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Reason (Optional)</label>
                      <Textarea 
                        placeholder="Why are you recommending this course?" 
                        rows={3}
                        value={recReason}
                        onChange={(e) => setRecReason(e.target.value)}
                        data-testid="textarea-recommendation-reason" 
                      />
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={() => {
                        if (!recUserEmail || !recCourseName) {
                          toast({ title: "Missing Fields", description: "Please fill in email and course name", variant: "destructive" });
                          return;
                        }
                        addRecommendationMutation.mutate({
                          userEmail: recUserEmail,
                          hrcmArea: recHrcmArea,
                          courseName: recCourseName,
                          reason: recReason || undefined
                        });
                      }}
                      disabled={addRecommendationMutation.isPending}
                      data-testid="button-submit-recommendation"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {addRecommendationMutation.isPending ? 'Adding...' : 'Add Recommendation'}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Recent Recommendations</CardTitle>
                      {recommendations.length > 0 && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete all ${recommendations.length} recommendations? This action cannot be undone.`)) {
                              clearAllRecommendationsMutation.mutate();
                            }
                          }}
                          disabled={clearAllRecommendationsMutation.isPending}
                          data-testid="button-clear-all-recommendations"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {clearAllRecommendationsMutation.isPending ? 'Clearing...' : 'Clear All'}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {recommendations.length === 0 ? (
                      <div className="text-sm text-gray-500 text-center py-4">
                        No recommendations yet. Add your first recommendation above.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {recommendations.map((rec: any) => (
                          <div key={rec.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="font-medium">{rec.courseName}</div>
                                <div className="text-sm text-gray-500">
                                  To: {rec.userEmail} • Area: {rec.hrcmArea}
                                </div>
                                {rec.reason && (
                                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{rec.reason}</div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{rec.status || 'pending'}</Badge>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteRecommendationMutation.mutate(rec.id)}
                                  disabled={deleteRecommendationMutation.isPending}
                                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                  data-testid={`button-delete-recommendation-${rec.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Platinum Standards Management Tab */}
          {activeTab === 'platinum-standards' && (
            <div className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">
                    ⭐ Global Platinum Standards Management
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Manage platinum standards that appear globally for all users across all HRCM areas
                  </p>
                </div>

                {/* Add New Standard Form */}
                <Card className="border-2 border-primary/20 shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5">
                    <CardTitle className="flex items-center gap-2">
                      <Plus className="w-5 h-5 text-primary" />
                      Add New Platinum Standard
                    </CardTitle>
                    <CardDescription>Standards will be visible to all users globally</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Category</label>
                      <select
                        value={selectedPlatinumCategory}
                        onChange={(e) => setSelectedPlatinumCategory(e.target.value as any)}
                        className="w-full px-3 py-2 border-2 border-input bg-background rounded-md focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        data-testid="select-platinum-category"
                      >
                        <option value="health">🟢 Health</option>
                        <option value="relationship">💗 Relationship</option>
                        <option value="career">🟡 Career</option>
                        <option value="money">🟣 Money</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Standard Text</label>
                      <Input
                        placeholder="Enter platinum standard text..."
                        value={newStandardText}
                        onChange={(e) => setNewStandardText(e.target.value)}
                        className="border-2 focus:ring-2 focus:ring-primary"
                        data-testid="input-new-standard"
                      />
                    </div>
                    <Button
                      onClick={() => {
                        if (!newStandardText.trim()) {
                          toast({ title: "Error", description: "Please enter standard text", variant: "destructive" });
                          return;
                        }
                        addPlatinumStandardMutation.mutate({
                          category: selectedPlatinumCategory,
                          standardText: newStandardText.trim()
                        });
                      }}
                      disabled={addPlatinumStandardMutation.isPending}
                      className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
                      data-testid="button-add-standard"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {addPlatinumStandardMutation.isPending ? 'Adding...' : 'Add Standard'}
                    </Button>
                  </CardContent>
                </Card>

                {/* Standards by Category */}
                <div className="grid gap-6">
                  {['health', 'relationship', 'career', 'money'].map((category) => {
                    const categoryStandards = platinumStandards.filter((s: any) => s.category === category);
                    
                    // Define category-specific styling
                    const categoryConfig = {
                      health: { 
                        dot: 'bg-emerald-500', 
                        border: 'border-emerald-500/30',
                        gradient: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
                        text: 'text-emerald-700 dark:text-emerald-400',
                        badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
                        icon: '🟢'
                      },
                      relationship: { 
                        dot: 'bg-pink-500', 
                        border: 'border-pink-500/30',
                        gradient: 'from-pink-500/10 via-pink-500/5 to-transparent',
                        text: 'text-pink-700 dark:text-pink-400',
                        badge: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
                        icon: '💗'
                      },
                      career: { 
                        dot: 'bg-amber-500', 
                        border: 'border-amber-500/30',
                        gradient: 'from-amber-500/10 via-amber-500/5 to-transparent',
                        text: 'text-amber-700 dark:text-amber-400',
                        badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
                        icon: '🟡'
                      },
                      money: { 
                        dot: 'bg-purple-500', 
                        border: 'border-purple-500/30',
                        gradient: 'from-purple-500/10 via-purple-500/5 to-transparent',
                        text: 'text-purple-700 dark:text-purple-400',
                        badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
                        icon: '🟣'
                      }
                    }[category as 'health' | 'relationship' | 'career' | 'money'];
                    
                    return (
                      <Card key={category} className={`border-2 ${categoryConfig.border} shadow-md`}>
                        <CardHeader className={`pb-3 bg-gradient-to-r ${categoryConfig.gradient}`}>
                          <CardTitle className="flex items-center gap-2 capitalize">
                            <div className={`w-4 h-4 rounded-full ${categoryConfig.dot} shadow-md`}></div>
                            <span className={categoryConfig.text}>
                              {categoryConfig.icon} {category} Standards
                            </span>
                            <Badge className={`ml-auto ${categoryConfig.badge} border-0`}>
                              {categoryStandards.length} standards
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {categoryStandards.length === 0 ? (
                            <div className={`text-center py-12 rounded-lg border-2 border-dashed ${
                              category === 'health' ? 'border-emerald-300 bg-emerald-50/30 dark:border-emerald-700 dark:bg-emerald-950/20' :
                              category === 'relationship' ? 'border-pink-300 bg-pink-50/30 dark:border-pink-700 dark:bg-pink-950/20' :
                              category === 'career' ? 'border-amber-300 bg-amber-50/30 dark:border-amber-700 dark:bg-amber-950/20' :
                              'border-purple-300 bg-purple-50/30 dark:border-purple-700 dark:bg-purple-950/20'
                            }`}>
                              <div className="text-5xl mb-2">{categoryConfig.icon}</div>
                              <p className="text-sm font-medium text-muted-foreground">No standards defined yet</p>
                              <p className="text-xs text-muted-foreground mt-1">Add your first platinum standard above</p>
                            </div>
                          ) : (
                            categoryStandards.map((standard: any, index: number) => (
                              <div
                                key={standard.id}
                                className={`flex items-center gap-3 p-4 rounded-lg group hover-elevate border-l-4 ${
                                  category === 'health' ? 'border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20' :
                                  category === 'relationship' ? 'border-l-pink-500 bg-pink-50/50 dark:bg-pink-950/20' :
                                  category === 'career' ? 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20' :
                                  'border-l-purple-500 bg-purple-50/50 dark:bg-purple-950/20'
                                } shadow-sm`}
                                data-testid={`standard-${category}-${index}`}
                              >
                                <div className="flex items-center gap-2">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                    category === 'health' ? 'bg-emerald-200 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-200' :
                                    category === 'relationship' ? 'bg-pink-200 text-pink-800 dark:bg-pink-800 dark:text-pink-200' :
                                    category === 'career' ? 'bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200' :
                                    'bg-purple-200 text-purple-800 dark:bg-purple-800 dark:text-purple-200'
                                  }`}>
                                    {standard.orderIndex}
                                  </div>
                                </div>
                                <div className="flex-1">
                                  <div className="font-medium text-foreground" data-testid={`standard-text-${standard.id}`}>
                                    {standard.standardText}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge 
                                    className={standard.isActive 
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700' 
                                      : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                                    }
                                  >
                                    {standard.isActive ? "✓ Active" : "○ Inactive"}
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      updatePlatinumStandardMutation.mutate({
                                        id: standard.id,
                                        data: { isActive: !standard.isActive }
                                      });
                                    }}
                                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950"
                                    data-testid={`button-toggle-standard-${standard.id}`}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      if (window.confirm('Are you sure you want to delete this standard? This will affect all users.')) {
                                        deletePlatinumStandardMutation.mutate(standard.id);
                                      }
                                    }}
                                    disabled={deletePlatinumStandardMutation.isPending}
                                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                    data-testid={`button-delete-standard-${standard.id}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ))
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {isLoadingPlatinumStandards && (
                  <div className="text-center py-12 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 rounded-lg border-2 border-primary/20">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary mx-auto"></div>
                    <p className="text-sm font-medium bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mt-4">
                      ⭐ Loading platinum standards...
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Email Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent data-testid="dialog-add-email">
          <DialogHeader>
            <DialogTitle>Add Approved Email</DialogTitle>
            <DialogDescription>Add a new email address to the approved list</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Name</label>
              <Input
                type="text"
                placeholder="Full Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                data-testid="input-new-name"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Email Address</label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                data-testid="input-new-email"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAddDialog(false)} data-testid="button-cancel-add">
              Cancel
            </Button>
            <Button 
              onClick={handleAddEmail} 
              disabled={addEmailMutation.isPending}
              data-testid="button-confirm-add"
            >
              {addEmailMutation.isPending ? 'Adding...' : 'Add Email'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent data-testid="dialog-bulk-upload">
          <DialogHeader>
            <DialogTitle>Bulk Upload Emails</DialogTitle>
            <DialogDescription>Add multiple emails (one per line)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="user1@example.com&#10;user2@example.com&#10;user3@example.com"
              value={bulkEmails}
              onChange={(e) => setBulkEmails(e.target.value)}
              rows={10}
              data-testid="textarea-bulk-emails"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowBulkDialog(false)} data-testid="button-cancel-bulk">
              Cancel
            </Button>
            <Button 
              onClick={handleBulkUpload} 
              disabled={bulkUploadMutation.isPending}
              data-testid="button-confirm-bulk"
            >
              {bulkUploadMutation.isPending ? 'Uploading...' : 'Upload Emails'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Admin Dialog */}
      <Dialog open={showAddAdminDialog} onOpenChange={setShowAddAdminDialog}>
        <DialogContent data-testid="dialog-add-admin">
          <DialogHeader>
            <DialogTitle>Add Admin User</DialogTitle>
            <DialogDescription>Add a new admin user to the system</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Name</label>
              <Input
                type="text"
                placeholder="Full Name"
                value={newAdminName}
                onChange={(e) => setNewAdminName(e.target.value)}
                data-testid="input-admin-name"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Email Address</label>
              <Input
                type="email"
                placeholder="admin@example.com"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                data-testid="input-admin-email"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAddAdminDialog(false)} data-testid="button-cancel-add-admin">
              Cancel
            </Button>
            <Button 
              onClick={handleAddAdmin} 
              disabled={addAdminMutation.isPending}
              data-testid="button-confirm-add-admin"
            >
              {addAdminMutation.isPending ? 'Adding...' : 'Add Admin'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Admin Dialog */}
      <Dialog open={!!editingAdmin} onOpenChange={() => setEditingAdmin(null)}>
        <DialogContent data-testid="dialog-edit-admin">
          <DialogHeader>
            <DialogTitle>Edit Admin User</DialogTitle>
            <DialogDescription>Update admin user information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Name</label>
              <Input
                type="text"
                placeholder="Full Name"
                value={editingAdmin?.name || ''}
                onChange={(e) => setEditingAdmin(editingAdmin ? { ...editingAdmin, name: e.target.value } : null)}
                data-testid="input-edit-admin-name"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Email Address</label>
              <Input
                type="email"
                placeholder="admin@example.com"
                value={editingAdmin?.email || ''}
                onChange={(e) => setEditingAdmin(editingAdmin ? { ...editingAdmin, email: e.target.value } : null)}
                data-testid="input-edit-admin-email"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingAdmin(null)} data-testid="button-cancel-edit-admin">
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (editingAdmin) {
                  updateAdminMutation.mutate({
                    id: editingAdmin.id,
                    data: { name: editingAdmin.name, email: editingAdmin.email }
                  });
                }
              }}
              disabled={updateAdminMutation.isPending}
              data-testid="button-confirm-edit-admin"
            >
              {updateAdminMutation.isPending ? 'Updating...' : 'Update Admin'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Email Dialog */}
      <Dialog open={!!editingEmail} onOpenChange={() => setEditingEmail(null)}>
        <DialogContent data-testid="dialog-edit-email">
          <DialogHeader>
            <DialogTitle>Edit Approved Email</DialogTitle>
            <DialogDescription>Update email address and status</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Email Address</label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={editingEmail?.email || ''}
                onChange={(e) => setEditingEmail(editingEmail ? { ...editingEmail, email: e.target.value } : null)}
                data-testid="input-edit-email-address"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <select
                value={editingEmail?.status || 'active'}
                onChange={(e) => setEditingEmail(editingEmail ? { ...editingEmail, status: e.target.value } : null)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                data-testid="select-edit-email-status"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingEmail(null)} data-testid="button-cancel-edit-email">
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (editingEmail) {
                  updateEmailMutation.mutate({
                    id: editingEmail.id,
                    data: { email: editingEmail.email, status: editingEmail.status }
                  });
                }
              }}
              disabled={updateEmailMutation.isPending}
              data-testid="button-confirm-edit-email"
            >
              {updateEmailMutation.isPending ? 'Updating...' : 'Update Email'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* User Detail View Dialog */}
      <UserDetailDialog 
        userId={selectedUserForDetail}
        onClose={() => setSelectedUserForDetail(null)}
      />
    </div>
  );
}

// Separate component for User Detail Dialog
function UserDetailDialog({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  return (
    <Dialog open={!!userId} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto" data-testid="dialog-user-detail">
        <DialogHeader>
          <DialogTitle className="text-2xl">User Analytics & Progress Report</DialogTitle>
        </DialogHeader>

        {userId && <UserDetailView userId={userId} />}

        <div className="flex justify-end mt-4">
          <Button onClick={onClose} data-testid="button-close-user-detail">Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
