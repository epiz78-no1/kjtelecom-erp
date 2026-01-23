import { Link, useLocation } from "wouter";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { User, Settings as SettingsIcon, Users, Network, Award, LogOut, Search, ShoppingBag } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppContext } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";

export function Header() {
    const { user, logout, tenants, currentTenant } = useAppContext();
    const [location] = useLocation();
    const activeTenant = tenants?.find(t => t.id === currentTenant);

    const navItems = [
        { label: "홈", path: "/" },
        { label: "자재현황", path: "/optical-cables" }, // Defaulting to Optical Cables based on context
        { label: "자료실", path: "/archives" },
    ];

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md dark:bg-zinc-950/80 supports-[backdrop-filter]:bg-white/60">
            {/* Top Slim Bar (Optional, mimicking Apple's global nav) */}
            {/* <div className="hidden md:flex h-8 items-center justify-center bg-zinc-900 text-[11px] text-zinc-400 gap-6">
            <span>KJ ERP System</span>
            <span>Support</span>
            <span>Enterprise</span>
        </div> */}

            <div className="flex h-14 items-center px-4 md:px-6 max-w-[1400px] mx-auto w-full justify-between">

                {/* Left: Mobile Menu & Logo */}
                <div className="flex items-center gap-2 md:hidden">
                    <SidebarTrigger />
                    <span className="font-bold text-lg">KJ ERP</span>
                </div>

                {/* Center: Navigation (Desktop) */}
                <nav className="hidden md:flex items-center gap-1">
                    <SidebarTrigger className="mr-2" />
                    <Link href="/">
                        <a className={cn(
                            "px-4 py-2 text-sm font-medium transition-colors rounded-full hover:bg-slate-100",
                            location === "/" ? "text-slate-900 font-semibold" : "text-slate-500"
                        )}>
                            홈
                        </a>
                    </Link>
                    <Link href="/optical-dashboard">
                        <a className={cn(
                            "px-4 py-2 text-sm font-medium transition-colors rounded-full hover:bg-slate-100",
                            location !== "/" && !location.startsWith("/archives") ? "text-slate-900 font-semibold" : "text-slate-500"
                        )}>
                            자재관리
                        </a>
                    </Link>
                    <Link href="/archives">
                        <a className={cn(
                            "px-4 py-2 text-sm font-medium transition-colors rounded-full hover:bg-slate-100",
                            location.startsWith("/archives") ? "text-slate-900 font-semibold" : "text-slate-500"
                        )}>
                            자료실
                        </a>
                    </Link>
                </nav>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-900">
                        <Search className="h-4 w-4" />
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="gap-2 px-2 hover:bg-slate-100 rounded-full">
                                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center border">
                                    <User className="h-4 w-4 text-slate-600" />
                                </div>
                                <span className="hidden md:inline text-sm font-medium text-slate-700">{user?.name}</span>
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
                </div>
            </div>
        </header>
    );
}
