import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Loader2, Mail } from 'lucide-react';
import mkLogo from '@assets/Screenshot 2025-10-11 130038_1760168623219.png';

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter your email address",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      await apiRequest('POST', '/api/auth/login', { email });
      
      // Ensure user data is fetched before redirecting
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      
      // Wait a moment for the query to refetch
      await new Promise(resolve => setTimeout(resolve, 200));
      
      toast({
        title: "Login Successful",
        description: "Welcome to Platinum HRCM Dashboard"
      });
      
      // Navigate to dashboard
      setLocation('/dashboard');
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Your email is not approved. Please contact admin.",
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
          <div className="text-center space-y-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
              Login now for HRCM Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Use your registered Email ID to enter HRCM Dashboard
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Mail className="w-4 h-4" />
                Email Address
              </label>
              <Input
                type="email"
                placeholder="Enter your registered email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 text-base rounded-lg border-gray-300 dark:border-gray-700"
                disabled={loading}
                data-testid="input-email"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-base font-semibold bg-red-600 hover:bg-red-700 text-white rounded-full shadow-md"
              data-testid="button-login"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify Access'
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="text-center pt-6">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              © 2025 Copyright Mitesh Khatri Training™ LLP. All Rights Reserved
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
