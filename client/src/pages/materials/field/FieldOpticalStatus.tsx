import { Download, Loader2, Cable, MoreHorizontal, ArrowLeftRight, Trash2, X } from "lucide-react";
import { useState } from "react";
import { SearchInput } from "@/components/ui/SearchInput";

import { Button } from "@/components/ui/button";
import { useAppContext } from "@/contexts/AppContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { OpticalCable, OpticalCableLog } from "@shared/schema";
import { exportToExcel } from "@/lib/excel";
import { useTableFilters } from "@/hooks/useTableFilters";
import { OpticalActionDialog } from "@/components/optical/OpticalActionDialog";
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
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export default function FieldOpticalStatus() {
    const { tenants, currentTenant, divisions, teams: allTeams, checkPermission } = useAppContext();
    const queryClient = useQueryClient();
    const canWrite = checkPermission("usage", "write");

    const currentTenantData = tenants.find(t => t.id === currentTenant);
    const myTeamId = currentTenantData?.teamId;
    const myTeam = allTeams.find(t => t.id === myTeamId);

    // 현장팀 판별: teamId가 있고 owner가 아니면 현장팀
    const isFieldTeam = !!myTeamId && currentTenantData.role !== 'owner';

    const canManage = canWrite && !isFieldTeam;
    // 현장팀이거나 관리자면 반납/폐기 가능
    const canAction = canManage || isFieldTeam;

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
    }).filter(item => {
        // 현장팀이 아니면 모든 항목 표시
        if (!isFieldTeam) return true;
        // 현장팀이면 본인 팀 ID와 일치하는 항목만 표시
        return myTeamId && item.currentTeamId === myTeamId;
    }); // 현장팀 필터링

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
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-zinc-950/50 p-2 overflow-hidden">
            {/* Ultra Compact Header Section */}
            <div className="flex flex-col gap-2 flex-shrink-0 mb-2 pt-1">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 px-1">
                        <h1 className="text-base font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            현장팀 보유 재고 (광케이블)
                            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse"></span>
                        </h1>
                        <div className="h-3 w-px bg-slate-200 dark:bg-slate-800"></div>
                        <span className="text-xs font-medium text-slate-500">{filteredStock.length} items</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <SearchInput
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="드럼번호, 현장팀 검색..."
                            className="w-40 focus:w-56 h-7 text-xs rounded-md bg-white border-slate-200 focus:ring-1 focus:ring-primary/20 transition-all font-normal"
                        />

                        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>

                        <div className="w-[120px]">
                            <Select value={selectedDivision} onValueChange={setSelectedDivision}>
                                <SelectTrigger className="h-7 text-xs rounded-md bg-white border-slate-200">
                                    <SelectValue placeholder="사업부" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="전체" className="text-xs">전체 사업부</SelectItem>
                                    {uniqueDivisions.filter(d => d !== "전체").map(d => (
                                        <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {!isFieldTeam && (
                            <div className="w-[150px]">
                                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                                    <SelectTrigger className="h-7 text-xs rounded-md bg-white border-slate-200">
                                        <SelectValue placeholder="현장팀" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="전체" className="text-xs">전체 현장팀</SelectItem>
                                        {uniqueTeams.filter(t => t !== "전체").map(t => (
                                            <SelectItem key={String(t)} value={String(t)} className="text-xs">{String(t)}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {canWrite && !isFieldTeam && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 rounded-md text-emerald-600 hover:bg-emerald-50 ml-1"
                                            onClick={handleExportExcel}
                                        >
                                            <Download className="h-3.5 w-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Excel 다운로드</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>
                </div>
            </div>
            {/* Desktop View */}
            <div className="hidden md:flex flex-col h-full">


                {/* Main Table Area */}
                <div className="flex-1 rounded-3xl border border-slate-200 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-xl shadow-slate-200/50 dark:shadow-black/50 overflow-hidden flex flex-col relative z-0">
                    <div className="flex-1 overflow-auto custom-scrollbar relative">
                        <table className="w-full text-sm border-collapse table-fixed">
                            <TableHeader className="sticky top-0 bg-slate-50/95 backdrop-blur z-20 shadow-sm">
                                <TableRow className="h-10 border-b border-slate-200">
                                    <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.division }}>사업<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("division", e)} /></TableHead>
                                    <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.teamCategory }}>현장팀<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("teamCategory", e)} /></TableHead>
                                    <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.productName }}>품명<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("productName", e)} /></TableHead>
                                    <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.drumNo }}>제조번호<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("drumNo", e)} /></TableHead>
                                    <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.spec }}>규격<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("spec", e)} /></TableHead>
                                    <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.coreCount }}>코어<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("coreCount", e)} /></TableHead>
                                    <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.remainingLength }}>잔량<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("remainingLength", e)} /></TableHead>
                                    <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.status }}>상태<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("status", e)} /></TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredStock.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-64 text-center text-muted-foreground flex flex-col items-center justify-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                                                    <Cable className="h-6 w-6 text-slate-400 opacity-50" />
                                                </div>
                                                <p className="font-medium">보유한 광케이블 재고가 없습니다</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredStock.map((item) => (
                                        <TableRow
                                            key={item.id}
                                            className="group h-10 border-b border-slate-100 dark:border-zinc-800 transition-colors hover:bg-slate-50/80 text-xs"
                                        >
                                            <TableCell className="text-center px-1 font-medium text-slate-700">{item.division}</TableCell>
                                            <TableCell className="text-center px-1 text-slate-600">{item.teamCategory}</TableCell>
                                            <TableCell className="text-center px-1 text-slate-600 truncate">{item.productName}</TableCell>
                                            <TableCell className="text-center px-1 font-mono text-slate-700">{item.drumNo}</TableCell>
                                            <TableCell className="text-center px-1 text-slate-500">{item.spec}</TableCell>
                                            <TableCell className="text-center px-1 text-slate-500">{item.coreCount}</TableCell>
                                            <TableCell className="text-right px-4 font-bold font-mono text-emerald-600">{item.remainingLength.toLocaleString()}</TableCell>
                                            <TableCell className="text-center px-1">
                                                {item.returnRequestStatus === 'pending' ? (
                                                    <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-600 border-amber-200">반납 승인 대기</Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-500">보유중</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center p-0">
                                                {canAction && (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <MoreHorizontal className="h-4 w-4 text-slate-400" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-32">
                                                            {item.returnRequestStatus === 'pending' ? (
                                                                <DropdownMenuItem
                                                                    onClick={() => handleCancelReturn(String(item.id))}
                                                                    className="text-amber-600 focus:text-amber-700 focus:bg-amber-50 text-xs"
                                                                >
                                                                    <X className="mr-2 h-3.5 w-3.5" />
                                                                    반납 요청 취소
                                                                </DropdownMenuItem>
                                                            ) : (
                                                                <>
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleOpenAction(item, 'return')}
                                                                        className="text-xs"
                                                                    >
                                                                        <ArrowLeftRight className="mr-2 h-3.5 w-3.5" />
                                                                        반납 신청
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleOpenAction(item, 'waste')}
                                                                        className="text-red-600 focus:text-red-700 focus:bg-red-50 text-xs"
                                                                    >
                                                                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                                                                        폐기 처리
                                                                    </DropdownMenuItem>
                                                                </>
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

