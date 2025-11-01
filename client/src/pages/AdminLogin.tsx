import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Loader2, Shield, ArrowLeft, Lock } from 'lucide-react';
import mkLogo from '@assets/Screenshot 2025-10-11 130038_1760168623219.png';

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter your admin email address",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      await apiRequest('POST', '/api/auth/admin-login', { email });
      
      // Invalidate cached admin info to fetch fresh data for newly logged-in admin
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      
      toast({
        title: "Admin Login Successful",
        description: "Welcome to Admin Panel"
      });
      setLocation('/admin/panel');
    } catch (error: any) {
      toast({
        title: "Admin Login Failed",
        description: error.message || "You are not authorized as admin.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
      <div className="w-full max-w-md px-6">
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex justify-center">
            <img 
              src={mkLogo} 
              alt="MK Logo" 
              className="w-32 h-32 object-contain"
              data-testid="img-mk-logo"
            />
          </div>

          {/* Title */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Admin Access Portal
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Secure login for administrative team members
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Shield className="w-4 h-4" />
                Admin Email Address
              </label>
              <Input
                type="email"
                placeholder="Enter your admin email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 text-base rounded-lg border-gray-300 dark:border-gray-700"
                disabled={loading}
                data-testid="input-admin-email"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-base font-semibold bg-red-600 hover:bg-red-700 text-white rounded-full shadow-md"
              data-testid="button-admin-login"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Accessing...
                </>
              ) : (
                'Access Admin Panel'
              )}
            </Button>
          </form>

          {/* Back to Main Dashboard */}
          <div className="text-center">
            <button
              onClick={() => setLocation('/')}
              className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              data-testid="link-user-login"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Main Dashboard
            </button>
          </div>

          {/* Security Notice */}
          <div className="flex items-center justify-center gap-2 pt-4">
            <Lock className="w-4 h-4 text-gray-500" />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Secure Admin Access System
            </p>
          </div>

          {/* Footer */}
          <div className="text-center pt-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              © 2025 Copyright Mitesh Khatri Training™ LLP. All Rights Reserved
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
