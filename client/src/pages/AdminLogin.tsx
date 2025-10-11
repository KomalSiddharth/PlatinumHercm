import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, Shield } from 'lucide-react';

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-gray-900">
      <div className="w-full max-w-md p-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 space-y-6">
          {/* Admin Icon */}
          <div className="flex justify-center">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Shield className="w-12 h-12 text-white" data-testid="icon-admin" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Admin Panel
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              IMK Email Verification System
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <Input
                type="email"
                placeholder="Admin Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 text-base border-2 border-blue-200 focus:border-blue-400 dark:border-blue-800 dark:focus:border-blue-600"
                disabled={loading}
                data-testid="input-admin-email"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-14 text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full shadow-lg"
              data-testid="button-admin-login"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Logging in...
                </>
              ) : (
                'ADMIN LOGIN'
              )}
            </Button>
          </form>

          {/* Back to User Login */}
          <div className="text-center pt-4">
            <button
              onClick={() => setLocation('/')}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 underline"
              data-testid="link-user-login"
            >
              Back to User Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
