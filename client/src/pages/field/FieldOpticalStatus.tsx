import { Download, Loader2, Cable, MoreHorizontal, ArrowLeftRight, Trash2, X } from "lucide-react";
import { useState } from "react";
import { SearchInput } from "@/components/ui/SearchInput";
import { FieldTeamCard } from "@/components/FieldTeamCard";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/contexts/AppContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { useColumnResize } from "@/hooks/useColumnResize";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export default function FieldOpticalStatus() {
    const { tenants, currentTenant, divisions, teams: allTeams, checkPermission } = useAppContext();
    const queryClient = useQueryClient();
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

    const myTeamId = currentTenantData?.teamId;
    const myTeam = allTeams.find(t => t.id === myTeamId);

    const { widths, startResizing } = useColumnResize({
        division: 80,
        teamCategory: 120,
        productName: 120,
        drumNo: 120,
        spec: 150,
        coreCount: 80,
        remainingLength: 100,
        status: 100,
        actions: 50
    });

    const { data: cables = [], isLoading } = useQuery<(OpticalCable & { logs: OpticalCableLog[] })[]>({
        queryKey: ["/api/optical-cables"],
    });

    // Filter assigned cables only
    const assignedCables = cables.filter(c => c.status === 'assigned' && c.currentTeamId);

    const allStockItems = assignedCables.map(cable => {
        const team = allTeams.find(t => t.id === cable.currentTeamId);
        // 케이블 고유의 사업부 정보 사용 (팀의 사업부가 아님)
        const divisionName = cable.division || 'SKT';

        return {
            id: cable.id, // 케이블 ID 사용
            division: divisionName,
            teamCategory: team?.name || '',
            drumNo: cable.drumNo,
            spec: cable.spec,
            coreCount: cable.coreCount,
            productName: cable.productName,
            remainingLength: cable.remainingLength,
            currentTeamId: cable.currentTeamId,
            status: cable.status, // 상태 추가
            returnRequestStatus: cable.returnRequestStatus // 반납 요청 상태 추가
        };
    }).filter(item => !isFieldTeam || (myTeam && item.teamCategory === myTeam.name)); // 현장팀 필터링

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

    // 반납 취소 mutation
    const { mutate: cancelReturnRequest, isPending: isCanceling } = useMutation({
        mutationFn: async (cableId: string) => {
            const response = await fetch(`/api/optical-cables/${cableId}/cancel-return`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to cancel return request');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables"] });
        },
        onError: (error: Error) => {
            alert(`반납 취소 실패: ${error.message}`);
        }
    });

    const handleCancelReturn = (cableId: string) => {
        if (confirm('반납 신청을 취소하시겠습니까?')) {
            cancelReturnRequest(cableId);
        }
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
            {/* Desktop View */}
            <div className="hidden md:flex flex-col h-full">
                <div className="flex-shrink-0 space-y-4 pb-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold">현장팀 보유 재고 현황 (광케이블)</h1>
                            <p className="text-muted-foreground">각 현장팀이 현재 보유하고 있는 광케이블 드럼을 조회합니다</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {canWrite && !isFieldTeam && (
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

                    {!isFieldTeam && (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            {allTeams
                                .filter((t: any) => {
                                    if (selectedDivision === "전체") return true;
                                    const division = divisions?.find(d => d.id === t.divisionId);
                                    return division?.name === selectedDivision;
                                })
                                .sort((a: any, b: any) => (b.lastActivity || "").localeCompare(a.lastActivity || ""))
                                .slice(0, 4)
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
                    )}

                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                        <SearchInput
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="제조번호, 규격, 팀명 검색..."
                            className="flex-1 max-w-sm"
                        />
                        {!isFieldTeam && (
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
                        )}
                    </div>
                </div>

                <div className="flex-1 rounded-md border bg-background overflow-hidden relative">
                    <div className="h-full overflow-auto">
                        <table className="w-full caption-bottom text-sm table-fixed">
                            <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                                <TableRow className="h-8">
                                    <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.division }}>
                                        사업
                                        <div
                                            className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                                            onMouseDown={(e) => startResizing("division", e)}
                                        />
                                    </TableHead>
                                    <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.teamCategory }}>
                                        현장팀
                                        <div
                                            className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                                            onMouseDown={(e) => startResizing("teamCategory", e)}
                                        />
                                    </TableHead>
                                    <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.productName }}>
                                        품명
                                        <div
                                            className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                                            onMouseDown={(e) => startResizing("productName", e)}
                                        />
                                    </TableHead>
                                    <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.drumNo }}>
                                        제조번호
                                        <div
                                            className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                                            onMouseDown={(e) => startResizing("drumNo", e)}
                                        />
                                    </TableHead>
                                    <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.spec }}>
                                        규격
                                        <div
                                            className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                                            onMouseDown={(e) => startResizing("spec", e)}
                                        />
                                    </TableHead>
                                    <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.coreCount }}>
                                        코어
                                        <div
                                            className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                                            onMouseDown={(e) => startResizing("coreCount", e)}
                                        />
                                    </TableHead>
                                    <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.remainingLength }}>
                                        잔량(m)
                                        <div
                                            className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                                            onMouseDown={(e) => startResizing("remainingLength", e)}
                                        />
                                    </TableHead>
                                    <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.status }}>
                                        상태
                                        <div
                                            className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                                            onMouseDown={(e) => startResizing("status", e)}
                                        />
                                    </TableHead>
                                    <TableHead className="font-semibold text-center align-middle bg-background" style={{ width: widths.actions }}></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredStock.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                            보유 중인 광케이블이 없습니다
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredStock.map((item) => (
                                        <TableRow key={item.id} className="h-10 hover:bg-muted/50">
                                            <TableCell className="text-center align-middle p-2">
                                                <div className="w-full truncate font-medium" title={item.division}>{item.division}</div>
                                            </TableCell>
                                            <TableCell className="text-center align-middle p-2">
                                                <div className="w-full truncate" title={item.teamCategory}>{item.teamCategory}</div>
                                            </TableCell>
                                            <TableCell className="text-center align-middle p-2">
                                                <div className="w-full truncate" title={item.productName}>{item.productName}</div>
                                            </TableCell>
                                            <TableCell className="text-center align-middle p-2">
                                                <div className="w-full truncate font-medium" title={item.drumNo}>{item.drumNo}</div>
                                            </TableCell>
                                            <TableCell className="text-center align-middle p-2">
                                                <div className="w-full truncate" title={item.spec}>{item.spec}</div>
                                            </TableCell>
                                            <TableCell className="text-center align-middle p-2">
                                                <div className="w-full truncate" title={String(item.coreCount)}>{item.coreCount}</div>
                                            </TableCell>
                                            <TableCell className="text-center align-middle font-bold p-2">
                                                {item.remainingLength.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-center align-middle px-2 py-1">
                                                {item.returnRequestStatus === 'pending' ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                        반납 대기
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                        {item.status === 'assigned' ? '보유중' : item.status === 'in_stock' ? '재고' : item.status === 'used_up' ? '사용완료' : item.status === 'returned' ? '반납' : item.status === 'waste' ? '폐기' : item.status}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center align-middle px-2 py-1">
                                                {canAction && (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            {item.returnRequestStatus === 'pending' ? (
                                                                <DropdownMenuItem
                                                                    onClick={() => handleCancelReturn(item.id)}
                                                                >
                                                                    <X className="mr-2 h-4 w-4" />
                                                                    반납 취소
                                                                </DropdownMenuItem>
                                                            ) : (
                                                                <DropdownMenuItem onClick={() => handleOpenAction(item, 'return')}>
                                                                    <ArrowLeftRight className="mr-2 h-4 w-4" />
                                                                    사무실 반납
                                                                </DropdownMenuItem>
                                                            )}
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
            </div>

            {/* Mobile View */}
            <div className="md:hidden flex flex-col h-full overflow-hidden">
                {/* Mobile Header */}
                <div className="flex-shrink-0 p-4 border-b bg-background space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold">현장팀 광케이블 현황</h2>
                            <p className="text-xs text-muted-foreground">
                                총 {filteredStock.length}개 드럼
                            </p>
                        </div>
                        <Select value={selectedDivision} onValueChange={setSelectedDivision}>
                            <SelectTrigger className="w-[100px] h-8 text-xs">
                                <SelectValue placeholder="사업부" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="전체">전체</SelectItem>
                                {uniqueDivisions.filter(d => d !== "전체").map(d => (
                                    <SelectItem key={d} value={d}>{d}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex gap-2">
                        <SearchInput
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="제조번호, 규격, 팀명 검색..."
                            className="flex-1"
                            size="sm"
                        />
                        {!isFieldTeam && (
                            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                                <SelectTrigger className="w-[100px] h-9 text-xs">
                                    <SelectValue placeholder="팀" />
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
                        )}
                    </div>
                </div>

                {/* Mobile Card List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/10">
                    {filteredStock.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                            <Cable className="h-8 w-8 mb-2 opacity-50" />
                            <p className="text-sm">보유 중인 광케이블이 없습니다</p>
                        </div>
                    ) : (
                        filteredStock.map((item) => (
                            <div key={item.id} className="bg-card border rounded-lg p-3 shadow-sm">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="px-1.5 py-0 text-[10px] h-5">
                                            {item.division}
                                        </Badge>
                                        <span className="font-semibold text-sm truncate max-w-[150px]">
                                            {item.drumNo}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {item.returnRequestStatus === 'pending' ? (
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-800">
                                                반납대기
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800">
                                                보유중
                                            </span>
                                        )}
                                        {canAction && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 ml-1">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {item.returnRequestStatus === 'pending' ? (
                                                        <DropdownMenuItem onClick={() => handleCancelReturn(item.id)}>
                                                            <X className="mr-2 h-4 w-4" />
                                                            반납 취소
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem onClick={() => handleOpenAction(item, 'return')}>
                                                            <ArrowLeftRight className="mr-2 h-4 w-4" />
                                                            사무실 반납
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">품명/규격</span>
                                        <span className="font-medium">{item.productName} / {item.spec}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">코어수</span>
                                        <span>{item.coreCount}C</span>
                                    </div>
                                    {!isFieldTeam && (
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">현장팀</span>
                                            <span>{item.teamCategory}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-3 pt-2 border-t flex justify-between items-center bg-muted/20 -mx-3 -mb-3 px-3 py-2 rounded-b-lg">
                                    <span className="text-xs text-muted-foreground">잔량</span>
                                    <span className="font-bold text-primary text-base">
                                        {item.remainingLength.toLocaleString()}m
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
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

