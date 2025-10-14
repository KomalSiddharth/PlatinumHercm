import { useState } from 'react';
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
  BarChart3
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import UserDetailView from '@/components/UserDetailView';
import UserActivitySearch from '@/components/UserActivitySearch';

export default function AdminPanel() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<'approved' | 'team' | 'logs' | 'analytics' | 'activity'>('approved');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [bulkEmails, setBulkEmails] = useState('');
  
  // Team Management states
  const [showAddAdminDialog, setShowAddAdminDialog] = useState(false);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  
  // Analytics states
  const [selectedUserForDetail, setSelectedUserForDetail] = useState<string | null>(null);
  const [emailSearchQuery, setEmailSearchQuery] = useState('');
  const [searchedUser, setSearchedUser] = useState<any>(null);
  
  const { toast } = useToast();

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
                onClick={() => setActiveTab('activity')}
                className={`pb-3 border-b-2 transition-colors ${
                  activeTab === 'activity' 
                    ? 'border-blue-600 text-blue-600 font-medium' 
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                data-testid="tab-activity"
              >
                User Activity
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

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Showing last {accessLogs.length} login attempts
                </p>
              </div>
            </>
          )}

          {/* User Analytics Tab Content - Enhanced with Charts */}
          {activeTab === 'analytics' && (
            <div className="p-6 space-y-6">
              {/* Email Search */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Search User by Email</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="Enter user email to search..."
                      value={emailSearchQuery}
                      onChange={(e) => setEmailSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleEmailSearch()}
                      data-testid="input-email-search"
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleEmailSearch}
                      disabled={searchUserMutation.isPending}
                      data-testid="button-search-user"
                    >
                      <Search className="w-4 h-4 mr-2" />
                      {searchUserMutation.isPending ? 'Searching...' : 'Search'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {isLoadingAnalytics ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-500">Loading analytics...</p>
                </div>
              ) : userAnalytics.length === 0 ? (
                <div className="text-center py-12">
                  <BarChart3 className="w-16 h-16 mx-auto text-gray-400" />
                  <p className="mt-4 text-gray-500">No user data available</p>
                </div>
              ) : (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">{userAnalytics.length}</div>
                        <p className="text-xs text-gray-500 mt-1">Active participants</p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Achievement</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">
                          {Math.round(userAnalytics.reduce((sum: number, u: any) => sum + u.achievementRate, 0) / userAnalytics.length)}%
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Across all users</p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Top Performers</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-green-600">
                          {userAnalytics.filter((u: any) => u.status === 'excellent').length}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Excellent status</p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Need Support</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-orange-600">
                          {userAnalytics.filter((u: any) => u.status === 'needs_support').length}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Require attention</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Achievement Rate Comparison */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Achievement Rate Comparison</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={userAnalytics.map((u: any) => ({
                            name: u.firstName || u.email.split('@')[0],
                            achievement: u.achievementRate
                          }))}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                            <YAxis domain={[0, 100]} />
                            <Tooltip />
                            <Bar dataKey="achievement" fill="#3b82f6" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Overall Score Trend */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Overall Score Distribution</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={userAnalytics.map((u: any) => ({
                            name: u.firstName || u.email.split('@')[0],
                            score: u.overallScore
                          }))}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                            <YAxis domain={[0, 5]} />
                            <Tooltip />
                            <Bar dataKey="score" fill="#10b981" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>

                  {/* User Details Table with Actions */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">User Details & Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 dark:bg-gray-900/50">
                            <tr>
                              <th className="px-4 py-3 text-left text-sm font-semibold">USER</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold">WEEKS</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold">SCORE</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold">ACHIEVEMENT</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold">TREND</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold">STATUS</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold">ACTIONS</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {userAnalytics.map((user: any) => (
                              <tr key={user.userId} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                                <td className="px-4 py-3">
                                  <div>
                                    <div className="text-sm font-medium">{user.firstName} {user.lastName}</div>
                                    <div className="text-xs text-gray-500">{user.email}</div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-sm">{user.totalWeeks}</td>
                                <td className="px-4 py-3">
                                  <Badge variant="outline" className="font-bold">{user.overallScore}/5</Badge>
                                </td>
                                <td className="px-4 py-3">
                                  <Badge variant={user.achievementRate >= 70 ? 'default' : user.achievementRate >= 50 ? 'secondary' : 'destructive'}>
                                    {user.achievementRate}%
                                  </Badge>
                                </td>
                                <td className="px-4 py-3">
                                  {user.trend > 0 ? (
                                    <div className="flex items-center gap-1 text-green-600">
                                      <TrendingUp className="w-4 h-4" />
                                      <span className="text-sm font-medium">+{user.trend}</span>
                                    </div>
                                  ) : user.trend < 0 ? (
                                    <div className="flex items-center gap-1 text-red-600">
                                      <TrendingDown className="w-4 h-4" />
                                      <span className="text-sm font-medium">{user.trend}</span>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <Badge className={
                                    user.status === 'excellent' ? 'bg-green-600' :
                                    user.status === 'good' ? 'bg-blue-600' :
                                    'bg-orange-600'
                                  }>
                                    {user.status === 'excellent' ? 'Excellent' : 
                                     user.status === 'good' ? 'Good' : 'Needs Support'}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setSelectedUserForDetail(user.userId)}
                                    data-testid={`button-view-user-${user.userId}`}
                                  >
                                    <Eye className="w-4 h-4 mr-1" />
                                    View Details
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* User Activity Search Tab Content */}
          {activeTab === 'activity' && (
            <div className="p-6">
              <UserActivitySearch apiEndpoint="/api/admin/search-user-by-name" />
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
