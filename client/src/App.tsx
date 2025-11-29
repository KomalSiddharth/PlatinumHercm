import { Switch, Route, Redirect } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import AdminLogin from "@/pages/AdminLogin";
import AdminPanel from "@/pages/AdminPanel";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/login" component={Login} />
      <Route path="/admin">
        {() => <Redirect to="/admin/login" />}
      </Route>
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/panel" component={AdminPanel} />
      <Route path="/dashboard" component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

// 🤖 Smart Delphi Chatbot Loader - Shows for logged-in users only
function DelphiChatbotLoader() {
  // Check authentication status using the actual auth query
  const { data: currentUser, isLoading } = useQuery<{ id: string; email: string } | null>({
    queryKey: ['/api/auth/user'],
    retry: false,
  });
  
  useEffect(() => {
    // Don't load until auth query completes
    if (isLoading) return;
    
    const isLoggedIn = !!currentUser; // If currentUser data exists, user is logged in
    
    // Only load chatbot if user is logged in
    if (isLoggedIn) {
      console.log('[DELPHI] 🤖 Loading chatbot (user logged in)');
      
      // Delphi configuration
      (window as any).delphi = {
        ...((window as any).delphi ?? {}),
      };
      (window as any).delphi.bubble = {
        config: "00175779-acb8-4580-a7ec-8469446841a4",
        overrides: {
          landingPage: "OVERVIEW",
        },
        trigger: {
          color: "#bc0000",
        },
      };

      // Load Delphi script if not already loaded
      if (!document.getElementById('delphi-bubble-bootstrap-global')) {
        const script = document.createElement('script');
        script.id = 'delphi-bubble-bootstrap-global';
        script.src = 'https://embed.delphi.ai/loader.js';
        script.async = true;
        document.body.appendChild(script);
        console.log('[DELPHI] ✅ Chatbot script loaded');
      }
    } else {
      console.log('[DELPHI] ⏸️ Chatbot hidden (user not logged in)');
      
      // Clean up if not logged in
      const script = document.getElementById('delphi-bubble-bootstrap-global');
      if (script) {
        script.remove();
      }
      const bubble = document.querySelector('[id*="delphi"]');
      if (bubble) {
        bubble.remove();
      }
    }
  }, [currentUser, isLoading]);

  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <DelphiChatbotLoader />
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
