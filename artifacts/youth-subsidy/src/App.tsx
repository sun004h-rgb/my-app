import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";

import { Layout } from "@/components/layout";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Businesses from "@/pages/businesses";
import BusinessNew from "@/pages/businesses-new";
import BusinessDetail from "@/pages/businesses-detail";
import BusinessEdit from "@/pages/businesses-edit";
import Workers from "@/pages/workers";
import WorkerDetail from "@/pages/workers-detail";
import Rounds from "@/pages/rounds";
import Notifications from "@/pages/notifications";
import AdminUsers from "@/pages/admin-users";
import SettingsNotifications from "@/pages/settings-notifications";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ component: Component, requireAdmin = false }: { component: React.ComponentType, requireAdmin?: boolean }) {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">로딩중...</div>;
  }

  if (!user && location !== "/login") {
    setLocation("/login");
    return null;
  }

  if (requireAdmin && user?.role !== "admin") {
    setLocation("/");
    return null;
  }

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      <Route path="/">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      <Route path="/businesses/new">
        {() => <ProtectedRoute component={BusinessNew} />}
      </Route>
      <Route path="/businesses/:id/edit">
        {() => <ProtectedRoute component={BusinessEdit} />}
      </Route>
      <Route path="/businesses/:id">
        {() => <ProtectedRoute component={BusinessDetail} />}
      </Route>
      <Route path="/businesses">
        {() => <ProtectedRoute component={Businesses} />}
      </Route>
      
      <Route path="/workers/:id">
        {() => <ProtectedRoute component={WorkerDetail} />}
      </Route>
      <Route path="/workers">
        {() => <ProtectedRoute component={Workers} />}
      </Route>
      
      <Route path="/rounds">
        {() => <ProtectedRoute component={Rounds} />}
      </Route>
      <Route path="/notifications">
        {() => <ProtectedRoute component={Notifications} />}
      </Route>
      <Route path="/admin/users">
        {() => <ProtectedRoute component={AdminUsers} requireAdmin />}
      </Route>
      <Route path="/admin/settings/notifications">
        {() => <ProtectedRoute component={SettingsNotifications} />}
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <TooltipProvider>
              <Router />
              <Toaster />
            </TooltipProvider>
          </AuthProvider>
        </WouterRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
