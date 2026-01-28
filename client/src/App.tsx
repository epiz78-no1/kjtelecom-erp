import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { SettingsSidebar } from "@/components/layout/SettingsSidebar";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { AppProvider } from "@/contexts/AppContext";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { LogOut, User, Settings as SettingsIcon, Users, Network, Award, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "wouter";
import { lazy, Suspense } from "react";

// Synchronous imports for critical paths (Auth)
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import TenantSelect from "@/pages/auth/TenantSelect";
import NotFound from "@/pages/common/NotFound";

// Lazy imports for other pages to improve initial load time
const Dashboard = lazy(() => import("@/pages/general/Dashboard"));
const Inventory = lazy(() => import("@/pages/general/Inventory"));
const IncomingRecords = lazy(() => import("@/pages/general/IncomingRecords"));
const OutgoingRecords = lazy(() => import("@/pages/general/OutgoingRecords"));



// Optical Pages
const OpticalDashboard = lazy(() => import("@/pages/optical/OpticalDashboard"));
const OpticalCables = lazy(() => import("@/pages/optical/OpticalCables"));
const OpticalIncoming = lazy(() => import("@/pages/optical/OpticalIncoming"));
const OpticalOutgoing = lazy(() => import("@/pages/optical/OpticalOutgoing"));
const TeamOutgoing = lazy(() => import("@/pages/field/TeamOutgoing"));
const TeamMaterialUsage = lazy(() => import("@/pages/field/TeamMaterialUsage"));
const FieldOpticalStatus = lazy(() => import("@/pages/field/FieldOpticalStatus"));
const FieldOpticalUsage = lazy(() => import("@/pages/field/FieldOpticalUsage"));

// Demolition Pages
const DemolitionDashboard = lazy(() => import("@/pages/demolition/DemolitionDashboard"));
const DemolitionMaterials = lazy(() => import("@/pages/demolition/DemolitionMaterials"));
const DemolitionIncoming = lazy(() => import("@/pages/demolition/DemolitionIncoming"));
const DemolitionOutgoing = lazy(() => import("@/pages/demolition/DemolitionOutgoing"));
const TeamMaterialUsageDemolition = lazy(() => import("@/pages/field/TeamMaterialUsageDemolition"));
const TeamOutgoingDemolition = lazy(() => import("@/pages/field/TeamOutgoingDemolition"));

// Admin & Settings
const Settings = lazy(() => import("@/pages/common/Settings"));
const AdminMembers = lazy(() => import("@/pages/admin/AdminMembers"));
const AdminOrg = lazy(() => import("@/pages/admin/AdminOrg"));
const AdminPositions = lazy(() => import("@/pages/admin/AdminPositions"));
const AdminUsage = lazy(() => import("@/pages/admin/AdminUsage"));
const AdminPermissions = lazy(() => import("@/pages/admin/AdminPermissions"));
const SuperAdminDashboard = lazy(() => import("@/pages/admin/SuperAdminDashboard"));

import Home from "@/pages/general/Home";

const Archives = lazy(() => import("@/pages/general/Archives"));

import { FEATURE_FLAGS } from "@/lib/constants";
import { Header } from "@/components/common/Header";
import { PAGE_TITLES } from "@/lib/pageTitles";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";


function AppContent() {
  const { user, isLoading, logout, tenants, currentTenant } = useAppContext();
  const [location] = useLocation();
  const activeTenant = tenants.find(t => t.id === currentTenant);

  // Set page title based on header tab structure
  let pageTitle = '페이지';
  if (location === '/') {
    pageTitle = '홈';
  } else if (location.startsWith('/archives')) {
    pageTitle = '자료실';
  } else if (location.startsWith('/admin')) {
    pageTitle = '관리';
  } else {
    pageTitle = '자재관리';
  }
  useDocumentTitle(pageTitle);

  // Show loading state for initial auth check
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

  // Public routes (login, register) - Synchronous
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

          // Suspense Fallback
          const LoadingFallback = () => (
            <div className="flex h-full w-full items-center justify-center min-h-[50vh]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          );

          // Strict Separation: Super Admin cannot access tenant routes
          if (user.username === 'admin') {
            if (location !== '/super-admin') {
              window.location.href = "/super-admin";
              return null;
            }
            return (
              <Suspense fallback={<LoadingFallback />}>
                <SuperAdminDashboard />
              </Suspense>
            );
          }

          // Normal User blocked from super-admin
          if (location === '/super-admin') {
            window.location.href = "/";
            return null;
          }

          const style = {
            "--sidebar-width": "16rem",
            "--sidebar-width-icon": "3rem",
          };

          return (
            <SidebarProvider style={style as React.CSSProperties}>
              <div className="flex h-screen w-full">
                {location.startsWith('/settings') ? <SettingsSidebar /> : location.startsWith('/admin') ? <AdminSidebar /> : <AppSidebar />}
                <div className="flex flex-col flex-1 overflow-hidden">
                  <Header />
                  <main className="flex-1 overflow-auto p-6">
                    <Suspense fallback={<LoadingFallback />}>
                      <Switch>
                        <Route path="/" component={Home} />
                        <Route path="/general-dashboard" component={Dashboard} />
                        <Route path="/archives" component={Archives} />
                        <Route path="/inventory" component={Inventory} />
                        <Route path="/incoming" component={IncomingRecords} />
                        <Route path="/outgoing" component={OutgoingRecords} />
                        <Route path="/team-outgoing" component={TeamOutgoing} />
                        <Route path="/team-material-usage" component={TeamMaterialUsage} />

                        {FEATURE_FLAGS.ENABLE_OPTICAL && <Route path="/optical-cables" component={OpticalCables} />}
                        {FEATURE_FLAGS.ENABLE_OPTICAL && <Route path="/optical-dashboard" component={OpticalDashboard} />}
                        {FEATURE_FLAGS.ENABLE_OPTICAL && <Route path="/optical-incoming" component={OpticalIncoming} />}
                        {FEATURE_FLAGS.ENABLE_OPTICAL && <Route path="/optical-outgoing" component={OpticalOutgoing} />}
                        {FEATURE_FLAGS.ENABLE_OPTICAL && <Route path="/team-outgoing-optical" component={FieldOpticalStatus} />}
                        {FEATURE_FLAGS.ENABLE_OPTICAL && <Route path="/team-material-usage-optical" component={FieldOpticalUsage} />}

                        {/* Demolition Material Routes */}
                        <Route path="/demolition-dashboard" component={DemolitionDashboard} />
                        <Route path="/demolition-materials" component={DemolitionMaterials} />
                        <Route path="/demolition-incoming" component={DemolitionIncoming} />
                        <Route path="/demolition-outgoing" component={DemolitionOutgoing} />
                        <Route path="/team-material-usage-demolition" component={TeamMaterialUsageDemolition} />
                        <Route path="/team-outgoing-demolition" component={TeamOutgoingDemolition} />

                        <Route path="/admin/members" component={AdminMembers} />
                        <Route path="/admin/org" component={AdminOrg} />
                        <Route path="/admin/positions" component={AdminPositions} />
                        <Route path="/admin/permissions" component={AdminPermissions} />
                        <Route path="/admin/usage" component={AdminUsage} />
                        <Route path="/settings" component={Settings} />
                        <Route component={NotFound} />
                      </Switch>
                    </Suspense>
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
