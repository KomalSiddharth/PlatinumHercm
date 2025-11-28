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

function App() {
  useEffect(() => {
    // Load Delphi chat bubble
    if (typeof window !== 'undefined') {
      // Set up Delphi config
      (window as any).delphi = {
        ...(((window as any).delphi) ?? {}),
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

      // Load Delphi bubble script
      const script = document.createElement('script');
      script.id = 'delphi-bubble-bootstrap';
      script.src = 'https://embed.delphi.ai/loader.js';
      script.async = true;
      document.head.appendChild(script);

      return () => {
        // Clean up script if needed
        const existingScript = document.getElementById('delphi-bubble-bootstrap');
        if (existingScript) {
          existingScript.remove();
        }
      };
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
