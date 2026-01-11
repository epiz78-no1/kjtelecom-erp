import { Download, Search, Loader2, Cable, MoreHorizontal, ArrowLeftRight, Trash2 } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { FieldTeamCard } from "@/components/FieldTeamCard";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/contexts/AppContext";
import { useQuery } from "@tanstack/react-query";
import type { OpticalCable, OpticalCableLog } from "@shared/schema";
import { exportToExcel } from "@/lib/excel";
import { useTableFilters } from "@/hooks/useTableFilters";
import { OpticalActionDialog } from "@/components/OpticalActionDialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function FieldOpticalStatus() {
    const { tenants, currentTenant, divisions, teams: allTeams, checkPermission } = useAppContext();
    const canWrite = checkPermission("usage", "write");

    const currentTenantData = tenants.find(t => t.id === currentTenant);
    const isFieldTeam = currentTenantData?.permissions &&
        currentTenantData.permissions.usage === 'write' &&
        currentTenantData.permissions.incoming === 'none' &&
        currentTenantData.permissions.outgoing === 'none' &&
        currentTenantData.permissions.inventory === 'none';

    const canManage = canWrite && !isFieldTeam;
    // 현장팀이거나 관리자면 반납/폐기 가능
    const canAction = canManage || isFieldTeam;

    const { data: cables = [], isLoading } = useQuery<(OpticalCable & { logs: OpticalCableLog[] })[]>({
        queryKey: ["/api/optical-cables"],
    });

    // Filter assigned cables only
    const assignedCables = cables.filter(c => c.status === 'assigned' && c.currentTeamId);

    // Aggregate by team
    // ... (기존 로직 유지하되, action을 위해 개별 항목 식별자 필요)
    // 현재 로직은 group by key를 함. 하지만 개별 드럼 단위로 보여주므로 stockMap key가 unique identifier가 됨.
    // 하지만 Action을 하려면 cableId가 필요함.
    // assignedCables 자체가 개별 드럼 리스트이므로, 굳이 stockMap으로 묶을 필요 없이 바로 써도 됨.
    // 다만, 기존 코드가 stockMap을 쓰는 이유는 중복 드럼이 없어서 그런듯? (assignedCables는 이미 개별 row)

    const allStockItems = assignedCables.map(cable => {
        const team = allTeams.find(t => t.id === cable.currentTeamId);
        const division = divisions?.find(d => d.id === team?.divisionId);
        const divisionName = division?.name || 'SKT';

        return {
            id: cable.id, // 케이블 ID 사용
            division: divisionName,
            teamCategory: team?.name || '',
            drumNo: cable.drumNo,
            spec: cable.spec,
            coreCount: cable.coreCount,
            productName: cable.productName,
            remainingLength: cable.remainingLength,
            currentTeamId: cable.currentTeamId
        };
    });

    const {
        searchQuery,
        setSearchQuery,
        selectedDivision,
        setSelectedDivision,
        selectedCategory: selectedTeam,
        setSelectedCategory: setSelectedTeam,
        filteredItems: filteredStock,
        categories: uniqueTeams
    } = useTableFilters(allStockItems, {
        searchFields: ["drumNo", "spec", "teamCategory"],
        divisionField: "division",
        categoryField: "teamCategory"
    });

    // Action Dialog State
    const [actionOpen, setActionOpen] = useState(false);
    const [selectedCable, setSelectedCable] = useState<typeof allStockItems[0] | null>(null);
    const [actionType, setActionType] = useState<'return' | 'waste'>('return');

    const handleOpenAction = (cable: typeof allStockItems[0], type: 'return' | 'waste') => {
        setSelectedCable(cable);
        setActionType(type);
        setActionOpen(true);
    };

    const uniqueDivisions = ["전체", ...Array.from(new Set(allStockItems.map(item => item.division))).filter(Boolean)];

    const handleExportExcel = () => {
        const dataToExport = filteredStock.map(item => ({
            "사업": item.division,
            "현장팀": item.teamCategory,
            "제조번호": item.drumNo,
            "규격": item.spec,
            "코어": item.coreCount,
            "잔량(m)": item.remainingLength
        }));

        exportToExcel(dataToExport, "현장팀_광케이블_보유현황");
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex-shrink-0 space-y-4 pb-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">현장팀 보유 재고 현황 (광케이블)</h1>
                        <p className="text-muted-foreground">각 현장팀이 현재 보유하고 있는 광케이블 드럼을 조회합니다</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {canWrite && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 border-green-600 text-green-600 hover:bg-green-50"
                                onClick={handleExportExcel}
                            >
                                <Download className="h-3 w-3 mr-1" />
                                Excel
                            </Button>
                        )}
                        <div className="w-[180px]">
                            <Select value={selectedDivision} onValueChange={setSelectedDivision}>
                                <SelectTrigger>
                                    <SelectValue placeholder="사업부 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="전체">전체</SelectItem>
                                    {uniqueDivisions.filter(d => d !== "전체").map(d => (
                                        <SelectItem key={d} value={d}>{d}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {allTeams
                        .filter((t: any) => {
                            if (selectedDivision === "전체") return true;
                            const division = divisions?.find(d => d.id === t.divisionId);
                            return division?.name === selectedDivision;
                        })
                        .sort((a: any, b: any) => (b.lastActivity || "").localeCompare(a.lastActivity || ""))
                        .map((team: any) => {
                            // Calculate current cable count for this team
                            const teamCableCount = allStockItems.filter(item => item.teamCategory === team.name).length;

                            return (
                                <FieldTeamCard
                                    key={team.id}
                                    team={{ ...team, materialCount: teamCableCount }}
                                    onClick={(t) => setSelectedTeam(t.name === selectedTeam ? "전체" : t.name)}
                                />
                            );
                        })}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="제조번호, 규격, 팀명 검색..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                        <SelectTrigger className="w-48">
                            <SelectValue placeholder="팀 선택" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="전체">전체</SelectItem>
                            {uniqueTeams.filter(t => t !== "전체").map((team) => (
                                <SelectItem key={String(team)} value={String(team)}>
                                    {String(team)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="flex-1 rounded-md border bg-background overflow-hidden relative">
                <div className="h-full overflow-auto">
                    <table className="w-full caption-bottom text-sm table-fixed">
                        <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                            <TableRow className="h-10">
                                <TableHead className="font-semibold w-[80px] text-center align-middle bg-background">사업</TableHead>
                                <TableHead className="font-semibold w-[120px] text-center align-middle bg-background">현장팀</TableHead>
                                <TableHead className="font-semibold w-[120px] text-center align-middle bg-background">제조번호</TableHead>
                                <TableHead className="font-semibold w-[150px] text-center align-middle bg-background">규격</TableHead>
                                <TableHead className="font-semibold w-[80px] text-center align-middle bg-background">코어</TableHead>
                                <TableHead className="font-semibold w-[100px] text-center align-middle bg-background">잔량(m)</TableHead>
                                <TableHead className="font-semibold w-[70px] text-center align-middle bg-background"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredStock.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        보유 중인 광케이블이 없습니다
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredStock.map((item) => (
                                    <TableRow key={item.id} className="h-10 hover:bg-muted/50">
                                        <TableCell className="text-center align-middle whitespace-nowrap font-medium">{item.division}</TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap">{item.teamCategory}</TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap font-medium">{item.productName}</TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap font-medium">{item.drumNo}</TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap">{item.spec}</TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap">{item.coreCount}</TableCell>
                                        <TableCell className="text-center align-middle font-bold">
                                            {item.remainingLength.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-center align-middle">
                                            {canAction && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleOpenAction(item, 'return')}>
                                                            <ArrowLeftRight className="mr-2 h-4 w-4" />
                                                            사무실 반납
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleOpenAction(item, 'waste')}
                                                            className="text-destructive"
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            폐기 처리
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </table>
                </div>
            </div>

            <OpticalActionDialog
                open={actionOpen}
                onOpenChange={setActionOpen}
                cable={selectedCable}
                actionType={actionType}
            />
        </div>
    );
}
