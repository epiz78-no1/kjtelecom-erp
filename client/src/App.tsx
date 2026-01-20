import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
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

const Auth = lazy(() => import("@/pages/auth/Auth"));

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
const SuperAdminDashboard = lazy(() => import("@/pages/admin/SuperAdminDashboard"));

import { FEATURE_FLAGS } from "@/lib/constants";


function AppContent() {
  const { user, isLoading, logout, tenants, currentTenant } = useAppContext();
  const [location] = useLocation();
  const activeTenant = tenants.find(t => t.id === currentTenant);

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
                {location.startsWith('/admin') ? <AdminSidebar /> : <AppSidebar />}
                <div className="flex flex-col flex-1 overflow-hidden">
                  <header className="flex h-14 items-center justify-between gap-4 border-b px-4">
                    <div className="flex items-center gap-4">
                      <SidebarTrigger data-testid="button-sidebar-toggle" />

                      {/* 모듈 타이틀 (왼쪽에서 옮겨옴) */}
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-slate-900">자재관리</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">


                      {/* User Profile Menu - Everyone */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="gap-2 px-2 hover:bg-slate-100">
                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center border">
                              <User className="h-4 w-4 text-slate-600" />
                            </div>
                            <span className="text-sm font-medium text-slate-700">{user.name}</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>내 계정</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href="/settings" className="cursor-pointer">
                              <SettingsIcon className="mr-2 h-4 w-4" />
                              <span>내 정보 수정</span>
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => logout()} className="text-red-600 cursor-pointer">
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>로그아웃</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Admin Settings Menu - Admin Only */}
                      {(activeTenant?.role === 'admin' || activeTenant?.role === 'owner') && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" title="시스템 관리">
                              <SettingsIcon className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>시스템 관리</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <a href="/admin/members" target="_blank" rel="noopener noreferrer" className="cursor-pointer flex items-center">
                                <Users className="mr-2 h-4 w-4" />
                                <span>멤버 관리</span>
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <a href="/admin/org" target="_blank" rel="noopener noreferrer" className="cursor-pointer flex items-center">
                                <Network className="mr-2 h-4 w-4" />
                                <span>조직 관리</span>
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <a href="/admin/positions" target="_blank" rel="noopener noreferrer" className="cursor-pointer flex items-center">
                                <Award className="mr-2 h-4 w-4" />
                                <span>직급/직책 관리</span>
                              </a>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </header>
                  <main className="flex-1 overflow-auto p-6">
                    <Suspense fallback={<LoadingFallback />}>
                      <Switch>
                        <Route path="/" component={Dashboard} />
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
