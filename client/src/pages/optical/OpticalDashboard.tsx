import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Cable, Cuboid, ChevronDown, ChevronRight, ShoppingCart, Users, CornerDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAppContext } from "@/contexts/AppContext";
import type { FieldTeam } from "@/components/FieldTeamCard";
import type { OpticalCable, OpticalCableLog } from "@shared/schema";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export default function OpticalDashboard() {
    const { teams, divisions } = useAppContext();
    const [expandedDivisions, setExpandedDivisions] = useState<Record<string, boolean>>({});
    const [filterCategory, setFilterCategory] = useState<string>("구매");

    const toggleDivision = (divisionName: string) => {
        setExpandedDivisions(prev => ({
            ...prev,
            [divisionName]: !prev[divisionName]
        }));
    };

    const { data: cables = [], isLoading: isLoadingCables } = useQuery<(OpticalCable & { logs: OpticalCableLog[] })[]>({
        queryKey: ["/api/optical-cables"],
    });

    const { data: logs = [], isLoading: isLoadingLogs } = useQuery<(OpticalCableLog & { cable: OpticalCable | null })[]>({
        queryKey: ["/api/optical-cables/logs"],
    });

    if (isLoadingCables || isLoadingLogs) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary/80" />
                    <p className="text-muted-foreground animate-pulse font-medium">데이터를 불러오는 중...</p>
                </div>
            </div>
        );
    }

    // Calculate Stats
    const totalLength = cables.reduce((sum, c) => sum + c.remainingLength, 0);
    const totalDrums = cables.filter(c => c.status !== 'waste' && c.remainingLength > 0).length;
    const totalAmount = cables.filter(c => c.status !== 'waste').reduce((sum, c) => sum + (c.totalAmount || 0), 0);
    const activeTeamCount = teams.filter(t => t.isActive).length;

    interface ProductStat {
        productName: string;
        count: number;
        length: number;
        amount: number;
    }

    interface DivisionStat {
        name: string;
        count: number;
        length: number;
        amount: number;
        products: Record<string, ProductStat>; // Key: productName
    }

    // 1. Aggregation by Division -> Product Name
    const statsByDivision = cables.reduce((acc, cable) => {
        if (cable.status === 'waste') return acc;
        // Filter by selected category
        if (cable.category !== filterCategory) return acc;

        const divisionName = cable.division || "-";
        const productName = cable.productName || "미지정";

        if (!acc[divisionName]) {
            acc[divisionName] = {
                name: divisionName,
                count: 0,
                length: 0,
                amount: 0,
                products: {}
            };
        }

        // Division Totals
        acc[divisionName].count += 1;
        acc[divisionName].length += cable.remainingLength;
        acc[divisionName].amount += (cable.totalAmount || 0);

        // Product Details
        if (!acc[divisionName].products[productName]) {
            acc[divisionName].products[productName] = {
                productName,
                count: 0,
                length: 0,
                amount: 0
            };
        }

        acc[divisionName].products[productName].count += 1;
        acc[divisionName].products[productName].length += cable.remainingLength;
        acc[divisionName].products[productName].amount += (cable.totalAmount || 0);

        return acc;
    }, {} as Record<string, DivisionStat>);

    const divisionList = Object.values(statsByDivision)
        .sort((a, b) => b.length - a.length); // Sort divisions by total length descending


    // 2. Field Team Status
    const fieldTeams = teams.map(team => {
        const divisionName = divisions.find(d => d.id === team.divisionId)?.name || "-";
        const assignedCables = cables.filter(c => c.status === 'assigned' && c.currentTeamId === team.id);
        const materialCount = assignedCables.length;

        return {
            ...team,
            divisionName,
            materialCount,
        } as FieldTeam;
    }).sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        return a.name.localeCompare(b.name);
    });

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
                        광케이블 관리
                    </h1>
                    <p className="text-xs text-slate-500 font-medium pb-0.5">
                        실시간 자재 보유량과 현장팀 운영 현황
                    </p>
                </div>
            </div>

            {/* Bento Grid Layout - Stats */}
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <div className="relative overflow-hidden rounded-2xl bg-white p-4 shadow-sm border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 group hover:shadow-md transition-all duration-300">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Cuboid className="h-24 w-24 text-blue-600 transform rotate-12" />
                    </div>
                    <div className="relative z-10 flex flex-col justify-between h-full">
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">보유 케이블</p>
                            <h3 className="text-3xl font-bold mt-2 text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                                {totalDrums}
                                <span className="text-lg text-slate-400 font-normal ml-1">DRM</span>
                            </h3>
                        </div>
                        <div className="mt-4 flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 w-fit px-2 py-1 rounded-full">
                            <ArrowUpRight className="h-3 w-3 mr-1" />
                            가용 상태 (폐기 제외)
                        </div>
                    </div>
                </div>

                <div className="relative overflow-hidden rounded-2xl bg-white p-4 shadow-sm border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 group hover:shadow-md transition-all duration-300">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Cable className="h-24 w-24 text-violet-600 transform -rotate-12" />
                    </div>
                    <div className="relative z-10 flex flex-col justify-between h-full">
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">총 잔여 길이</p>
                            <h3 className="text-3xl font-bold mt-2 text-slate-900 dark:text-white group-hover:text-violet-600 transition-colors">
                                {(totalLength / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                                <span className="text-lg text-slate-400 font-normal ml-1">km</span>
                            </h3>
                        </div>
                        <div className="mt-4 flex items-center text-xs font-medium text-slate-500 bg-slate-100 w-fit px-2 py-1 rounded-full">
                            {totalLength.toLocaleString()}m 보유중
                        </div>
                    </div>
                </div>

                <div className="relative overflow-hidden rounded-2xl bg-white p-4 shadow-sm border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 group hover:shadow-md transition-all duration-300">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <ShoppingCart className="h-24 w-24 text-emerald-600 transform rotate-6" />
                    </div>
                    <div className="relative z-10 flex flex-col justify-between h-full">
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">총 재고 금액</p>
                            <h3 className="text-3xl font-bold mt-2 text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                                {(totalAmount / 1000000).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                                <span className="text-lg text-slate-400 font-normal ml-1">백만원</span>
                            </h3>
                        </div>
                        <div className="mt-4 flex items-center text-xs font-medium text-slate-500 bg-slate-100 w-fit px-2 py-1 rounded-full">
                            ₩{totalAmount.toLocaleString()}
                        </div>
                    </div>
                </div>

                <div className="relative overflow-hidden rounded-2xl bg-white p-4 shadow-sm border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 group hover:shadow-md transition-all duration-300">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Users className="h-24 w-24 text-amber-500 transform -rotate-6" />
                    </div>
                    <div className="relative z-10 flex flex-col justify-between h-full">
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">활성 현장팀</p>
                            <h3 className="text-3xl font-bold mt-2 text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors">
                                {activeTeamCount}
                                <span className="text-lg text-slate-400 font-normal ml-1">Teams</span>
                            </h3>
                        </div>
                        <div className="mt-4 flex items-center text-xs font-medium text-amber-600 bg-amber-50 w-fit px-2 py-1 rounded-full">
                            전체 {teams.length}개 팀 중
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-8">
                {/* Inventory Table Section */}
                <Card className="lg:col-span-2 border-slate-200 shadow-sm rounded-3xl overflow-hidden bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 border-b border-slate-100 dark:border-zinc-800">
                        <div>
                            <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">항목별 재고 현황</CardTitle>
                            <CardDescription>사업 구분별 상세 재고 내역입니다.</CardDescription>
                        </div>
                        <div className="w-[120px]">
                            <Select value={filterCategory} onValueChange={setFilterCategory}>
                                <SelectTrigger className="h-9 rounded-xl border-slate-200 bg-white shadow-sm hover:border-primary/50 transition-colors">
                                    <SelectValue placeholder="구분" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-slate-100 shadow-lg">
                                    <SelectItem value="구매">구매</SelectItem>
                                    <SelectItem value="철거">철거</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b border-slate-100">
                                        <TableHead className="w-[180px] pl-6 py-4 text-xs font-semibold uppercase text-slate-500">사업</TableHead>
                                        <TableHead className="py-4 text-center text-xs font-semibold uppercase text-slate-500">품명</TableHead>
                                        <TableHead className="py-4 text-right text-xs font-semibold uppercase text-slate-500">보유량</TableHead>
                                        <TableHead className="py-4 text-right text-xs font-semibold uppercase text-slate-500">잔여길이</TableHead>
                                        <TableHead className="py-4 pr-6 text-right text-xs font-semibold uppercase text-slate-500">총 금액</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {divisionList.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-48 text-center text-muted-foreground text-sm">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Loader2 className="h-8 w-8 text-slate-200" />
                                                    <p>재고 데이터가 없습니다</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        divisionList.map((div) => {
                                            const isExpanded = expandedDivisions[div.name];
                                            const productList = Object.values(div.products).sort((a, b) => b.length - a.length);

                                            return (
                                                <>
                                                    <TableRow
                                                        key={div.name}
                                                        className={cn(
                                                            "cursor-pointer transition-all duration-200 border-b border-slate-50 dark:border-zinc-800/50",
                                                            isExpanded ? "bg-slate-50 dark:bg-zinc-800/50" : "hover:bg-slate-50/50"
                                                        )}
                                                        onClick={() => toggleDivision(div.name)}
                                                    >
                                                        <TableCell className="pl-6 py-4 font-medium text-slate-900 dark:text-slate-100 flex items-center gap-3">
                                                            <div className={cn(
                                                                "flex h-6 w-6 items-center justify-center rounded-md border transition-colors",
                                                                isExpanded ? "bg-white border-slate-200" : "bg-slate-100 border-transparent"
                                                            )}>
                                                                {isExpanded ? (
                                                                    <ChevronDown className="h-3 w-3 text-slate-500" />
                                                                ) : (
                                                                    <ChevronRight className="h-3 w-3 text-slate-500" />
                                                                )}
                                                            </div>
                                                            {div.name}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                                                {productList.length}종
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-right font-medium">{div.count.toLocaleString()}</TableCell>
                                                        <TableCell className="text-right font-medium font-mono text-slate-600">{div.length.toLocaleString()}m</TableCell>
                                                        <TableCell className="pr-6 text-right font-medium text-slate-900">₩{div.amount.toLocaleString()}</TableCell>
                                                    </TableRow>

                                                    {isExpanded && productList.map((prod) => (
                                                        <TableRow key={`${div.name}-${prod.productName}`} className="bg-slate-50/30 dark:bg-zinc-900/30 hover:bg-slate-50/80 border-b border-slate-50 animate-in fade-in slide-in-from-top-1 duration-200">
                                                            <TableCell></TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center pl-4 relative">
                                                                    <div className="absolute left-0 top-1/2 -mt-px w-3 h-px bg-slate-300"></div>
                                                                    <CornerDownRight className="mr-2 h-3 w-3 text-slate-300" />
                                                                    <span className="font-medium text-sm text-slate-700">{prod.productName}</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right text-slate-500 text-sm">{prod.count.toLocaleString()}</TableCell>
                                                            <TableCell className="text-right">
                                                                <span className="font-mono text-sm text-sky-600 font-semibold bg-sky-50 px-2 py-0.5 rounded">
                                                                    {prod.length.toLocaleString()}m
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="pr-6 text-right text-slate-500 text-sm">₩{prod.amount.toLocaleString()}</TableCell>
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

                {/* Field Team Section */}
                <Card className="border-0 shadow-lg shadow-indigo-200/50 dark:shadow-indigo-900/20 rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-600 text-white overflow-hidden">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                            <Users className="h-5 w-5 text-indigo-100" />
                            현장팀 현황
                        </CardTitle>
                        <CardDescription className="text-indigo-100/80">광케이블을 보유 중인 팀 목록입니다.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                        <div className="space-y-3">
                            {fieldTeams.map((team) => (
                                <div
                                    key={team.id}
                                    className="group relative flex items-center justify-between p-4 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all border border-white/10 hover:border-white/30 cursor-default"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "h-10 w-10 rounded-full flex items-center justify-center font-bold text-lg shadow-inner",
                                            team.isActive ? "bg-emerald-400 text-white" : "bg-slate-700/50 text-slate-300"
                                        )}>
                                            {team.name.substring(0, 1)}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm tracking-wide text-white">{team.name}</h4>
                                            <p className="text-xs text-indigo-100 flex items-center gap-1 mt-0.5">
                                                <span className={cn("h-1.5 w-1.5 rounded-full", team.isActive ? "bg-emerald-300" : "bg-slate-400")}></span>
                                                {team.divisionName}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold font-mono text-white">{team.materialCount}</div>
                                        <div className="text-[10px] text-indigo-200 uppercase tracking-widest font-semibold">Drums</div>
                                    </div>
                                </div>
                            ))}
                            {fieldTeams.length === 0 && (
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
