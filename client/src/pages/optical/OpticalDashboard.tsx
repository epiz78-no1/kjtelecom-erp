import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Cable, Cuboid, ChevronDown, ChevronRight, ShoppingCart, Users } from "lucide-react";
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
    const [expandedDivisions, setExpandedDivisions] = useState<Record<string, boolean>>({});

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
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
                        <CardTitle className="text-sm font-medium">보유 케이블</CardTitle>
                        <Cuboid className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalDrums}개</div>
                        <p className="text-xs text-muted-foreground">폐기 제외, 잔량 존재</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">총 잔여 길이</CardTitle>
                        <Cable className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalLength.toLocaleString()}m</div>
                        <p className="text-xs text-muted-foreground">전체 보유 케이블 합계</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">총 재고 금액</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₩{totalAmount.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">현재 재고 가치 기준</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">활성 현장팀</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeTeamCount}팀</div>
                        <p className="text-xs text-muted-foreground">전체 {teams.length}개 팀 중</p>
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
                        <Table className="table-fixed">
                            <TableHeader>
                                <TableRow className="bg-muted/50 h-8">
                                    <TableHead className="w-[120px] text-sm font-medium">사업</TableHead>
                                    <TableHead className="text-center text-sm font-medium">품명</TableHead>
                                    <TableHead className="w-[120px] text-right text-sm font-medium">보유케이블</TableHead>
                                    <TableHead className="w-[150px] text-right text-sm font-medium">총 잔여길이</TableHead>
                                    <TableHead className="w-[150px] text-right text-sm font-medium">총 금액</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {divisionList.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                                            재고 데이터가 없습니다
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
                                                    className="cursor-pointer hover:bg-muted/50 font-medium text-sm"
                                                    onClick={() => toggleDivision(div.name)}
                                                >
                                                    <TableCell className="flex items-center gap-2">
                                                        {isExpanded ? (
                                                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                        ) : (
                                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                        )}
                                                        {div.name}
                                                    </TableCell>
                                                    <TableCell className="text-center text-muted-foreground text-xs">
                                                        {productList.length}개
                                                    </TableCell>
                                                    <TableCell className="text-right">{div.count.toLocaleString()}개</TableCell>
                                                    <TableCell className="text-right">{div.length.toLocaleString()}m</TableCell>
                                                    <TableCell className="text-right">₩{div.amount.toLocaleString()}</TableCell>
                                                </TableRow>

                                                {isExpanded && productList.map((prod) => (
                                                    <TableRow key={`${div.name}-${prod.productName}`} className="bg-muted/10 hover:bg-muted/20 text-sm">
                                                        <TableCell></TableCell>
                                                        <TableCell className="text-center font-medium">{prod.productName}</TableCell>
                                                        <TableCell className="text-right text-muted-foreground">{prod.count.toLocaleString()}개</TableCell>
                                                        <TableCell className="text-right text-muted-foreground">{prod.length.toLocaleString()}m</TableCell>
                                                        <TableCell className="text-right text-muted-foreground">₩{prod.amount.toLocaleString()}</TableCell>
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
