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
import { LogOut, User, Settings as SettingsIcon, Building2 } from "lucide-react";
import { Link } from "wouter";
import Dashboard from "@/pages/general/Dashboard";
import Inventory from "@/pages/general/Inventory";
import IncomingRecords from "@/pages/general/IncomingRecords";
import OutgoingRecords from "@/pages/general/OutgoingRecords";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import TenantSelect from "@/pages/auth/TenantSelect";
import Auth from "@/pages/auth/Auth";
import OpticalDashboard from "@/pages/optical/OpticalDashboard";
// ... Optical files remain in optical/ but need to check index if any
import OpticalCables from "@/pages/optical/OpticalCables";
import OpticalIncoming from "@/pages/optical/OpticalIncoming";
import OpticalOutgoing from "@/pages/optical/OpticalOutgoing";
import TeamOutgoing from "@/pages/field/TeamOutgoing";
import TeamMaterialUsage from "@/pages/field/TeamMaterialUsage";
import FieldOpticalStatus from "@/pages/field/FieldOpticalStatus";
import FieldOpticalUsage from "@/pages/field/FieldOpticalUsage";
import Settings from "@/pages/common/Settings";
import AdminMembers from "@/pages/admin/AdminMembers";
import AdminOrg from "@/pages/admin/AdminOrg";
import AdminPositions from "@/pages/admin/AdminPositions";
import SuperAdminDashboard from "@/pages/admin/SuperAdminDashboard";
import NotFound from "@/pages/common/NotFound";
import { FEATURE_FLAGS } from "@/lib/constants";

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
  const { user, isLoading, logout, tenants, currentTenant } = useAppContext();
  const activeTenant = tenants.find(t => t.id === currentTenant);

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
      <Route path="/super-admin" component={SuperAdminDashboard} />
      <Route>
        {() => {
          // Protected routes - require authentication
          if (!user) {
            return <Login />;
          }

          // Strict Separation: Super Admin cannot access tenant routes
          if (user.username === 'admin') {
            // Use window location to ensure clean state or useRedirect
            // Since we are inside a Route w/o path (catch-all for authenticated),
            // and /super-admin is defined ABOVE this block,
            // reaching here means the user is trying to access a tenant page (/, /inventory, etc).
            // We must redirect them back to super-admin.
            window.location.href = "/super-admin";
            return null;
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
                      {/* Tenant Name Display */}
                      {activeTenant && (
                        <div className="flex items-center gap-2 text-sm text-slate-600 font-medium border-r pr-3 mr-1">

                          <span>{activeTenant.name}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>{user.name}</span>
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
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                      >
                        <Link href="/settings">
                          <SettingsIcon className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </header>
                  <main className="flex-1 overflow-auto p-6">
                    <Switch>
                      <Route path="/" component={Dashboard} />
                      <Route path="/inventory" component={Inventory} />
                      <Route path="/incoming" component={IncomingRecords} />
                      <Route path="/outgoing" component={OutgoingRecords} />
                      <Route path="/team-outgoing" component={TeamOutgoing} />
                      <Route path="/team-material-usage" component={TeamMaterialUsage} />
                      <Route path="/team-material-usage" component={TeamMaterialUsage} />
                      {FEATURE_FLAGS.ENABLE_OPTICAL && (
                        <>
                          <Route path="/optical-cables" component={OpticalCables} />
                          <Route path="/optical-dashboard" component={OpticalDashboard} />
                          <Route path="/optical-incoming" component={OpticalIncoming} />
                          <Route path="/optical-outgoing" component={OpticalOutgoing} />
                          <Route path="/team-outgoing-optical" component={FieldOpticalStatus} />
                          <Route path="/team-material-usage-optical" component={FieldOpticalUsage} />
                        </>
                      )}
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
