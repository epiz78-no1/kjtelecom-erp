import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Package, TrendingUp, AlertCircle, CheckCircle, ChevronDown, ChevronRight, CornerDownRight } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useAppContext } from "@/contexts/AppContext";
import { FieldTeamCard } from "@/components/common/FieldTeamCard";
import { DemolitionMaterial } from "@/types/demolition";

export default function DemolitionDashboard() {
    const { divisions, teams } = useAppContext();

    // 1. Dashboard Stats (Existing - Reused)
    const { data: dashboardData } = useQuery<any>({
        queryKey: ["/api/demolition-dashboard"],
    });

    const stats = dashboardData?.stats || {};

    // 2. All Materials for Category Stats
    const { data: materials = [] } = useQuery<DemolitionMaterial[]>({
        queryKey: ["/api/demolition-materials"],
    });

    // 3. Logs for Field Team Stock
    const { data: logs = [] } = useQuery<any[]>({
        queryKey: ["/api/demolition-logs"],
        select: (data) => data.filter((log: any) => ['outgoing', 'usage', 'return', 'dispose'].includes(log.logType)),
    });

    const [expandedDivisions, setExpandedDivisions] = useState<Record<string, boolean>>({});

    const toggleDivision = (divisionName: string) => {
        setExpandedDivisions(prev => ({
            ...prev,
            [divisionName]: !prev[divisionName]
        }));
    };

    // --- Logic 1: Field Team Stock Aggregation (Same as TeamOutgoingDemolition.tsx) ---
    const stockMap = new Map<string, any>();

    logs.forEach((log: any) => {
        const d = (log.material?.division || "SKT").trim();
        const t = (log.team?.name || "미지정").trim();
        const p = (log.material?.productName || "").trim();
        const s = (log.material?.specification || "").trim();

        if (!p) return;

        const key = `${d}|${t}|${p}|${s}`;
        if (!stockMap.has(key)) {
            stockMap.set(key, {
                id: key,
                division: d,
                teamCategory: t,
                productName: p,
                specification: s,
                quantity: 0
            });
        }

        const qty = log.usedQuantity || 0;
        if (log.logType === 'outgoing') {
            stockMap.get(key).quantity += qty;
        } else if (['usage', 'return', 'dispose'].includes(log.logType)) {
            stockMap.get(key).quantity -= qty;
        }
    });

    const allStockItems = Array.from(stockMap.values()).filter(item => item.quantity > 0);

    // --- Logic 2: Division Stats Aggregation ---
    interface ProductStat {
        productName: string;
        count: number;
        originalQuantity: number;
        remainingQuantity: number;
    }

    interface DivisionStat {
        name: string;
        count: number;
        originalQuantity: number;
        remainingQuantity: number;
        products: Record<string, ProductStat>;
    }

    const divisionStats = materials.reduce((acc, item) => {
        const divisionName = item.division || "기타";
        const productName = item.productName || "미지정";

        if (!acc[divisionName]) {
            acc[divisionName] = {
                name: divisionName,
                count: 0,
                originalQuantity: 0,
                remainingQuantity: 0,
                products: {}
            };
        }

        acc[divisionName].originalQuantity += item.originalQuantity || 0;
        acc[divisionName].remainingQuantity += item.remainingQuantity || 0;

        // Product Details
        if (!acc[divisionName].products[productName]) {
            acc[divisionName].products[productName] = {
                productName,
                count: 0,
                originalQuantity: 0,
                remainingQuantity: 0
            };
        }

        acc[divisionName].products[productName].count += 1;
        acc[divisionName].products[productName].originalQuantity += item.originalQuantity || 0;
        acc[divisionName].products[productName].remainingQuantity += item.remainingQuantity || 0;

        acc[divisionName].count += 1;

        return acc;
    }, {} as Record<string, DivisionStat>);

    const divisionList = Object.values(divisionStats)
        .sort((a, b) => b.remainingQuantity - a.remainingQuantity);

    const totalMaterialsCheck = materials.reduce((sum, item) => sum + (item.remainingQuantity || 0), 0);

    // Filter teams that have relevant data or are active
    // Aligning with Dashboard.tsx style, showing active teams primarily
    const activeTeams = teams.filter(t => t.isActive).sort((a, b) => (b.lastActivity || "").localeCompare(a.lastActivity || ""));


    return (
        <div className="flex flex-col gap-4 h-full overflow-y-auto p-2 bg-slate-50/50 dark:bg-zinc-950/50 custom-scrollbar">
            {/* Ultra Compact Header Section */}
            <div className="flex flex-col gap-1 mb-1 px-1 pt-1">
                <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Live Dashboard</span>
                </div>
                <div className="flex items-end gap-2">
                    <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-none">
                        철거자재 관리
                    </h1>
                    <p className="text-xs text-slate-500 font-medium pb-0.5">
                        철거자재 현황을 한눈에 확인하세요
                    </p>
                </div>
            </div>

            {/* Bento Grid Layout - Stats */}
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <div className="relative overflow-hidden rounded-2xl bg-white p-4 shadow-sm border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 group hover:shadow-md transition-all duration-300">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Package className="h-24 w-24 text-indigo-600 transform rotate-12" />
                    </div>
                    <div className="relative z-10 flex flex-col justify-between h-full">
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">총 입고량</p>
                            <h3 className="text-3xl font-bold mt-2 text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                                {stats.total?.toLocaleString() || 0}
                            </h3>
                        </div>
                        <div className="mt-4 flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 w-fit px-2 py-1 rounded-full">
                            전체 철거자재 수
                        </div>
                    </div>
                </div>

                <div className="relative overflow-hidden rounded-2xl bg-white p-4 shadow-sm border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 group hover:shadow-md transition-all duration-300">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <AlertCircle className="h-24 w-24 text-amber-500 transform -rotate-12" />
                    </div>
                    <div className="relative z-10 flex flex-col justify-between h-full">
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">검토 대기</p>
                            <h3 className="text-3xl font-bold mt-2 text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors">
                                {stats.pendingReview?.toLocaleString() || 0}
                            </h3>
                        </div>
                        <div className="mt-4 flex items-center text-xs font-medium text-amber-600 bg-amber-50 w-fit px-2 py-1 rounded-full">
                            관리자 검토 필요
                        </div>
                    </div>
                </div>

                <div className="relative overflow-hidden rounded-2xl bg-white p-4 shadow-sm border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 group hover:shadow-md transition-all duration-300">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <CheckCircle className="h-24 w-24 text-emerald-600 transform rotate-6" />
                    </div>
                    <div className="relative z-10 flex flex-col justify-between h-full">
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">재사용 가능</p>
                            <h3 className="text-3xl font-bold mt-2 text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                                {stats.approvedReusable?.toLocaleString() || 0}
                            </h3>
                        </div>
                        <div className="mt-4 flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 w-fit px-2 py-1 rounded-full">
                            재사용 승인된 자재
                        </div>
                    </div>
                </div>

                <div className="relative overflow-hidden rounded-2xl bg-white p-4 shadow-sm border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 group hover:shadow-md transition-all duration-300">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingUp className="h-24 w-24 text-blue-500 transform -rotate-6" />
                    </div>
                    <div className="relative z-10 flex flex-col justify-between h-full">
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">재사용됨</p>
                            <h3 className="text-3xl font-bold mt-2 text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors">
                                {stats.inUse?.toLocaleString() || 0}
                            </h3>
                        </div>
                        <div className="mt-4 flex items-center text-xs font-medium text-blue-600 bg-blue-50 w-fit px-2 py-1 rounded-full">
                            사용 완료 자재
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-8 items-start">
                {/* Left: Category Status Table */}
                <Card className="lg:col-span-2 border-slate-200 shadow-sm rounded-3xl overflow-hidden bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 border-b border-slate-100 dark:border-zinc-800">
                        <div>
                            <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">항목별 재고 현황</CardTitle>
                            <CardDescription>사업 구분별 상세 재고 내역입니다</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b border-slate-100">
                                        <TableHead className="w-[180px] pl-6 py-4 text-xs font-semibold uppercase text-slate-500">사업</TableHead>
                                        <TableHead className="py-4 text-center text-xs font-semibold uppercase text-slate-500">품목</TableHead>
                                        <TableHead className="py-4 text-right text-xs font-semibold uppercase text-slate-500">철거</TableHead>
                                        <TableHead className="py-4 pr-6 text-right text-xs font-semibold uppercase text-slate-500">잔량</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {divisionList.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                                                        <Package className="h-5 w-5 text-slate-400 opacity-50" />
                                                    </div>
                                                    <span className="text-xs">재고 데이터가 없습니다</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        divisionList.map((div) => {
                                            const isExpanded = expandedDivisions[div.name];
                                            const productList = Object.values(div.products).sort((a, b) => b.remainingQuantity - a.remainingQuantity);

                                            return (
                                                <>
                                                    <TableRow
                                                        key={div.name}
                                                        className="cursor-pointer border-b border-slate-50 dark:border-zinc-800/50 hover:bg-slate-50/50 transition-colors"
                                                        onClick={() => toggleDivision(div.name)}
                                                    >
                                                        <TableCell className="pl-6 py-4 font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                                            {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                                                            {div.name}
                                                        </TableCell>
                                                        <TableCell className="text-center py-4 text-slate-600">
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                                                {productList.length}종
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-right py-4 font-bold text-slate-700">
                                                            {div.originalQuantity.toLocaleString()}
                                                        </TableCell>
                                                        <TableCell className="text-right py-4 pr-6 font-bold text-slate-900">
                                                            {div.remainingQuantity.toLocaleString()}
                                                        </TableCell>
                                                    </TableRow>

                                                    {isExpanded && productList.map((prod) => (
                                                        <TableRow key={`${div.name}-${prod.productName}`} className="bg-slate-50/30 dark:bg-zinc-900/30 hover:bg-slate-50/80 border-b border-slate-50 animate-in fade-in slide-in-from-top-1 duration-200">
                                                            <TableCell className="py-3">
                                                                {/* Empty for indentation */}
                                                            </TableCell>
                                                            <TableCell className="text-left pl-6 py-3">
                                                                <div className="flex items-center relative">
                                                                    <CornerDownRight className="mr-2 h-3 w-3 text-slate-300" />
                                                                    <span className="font-medium text-sm text-slate-700">{prod.productName}</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right py-3 text-slate-600 font-medium text-sm">
                                                                {prod.originalQuantity.toLocaleString()}
                                                            </TableCell>
                                                            <TableCell className="pr-6 text-right py-3 text-slate-500 text-sm font-mono">
                                                                {prod.remainingQuantity.toLocaleString()}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                {/* Field Team Section (Purple) */}
                <Card className="border-0 shadow-lg shadow-indigo-200/50 dark:shadow-indigo-900/20 rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-600 text-white overflow-hidden">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-indigo-100" />
                            현장팀 현황
                        </CardTitle>
                        <CardDescription className="text-indigo-100/80">철거자재를 보유 중인 팀 목록입니다.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                        <div className="space-y-3">
                            {activeTeams.map((team) => {
                                // Simple aggregation for team stock from allStockItems
                                const teamStockCount = allStockItems
                                    .filter(item => item.teamCategory === team.name)
                                    .reduce((sum, item) => sum + item.quantity, 0);

                                return (
                                    <div
                                        key={team.id}
                                        className="group relative flex items-center justify-between p-4 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all border border-white/10 hover:border-white/30 cursor-default"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div>
                                                <h4 className="font-bold text-sm tracking-wide text-white">{team.name}</h4>
                                                <p className="text-xs text-indigo-100 flex items-center gap-1 mt-0.5">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300"></span>
                                                    {divisions?.find(d => d.id === team.divisionId)?.name || "-"}
                                                </p>
                                                {team.lastActivity && (
                                                    <p className="text-[10px] text-indigo-200/70 mt-1">
                                                        최근활동: {new Date(team.lastActivity).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '')}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xl font-bold font-mono text-white">{teamStockCount.toLocaleString()}</div>
                                            <div className="text-[10px] text-indigo-200 uppercase tracking-widest font-semibold">Items</div>
                                        </div>
                                    </div>
                                );
                            })}
                            {activeTeams.length === 0 && (
                                <div className="text-center py-12 text-indigo-200/70">
                                    등록된 현장팀이 없습니다
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
