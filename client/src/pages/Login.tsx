import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Loader2 } from 'lucide-react';
import mkLogo from '@assets/Screenshot 2025-10-09 165931_1760165935397.png';

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
      
      toast({
        title: "Login Successful",
        description: "Welcome to Platinum HERCM Dashboard"
      });
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <div className="w-full max-w-md p-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 space-y-6">
          {/* Logo */}
          <div className="flex justify-center">
            <img 
              src={mkLogo} 
              alt="MK Logo" 
              className="w-40 h-40 object-contain"
              data-testid="img-mk-logo"
            />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
            Login Now For Session Dashboard
          </h1>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 text-base border-2 border-blue-200 focus:border-blue-400 dark:border-blue-800 dark:focus:border-blue-600"
                disabled={loading}
                data-testid="input-email"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-14 text-lg font-bold bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-full shadow-lg"
              data-testid="button-login"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Logging in...
                </>
              ) : (
                'LOGIN'
              )}
            </Button>
          </form>

          {/* Admin Link */}
          <div className="text-center pt-4">
            <button
              onClick={() => setLocation('/admin/login')}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 underline"
              data-testid="link-admin"
            >
              Admin Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
