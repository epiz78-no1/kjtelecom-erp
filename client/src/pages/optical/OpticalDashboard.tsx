import { useQuery } from "@tanstack/react-query";
import { Loader2, Cable, ArrowDownToLine, ArrowUpFromLine, Cuboid } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppContext } from "@/contexts/AppContext";
import { FieldTeamCard, type FieldTeam } from "@/components/FieldTeamCard";
import type { OpticalCable, OpticalCableLog } from "@shared/schema";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export default function OpticalDashboard() {
    const { teams, divisions } = useAppContext();

    const { data: cables = [], isLoading: isLoadingCables } = useQuery<(OpticalCable & { logs: OpticalCableLog[] })[]>({
        queryKey: ["/api/optical-cables"],
    });

    const { data: logs = [], isLoading: isLoadingLogs } = useQuery<(OpticalCableLog & { cable: OpticalCable | null })[]>({
        queryKey: ["/api/optical-cables/logs"],
    });

    if (isLoadingCables || isLoadingLogs) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    // Calculate Stats
    const totalLength = cables.reduce((sum, c) => sum + c.remainingLength, 0);
    const totalDrums = cables.filter(c => c.status !== 'waste' && c.remainingLength > 0).length;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const isThisMonth = (dateStr: string | Date | null) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    };

    const incomingLogs = logs.filter(l => l.logType === 'receive' || l.logType === 'create');
    const monthIncoming = incomingLogs
        .filter(l => isThisMonth(l.usageDate || l.createdAt))
        .reduce((sum, l) => sum + ((l.afterRemaining || 0) - (l.beforeRemaining || 0)), 0);

    const usageLogs = logs.filter(l => l.logType === 'usage');
    const monthUsageLength = usageLogs
        .filter(l => isThisMonth(l.usageDate || l.createdAt))
        .reduce((sum, l) => sum + (l.usedLength || 0), 0);

    // 1. Aggregation by Spec
    const specStats = cables.reduce((acc, cable) => {
        // Only count active stock (not waste, maybe returned/assigned counts too? Dashboard usually shows total inventory value)
        // Adjusting logic: Inventory Status usually means what we HAVE (in_stock + assigned + returned). Waste is gone.
        // Assuming "waste" and "used_up" status cables have 0 remainingLength usually, or we filter them.
        if (cable.status === 'waste') return acc;

        const spec = cable.spec || "미지정";
        if (!acc[spec]) {
            acc[spec] = { count: 0, length: 0, amount: 0 };
        }
        acc[spec].count += 1;
        acc[spec].length += cable.remainingLength;
        acc[spec].amount += cable.totalAmount;
        return acc;
    }, {} as Record<string, { count: number; length: number; amount: number }>);

    const specList = Object.entries(specStats)
        .map(([spec, stats]) => ({ spec, ...stats }))
        .sort((a, b) => b.length - a.length);

    // 2. Field Team Status
    // Map teams to display compatible with FieldTeamCard
    const fieldTeams = teams.map(team => {
        const divisionName = divisions.find(d => d.id === team.divisionId)?.name || "-";

        // Count cables currently assigned to this team
        // Logic: cable.status === 'assigned' AND cable.currentTeamId === team.id
        const assignedCables = cables.filter(c => c.status === 'assigned' && c.currentTeamId === team.id);
        const materialCount = assignedCables.length;

        // "held material types" - for optical, maybe just "Drums"?
        // General Dashboard uses "materialCount" which is distinct items. Here it is Drum Count.

        return {
            ...team,
            divisionName,
            materialCount, // Mapping assigned drum count to materialCount prop
        } as FieldTeam;
    }).sort((a, b) => {
        // Sort by active status then by name
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        return a.name.localeCompare(b.name);
    });

    return (
        <div className="flex flex-col gap-6 h-full overflow-auto">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    광케이블 대시보드
                </h1>
                <p className="text-muted-foreground">광케이블 자재 보유 및 입출고 현황 요약입니다.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">총 잔여 길이</CardTitle>
                        <Cable className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalLength.toLocaleString()}m</div>
                        <p className="text-xs text-muted-foreground">전체 보유 드럼 합계</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">보유 드럼</CardTitle>
                        <Cuboid className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalDrums}개</div>
                        <p className="text-xs text-muted-foreground">폐기 제외, 잔량 존재</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">금월 입고 (길이)</CardTitle>
                        <ArrowDownToLine className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{monthIncoming.toLocaleString()}m</div>
                        <p className="text-xs text-muted-foreground">이번 달 신규 입고</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">금월 실사용</CardTitle>
                        <ArrowUpFromLine className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{monthUsageLength.toLocaleString()}m</div>
                        <p className="text-xs text-muted-foreground">이번 달 공사 투입(설치+폐기)</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-medium">
                        항목별 재고 현황
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>규격</TableHead>
                                    <TableHead className="text-right">보유 드럼</TableHead>
                                    <TableHead className="text-right">총 잔여 길이</TableHead>
                                    <TableHead className="text-right">총 금액</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {specList.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                            재고 데이터가 없습니다
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    specList.map((item) => (
                                        <TableRow key={item.spec}>
                                            <TableCell className="font-medium">{item.spec}</TableCell>
                                            <TableCell className="text-right">{item.count}개</TableCell>
                                            <TableCell className="text-right">{item.length.toLocaleString()}m</TableCell>
                                            <TableCell className="text-right">₩{item.amount.toLocaleString()}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-medium">현장팀 현황 (광케이블 보유)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {fieldTeams.map((team) => (
                            <FieldTeamCard
                                key={team.id}
                                team={team}
                                onClick={() => { }} // No action for now
                            />
                        ))}
                        {fieldTeams.length === 0 && (
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
