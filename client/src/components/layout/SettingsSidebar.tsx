import { Link, useLocation } from "wouter";
import {
    Shield,
    Database,
    Settings as SettingsIcon,
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

export function SettingsSidebar() {
    const [location] = useLocation();

    return (
        <Sidebar className="border-r border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/50 backdrop-blur-xl" collapsible="none">
            <SidebarHeader className="h-14 flex items-center px-4 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                    <img src="/logo_wide.png" alt="Logo" className="h-6 object-contain" />
                </div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel className="text-slate-500 font-medium">설정</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild isActive={location === "/settings" || location === "/settings/security"}>
                                    <Link href="/settings">
                                        <Shield className="h-4 w-4" />
                                        <span>보안 설정</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild isActive={location === "/settings/data"}>
                                    <Link href="/settings/data">
                                        <Database className="h-4 w-4" />
                                        <span>데이터 관리</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild isActive={location === "/settings/system"}>
                                    <Link href="/settings/system">
                                        <SettingsIcon className="h-4 w-4" />
                                        <span>시스템 설정</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="border-t border-slate-100 dark:border-zinc-800 p-4">
                <div className="text-xs text-muted-foreground text-center">
                    KJ Erp v{import.meta.env.APP_VERSION}
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}
