import { Switch, Route, Redirect } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
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

// 🤖 Smart Delphi Chatbot Loader - Only shows for logged-in users NOT on homepage
function DelphiChatbotLoader() {
  useEffect(() => {
    // Check if user is on homepage
    const isHomePage = window.location.pathname === '/';
    
    // Check if user is logged in (check for user session)
    const isLoggedIn = () => {
      return (
        document.cookie.includes('user_session') || 
        document.cookie.includes('auth_token') ||
        sessionStorage.getItem('isLoggedIn') === 'true' ||
        // Alternative: Check if user endpoint works (if you have auth query)
        !!document.body.getAttribute('data-authenticated')
      );
    };

    // Only load chatbot if NOT on homepage AND user is logged in
    if (!isHomePage && isLoggedIn()) {
      console.log('[DELPHI] 🤖 Loading chatbot (logged in, not on homepage)');
      
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
      console.log('[DELPHI] ⏸️ Chatbot skipped:', { isHomePage, isLoggedIn: isLoggedIn() });
      
      // Clean up if on homepage or not logged in
      const script = document.getElementById('delphi-bubble-bootstrap-global');
      if (script) {
        script.remove();
      }
      const bubble = document.querySelector('[id*="delphi"]');
      if (bubble) {
        bubble.remove();
      }
    }

    // Listen for route changes and reload chatbot
    const handleRouteChange = () => {
      const newIsHomePage = window.location.pathname === '/';
      if (newIsHomePage !== isHomePage) {
        // Route changed - reload chatbot logic on next render
        window.dispatchEvent(new Event('chatbot-check'));
      }
    };

    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, [window.location.pathname]); // Re-check when path changes

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
