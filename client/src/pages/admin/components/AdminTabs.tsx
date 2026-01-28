import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface AdminTab {
    label: string;
    href: string;
}

const adminTabs: AdminTab[] = [
    { label: "멤버", href: "/admin/members" },
    { label: "조직도", href: "/admin/org" },
    { label: "직급/직책", href: "/admin/positions" },
    { label: "권한 관리", href: "/admin/permissions" },
    { label: "서비스 관리", href: "/admin/usage" },
];

export function AdminTabs() {
    const [location] = useLocation();

    return (
        <div className="border-b border-slate-200 mb-6">
            <nav className="flex gap-6">
                {adminTabs.map((tab) => {
                    const isActive = location === tab.href;
                    return (
                        <Link key={tab.href} href={tab.href}>
                            <button
                                className={cn(
                                    "px-1 py-3 text-sm font-medium border-b-2 transition-colors",
                                    isActive
                                        ? "border-slate-900 text-slate-900"
                                        : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                                )}
                            >
                                {tab.label}
                            </button>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
