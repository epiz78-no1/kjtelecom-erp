import { Link, useLocation } from "wouter";
import {
    Users,
    Network,
    Award,
    Cable,
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
        <Sidebar>
            <SidebarHeader className="border-b border-sidebar-border h-14 justify-center">
                <div className="flex items-center justify-center w-full px-2">
                    {/* 관리자 페이지용 로고 - 필요시 변경 가능, 현재는 동일하게 유지 */}
                    <img src="/logo.png" alt="(주)광주텔레콤" className="h-8 object-contain" />
                </div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>시스템 관리</SidebarGroupLabel>
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
            </SidebarContent>
            <SidebarFooter className="border-t border-sidebar-border">
                <div className="px-4 py-2 text-xs text-muted-foreground text-center">
                    SCM Admin v{import.meta.env.APP_VERSION}
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}
