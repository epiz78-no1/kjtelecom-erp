import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AppProvider } from "@/contexts/AppContext";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import Dashboard from "@/pages/Dashboard";
import Auth from "@/pages/Auth";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import TenantSelect from "@/pages/TenantSelect";
import Inventory from "@/pages/Inventory";
import IncomingRecords from "@/pages/IncomingRecords";
import OutgoingRecords from "@/pages/OutgoingRecords";
import TeamOutgoing from "@/pages/TeamOutgoing";
import TeamMaterialUsage from "@/pages/TeamMaterialUsage";
import Settings from "@/pages/Settings";
import AdminMembers from "@/pages/admin/AdminMembers";
import AdminOrg from "@/pages/admin/AdminOrg";
import AdminPositions from "@/pages/admin/AdminPositions";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/inventory" component={Inventory} />
      <Route path="/incoming" component={IncomingRecords} />
      <Route path="/outgoing" component={OutgoingRecords} />
      <Route path="/team-outgoing" component={TeamOutgoing} />
      <Route path="/team-material-usage" component={TeamMaterialUsage} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { user, isLoading, logout } = useAppContext();

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  // Public routes (login, register)
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/tenant-select" component={TenantSelect} />
      <Route>
        {() => {
          // Protected routes - require authentication
          if (!user) {
            return <Login />;
          }

          const style = {
            "--sidebar-width": "16rem",
            "--sidebar-width-icon": "3rem",
          };

          return (
            <SidebarProvider style={style as React.CSSProperties}>
              <div className="flex h-screen w-full">
                <AppSidebar />
                <div className="flex flex-col flex-1 overflow-hidden">
                  <header className="flex h-14 items-center justify-between gap-4 border-b px-4">
                    <SidebarTrigger data-testid="button-sidebar-toggle" />
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>{user.username}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => logout()}
                        className="gap-2"
                      >
                        <LogOut className="h-4 w-4" />
                        로그아웃
                      </Button>
                      <ThemeToggle />
                    </div>
                  </header>
                  <main className="flex-1 overflow-hidden p-6">
                    <Switch>
                      <Route path="/" component={Dashboard} />
                      <Route path="/inventory" component={Inventory} />
                      <Route path="/incoming" component={IncomingRecords} />
                      <Route path="/outgoing" component={OutgoingRecords} />
                      <Route path="/team-outgoing" component={TeamOutgoing} />
                      <Route path="/team-material-usage" component={TeamMaterialUsage} />
                      <Route path="/admin/members" component={AdminMembers} />
                      <Route path="/admin/org" component={AdminOrg} />
                      <Route path="/admin/positions" component={AdminPositions} />
                      <Route path="/settings" component={Settings} />
                      <Route component={NotFound} />
                    </Switch>
                  </main>
                </div>
              </div>
            </SidebarProvider>
          );
        }}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppProvider>
          <AppContent />
        </AppProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
