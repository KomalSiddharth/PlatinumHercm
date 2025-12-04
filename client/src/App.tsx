import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ChatBubbleProvider, useChatBubble } from "@/contexts/ChatBubbleContext";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import AdminLogin from "@/pages/AdminLogin";
import AdminPanel from "@/pages/AdminPanel";
import NotFound from "@/pages/not-found";
import ChatBubble from "@/components/ChatBubble";

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

// function ChatBubbleWrapper() {
//   const [location] = useLocation();
//   const { isChatBubbleOpen, setChatBubbleOpen } = useChatBubble();
//   const showOnPages = ['/dashboard', '/admin/panel'];
//   const shouldShow = showOnPages.some(page => location.startsWith(page));
  
//   if (!shouldShow) return null;
//   return <ChatBubble isOpen={isChatBubbleOpen} onOpenChange={setChatBubbleOpen} />;
// }

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ChatBubbleProvider>
          <Toaster />
          <Router />
          <ChatBubbleWrapper />
        </ChatBubbleProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
