import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useAppContext } from "@/contexts/AppContext";
import { FieldTeamCard } from "@/components/FieldTeamCard";
import { DemolitionMaterial } from "@/types/demolition";

export default function DemolitionDashboard() {
    const { divisions, teams } = useAppContext();

    // 1. Dashboard Stats (Existing)
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

    // --- Logic 2: Category Stats Aggregation ---
    const categoryStats = materials.reduce((acc, item) => {
        const category = item.category || "기타";
        if (!acc[category]) {
            acc[category] = { count: 0, originalQuantity: 0, remainingQuantity: 0 };
        }
        acc[category].count += 1;
        acc[category].originalQuantity += item.originalQuantity || 0;
        acc[category].remainingQuantity += item.remainingQuantity || 0;
        return acc;
    }, {} as Record<string, { count: number; originalQuantity: number; remainingQuantity: number }>);

    const categoryList = Object.entries(categoryStats)
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.remainingQuantity - a.remainingQuantity);

    const totalMaterialsCheck = materials.reduce((sum, item) => sum + (item.remainingQuantity || 0), 0);

    // Filter teams that have relevant data or are active
    // Aligning with Dashboard.tsx style, showing active teams primarily
    const activeTeams = teams.filter(t => t.isActive).sort((a, b) => (b.lastActivity || "").localeCompare(a.lastActivity || ""));


    return (
        <div className="p-6 space-y-6 h-full overflow-auto">
            <div>
                <h1 className="text-3xl font-bold">철거자재 대시보드</h1>
                <p className="text-muted-foreground">철거자재 현황을 한눈에 확인하세요</p>
            </div>

            {/* Top Stats Cards (Existing) */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">총 입고량</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            전체 철거자재 수
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">검토 대기</CardTitle>
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.pendingReview || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            관리자 검토 필요
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">재사용 가능</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.approvedReusable || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            재사용 승인된 자재
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">재사용됨</CardTitle>
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.inUse || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            사용 완료 자재
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Category Status Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-medium">
                        항목별 재고 현황
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-x-auto">
                        <Table className="table-fixed">
                            <TableHeader>
                                <TableRow className="bg-muted/50 h-8">
                                    <TableHead>카테고리</TableHead>
                                    <TableHead className="text-right">품목 수</TableHead>
                                    <TableHead className="text-right">철거 수량</TableHead>
                                    <TableHead className="text-right">현재 잔량</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {categoryList.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                            재고 데이터가 없습니다
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    categoryList.map((cat) => (
                                        <TableRow key={cat.name} className="h-10">
                                            <TableCell className="font-medium">{cat.name}</TableCell>
                                            <TableCell className="text-right">{cat.count}종</TableCell>
                                            <TableCell className="text-right">{cat.originalQuantity.toLocaleString()}</TableCell>
                                            <TableCell className="text-right font-bold text-primary">{cat.remainingQuantity.toLocaleString()}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                                {categoryList.length > 0 && (
                                    <TableRow className="bg-muted/50 font-semibold h-10">
                                        <TableCell>합계</TableCell>
                                        <TableCell className="text-right">{materials.length}종</TableCell>
                                        <TableCell className="text-right">{materials.reduce((sum, i) => sum + (i.originalQuantity || 0), 0).toLocaleString()}</TableCell>
                                        <TableCell className="text-right">{totalMaterialsCheck.toLocaleString()}</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Field Team Status Cards */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-medium">현장팀 현황</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {activeTeams.map((team) => {
                            // Calculate current material count for this team using aggregated list
                            const teamStockCount = allStockItems.filter(item => item.teamCategory === team.name).length;

                            return (
                                <FieldTeamCard
                                    key={team.id}
                                    team={{ ...team, materialCount: teamStockCount }}
                                    onClick={(t) => { }}
                                />
                            );
                        })}
                        {activeTeams.length === 0 && (
                            <div className="col-span-full text-center py-8 text-muted-foreground">
                                등록된 현장팀이 없습니다
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
