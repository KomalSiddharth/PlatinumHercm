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

// 🤖 Simple Delphi Chatbot Loader
function DelphiChatbotLoader() {
  useEffect(() => {
    // Add homepage class to body for CSS hiding
    if (window.location.pathname === '/') {
      document.body.classList.add('is-homepage');
    } else {
      document.body.classList.remove('is-homepage');
    }
  }, []);

  useEffect(() => {
    // Load Delphi script
    window.delphi = { ...(window.delphi ?? {}) };
    window.delphi.bubble = {
      config: "00175779-acb8-4580-a7ec-8469446841a4",
      overrides: {
        landingPage: "OVERVIEW",
      },
      trigger: {
        color: "#bc0000",
      },
    };

    // Load the script
    if (!document.getElementById('delphi-bubble-bootstrap')) {
      const script = document.createElement('script');
      script.id = 'delphi-bubble-bootstrap';
      script.src = 'https://embed.delphi.ai/loader.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

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
