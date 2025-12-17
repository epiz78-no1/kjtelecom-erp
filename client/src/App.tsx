import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AppProvider } from "@/contexts/AppContext";
import Dashboard from "@/pages/Dashboard";
import Inventory from "@/pages/Inventory";
import IncomingRecords from "@/pages/IncomingRecords";
import OutgoingRecords from "@/pages/OutgoingRecords";
import TeamOutgoing from "@/pages/TeamOutgoing";
import TeamMaterialUsage from "@/pages/TeamMaterialUsage";
import Statistics from "@/pages/Statistics";
import Settings from "@/pages/Settings";
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
      <Route path="/statistics" component={Statistics} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppProvider>
          <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1 overflow-hidden">
                <header className="flex h-14 items-center justify-between gap-4 border-b px-4">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <ThemeToggle />
                </header>
                <main className="flex-1 overflow-auto p-6">
                  <Router />
                </main>
              </div>
            </div>
          </SidebarProvider>
        </AppProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
