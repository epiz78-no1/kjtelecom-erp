import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Package,
  Users,
  Settings,
  Cable,
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardList,
  Network,
  Award,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useAppContext } from "@/contexts/AppContext";

const menuItems = [
  { title: "대시보드", url: "/", icon: LayoutDashboard },
  { title: "재고 현황", url: "/inventory", icon: Package },
  { title: "입고 내역", url: "/incoming", icon: ArrowDownToLine },
  { title: "출고 내역", url: "/outgoing", icon: ArrowUpFromLine },
  { title: "현장팀별 출고 현황", url: "/team-outgoing", icon: Users },
  { title: "현장팀 자재 사용등록", url: "/team-material-usage", icon: ClipboardList },
];

const adminItems = [
  { title: "멤버 관리", url: "/admin/members", icon: Users },
  { title: "조직 관리", url: "/admin/org", icon: Network },
  { title: "직급/직책 관리", url: "/admin/positions", icon: Award },
];

const settingsItems = [
  { title: "설정", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, tenants, currentTenant: contextTenantId, checkPermission } = useAppContext();

  // Check if current user is admin/owner of current tenant
  const currentTenantId = contextTenantId || window.localStorage.getItem('currentTenantId') || tenants?.[0]?.id;
  const currentTenant = tenants?.find(t => t.id === currentTenantId);
  const isAdmin = currentTenant?.role === 'admin' || currentTenant?.role === 'owner';
  const isSuperAdmin = user?.username === 'admin';

  const filteredMenuItems = menuItems.filter(item => {
    // Dashboard is always visible
    if (item.url === '/') return true;

    // Inventory, Incoming, Outgoing menus require 'read' permission
    if (item.url === '/inventory') return checkPermission('inventory', 'read');
    if (item.url === '/incoming') return checkPermission('incoming', 'read');
    if (item.url === '/outgoing') return checkPermission('outgoing', 'read');
    if (item.url === '/team-outgoing') return checkPermission('outgoing', 'read');

    // Team Material Usage is always visible for now (or check usage permission)
    if (item.url === '/team-material-usage') return true; // checkPermission('usage', 'read');

    return true;
  });

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Cable className="h-4 w-4" />
          </div>
          <span className="text-lg font-bold">자재관리</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>메뉴</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`nav-${item.url.replace("/", "") || "dashboard"}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>관리</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={location === item.url}>
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          {settingsItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild isActive={location === item.url}>
                <Link href={item.url} data-testid={`nav-${item.url.replace("/", "")}`}>
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
