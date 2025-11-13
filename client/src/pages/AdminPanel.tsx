import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useWebSocket } from '@/hooks/useWebSocket';
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
  Pencil,
  ChevronLeft,
  ChevronRight,
  Check,
  ChevronsUpDown,
  Moon,
  Sun
} from 'lucide-react';
import type { ApprovedEmail, AdminUser, AccessLog } from '@shared/schema';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import UserDetailView from '@/components/UserDetailView';
import UserActivitySearch from '@/components/UserActivitySearch';
import AdminUserDashboardViewer from '@/components/AdminUserDashboardViewer';

export default function AdminPanel() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<'approved' | 'team' | 'logs' | 'analytics' | 'dashboard-viewer' | 'team-analytics' | 'recommendations' | 'platinum-standards' | 'feedback'>('analytics');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [bulkEmails, setBulkEmails] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [editingEmail, setEditingEmail] = useState<ApprovedEmail | null>(null);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, isUploading: false });
  
  // Team Management states
  const [showAddAdminDialog, setShowAddAdminDialog] = useState(false);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  
  // Analytics states
  const [selectedUserForDetail, setSelectedUserForDetail] = useState<string | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchedUser, setSearchedUser] = useState<any>(null);
  const [analyticsCurrentPage, setAnalyticsCurrentPage] = useState(1);
  const [analyticsItemsPerPage, setAnalyticsItemsPerPage] = useState(10);
  const [showMetricsDialog, setShowMetricsDialog] = useState(false);
  
  // User Section (Approved Emails) pagination states
  const [approvedEmailsCurrentPage, setApprovedEmailsCurrentPage] = useState(1);
  const [approvedEmailsItemsPerPage, setApprovedEmailsItemsPerPage] = useState(50);
  
  // Team Management pagination states
  const [teamCurrentPage, setTeamCurrentPage] = useState(1);
  const [teamItemsPerPage, setTeamItemsPerPage] = useState(50);
  
  // Access Logs pagination states
  const [logsCurrentPage, setLogsCurrentPage] = useState(1);
  const [logsItemsPerPage, setLogsItemsPerPage] = useState(50);
  
  // Course recommendation states
  const [recUserEmail, setRecUserEmail] = useState('');
  const [recHrcmArea, setRecHrcmArea] = useState('health');
  const [recCourseName, setRecCourseName] = useState('');
  const [recReason, setRecReason] = useState('');
  const [recUserPopoverOpen, setRecUserPopoverOpen] = useState(false);
  
  // Team analytics period state
  const [teamAnalyticsPeriod, setTeamAnalyticsPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  
  // Platinum standards states
  const [selectedPlatinumCategory, setSelectedPlatinumCategory] = useState<'health' | 'relationship' | 'career' | 'money'>('health');
  const [newStandardText, setNewStandardText] = useState('');
  const [editingStandard, setEditingStandard] = useState<any>(null);
  const [selectedStandardIds, setSelectedStandardIds] = useState<Set<string>>(new Set());
  
  // Dark/Light mode state
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'dark';
  });
  
  const { toast } = useToast();
  
  // Apply saved theme on component mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
      setDarkMode(true);
    } else {
      document.documentElement.classList.remove('dark');
      setDarkMode(false);
    }
  }, []);
  
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // Check if user is logged in (admin restrictions removed)
  const { data: currentUser, isLoading: userLoading } = useQuery<{ id: string; email: string; firstName?: string; lastName?: string; isAdmin?: boolean }>({
    queryKey: ['/api/auth/user'],
    retry: false,
  });

  // Real-time WebSocket connection for admin notifications
  const { lastMessage } = useWebSocket(currentUser?.id);
  
  // Listen for real-time recommendation status changes
  useEffect(() => {
    console.log('[ADMIN REALTIME] WebSocket useEffect triggered, lastMessage:', lastMessage);
    
    if (!lastMessage) {
      console.log('[ADMIN REALTIME] No lastMessage, returning');
      return;
    }
    
    console.log('[ADMIN REALTIME] Processing message type:', lastMessage.type);
    console.log('[ADMIN REALTIME] Full message data:', lastMessage.data);
    
    if (lastMessage.type === 'recommendation_status_changed') {
      console.log('[ADMIN REALTIME] ✅ RECOMMENDATION STATUS CHANGED EVENT RECEIVED!');
      console.log('[ADMIN REALTIME] Recommendation ID:', lastMessage.data.recommendationId);
      console.log('[ADMIN REALTIME] New Status:', lastMessage.data.status);
      console.log('[ADMIN REALTIME] Course Name:', lastMessage.data.courseName);
      
      // INSTANT UPDATE: Immediately update the cache with new status
      console.log('[ADMIN REALTIME] About to update queryClient cache...');
      queryClient.setQueryData(['/api/admin/recommendations'], (old: any) => {
        console.log('[ADMIN REALTIME] Current cache data:', old);
        if (!old) {
          console.log('[ADMIN REALTIME] No cache data, returning');
          return old;
        }
        const updated = old.map((rec: any) =>
          rec.id === lastMessage.data.recommendationId
            ? { ...rec, status: lastMessage.data.status }
            : rec
        );
        console.log('[ADMIN REALTIME] Updated cache data:', updated);
        return updated;
      });
      
      console.log('[ADMIN REALTIME] Cache updated! Showing toast...');
      toast({
        title: "Status Updated ✓",
        description: lastMessage.data.message,
      });
      
      // Background refresh to confirm
      console.log('[ADMIN REALTIME] Invalidating queries for background refresh...');
      queryClient.invalidateQueries({ queryKey: ['/api/admin/recommendations'] });
      console.log('[ADMIN REALTIME] All updates complete!');
    } else {
      console.log('[ADMIN REALTIME] Message type not recommendation_status_changed, ignoring');
    }
  }, [lastMessage, toast]);

  const { data: approvedEmails = [], isLoading } = useQuery<ApprovedEmail[]>({
    queryKey: ['/api/admin/approved-emails'],
    enabled: activeTab === 'approved' || activeTab === 'recommendations' || activeTab === 'dashboard-viewer', // Enable on all 3 tabs
    staleTime: 30000, // Cache for 30 seconds to improve performance
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
    staleTime: 30000, // Cache for 30 seconds to improve performance
  });

  const { data: accessLogs = [], isLoading: isLoadingLogs } = useQuery<AccessLog[]>({
    queryKey: ['/api/admin/access-logs'],
    enabled: activeTab === 'logs',
    staleTime: 30000, // Cache for 30 seconds to improve performance
  });

  const { data: userAnalytics = [], isLoading: isLoadingAnalytics } = useQuery<any[]>({
    queryKey: ['/api/admin/users-analytics'],
    staleTime: 30000, // Cache for 30 seconds to improve performance
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
    staleTime: 30000, // Cache for 30 seconds to improve performance
  });

  const searchUserMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await fetch(`/api/admin/search-user-by-name?name=${encodeURIComponent(query)}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'User not found');
      }
      return response.json();
    },
    onSuccess: (data) => {
      // If multiple users found, show the first one
      const user = Array.isArray(data) ? data[0] : data;
      setSearchedUser(user);
      setSelectedUserForDetail(user.id);
    },
    onError: (error: any) => {
      toast({ 
        title: "User Not Found", 
        description: error.message || "No user found with this name or email",
        variant: "destructive" 
      });
      setSearchedUser(null);
    }
  });

  const handleUserSearch = () => {
    if (!userSearchQuery.trim()) {
      toast({ 
        title: "Search Query Required", 
        description: "Please enter a name or email to search",
        variant: "destructive" 
      });
      return;
    }
    searchUserMutation.mutate(userSearchQuery.trim());
  };

  const addEmailMutation = useMutation({
    mutationFn: async (data: { email: string; name?: string }) => {
      return apiRequest('/api/admin/approved-emails', 'POST', data);
    },
    onSuccess: () => {
      // Invalidate all related queries to auto-refresh analytics
      queryClient.invalidateQueries({ queryKey: ['/api/admin/approved-emails'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.includes('/api/admin/users-analytics') || key?.includes('/api/admin/team-analytics');
        }
      });
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
      return apiRequest('/api/admin/bulk-upload', 'POST', { emails });
    },
    onSuccess: () => {
      // Invalidate all related queries to auto-refresh analytics
      queryClient.invalidateQueries({ queryKey: ['/api/admin/approved-emails'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.includes('/api/admin/users-analytics') || key?.includes('/api/admin/team-analytics');
        }
      });
      toast({ title: "Bulk Upload Complete", description: "Emails have been added successfully" });
      setShowBulkDialog(false);
      setBulkEmails('');
      setCsvFile(null);
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
      return apiRequest(`/api/admin/approved-emails/${id}`, 'DELETE');
    },
    // Optimistic update - instantly remove from UI
    onMutate: async (id: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/admin/approved-emails'] });
      
      // Snapshot the previous value
      const previousEmails = queryClient.getQueryData(['/api/admin/approved-emails']);
      
      // Optimistically update by removing the email
      queryClient.setQueryData(['/api/admin/approved-emails'], (old: any) => {
        if (!old) return old;
        return old.filter((email: any) => email.id !== id);
      });
      
      // Show instant feedback
      toast({ title: "Deleting...", description: "Removing email and user data" });
      
      // Return context with previous data for rollback
      return { previousEmails };
    },
    onSuccess: () => {
      // Invalidate all related queries to auto-refresh analytics
      queryClient.invalidateQueries({ queryKey: ['/api/admin/approved-emails'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.includes('/api/admin/users-analytics') || key?.includes('/api/admin/team-analytics');
        }
      });
      toast({ title: "Email Deleted", description: "Email and all user data removed permanently" });
    },
    onError: (error: any, id: string, context: any) => {
      // Rollback on error
      if (context?.previousEmails) {
        queryClient.setQueryData(['/api/admin/approved-emails'], context.previousEmails);
      }
      toast({ 
        title: "Delete Failed", 
        description: error.message || "Failed to delete email",
        variant: "destructive" 
      });
    }
  });

  const updateEmailMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { email: string; name?: string; status: string } }) => {
      return apiRequest(`/api/admin/approved-emails/${id}`, 'PUT', data);
    },
    onSuccess: () => {
      // Invalidate all related queries to auto-refresh analytics
      queryClient.invalidateQueries({ queryKey: ['/api/admin/approved-emails'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.includes('/api/admin/users-analytics') || key?.includes('/api/admin/team-analytics');
        }
      });
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
      return apiRequest('/api/admin/approved-emails/all', 'DELETE');
    },
    onSuccess: () => {
      // Invalidate all related queries to auto-refresh analytics
      queryClient.invalidateQueries({ queryKey: ['/api/admin/approved-emails'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.includes('/api/admin/users-analytics') || key?.includes('/api/admin/team-analytics');
        }
      });
      setSelectedEmails([]);
      toast({ title: "All Emails Deleted", description: "All approved emails have been removed" });
    }
  });

  // Team Management mutations
  const addAdminMutation = useMutation({
    mutationFn: async (data: { name: string; email: string }) => {
      return apiRequest('/api/admin/team', 'POST', data);
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
      return apiRequest(`/api/admin/team/${id}`, 'PUT', data);
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
      return apiRequest(`/api/admin/team/${id}`, 'DELETE');
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
    staleTime: 30000, // Cache for 30 seconds to improve performance
  });

  const { data: platinumStandards = [], isLoading: isLoadingPlatinumStandards } = useQuery<any[]>({
    queryKey: ['/api/admin/platinum-standards'],
    enabled: activeTab === 'platinum-standards',
    staleTime: 30000, // Cache for 30 seconds to improve performance
  });

  // User Feedback query with real-time polling
  const { data: allFeedback = [] } = useQuery<any[]>({
    queryKey: ['/api/admin/feedback'],
    enabled: activeTab === 'feedback',
    refetchInterval: activeTab === 'feedback' ? 5000 : false, // Poll every 5 seconds when tab is active
    staleTime: 0, // Always consider data stale for instant updates
  });

  const addRecommendationMutation = useMutation({
    mutationFn: async (data: { userEmail: string; hrcmArea: string; courseName: string; reason?: string }) => {
      return apiRequest('/api/admin/recommendations', 'POST', data);
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
      return apiRequest(`/api/admin/recommendations/${id}`, 'DELETE');
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
      return apiRequest('/api/admin/recommendations/all', 'DELETE');
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
      return apiRequest('/api/admin/platinum-standards', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/platinum-standards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/platinum-standards'] });
      // Force immediate refetch for active dashboard users
      queryClient.refetchQueries({ queryKey: ['/api/platinum-standards'] });
      setNewStandardText('');
      toast({ title: "Success", description: "Platinum standard added successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to add platinum standard", variant: "destructive" });
    }
  });

  const updatePlatinumStandardMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { standardText?: string; isActive?: boolean; orderIndex?: number } }) => {
      return apiRequest(`/api/admin/platinum-standards/${id}`, 'PUT', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/platinum-standards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/platinum-standards'] });
      // Force immediate refetch for active dashboard users
      queryClient.refetchQueries({ queryKey: ['/api/platinum-standards'] });
      setEditingStandard(null);
      toast({ title: "Success", description: "Platinum standard updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update platinum standard", variant: "destructive" });
    }
  });

  const deletePlatinumStandardMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/admin/platinum-standards/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/platinum-standards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/platinum-standards'] });
      // Force immediate refetch for active dashboard users
      queryClient.refetchQueries({ queryKey: ['/api/platinum-standards'] });
      toast({ title: "Success", description: "Platinum standard deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete platinum standard", variant: "destructive" });
    }
  });

  const bulkDeletePlatinumStandardsMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return apiRequest('/api/admin/platinum-standards/bulk-delete', 'POST', { ids });
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/platinum-standards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/platinum-standards'] });
      queryClient.refetchQueries({ queryKey: ['/api/platinum-standards'] });
      setSelectedStandardIds(new Set());
      toast({ title: "Success", description: response.message || "Standards deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete standards", variant: "destructive" });
    }
  });

  // User Feedback mutations
  const updateFeedbackMutation = useMutation({
    mutationFn: async ({ id, status, adminResponse }: { id: string; status: string; adminResponse?: string }) => {
      return apiRequest(`/api/admin/feedback/${id}`, 'PATCH', { status, adminResponse });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/feedback'] });
      toast({ title: "Feedback Updated", description: "Feedback status has been updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update feedback",
        variant: "destructive" 
      });
    }
  });

  const deleteFeedbackMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/admin/feedback/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/feedback'] });
      toast({ title: "Feedback Deleted", description: "Feedback has been removed successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete feedback",
        variant: "destructive" 
      });
    }
  });

  const clearAllFeedbackMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/admin/feedback/clear-all', 'DELETE');
    },
    // Optimistic update - instantly clear from UI
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/admin/feedback'] });
      
      // Snapshot the previous value
      const previousFeedback = queryClient.getQueryData(['/api/admin/feedback']);
      
      // Optimistically update by clearing all feedback
      queryClient.setQueryData(['/api/admin/feedback'], []);
      
      // Show instant feedback
      toast({ title: "Clearing...", description: "Removing all feedback" });
      
      // Return context with previous data for rollback
      return { previousFeedback };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/feedback'] });
      toast({ title: "All Feedback Cleared", description: "All user feedback has been deleted successfully" });
    },
    onError: (error: any, variables, context: any) => {
      // Rollback on error
      if (context?.previousFeedback) {
        queryClient.setQueryData(['/api/admin/feedback'], context.previousFeedback);
      }
      toast({ 
        title: "Error", 
        description: error.message || "Failed to clear all feedback",
        variant: "destructive" 
      });
    }
  });

  const clearAllLogsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/admin/access-logs', 'DELETE');
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

  // Reset Approved Emails pagination to page 1 when search query changes
  useEffect(() => {
    setApprovedEmailsCurrentPage(1);
  }, [searchQuery]);

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

  const handleBulkUpload = async () => {
    let emailEntries: { email: string; name?: string }[] = [];

    // Parse CSV file if uploaded
    if (csvFile) {
      try {
        const text = await csvFile.text();
        // Helper function to remove quotes from CSV values
        const removeQuotes = (str: string) => {
          return str.replace(/^["']|["']$/g, '').trim();
        };
        
        // Parse CSV - handle name,email format
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);
        
        for (const line of lines) {
          // If line contains commas, treat as "name,email" format
          if (line.includes(',')) {
            const parts = line.split(',').map(p => removeQuotes(p.trim())).filter(p => p);
            if (parts.length >= 2) {
              // First part is name, second is email
              emailEntries.push({ email: parts[1], name: parts[0] });
            } else if (parts.length === 1) {
              // Only email
              emailEntries.push({ email: parts[0] });
            }
          } else {
            // Otherwise, treat entire line as email only
            emailEntries.push({ email: removeQuotes(line) });
          }
        }
      } catch (error) {
        toast({ 
          title: "Error", 
          description: "Failed to read CSV file", 
          variant: "destructive" 
        });
        return;
      }
    }

    // Add manual textarea emails (email only)
    const manualEmails = bulkEmails.split('\n').map(e => e.trim()).filter(e => e);
    emailEntries.push(...manualEmails.map(email => ({ email })));

    // Remove duplicates by email (keep first occurrence with name if available)
    const uniqueMap = new Map<string, { email: string; name?: string }>();
    for (const entry of emailEntries) {
      const existing = uniqueMap.get(entry.email.toLowerCase());
      if (!existing || (!existing.name && entry.name)) {
        // Keep this entry if no existing, or if existing has no name but this one does
        uniqueMap.set(entry.email.toLowerCase(), entry);
      }
    }
    emailEntries = Array.from(uniqueMap.values());

    if (emailEntries.length === 0) {
      toast({ 
        title: "Error", 
        description: "Please enter emails manually or upload a CSV file", 
        variant: "destructive" 
      });
      return;
    }

    // Check 30k limit
    if (emailEntries.length > 30000) {
      toast({ 
        title: "Too Many Emails", 
        description: `You can upload maximum 30,000 emails at once. You have ${emailEntries.length.toLocaleString()} emails.`, 
        variant: "destructive" 
      });
      return;
    }

    // Batch processing for large uploads
    setUploadProgress({ current: 0, total: emailEntries.length, isUploading: true });
    
    const BATCH_SIZE = 500; // Process 500 emails at a time
    const batches = [];
    for (let i = 0; i < emailEntries.length; i += BATCH_SIZE) {
      batches.push(emailEntries.slice(i, i + BATCH_SIZE));
    }

    try {
      let uploadedCount = 0;
      
      for (const batch of batches) {
        await apiRequest('/api/admin/bulk-upload', 'POST', { entries: batch });
        uploadedCount += batch.length;
        setUploadProgress({ current: uploadedCount, total: emailEntries.length, isUploading: true });
      }

      // Success - Invalidate all related queries to auto-refresh analytics
      queryClient.invalidateQueries({ queryKey: ['/api/admin/approved-emails'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.includes('/api/admin/users-analytics') || key?.includes('/api/admin/team-analytics');
        }
      });
      toast({ 
        title: "Bulk Upload Complete", 
        description: `Successfully uploaded ${emailEntries.length.toLocaleString()} emails` 
      });
      setShowBulkDialog(false);
      setBulkEmails('');
      setCsvFile(null);
      setUploadProgress({ current: 0, total: 0, isUploading: false });
    } catch (error: any) {
      toast({ 
        title: "Upload Failed", 
        description: error.message || "Failed to upload emails", 
        variant: "destructive" 
      });
      setUploadProgress({ current: 0, total: 0, isUploading: false });
    }
  };

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.name.endsWith('.csv') && !file.type.includes('csv') && !file.type.includes('text')) {
        toast({ 
          title: "Invalid File", 
          description: "Please upload a CSV file", 
          variant: "destructive" 
        });
        return;
      }
      setCsvFile(file);
    }
  };

  const handleLogout = () => {
    setLocation('/admin/login');
  };

  const filteredEmails = approvedEmails.filter((email: ApprovedEmail) =>
    email.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (email.name && email.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Pagination for Approved Emails
  const totalApprovedPages = Math.ceil(filteredEmails.length / approvedEmailsItemsPerPage);
  const startApprovedIndex = (approvedEmailsCurrentPage - 1) * approvedEmailsItemsPerPage;
  const endApprovedIndex = startApprovedIndex + approvedEmailsItemsPerPage;
  const paginatedEmails = filteredEmails.slice(startApprovedIndex, endApprovedIndex);

  const toggleSelectAll = () => {
    if (selectedEmails.length === filteredEmails.length) {
      setSelectedEmails([]);
    } else {
      setSelectedEmails(filteredEmails.map((e: ApprovedEmail) => e.id));
    }
  };

  const handleExportEmails = () => {
    if (approvedEmails.length === 0) {
      toast({ title: "No Data", description: "No approved emails to export", variant: "destructive" });
      return;
    }

    // Create CSV content with name,email format
    const csvHeader = "Name,Email,Status,Access Count\n";
    const csvRows = approvedEmails.map((email: ApprovedEmail) => {
      const name = email.name || '';
      const emailAddress = email.email;
      const status = email.status;
      const accessCount = email.accessCount;
      return `"${name}","${emailAddress}","${status}",${accessCount}`;
    }).join('\n');
    
    const csvContent = csvHeader + csvRows;
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().split('T')[0];
    
    link.setAttribute('href', url);
    link.setAttribute('download', `approved_emails_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({ title: "Export Successful", description: `Exported ${approvedEmails.length} emails to CSV` });
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
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              data-testid="button-theme-toggle"
              className="hover-elevate active-elevate-2"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
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

        {/* Admin Panel Content with Vertical Sidebar */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-row overflow-hidden min-h-[600px]">
          {/* Left Vertical Sidebar - Tabs */}
          <div className="w-64 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 overflow-y-auto">
            <div className="flex flex-col p-4 space-y-1">
              <button 
                onClick={() => setActiveTab('analytics')}
                className={`px-4 py-3 rounded-md text-left transition-colors ${
                  activeTab === 'analytics' 
                    ? 'bg-blue-600 text-white font-medium' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                }`}
                data-testid="tab-analytics"
              >
                Analytics
              </button>
              <button 
                onClick={() => setActiveTab('dashboard-viewer')}
                className={`px-4 py-3 rounded-md text-left transition-colors ${
                  activeTab === 'dashboard-viewer' 
                    ? 'bg-blue-600 text-white font-medium' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                }`}
                data-testid="tab-dashboard-viewer"
              >
                User Dashboards
              </button>
              <button 
                onClick={() => setActiveTab('recommendations')}
                className={`px-4 py-3 rounded-md text-left transition-colors ${
                  activeTab === 'recommendations' 
                    ? 'bg-blue-600 text-white font-medium' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                }`}
                data-testid="tab-recommendations"
              >
                Course Recommendations
              </button>
              <button 
                onClick={() => setActiveTab('platinum-standards')}
                className={`px-4 py-3 rounded-md text-left transition-colors ${
                  activeTab === 'platinum-standards' 
                    ? 'bg-blue-600 text-white font-medium' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                }`}
                data-testid="tab-platinum-standards"
              >
                Platinum Standards
              </button>
              <button 
                onClick={() => setActiveTab('approved')}
                className={`px-4 py-3 rounded-md text-left transition-colors ${
                  activeTab === 'approved' 
                    ? 'bg-blue-600 text-white font-medium' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                }`}
                data-testid="tab-approved"
              >
                Approved Emails
              </button>
              <button 
                onClick={() => setActiveTab('team')}
                className={`px-4 py-3 rounded-md text-left transition-colors ${
                  activeTab === 'team' 
                    ? 'bg-blue-600 text-white font-medium' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                }`}
                data-testid="tab-team"
              >
                Team Management
              </button>
              <button 
                onClick={() => setActiveTab('logs')}
                className={`px-4 py-3 rounded-md text-left transition-colors ${
                  activeTab === 'logs' 
                    ? 'bg-blue-600 text-white font-medium' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                }`}
                data-testid="tab-logs"
              >
                Access Logs
              </button>
              <button 
                onClick={() => setActiveTab('feedback')}
                className={`px-4 py-3 rounded-md text-left transition-colors ${
                  activeTab === 'feedback' 
                    ? 'bg-blue-600 text-white font-medium' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                }`}
                data-testid="tab-feedback"
              >
                User Feedback
              </button>
            </div>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 overflow-y-auto">

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
                  <Button 
                    variant="outline" 
                    onClick={handleExportEmails}
                    data-testid="button-export"
                  >
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
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">EMAIL</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">NAME</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">STATUS</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">ACCESS COUNT</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading...</td>
                  </tr>
                ) : filteredEmails.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No approved emails found</td>
                  </tr>
                ) : (
                  paginatedEmails.map((email: ApprovedEmail) => (
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
                        <span className="text-sm text-gray-900 dark:text-white" data-testid={`text-name-${email.id}`}>
                          {email.name || '-'}
                        </span>
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

              {/* Footer with Pagination */}
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  {/* Left: Pagination Info */}
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Showing {filteredEmails.length === 0 ? 0 : startApprovedIndex + 1} to {Math.min(endApprovedIndex, filteredEmails.length)} of {filteredEmails.length} users
                    </p>
                    {/* Items per page selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Show:</span>
                      <select
                        value={approvedEmailsItemsPerPage}
                        onChange={(e) => {
                          setApprovedEmailsItemsPerPage(Number(e.target.value));
                          setApprovedEmailsCurrentPage(1);
                        }}
                        className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        data-testid="select-items-per-page"
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                  </div>

                  {/* Right: Page Navigation */}
                  {totalApprovedPages > 1 && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setApprovedEmailsCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={approvedEmailsCurrentPage === 1}
                        data-testid="button-prev-page"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </Button>
                      
                      <div className="flex items-center gap-1">
                        {[...Array(totalApprovedPages)].map((_, idx) => {
                          const pageNum = idx + 1;
                          // Show first 2, last 2, current and adjacent pages
                          const shouldShow = 
                            pageNum === 1 || 
                            pageNum === totalApprovedPages || 
                            (pageNum >= approvedEmailsCurrentPage - 1 && pageNum <= approvedEmailsCurrentPage + 1);
                          
                          // Show ellipsis
                          const showEllipsisBefore = pageNum === approvedEmailsCurrentPage - 2 && approvedEmailsCurrentPage > 3;
                          const showEllipsisAfter = pageNum === approvedEmailsCurrentPage + 2 && approvedEmailsCurrentPage < totalApprovedPages - 2;
                          
                          if (showEllipsisBefore || showEllipsisAfter) {
                            return <span key={pageNum} className="px-2 text-gray-500">...</span>;
                          }
                          
                          if (!shouldShow) return null;
                          
                          return (
                            <Button
                              key={pageNum}
                              variant={pageNum === approvedEmailsCurrentPage ? "default" : "outline"}
                              size="sm"
                              onClick={() => setApprovedEmailsCurrentPage(pageNum)}
                              className="min-w-[2.5rem]"
                              data-testid={`button-page-${pageNum}`}
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setApprovedEmailsCurrentPage(prev => Math.min(totalApprovedPages, prev + 1))}
                        disabled={approvedEmailsCurrentPage === totalApprovedPages}
                        data-testid="button-next-page"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Team Management Tab Content */}
          {activeTab === 'team' && (() => {
            // Pagination for Team Management
            const totalTeamPages = Math.ceil(adminUsers.length / teamItemsPerPage);
            const startTeamIndex = (teamCurrentPage - 1) * teamItemsPerPage;
            const endTeamIndex = startTeamIndex + teamItemsPerPage;
            const paginatedAdmins = adminUsers.slice(startTeamIndex, endTeamIndex);

            return (
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
                      paginatedAdmins.map((admin: AdminUser) => (
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

              {/* Footer with Pagination */}
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Showing {startTeamIndex + 1} to {Math.min(endTeamIndex, adminUsers.length)} of {adminUsers.length} admin users
                  </p>

                  {totalTeamPages > 1 && (
                    <div className="flex items-center gap-4">
                      {/* Items Per Page Selector */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Show</span>
                        <select
                          value={teamItemsPerPage}
                          onChange={(e) => {
                            setTeamItemsPerPage(Number(e.target.value));
                            setTeamCurrentPage(1);
                          }}
                          className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm"
                          data-testid="select-team-items-per-page"
                        >
                          <option value={10}>10</option>
                          <option value={25}>25</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                        </select>
                        <span className="text-sm text-gray-600 dark:text-gray-400">per page</span>
                      </div>

                      {/* Page Navigation */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTeamCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={teamCurrentPage === 1}
                        data-testid="button-team-prev-page"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </Button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalTeamPages) }, (_, i) => {
                          let pageNum;
                          if (totalTeamPages <= 5) {
                            pageNum = i + 1;
                          } else if (teamCurrentPage <= 3) {
                            pageNum = i + 1;
                          } else if (teamCurrentPage >= totalTeamPages - 2) {
                            pageNum = totalTeamPages - 4 + i;
                          } else {
                            pageNum = teamCurrentPage - 2 + i;
                          }

                          return (
                            <Button
                              key={pageNum}
                              variant={teamCurrentPage === pageNum ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setTeamCurrentPage(pageNum)}
                              className="min-w-[2.5rem]"
                              data-testid={`button-team-page-${pageNum}`}
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTeamCurrentPage(prev => Math.min(totalTeamPages, prev + 1))}
                        disabled={teamCurrentPage === totalTeamPages}
                        data-testid="button-team-next-page"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </>
            );
          })()}

          {/* Access Logs Tab Content */}
          {activeTab === 'logs' && (() => {
            // Pagination for Access Logs
            const totalLogsPages = Math.ceil(accessLogs.length / logsItemsPerPage);
            const startLogsIndex = (logsCurrentPage - 1) * logsItemsPerPage;
            const endLogsIndex = startLogsIndex + logsItemsPerPage;
            const paginatedLogs = accessLogs.slice(startLogsIndex, endLogsIndex);

            return (
            <>
              {/* Header with Clear All Button */}
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Access Logs</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Total {accessLogs.length} login attempts
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
                      paginatedLogs.map((log: AccessLog) => (
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

              {/* Footer with Pagination */}
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Showing {startLogsIndex + 1} to {Math.min(endLogsIndex, accessLogs.length)} of {accessLogs.length} access logs
                  </p>

                  {totalLogsPages > 1 && (
                    <div className="flex items-center gap-4">
                      {/* Items Per Page Selector */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Show</span>
                        <select
                          value={logsItemsPerPage}
                          onChange={(e) => {
                            setLogsItemsPerPage(Number(e.target.value));
                            setLogsCurrentPage(1);
                          }}
                          className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm"
                          data-testid="select-logs-items-per-page"
                        >
                          <option value={10}>10</option>
                          <option value={25}>25</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                        </select>
                        <span className="text-sm text-gray-600 dark:text-gray-400">per page</span>
                      </div>

                      {/* Page Navigation */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLogsCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={logsCurrentPage === 1}
                        data-testid="button-logs-prev-page"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </Button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalLogsPages) }, (_, i) => {
                          let pageNum;
                          if (totalLogsPages <= 5) {
                            pageNum = i + 1;
                          } else if (logsCurrentPage <= 3) {
                            pageNum = i + 1;
                          } else if (logsCurrentPage >= totalLogsPages - 2) {
                            pageNum = totalLogsPages - 4 + i;
                          } else {
                            pageNum = logsCurrentPage - 2 + i;
                          }

                          return (
                            <Button
                              key={pageNum}
                              variant={logsCurrentPage === pageNum ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setLogsCurrentPage(pageNum)}
                              className="min-w-[2.5rem]"
                              data-testid={`button-logs-page-${pageNum}`}
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLogsCurrentPage(prev => Math.min(totalLogsPages, prev + 1))}
                        disabled={logsCurrentPage === totalLogsPages}
                        data-testid="button-logs-next-page"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </>
            );
          })()}

          {/* User Feedback Tab Content */}
          {activeTab === 'feedback' && (
            <>
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">User Feedback</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Manage and respond to user feedback
                    </p>
                  </div>
                  {allFeedback.length > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to delete all ${allFeedback.length} feedback submissions? This action cannot be undone.`)) {
                          clearAllFeedbackMutation.mutate();
                        }
                      }}
                      disabled={clearAllFeedbackMutation.isPending}
                      data-testid="button-clear-all-feedback"
                    >
                      {clearAllFeedbackMutation.isPending ? 'Clearing...' : 'Clear All'}
                    </Button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Type</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Title</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">User</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Feature</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Priority</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Date</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {allFeedback.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-8 text-center text-gray-500">No feedback submitted yet</td>
                      </tr>
                    ) : (
                      allFeedback.map((feedback: any) => (
                        <tr key={feedback.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30" data-testid={`row-feedback-${feedback.id}`}>
                          <td className="px-6 py-4">
                            <Badge variant="outline" className="capitalize">
                              {feedback.feedbackType === 'bug' && '🐛'}
                              {feedback.feedbackType === 'feature' && '💡'}
                              {feedback.feedbackType === 'course' && '📚'}
                              {feedback.feedbackType === 'ui' && '🎨'}
                              {feedback.feedbackType === 'general' && '⭐'}
                              {feedback.feedbackType === 'support' && '❓'}
                              {' '}{feedback.feedbackType}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-xs truncate" title={feedback.title}>
                            {feedback.title}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{feedback.userId}</td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{feedback.relatedFeature || 'N/A'}</td>
                          <td className="px-6 py-4">
                            <select
                              value={feedback.status}
                              onChange={(e) => updateFeedbackMutation.mutate({ id: feedback.id, status: e.target.value })}
                              className="text-sm border rounded px-2 py-1 bg-background"
                              data-testid={`select-status-${feedback.id}`}
                            >
                              <option value="pending">⏳ Pending</option>
                              <option value="in_progress">🔄 In Progress</option>
                              <option value="resolved">✅ Resolved</option>
                              <option value="closed">🚫 Closed</option>
                            </select>
                          </td>
                          <td className="px-6 py-4">
                            <select
                              value={feedback.priority}
                              onChange={(e) => updateFeedbackMutation.mutate({ id: feedback.id, status: feedback.status, adminResponse: feedback.adminResponse })}
                              className="text-sm border rounded px-2 py-1 bg-background"
                              data-testid={`select-priority-${feedback.id}`}
                              disabled
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                              <option value="critical">Critical</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                            {feedback.createdAt ? new Date(feedback.createdAt).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="icon" data-testid={`button-view-${feedback.id}`}>
                                    <Eye className="w-4 h-4 text-blue-600" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                  <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                      {feedback.feedbackType === 'bug' && '🐛'}
                                      {feedback.feedbackType === 'feature' && '💡'}
                                      {feedback.feedbackType === 'course' && '📚'}
                                      {feedback.feedbackType === 'ui' && '🎨'}
                                      {feedback.feedbackType === 'general' && '⭐'}
                                      {feedback.feedbackType === 'support' && '❓'}
                                      {feedback.title}
                                    </DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4 mt-4">
                                    <div>
                                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Description:</p>
                                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 whitespace-pre-wrap">{feedback.description}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">User:</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{feedback.userId}</p>
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Feature:</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{feedback.relatedFeature || 'N/A'}</p>
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</p>
                                        <Badge variant="outline" className="capitalize">{feedback.status}</Badge>
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Priority:</p>
                                        <Badge variant="outline" className="capitalize">{feedback.priority}</Badge>
                                      </div>
                                    </div>
                                    {feedback.adminResponse && (
                                      <div>
                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Admin Response:</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 whitespace-pre-wrap">{feedback.adminResponse}</p>
                                      </div>
                                    )}
                                    <div className="pt-4 border-t">
                                      <p className="text-xs text-gray-500">
                                        Submitted: {feedback.createdAt ? new Date(feedback.createdAt).toLocaleString() : 'N/A'}
                                      </p>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => deleteFeedbackMutation.mutate(feedback.id)}
                                disabled={deleteFeedbackMutation.isPending}
                                data-testid={`button-delete-${feedback.id}`}
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

              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Total: {allFeedback.length} feedback submissions
                </p>
              </div>
            </>
          )}

          {/* User Analytics Tab Content - Redesigned with Team Analytics Section */}
          {activeTab === 'analytics' && (
            <div className="p-6 space-y-8">
              {/* Purple Main Heading */}
              <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-6 rounded-lg shadow-lg">
                <h1 className="text-3xl font-bold mb-2">📊 Analytics</h1>
                <p className="text-sm opacity-90">
                  Complete analytics overview: Team performance metrics and individual user progress tracking
                </p>
              </div>

              {/* SECTION 1: Team Analytics & Growth */}
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b-2 border-purple-500 pb-3">
                  <div>
                    <h2 className="text-2xl font-bold text-purple-700 dark:text-purple-400">Team Analytics & Growth</h2>
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
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      Weekly
                    </Button>
                    <Button 
                      variant={teamAnalyticsPeriod === 'monthly' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setTeamAnalyticsPeriod('monthly')}
                      data-testid="button-period-monthly"
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      Monthly
                    </Button>
                    <Button 
                      variant={teamAnalyticsPeriod === 'yearly' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setTeamAnalyticsPeriod('yearly')}
                      data-testid="button-period-yearly"
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      Yearly
                    </Button>
                  </div>
                </div>

                {isLoadingTeamAnalytics ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-8 h-8 animate-spin text-purple-600" />
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
                          <div className="text-3xl font-bold text-purple-600" data-testid="metric-total-users">
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
                                  <div className="text-xl font-bold text-purple-600" data-testid={`performer-rating-${index + 1}`}>
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
                      No team analytics data available
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* SECTION 2: Individual User Analytics */}
              <div className="space-y-6 border-t-4 border-purple-300 pt-8">
                <div className="border-b-2 border-purple-500 pb-3">
                  <h2 className="text-2xl font-bold text-purple-700 dark:text-purple-400">Individual User Performance</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Track individual user progress across all HRCM areas
                  </p>
                </div>

              {/* Search User Section */}
              <Card className="border-2 border-blue-200 dark:border-blue-800">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Search className="w-5 h-5" />
                    Quick User Lookup
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowMetricsDialog(true)}
                      data-testid="button-show-metrics-help"
                      className="ml-auto hover-elevate"
                      title="Understanding the Metrics"
                    >
                      <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    Enter a user's email address to view their detailed analytics and progress report
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Search by name or email (e.g., John or john@email.com)"
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleUserSearch()}
                      data-testid="input-user-search"
                      className="flex-1 text-base"
                    />
                    <Button 
                      onClick={handleUserSearch}
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
                              (()=> {
                                // Calculate pagination
                                const startIndex = (analyticsCurrentPage - 1) * analyticsItemsPerPage;
                                const endIndex = startIndex + analyticsItemsPerPage;
                                const paginatedUsers = userAnalytics.slice(startIndex, endIndex);
                                
                                return paginatedUsers.map((user: any) =>(
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
                              ));
                              })()
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination Controls */}
                      {userAnalytics.length > 0 && (
                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-center gap-4">
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              Showing {Math.min((analyticsCurrentPage - 1) * analyticsItemsPerPage + 1, userAnalytics.length)} to {Math.min(analyticsCurrentPage * analyticsItemsPerPage, userAnalytics.length)} of {userAnalytics.length} users
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="text-sm text-gray-600 dark:text-gray-400">Rows per page:</label>
                              <select
                                value={analyticsItemsPerPage}
                                onChange={(e) => {
                                  setAnalyticsItemsPerPage(Number(e.target.value));
                                  setAnalyticsCurrentPage(1);
                                }}
                                className="border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm bg-white dark:bg-gray-800"
                                data-testid="select-items-per-page"
                              >
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                              </select>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setAnalyticsCurrentPage(prev => Math.max(1, prev - 1))}
                              disabled={analyticsCurrentPage === 1}
                              data-testid="button-prev-page"
                              className="hover-elevate"
                            >
                              <ChevronLeft className="w-4 h-4 mr-1" />
                              Previous
                            </Button>
                            
                            <div className="flex items-center gap-1">
                              {(() => {
                                const totalPages = Math.ceil(userAnalytics.length / analyticsItemsPerPage);
                                const pages = [];
                                const maxVisiblePages = 5;
                                
                                let startPage = Math.max(1, analyticsCurrentPage - Math.floor(maxVisiblePages / 2));
                                let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                                
                                if (endPage - startPage < maxVisiblePages - 1) {
                                  startPage = Math.max(1, endPage - maxVisiblePages + 1);
                                }
                                
                                for (let i = startPage; i <= endPage; i++) {
                                  pages.push(
                                    <Button
                                      key={i}
                                      variant={i === analyticsCurrentPage ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => setAnalyticsCurrentPage(i)}
                                      className="min-w-[2.5rem] hover-elevate"
                                      data-testid={`button-page-${i}`}
                                    >
                                      {i}
                                    </Button>
                                  );
                                }
                                
                                return pages;
                              })()}
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setAnalyticsCurrentPage(prev => Math.min(Math.ceil(userAnalytics.length / analyticsItemsPerPage), prev + 1))}
                              disabled={analyticsCurrentPage >= Math.ceil(userAnalytics.length / analyticsItemsPerPage)}
                              data-testid="button-next-page"
                              className="hover-elevate"
                            >
                              Next
                              <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}

              {/* Understanding Metrics Dialog */}
              <Dialog open={showMetricsDialog} onOpenChange={setShowMetricsDialog}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                      <HelpCircle className="w-6 h-6 text-blue-600" />
                      Understanding the Metrics
                    </DialogTitle>
                    <DialogDescription>
                      Learn what each metric means in the analytics dashboard
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                    <div className="space-y-2">
                      <div className="font-semibold text-blue-700 dark:text-blue-300 text-base">📈 Overall Score</div>
                      <div className="text-gray-700 dark:text-gray-300 text-sm">
                        Average rating (out of 10) across Health, Relationship, Career, and Money areas
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="font-semibold text-blue-700 dark:text-blue-300 text-base">🎯 Achievement Rate</div>
                      <div className="text-gray-700 dark:text-gray-300 text-sm">
                        Percentage of targets completed for the week (70%+ = Excellent, 50-69% = Good, below 50% = Needs Support)
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="font-semibold text-blue-700 dark:text-blue-300 text-base">📊 Trend</div>
                      <div className="text-gray-700 dark:text-gray-300 text-sm">
                        Change in score compared to previous week (↑ Improving, ↓ Declining, — Stable)
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="font-semibold text-blue-700 dark:text-blue-300 text-base">🗓️ Total Weeks</div>
                      <div className="text-gray-700 dark:text-gray-300 text-sm">
                        Number of weeks the user has been actively tracking their HRCM progress
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="font-semibold text-blue-700 dark:text-blue-300 text-base">✅ Status</div>
                      <div className="text-gray-700 dark:text-gray-300 text-sm">
                        <span className="text-green-600 font-medium">Excellent</span> (70%+) | 
                        <span className="text-blue-600 font-medium"> Good</span> (50-69%) | 
                        <span className="text-orange-600 font-medium"> Needs Support</span> (below 50%)
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="font-semibold text-blue-700 dark:text-blue-300 text-base">👁️ View Details</div>
                      <div className="text-gray-700 dark:text-gray-300 text-sm">
                        Opens complete progress report with weekly data, HRCM breakdown, and course completions
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              </div>
            </div>
          )}


          {/* User Dashboard Viewer Tab */}
          {activeTab === 'dashboard-viewer' && (
            <div className="p-6">
              <AdminUserDashboardViewer approvedEmails={approvedEmails} />
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
                      <label className="text-sm font-medium mb-2 block">Select User</label>
                      <Popover open={recUserPopoverOpen} onOpenChange={setRecUserPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={recUserPopoverOpen}
                            className="w-full justify-between"
                            data-testid="button-select-user"
                          >
                            {recUserEmail ? (
                              <span className="truncate">
                                {(() => {
                                  const user = approvedEmails.find(e => e.email === recUserEmail);
                                  return user ? `${user.name || 'No Name'} (${user.email})` : recUserEmail;
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
                            <CommandInput placeholder="Search by name or email..." data-testid="input-search-user" />
                            <CommandList>
                              <CommandEmpty>No user found.</CommandEmpty>
                              <CommandGroup>
                                {approvedEmails.map((user) => (
                                  <CommandItem
                                    key={user.email}
                                    value={`${user.name || ''} ${user.email}`}
                                    onSelect={() => {
                                      setRecUserEmail(user.email);
                                      setRecUserPopoverOpen(false);
                                    }}
                                    data-testid={`option-user-${user.email}`}
                                  >
                                    <Check
                                      className={`mr-2 h-4 w-4 ${
                                        recUserEmail === user.email ? 'opacity-100' : 'opacity-0'
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
                    <div>
                      <label className="text-sm font-medium mb-2 block">HRCM Area</label>
                      <select 
                        className="w-full border border-input rounded-md p-2 bg-background text-foreground" 
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
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold" 
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
                                <Badge 
                                  variant="outline"
                                  className={
                                    rec.status === 'accepted' 
                                      ? 'border-green-600 text-green-600 bg-green-50 dark:bg-green-950' 
                                      : rec.status === 'rejected' 
                                      ? 'border-red-600 text-red-600 bg-red-50 dark:bg-red-950'
                                      : rec.status === 'completed'
                                      ? 'border-blue-600 text-blue-600 bg-blue-50 dark:bg-blue-950'
                                      : 'border-yellow-600 text-yellow-600 bg-yellow-50 dark:bg-yellow-950'
                                  }
                                  data-testid={`status-${rec.id}`}
                                >
                                  {rec.status === 'accepted' ? '✓ Accepted' : 
                                   rec.status === 'rejected' ? '✗ Rejected' :
                                   rec.status === 'completed' ? '✓ Completed' : 
                                   '⏳ Pending'}
                                </Badge>
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
                    Global Platinum Standards Management
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
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold"
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
                    
                    // Get selected standards for this category
                    const categorySelectedIds = Array.from(selectedStandardIds).filter(id => 
                      categoryStandards.some((s: any) => s.id === id)
                    );
                    const allCategorySelected = categoryStandards.length > 0 && 
                      categorySelectedIds.length === categoryStandards.length;
                    
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
                          {categoryStandards.length > 0 && (
                            <div className="flex items-center gap-2 mt-3">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={allCategorySelected}
                                  onCheckedChange={(checked) => {
                                    const newSelected = new Set(selectedStandardIds);
                                    if (checked) {
                                      categoryStandards.forEach((s: any) => newSelected.add(s.id));
                                    } else {
                                      categoryStandards.forEach((s: any) => newSelected.delete(s.id));
                                    }
                                    setSelectedStandardIds(newSelected);
                                  }}
                                  data-testid={`checkbox-select-all-${category}`}
                                />
                                <span className="text-sm text-muted-foreground">
                                  Select All
                                </span>
                              </div>
                              {categorySelectedIds.length > 0 && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => {
                                    if (window.confirm(`Are you sure you want to delete ${categorySelectedIds.length} selected standard${categorySelectedIds.length > 1 ? 's' : ''}? This will affect all users.`)) {
                                      bulkDeletePlatinumStandardsMutation.mutate(categorySelectedIds);
                                    }
                                  }}
                                  disabled={bulkDeletePlatinumStandardsMutation.isPending}
                                  className="ml-auto"
                                  data-testid={`button-delete-selected-${category}`}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete Selected ({categorySelectedIds.length})
                                </Button>
                              )}
                            </div>
                          )}
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
                                className={`flex items-center gap-3 p-4 rounded-lg group border-l-4 ${
                                  category === 'health' ? 'border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100/50 dark:hover:bg-emerald-950/30' :
                                  category === 'relationship' ? 'border-l-pink-500 bg-pink-50/50 dark:bg-pink-950/20 hover:bg-pink-100/50 dark:hover:bg-pink-950/30' :
                                  category === 'career' ? 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100/50 dark:hover:bg-amber-950/30' :
                                  'border-l-purple-500 bg-purple-50/50 dark:bg-purple-950/20 hover:bg-purple-100/50 dark:hover:bg-purple-950/30'
                                } shadow-sm transition-colors`}
                                data-testid={`standard-${category}-${index}`}
                              >
                                <Checkbox
                                  checked={selectedStandardIds.has(standard.id)}
                                  onCheckedChange={(checked) => {
                                    const newSelected = new Set(selectedStandardIds);
                                    if (checked) {
                                      newSelected.add(standard.id);
                                    } else {
                                      newSelected.delete(standard.id);
                                    }
                                    setSelectedStandardIds(newSelected);
                                  }}
                                  data-testid={`checkbox-standard-${standard.id}`}
                                />
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
                                    onClick={() => setEditingStandard(standard)}
                                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950"
                                    data-testid={`button-edit-standard-${standard.id}`}
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

          </div> {/* Close right content area */}
        </div> {/* Close vertical sidebar container */}
      </div> {/* Close main admin panel container */}

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
      <Dialog open={showBulkDialog} onOpenChange={() => {
        setShowBulkDialog(false);
        setCsvFile(null);
        setBulkEmails('');
      }}>
        <DialogContent className="max-w-2xl" data-testid="dialog-bulk-upload">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              Bulk Upload Emails
            </DialogTitle>
            <DialogDescription>Upload a CSV file with "name,email" format or paste emails manually (one per line). Same email entries will be merged automatically.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* CSV File Upload Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold">📁 Upload CSV File</label>
                {csvFile && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCsvFile(null)}
                    className="text-red-600 hover:text-red-700 h-7"
                    data-testid="button-clear-csv"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
              <div className="border-2 border-dashed border-primary/30 rounded-lg p-6 bg-gradient-to-r from-primary/5 to-accent/5 hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  onChange={handleCsvFileChange}
                  className="hidden"
                  id="csv-upload"
                  data-testid="input-csv-file"
                />
                <label 
                  htmlFor="csv-upload" 
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  {csvFile ? (
                    <>
                      <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                        <Upload className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                          ✓ {csvFile.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {(csvFile.size / 1024).toFixed(2)} KB • Click to change file
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Upload className="w-6 h-6 text-primary" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium">Click to upload CSV file</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Format: name,email (one per line) or just email
                        </p>
                      </div>
                    </>
                  )}
                </label>
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border"></div>
              <span className="text-xs font-medium text-muted-foreground uppercase">or</span>
              <div className="flex-1 h-px bg-border"></div>
            </div>

            {/* Manual Entry Section */}
            <div className="space-y-3">
              <label className="text-sm font-semibold">✍️ Paste Emails Manually</label>
              <Textarea
                placeholder="user1@example.com&#10;John Doe,user2@example.com&#10;user3@example.com&#10;&#10;Format: One email per line, optionally with name (name,email)"
                value={bulkEmails}
                onChange={(e) => setBulkEmails(e.target.value)}
                rows={8}
                className="font-mono text-sm"
                data-testid="textarea-bulk-emails"
              />
              <p className="text-xs text-muted-foreground">
                💡 Tip: You can use CSV format "name,email" or just email. Use both CSV file and manual entry together. Same emails will be merged automatically. Maximum 30,000 emails per upload.
              </p>
            </div>

            {/* Upload Progress Bar */}
            {uploadProgress.isUploading && (
              <div className="space-y-3 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 rounded-lg border-2 border-emerald-500/30">
                <div className="flex items-center justify-between text-sm font-medium">
                  <span className="text-emerald-700 dark:text-emerald-400">
                    📤 Uploading emails...
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-500">
                    {uploadProgress.current.toLocaleString()} / {uploadProgress.total.toLocaleString()}
                  </span>
                </div>
                <div className="w-full h-3 bg-emerald-200/50 dark:bg-emerald-900/50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300 rounded-full"
                    style={{ width: `${(uploadProgress.current / uploadProgress.total * 100).toFixed(1)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-emerald-600 dark:text-emerald-500 text-center font-medium">
                  {((uploadProgress.current / uploadProgress.total) * 100).toFixed(1)}% Complete
                </p>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowBulkDialog(false);
                setCsvFile(null);
                setBulkEmails('');
                setUploadProgress({ current: 0, total: 0, isUploading: false });
              }} 
              disabled={uploadProgress.isUploading}
              data-testid="button-cancel-bulk"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleBulkUpload} 
              disabled={uploadProgress.isUploading}
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
              data-testid="button-confirm-bulk"
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploadProgress.isUploading ? 'Uploading...' : 'Upload Emails'}
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
            <DialogDescription>Update email address, name, and status</DialogDescription>
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
              <label className="text-sm font-medium mb-2 block">Name (Optional)</label>
              <Input
                type="text"
                placeholder="User Name"
                value={editingEmail?.name || ''}
                onChange={(e) => setEditingEmail(editingEmail ? { ...editingEmail, name: e.target.value } : null)}
                data-testid="input-edit-email-name"
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
                    data: { email: editingEmail.email, name: editingEmail.name || undefined, status: editingEmail.status }
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

      {/* Edit Platinum Standard Dialog */}
      <Dialog open={!!editingStandard} onOpenChange={() => setEditingStandard(null)}>
        <DialogContent data-testid="dialog-edit-platinum-standard">
          <DialogHeader>
            <DialogTitle>Edit Platinum Standard</DialogTitle>
            <DialogDescription>Update standard text and status</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Standard Text</label>
              <Input
                type="text"
                placeholder="Enter platinum standard text..."
                value={editingStandard?.standardText || ''}
                onChange={(e) => setEditingStandard(editingStandard ? { ...editingStandard, standardText: e.target.value } : null)}
                data-testid="input-edit-standard-text"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <select
                value={editingStandard?.isActive ? 'active' : 'inactive'}
                onChange={(e) => setEditingStandard(editingStandard ? { ...editingStandard, isActive: e.target.value === 'active' } : null)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                data-testid="select-edit-standard-status"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingStandard(null)} data-testid="button-cancel-edit-standard">
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (editingStandard) {
                  if (!editingStandard.standardText.trim()) {
                    toast({ title: "Error", description: "Standard text cannot be empty", variant: "destructive" });
                    return;
                  }
                  updatePlatinumStandardMutation.mutate({
                    id: editingStandard.id,
                    data: { 
                      standardText: editingStandard.standardText.trim(),
                      isActive: editingStandard.isActive 
                    }
                  });
                }
              }}
              disabled={updatePlatinumStandardMutation.isPending}
              data-testid="button-confirm-edit-standard"
            >
              {updatePlatinumStandardMutation.isPending ? 'Updating...' : 'Update Standard'}
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
