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
  ExternalLink
} from 'lucide-react';
import type { ApprovedEmail } from '@shared/schema';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export default function AdminPanel() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<'approved' | 'team' | 'logs'>('approved');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [bulkEmails, setBulkEmails] = useState('');
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
            </div>
          </div>

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
    </div>
  );
}
