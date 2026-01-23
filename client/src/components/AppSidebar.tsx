import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  Users,
  Network,
  Award,
  ChevronRight,
  ClipboardList,
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
import { FEATURE_FLAGS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const menuItems = [
  { title: "대시보드", url: "/general-dashboard", icon: LayoutDashboard },
  { title: "자재현황", url: "/inventory", icon: Package },
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
  const { tenants, currentTenant: contextTenantId, checkPermission } = useAppContext();

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
    // 현장팀 권한인 경우 "현장팀별 출고 현황"과 "현장팀 자재 사용등록" 표시
    if (isFieldTeam) {
      return item.url === '/team-material-usage' || item.url === '/team-outgoing';
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
  const generalUrlList = ['/general-dashboard', '/inventory', '/incoming', '/outgoing'];
  const fieldUrlList = ['/team-outgoing', '/team-material-usage'];

  const generalItems = filteredMenuItems.filter(item => generalUrlList.includes(item.url));

  return (
    <Sidebar className="border-r border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/50 backdrop-blur-xl">
      <SidebarHeader className="h-12 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-center px-4">
        <div className="flex items-center justify-start w-full">
          {/* 로고 영역 컴팩트하게 조정 */}
          <div className="flex items-center justify-center h-8 w-full">
            <img src="/logo_wide.png" alt="KJ ERP Logo" className="h-full w-auto object-contain" />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-2">
        {/* =========================================================================
            SECTION: HOME
            Only shown when on "/"
           ========================================================================= */}
        {location === '/' && (
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={true} className="h-9 font-medium">
                  <Link href="/">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>홈 대시보드</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}

        {/* =========================================================================
            SECTION: ARCHIVES
            Only shown when on "/archives" or sub-paths
           ========================================================================= */}
        {location.startsWith('/archives') && (
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={true} className="h-9 font-medium">
                  <Link href="/archives">
                    <Package className="h-4 w-4" />
                    <span>자료실 홈</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}

        {/* =========================================================================
            SECTION: MATERIAL MANAGEMENT (DEFAULT)
            Shown for everything else (Optical, General, Team, Demolition, Admin)
           ========================================================================= */}
        {location !== '/' && !location.startsWith('/archives') && (
          <>
            <SidebarGroup>
              <SidebarMenu>
                {/* 광케이블 자재 관리 - 권한 확인 */}
                {FEATURE_FLAGS.ENABLE_OPTICAL && (
                  <Collapsible className="group/collapsible" defaultOpen={location.startsWith('/optical')}>
                    {(checkPermission('inventory', 'read') || checkPermission('incoming', 'read') || checkPermission('outgoing', 'read')) && (
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton tooltip="광케이블 자재 관리" className="h-9 hover:bg-white hover:shadow-sm transition-all hover:text-primary active:bg-slate-50">
                            <span className="font-medium text-sm">광케이블 자재 관리</span>
                            <ChevronRight className="ml-auto h-4 w-4 text-slate-400 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub className="mr-0 pr-0 border-l-slate-200 ml-3.5">
                            {/* Dashboard - Visible if any read access */}
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton asChild isActive={location === "/optical-dashboard"} className="h-8 text-xs">
                                <Link href="/optical-dashboard">
                                  <span>대시보드</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>

                            {/* Inventory */}
                            {checkPermission('inventory', 'read') && (
                              <SidebarMenuSubItem>
                                <SidebarMenuSubButton asChild isActive={location === "/optical-cables"} className="h-8 text-xs">
                                  <Link href="/optical-cables">
                                    <span>자재현황</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            )}

                            {/* Incoming */}
                            {checkPermission('incoming', 'read') && (
                              <SidebarMenuSubItem>
                                <SidebarMenuSubButton asChild isActive={location === "/optical-incoming"} className="h-8 text-xs">
                                  <Link href="/optical-incoming">
                                    <span>입고 내역</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            )}

                            {/* Outgoing */}
                            {checkPermission('outgoing', 'read') && (
                              <SidebarMenuSubItem>
                                <SidebarMenuSubButton asChild isActive={location === "/optical-outgoing"} className="h-8 text-xs">
                                  <Link href="/optical-outgoing">
                                    <span>출고 내역</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            )}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    )}
                  </Collapsible>
                )}

                {/* 일반 자재 관리 - 항목이 있을 때만 표시 */}
                {generalItems.length > 0 && (
                  <Collapsible className="group/collapsible" defaultOpen={generalItems.some(item => location === item.url)}>
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip="일반 자재 관리" className="h-9 hover:bg-white hover:shadow-sm transition-all hover:text-primary active:bg-slate-50">
                          <span className="font-medium text-sm">일반 자재 관리</span>
                          <ChevronRight className="ml-auto h-4 w-4 text-slate-400 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub className="mr-0 pr-0 border-l-slate-200 ml-3.5">
                          {generalItems.map((item) => (
                            <SidebarMenuSubItem key={item.title}>
                              <SidebarMenuSubButton asChild isActive={location === item.url} className="h-8 text-xs">
                                <Link href={item.url} data-testid={`nav - ${item.url.replace("/", "") || "dashboard"} `}>
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

                {/* 철거자재 관리 - 관리자 및 현장팀 */}
                {!isFieldTeam && (
                  <Collapsible className="group/collapsible" defaultOpen={location.startsWith('/demolition')}>
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip="철거자재 관리" className="h-9 hover:bg-white hover:shadow-sm transition-all hover:text-primary active:bg-slate-50">
                          <span className="font-medium text-sm">철거자재 관리</span>
                          <ChevronRight className="ml-auto h-4 w-4 text-slate-400 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub className="mr-0 pr-0 border-l-slate-200 ml-3.5">
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton asChild isActive={location === "/demolition-dashboard"} className="h-8 text-xs">
                              <Link href="/demolition-dashboard">
                                <span>대시보드</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton asChild isActive={location === "/demolition-materials"} className="h-8 text-xs">
                              <Link href="/demolition-materials">
                                <span>자재현황</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton asChild isActive={location === "/demolition-incoming"} className="h-8 text-xs">
                              <Link href="/demolition-incoming">
                                <span>입고 내역</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton asChild isActive={location === "/demolition-outgoing"} className="h-8 text-xs">
                              <Link href="/demolition-outgoing">
                                <span>출고 내역</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                )}

                {/* 현장팀별 출고 현황 */}
                {filteredMenuItems.some(item => item.url === '/team-outgoing') && (
                  <Collapsible className="group/collapsible" defaultOpen={location.startsWith('/team-outgoing')}>
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip="현장팀별 출고 현황" className="h-9 hover:bg-white hover:shadow-sm transition-all hover:text-primary active:bg-slate-50">
                          <span className="font-medium text-sm">현장팀별 출고 현황</span>
                          <ChevronRight className="ml-auto h-4 w-4 text-slate-400 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub className="mr-0 pr-0 border-l-slate-200 ml-3.5">
                          {FEATURE_FLAGS.ENABLE_OPTICAL && (
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton asChild isActive={location === '/team-outgoing-optical'} className="h-8 text-xs">
                                <Link href="/team-outgoing-optical">
                                  <span>광케이블</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          )}
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton asChild isActive={location === '/team-outgoing'} className="h-8 text-xs">
                              <Link href="/team-outgoing">
                                <span>일반 자재</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton asChild isActive={location === '/team-outgoing-demolition'} className="h-8 text-xs">
                              <Link href="/team-outgoing-demolition">
                                <span>철거자재</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                )}

                {/* 현장팀 자재 사용등록 */}
                {filteredMenuItems.some(item => item.url === '/team-material-usage') && (
                  <Collapsible defaultOpen={isFieldTeam || location.startsWith('/team-material-usage')} className="group/collapsible">
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip="현장팀 자재 사용등록" className="h-9 hover:bg-white hover:shadow-sm transition-all hover:text-primary active:bg-slate-50">
                          <span className="font-medium text-sm">현장팀 자재 사용등록</span>
                          <ChevronRight className="ml-auto h-4 w-4 text-slate-400 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub className="mr-0 pr-0 border-l-slate-200 ml-3.5">
                          {FEATURE_FLAGS.ENABLE_OPTICAL && (
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton asChild isActive={location === '/team-material-usage-optical'} className="h-8 text-xs">
                                <Link href="/team-material-usage-optical">
                                  <span>광케이블</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          )}
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton asChild isActive={location === '/team-material-usage'} className="h-8 text-xs">
                              <Link href="/team-material-usage">
                                <span>일반 자재</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton asChild isActive={location === '/team-material-usage-demolition'} className="h-8 text-xs">
                              <Link href="/team-material-usage-demolition">
                                <span>철거자재</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                )}
              </SidebarMenu>
            </SidebarGroup>


            {/* Admin Menu - Only shown on admin pages */}
            {isAdmin && location.startsWith('/admin') && (
              <SidebarGroup className="mt-4 border-t border-slate-100 pt-4">
                <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1 mb-1">Administration</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {adminItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild isActive={location === item.url} className="h-9 text-xs">
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
          </>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-slate-100 dark:border-zinc-800 p-2">
        <div className="rounded-lg bg-slate-50 dark:bg-zinc-800 p-2 text-[10px] text-muted-foreground text-center border border-slate-100 dark:border-zinc-700">
          v{import.meta.env.APP_VERSION} (DB Type Safe)
        </div>
      </SidebarFooter>
    </Sidebar >
  );
}
