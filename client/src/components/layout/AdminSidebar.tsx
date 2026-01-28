import { Link, useLocation } from "wouter";
import {
    Users,
    Network,
    Award,
    Cable,
    ShieldCheck,
    PieChart,
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

const adminItems = [
    { title: "멤버 관리", url: "/admin/members", icon: Users },
    { title: "조직 관리", url: "/admin/org", icon: Network },
    { title: "직급/직책 관리", url: "/admin/positions", icon: Award },
];

export function AdminSidebar() {
    const [location] = useLocation();

    return (
        <Sidebar className="border-r border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/50 backdrop-blur-xl" collapsible="none">
            <SidebarHeader className="h-14 flex items-center px-4 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                    <img src="/logo_wide.png" alt="Logo" className="h-6 object-contain" />
                    <span>Admin</span>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel className="text-slate-500 font-medium">구성원 / 조직도</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild isActive={location.startsWith("/admin/members")}>
                                    <Link href="/admin/members">
                                        <Users className="h-4 w-4" />
                                        <span>멤버</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild isActive={location.startsWith("/admin/org")}>
                                    <Link href="/admin/org">
                                        <Network className="h-4 w-4" />
                                        <span>조직도</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild isActive={location.startsWith("/admin/positions")}>
                                    <Link href="/admin/positions">
                                        <Award className="h-4 w-4" />
                                        <span>직급/직책</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup className="mt-4">
                    <SidebarGroupLabel className="text-slate-500 font-medium">권한 관리</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton className="text-muted-foreground">
                                    <ShieldCheck className="h-4 w-4" />
                                    <span>어드민</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup className="mt-4">
                    <SidebarGroupLabel className="text-slate-500 font-medium">사용량</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild isActive={location.startsWith("/admin/usage")}>
                                    <Link href="/admin/usage">
                                        <PieChart className="h-4 w-4" />
                                        <span>공용 용량</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="border-t border-slate-100 dark:border-zinc-800 p-4">
                <div className="text-xs text-muted-foreground text-center">
                    KJ Erp Admin v{import.meta.env.APP_VERSION}
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}
