
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
    Building2,
    ChevronDown
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
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

    const breadcrumbs = React.useMemo(() => {
        for (const item of mainNavItems) {
            if (item.activePattern?.test(location)) {
                if (item.children) {
                    const child = item.children.find(c => c.href === location);
                    if (child) return { parent: item.title, current: child.title };
                }
                return { parent: item.title, current: item.title };
            }
        }
        return null;
    }, [location, mainNavItems]);

    return (
        <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/60">
            <div className="container flex h-12 items-center px-3">
                {/* 모바일 메뉴 (Sheet) */}
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="mr-2 md:hidden h-8 w-8">
                            <Menu className="h-4 w-4" />
                            <span className="sr-only">메뉴 열기</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="pr-0">
                        <Link href="/" className="flex items-center gap-2 font-bold text-lg mb-6">
                            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary text-primary-foreground">
                                <Building2 className="h-5 w-5" />
                            </div>
                            <span>KJ Telecom ERP</span>
                        </Link>
                        <div className="flex flex-col gap-4">
                            {/* 모바일용 메뉴 렌더링 (간소화) */}
                            {mainNavItems.map((item) => (
                                <div key={item.title} className="flex flex-col gap-2">
                                    <Link href={item.href || "#"} className={cn(
                                        "flex items-center gap-2 text-base font-medium",
                                        (item.href && location === item.href) ? "text-primary" : "text-muted-foreground",
                                        item.disabled && "opacity-50 cursor-not-allowed"
                                    )}>
                                        <item.icon className="h-4 w-4" />
                                        {item.title}
                                    </Link>
                                    {item.children && (
                                        <div className="pl-6 flex flex-col gap-2">
                                            {item.children.map((child) => (
                                                <Link key={child.href} href={child.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
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

                {/* 로고 & Breadcrumb */}
                <div className="mr-6 hidden md:flex items-center gap-4">
                    <Link href="/" className="flex items-center gap-2 font-bold text-base text-slate-800 dark:text-slate-100">
                        <Building2 className="h-4 w-4 text-primary" />
                        <span>KJ Telecom</span>
                    </Link>
                    {breadcrumbs && (
                        <>
                            <div className="h-3 w-px bg-slate-200 dark:bg-slate-700"></div>
                            <Breadcrumb>
                                <BreadcrumbList>
                                    <BreadcrumbItem>
                                        <BreadcrumbLink className="text-xs font-medium text-slate-500">{breadcrumbs.parent}</BreadcrumbLink>
                                    </BreadcrumbItem>
                                    <BreadcrumbSeparator />
                                    <BreadcrumbItem>
                                        <BreadcrumbPage className="text-xs font-bold text-primary">{breadcrumbs.current}</BreadcrumbPage>
                                    </BreadcrumbItem>
                                </BreadcrumbList>
                            </Breadcrumb>
                        </>
                    )}
                </div>

                {/* 데스크톱 메인 네비게이션 */}
                <NavigationMenu className="hidden md:flex mx-auto">
                    <NavigationMenuList className="gap-1">
                        {mainNavItems.map((item) => (
                            <NavigationMenuItem key={item.title}>
                                {item.children ? (
                                    <>
                                        <NavigationMenuTrigger className={cn(
                                            "h-8 px-2 bg-transparent hover:bg-slate-100 dark:hover:bg-zinc-800 data-[state=open]:bg-slate-100 dark:data-[state=open]:bg-zinc-800",
                                            item.activePattern && item.activePattern.test(location) && "text-primary font-medium"
                                        )}>
                                            <div className="flex items-center gap-1.5">
                                                <item.icon className="h-3.5 w-3.5 opacity-70" />
                                                <span className="text-xs">{item.title}</span>
                                            </div>
                                        </NavigationMenuTrigger>
                                        <NavigationMenuContent>
                                            <ul className="grid w-[400px] gap-2 p-3 md:w-[500px] md:grid-cols-2 lg:w-[600px] bg-white dark:bg-zinc-950">
                                                {item.children.map((child) => (
                                                    <li key={child.title}>
                                                        <NavigationMenuLink asChild>
                                                            <Link
                                                                href={child.href}
                                                                className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-slate-50 hover:text-primary focus:bg-slate-50 focus:text-primary dark:hover:bg-zinc-900"
                                                            >
                                                                <div className="text-sm font-medium leading-none flex items-center gap-2">
                                                                    {child.title}
                                                                    {location === child.href && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                                                                </div>
                                                                <p className="line-clamp-1 text-xs leading-snug text-muted-foreground mt-1.5">
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
                                            "group inline-flex h-8 items-center justify-center rounded-md px-2 py-1.5 text-xs font-medium transition-colors hover:bg-slate-100 dark:hover:bg-zinc-800 focus:bg-slate-100 focus:text-primary focus:outline-none disabled:pointer-events-none disabled:opacity-50 cursor-pointer gap-1.5",
                                            item.activePattern && item.activePattern.test(location) ? "text-primary bg-slate-50 dark:bg-zinc-900" : "text-slate-600 dark:text-slate-400",
                                            item.disabled && "opacity-50 cursor-not-allowed"
                                        )}>
                                            <item.icon className="h-3.5 w-3.5 opacity-70" />
                                            <span>{item.title}</span>
                                        </div>
                                    </Link>
                                )}
                            </NavigationMenuItem>
                        ))}
                    </NavigationMenuList>
                </NavigationMenu>

                {/* 우측 유틸리티 메뉴 (사업부, 프로필) */}
                <div className="ml-auto flex items-center gap-2">
                    {/* 사업부 선택 */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="hidden md:flex gap-1.5 h-7 px-2 pl-1.5 text-[11px] border-slate-200 dark:border-zinc-800 shadow-sm bg-white/50 backdrop-blur">
                                <div className="h-3.5 w-3.5 rounded-full bg-slate-100 flex items-center justify-center">
                                    <Building2 className="h-2 w-2 text-slate-500" />
                                </div>
                                <span className="font-medium text-slate-600 dark:text-slate-300 max-w-[100px] truncate">
                                    {activeTenant?.name || "사업부 선택"}
                                </span>
                                <ChevronDown className="h-2.5 w-2.5 text-slate-400" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel className="text-xs text-muted-foreground">사업부 전환</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {tenants.map((tenant) => (
                                <DropdownMenuItem
                                    key={tenant.id}
                                    onClick={() => setTenant(tenant.id)}
                                    className={cn("text-xs cursor-pointer", currentTenant === tenant.id ? "bg-slate-50 text-primary font-medium" : "")}
                                >
                                    {tenant.name}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="h-4 w-px bg-slate-200 dark:bg-zinc-800 mx-1 hidden md:block" />

                    {/* 프로필 (Avatar Only) */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative h-7 w-7 rounded-full">
                                <Avatar className="h-7 w-7 border border-slate-200 shadow-sm">
                                    {/* <AvatarImage src={user?.avatarUrl} alt={user?.username} /> */}
                                    <AvatarFallback className="text-[10px] font-bold bg-indigo-50 text-indigo-600">
                                        {user?.username?.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56" forceMount>
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">{user?.username}</p>
                                    {/* <p className="text-xs leading-none text-muted-foreground">{user?.email}</p> */}
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link href="/settings" className="w-full cursor-pointer flex items-center py-2">
                                    <Settings className="mr-2 h-4 w-4 text-slate-500" />
                                    <span>설정</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
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
