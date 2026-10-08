import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import Dashboard from '@/pages/Dashboard';

const queryClient = new QueryClient();

/**
 * Root redirect: mirrors the original app's index.html → welcome.html redirect.
 * All actual pages (welcome.html, admin-dashboard.html, etc.) are served
 * as static files from public/ by Vite.
 */
function RootRedirect() {
  useEffect(() => {
    // Redirect to the welcome page (static HTML in public/)
    window.location.href = `${import.meta.env.BASE_URL}welcome.html`;
  }, []);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={RootRedirect} />
      <Route path="/dashboard" component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
