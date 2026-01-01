import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Package,
  Users,
  Cable,
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardList,
  Network,
  Award,
  ChevronRight,
  Folder,
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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

export function AppSidebar() {
  const [location] = useLocation();
  const { user, tenants, currentTenant: contextTenantId, checkPermission } = useAppContext();

  // Check if current user is admin/owner of current tenant
  const currentTenantId = contextTenantId || window.localStorage.getItem('currentTenantId') || tenants?.[0]?.id;
  const currentTenant = tenants?.find(t => t.id === currentTenantId);
  const isAdmin = currentTenant?.role === 'admin' || currentTenant?.role === 'owner';

  // 현장팀 여부 확인 logic hoisting
  const currentTenantData = tenants?.find(t => t.id === currentTenantId);
  const isFieldTeam = currentTenantData?.permissions &&
    currentTenantData.permissions.usage === 'write' &&
    currentTenantData.permissions.incoming === 'none' &&
    currentTenantData.permissions.outgoing === 'none' &&
    currentTenantData.permissions.inventory === 'none';

  const filteredMenuItems = menuItems.filter(item => {
    // 현장팀 권한인 경우 "현장팀 자재 사용등록"만 표시
    if (isFieldTeam) {
      return item.url === '/team-material-usage';
    }

    // 관리자는 모든 메뉴 표시
    if (isAdmin) return true;

    // 대시보드는 항상 표시
    if (item.url === '/') return true;

    // 재고, 입고, 출고 메뉴는 'read' 권한 필요
    if (item.url === '/inventory') return checkPermission('inventory', 'read');
    if (item.url === '/incoming') return checkPermission('incoming', 'read');
    if (item.url === '/outgoing') return checkPermission('outgoing', 'read');
    if (item.url === '/team-outgoing') return checkPermission('outgoing', 'read');

    // 현장팀 자재 사용등록은 항상 표시 (또는 usage 권한 체크)
    if (item.url === '/team-material-usage') return true;

    return true;
  });

  // Separate items into groups based on URL
  const generalUrlList = ['/', '/inventory', '/incoming', '/outgoing'];
  const fieldUrlList = ['/team-outgoing', '/team-material-usage'];

  const generalItems = filteredMenuItems.filter(item => generalUrlList.includes(item.url));
  const fieldItems = filteredMenuItems.filter(item => fieldUrlList.includes(item.url));

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
          <SidebarMenu>
            {/* 일반 자재 관리 - 항목이 있을 때만 표시 */}
            {generalItems.length > 0 && (
              <Collapsible defaultOpen className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip="일반 자재 관리">
                      <span>일반 자재 관리</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {generalItems.map((item) => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton asChild isActive={location === item.url}>
                            <Link href={item.url} data-testid={`nav-${item.url.replace("/", "") || "dashboard"}`}>
                              <item.icon className="h-4 w-4" />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            )}

            {/* 광케이블 자재 관리 - 현장팀에게는 숨김 */}
            {!isFieldTeam && (
              <Collapsible className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip="광케이블 자재 관리">
                      <span>광케이블 자재 관리</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton className="pointer-events-none opacity-50">
                          <span>준비 중...</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            )}

            {/* 현장팀별 출고 현황 */}
            {filteredMenuItems.some(item => item.url === '/team-outgoing') && (
              <Collapsible className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip="현장팀별 출고 현황">
                      <span>현장팀별 출고 현황</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={location === '/team-outgoing'}>
                          <Link href="/team-outgoing">
                            <span>일반 자재</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton className="pointer-events-none opacity-50">
                          <span>광케이블</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            )}

            {/* 현장팀 자재 사용등록 */}
            {filteredMenuItems.some(item => item.url === '/team-material-usage') && (
              <Collapsible defaultOpen={isFieldTeam} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip="현장팀 자재 사용등록">
                      <span>현장팀 자재 사용등록</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={location === '/team-material-usage'}>
                          <Link href="/team-material-usage">
                            <span>일반 자재</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton className="pointer-events-none opacity-50">
                          <span>광케이블</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            )}
          </SidebarMenu>
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
        {/* Footer content removed as per request to move settings to header */}
      </SidebarFooter>
    </Sidebar>
  );
}
