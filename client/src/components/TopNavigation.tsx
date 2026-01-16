
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Package,
    Cable,
    HardHat,
    Settings,
    LogOut,
    Stamp,
    GitPullRequest,
    Menu,
    User,
    Building2
} from "lucide-react";
import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger,
    navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAppContext } from "@/contexts/AppContext";
import React from "react";

export function TopNavigation() {
    const [location] = useLocation();
    const { user, logout, tenants, currentTenant, setTenant } = useAppContext();
    const activeTenant = tenants.find((t) => t.id === currentTenant);

    // 메뉴 아이템 정의 (한글)
    const mainNavItems = [
        {
            title: "대시보드",
            href: "/",
            icon: LayoutDashboard,
            activePattern: /^\/$/,
        },
        {
            title: "일반 자재",
            icon: Package,
            activePattern: /^\/(inventory|incoming|outgoing|team-outgoing|team-material-usage)$/,
            children: [
                { title: "재고 현황", href: "/inventory", description: "자재 재고 및 입출고 현황" },
                { title: "입고 내역", href: "/incoming", description: "자재 입고 이력 관리" },
                { title: "출고 내역", href: "/outgoing", description: "현장팀 자재 출고 이력" },
                { title: "팀별 자재 현황", href: "/team-outgoing", description: "현장팀 보유 자재 조회" },
                { title: "자재 사용 내역", href: "/team-material-usage", description: "현장 자재 사용 등록 및 조회" },
            ],
        },
        {
            title: "광케이블",
            icon: Cable,
            activePattern: /^\/optical-/,
            children: [
                { title: "광케이블 현황", href: "/optical-cables", description: "드럼별 광케이블 재고 관리" },
                { title: "광케이블 대시보드", href: "/optical-dashboard", description: "광케이블 통계 및 현황 요약" },
                { title: "광케이블 입고", href: "/optical-incoming", description: "광케이블 입고 이력" },
                { title: "광케이블 출고", href: "/optical-outgoing", description: "현장팀 광케이블 출고" },
                { title: "팀별 광케이블", href: "/team-outgoing-optical", description: "현장팀 보유 광케이블" },
                { title: "사용/폐기 내역", href: "/team-material-usage-optical", description: "광케이블 사용 및 폐기 등록" },
            ],
        },
        {
            title: "현장팀",
            icon: HardHat,
            activePattern: /^\/field-/,
            children: [
                // 기존 메뉴와 중복되지만 접근성을 위해 그룹화 (실제 링크는 위와 동일)
                { title: "팀별 자재 현황", href: "/team-outgoing", description: "현장팀 자재 보유 현황" },
                { title: "자재 사용 내역", href: "/team-material-usage", description: "자재 사용 이력" },
                { title: "광케이블 현황", href: "/team-outgoing-optical", description: "광케이블 보유 현황" },
            ],
        },
        {
            title: "관리자",
            icon: Settings,
            activePattern: /^\/admin/,
            children: [
                { title: "멤버 관리", href: "/admin/members", description: "사용자 계정 및 권한 관리" },
                { title: "조직 관리", href: "/admin/org", description: "부서 및 팀 구조 관리" },
                { title: "직급 관리", href: "/admin/positions", description: "직급 체계 설정" },
            ],
        },
        // 향후 추가될 메뉴 (비활성화 상태 또는 준비중 표시)
        {
            title: "결재",
            icon: Stamp,
            href: "#",
            disabled: true,
            description: "준비 중입니다",
        },
        {
            title: "공정",
            icon: GitPullRequest,
            href: "#",
            disabled: true,
            description: "준비 중입니다",
        },
    ];

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-20 items-center px-4">
                {/* 모바일 메뉴 (Sheet) */}
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="mr-2 md:hidden">
                            <Menu className="h-5 w-5" />
                            <span className="sr-only">메뉴 열기</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="pr-0">
                        <Link href="/" className="flex items-center gap-2 font-bold text-xl mb-6">
                            <Building2 className="h-6 w-6 text-primary" />
                            <span>KJ Telecom ERP</span>
                        </Link>
                        <div className="flex flex-col gap-4">
                            {/* 모바일용 메뉴 렌더링 (간소화) */}
                            {mainNavItems.map((item) => (
                                <div key={item.title} className="flex flex-col gap-2">
                                    <Link href={item.href || "#"} className={cn(
                                        "flex items-center gap-2 text-lg font-medium",
                                        (item.href && location === item.href) ? "text-primary" : "text-muted-foreground",
                                        item.disabled && "opacity-50 cursor-not-allowed"
                                    )}>
                                        <item.icon className="h-5 w-5" />
                                        {item.title}
                                    </Link>
                                    {item.children && (
                                        <div className="pl-6 flex flex-col gap-2">
                                            {item.children.map((child) => (
                                                <Link key={child.href} href={child.href} className="text-sm text-muted-foreground hover:text-primary">
                                                    {child.title}
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </SheetContent>
                </Sheet>

                {/* 로고 */}
                <div className="mr-8 hidden md:flex">
                    <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary">
                        <Building2 className="h-8 w-8" />
                        <span>KJ Telecom ERP</span>
                    </Link>
                </div>

                {/* 데스크톱 메인 네비게이션 */}
                <NavigationMenu className="hidden md:flex mx-auto">
                    <NavigationMenuList className="gap-2">
                        {mainNavItems.map((item) => (
                            <NavigationMenuItem key={item.title}>
                                {item.children ? (
                                    <>
                                        <NavigationMenuTrigger className={cn(
                                            "h-16 w-24 flex flex-col gap-1 rounded-md transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                                            item.activePattern && item.activePattern.test(location) && "bg-accent text-accent-foreground text-primary"
                                        )}>
                                            <item.icon className="h-6 w-6 mb-1" />
                                            <span className="text-xs font-medium">{item.title}</span>
                                        </NavigationMenuTrigger>
                                        <NavigationMenuContent>
                                            <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                                                {item.children.map((child) => (
                                                    <li key={child.title}>
                                                        <NavigationMenuLink asChild>
                                                            <Link
                                                                href={child.href}
                                                                className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                                                            >
                                                                <div className="text-sm font-medium leading-none">{child.title}</div>
                                                                <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                                                                    {child.description}
                                                                </p>
                                                            </Link>
                                                        </NavigationMenuLink>
                                                    </li>
                                                ))}
                                            </ul>
                                        </NavigationMenuContent>
                                    </>
                                ) : (
                                    <Link href={item.href || "#"}>
                                        <div className={cn(
                                            "group inline-flex h-16 w-24 flex-col items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50 cursor-pointer",
                                            item.activePattern && item.activePattern.test(location) ? "bg-accent/10 text-primary" : "text-muted-foreground",
                                            item.disabled && "opacity-50 cursor-not-allowed"
                                        )}>
                                            <item.icon className={cn("h-6 w-6 mb-1", item.activePattern?.test(location) && "text-primary")} />
                                            <span className="text-xs">{item.title}</span>
                                        </div>
                                    </Link>
                                )}
                            </NavigationMenuItem>
                        ))}
                    </NavigationMenuList>
                </NavigationMenu>

                {/* 우측 유틸리티 메뉴 (사업부, 프로필) */}
                <div className="ml-auto flex items-center gap-4">
                    {/* 사업부 선택 */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="hidden md:flex gap-2">
                                <Building2 className="h-4 w-4" />
                                <span>{activeTenant?.name || "사업부 선택"}</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>사업부 전환</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {tenants.map((tenant) => (
                                <DropdownMenuItem
                                    key={tenant.id}
                                    onClick={() => setTenant(tenant.id)}
                                    className={currentTenant === tenant.id ? "bg-accent" : ""}
                                >
                                    {tenant.name}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* 프로필 및 설정 */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-full">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                    {user?.name?.[0] || <User className="h-4 w-4" />}
                                </div>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">{user?.name}</p>
                                    <p className="text-xs leading-none text-muted-foreground">{user?.username}</p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link href="/settings" className="w-full cursor-pointer flex items-center">
                                    <Settings className="mr-2 h-4 w-4" />
                                    <span>설정</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => logout()} className="cursor-pointer text-red-600 focus:text-red-600">
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
