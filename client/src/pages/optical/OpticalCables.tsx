import React, { useState } from 'react';
import { useQuery, useMutation } from "@tanstack/react-query";
import { useColumnResize } from "@/hooks/useColumnResize";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Search, Cable, History, ArrowRightLeft, MoreHorizontal, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useAppContext } from "@/contexts/AppContext";
import { Trash2, Download, Upload } from "lucide-react";
import { OpticalCableFormDialog, type OpticalCableFormData } from "@/components/OpticalCableFormDialog";
import { OpticalCableHistoryDialog } from "@/components/OpticalCableHistoryDialog";
import { GenericBulkUploadDialog } from "@/components/GenericBulkUploadDialog";
import {
    validateOpticalRow,
    transformOpticalRow,
    opticalColumns,
    downloadOpticalTemplate
} from "@/lib/bulk-configs/optical";
import { OpticalCableActionDialog } from "@/components/OpticalCableActionDialog";
import * as XLSX from "xlsx";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { OpticalCable, OpticalCableLog } from "@shared/schema";
import { useDialogState } from "@/hooks/useDialogState";
import { useTableFilters } from "@/hooks/useTableFilters";

export default function OpticalCables() {
    const { toast } = useToast();
    const { user, tenants, currentTenant } = useAppContext();
    const isTenantOwner = tenants.find(t => t.id === currentTenant)?.role === 'owner';

    const { data: cables = [], isLoading } = useQuery<OpticalCable[]>({
        queryKey: ["/api/optical-cables"],
    });

    const {
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        filteredItems: filteredCables,
        categories
    } = useTableFilters(cables, {
        searchFields: ["drumNo", "spec"],
        categoryField: "category"
    });

    const {
        open: dialogOpen,
        editingItem,
        handleOpen: openDialog,
        handleClose: closeDialog
    } = useDialogState<OpticalCable>();

    const [historyOpen, setHistoryOpen] = useState(false);
    const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
    const [historyItem, setHistoryItem] = useState<OpticalCable | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

    // Reservation Dialog State
    const [reserveDialogOpen, setReserveDialogOpen] = useState(false);
    const [selectedReserveCable, setSelectedReserveCable] = useState<OpticalCable | null>(null);

    // Range Filter State
    const [minRemaining, setMinRemaining] = useState<string>('');
    const [maxRemaining, setMaxRemaining] = useState<string>('');
    const [selectedCoreCount, setSelectedCoreCount] = useState<string>('전체');
    // Action Dialog State
    const [actionDialogOpen, setActionDialogOpen] = useState(false);
    const [selectedActionCable, setSelectedActionCable] = useState<OpticalCable | null>(null);
    const [actionType, setActionType] = useState<'assign' | 'usage' | 'return' | 'waste'>('assign');

    const { data: teams = [] } = useQuery<any[]>({
        queryKey: ["/api/teams"],
        enabled: actionDialogOpen && actionType === 'assign'
    });

    const handleAction = (cable: OpticalCable, type: 'assign' | 'usage' | 'return' | 'waste') => {
        setSelectedActionCable(cable);
        setActionType(type);
        setActionDialogOpen(true);
    };

    // Apply range filters
    const rangeFilteredCables = filteredCables.filter(cable => {
        // 잔량 범위 필터
        if (minRemaining && cable.remainingLength < Number(minRemaining)) return false;
        if (maxRemaining && cable.remainingLength > Number(maxRemaining)) return false;
        // 코어 수 필터
        if (selectedCoreCount !== '전체' && cable.coreCount !== Number(selectedCoreCount)) return false;
        return true;
    });

    const { widths, startResizing } = useColumnResize({
        checkbox: 40,
        division: 60,           // 사업 (SKT/SKB) - 디자인 가이드 표준
        category: 50,           // 구분 (광케이블/철거/구매) - 디자인 가이드 표준
        receivedDate: 95,       // 입고일자 (YYYY-MM-DD)
        manufacturer: 90,       // 제조사
        manufactureYear: 70,    // 제조연도
        spec: 50,               // 규격
        coreCount: 50,          // 코어
        drumNo: 70,             // 제조번호 (최대 6자리)
        location: 70,           // 위치
        totalLength: 90,        // 케이블용량
        incomingLength: 75,     // 입고량
        usedLength: 75,         // 사용량
        wasteLength: 65,        // 폐기량
        remainingLength: 75,    // 잔량
        unitPrice: 85,          // 단가
        totalAmount: 100,       // 금액
        remark: 80,             // 비고
        actions: 50             // 작업
    });

    const createMutation = useMutation({
        mutationFn: async (data: OpticalCableFormData) => {
            const res = await apiRequest("POST", "/api/optical-cables", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables"] });
            toast({ title: "광케이블 드럼이 등록되었습니다" });
            closeDialog();
        },
        onError: (error: Error) => {
            toast({ title: "등록 실패", description: error.message, variant: "destructive" });
        }
    });

    const bulkDeleteMutation = useMutation({
        mutationFn: async (ids: string[]) => {
            return apiRequest("POST", "/api/optical-cables/bulk-delete", { ids });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables"] });
            toast({ title: `${selectedIds.size}개 항목이 삭제되었습니다` });
            setSelectedIds(new Set());
        },
        onError: () => {
            toast({ title: "삭제 실패", variant: "destructive" });
        },
    });

    const bulkUploadMutation = useMutation({
        mutationFn: async (items: any[]) => {
            const res = await apiRequest("POST", "/api/optical-cables/bulk", { items });
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables"] });
            toast({ title: `${data.length}개 항목이 일괄 등록되었습니다` });
            // setBulkUploadOpen(false) handled by dialog immediately
        },
        onError: (error: Error) => {
            toast({ title: "일괄 등록 실패", description: error.message, variant: "destructive" });
        }
    });

    // Filter logic removed (handled by hook)

    const handleExcelDownload = () => {
        const data = filteredCables.map(item => ({
            "사업": item.division || "SKT",
            "구분": item.category,
            "입고일": item.receivedDate,
            "제조사": item.manufacturer,
            "제조연도": item.manufactureYear,
            "규격": item.spec,
            "코어": item.coreCount,
            "제조번호": item.drumNo,
            "위치": item.location,
            "비고": item.remark,
            "케이블용량": item.totalLength,
            "입고량": item.totalLength, // Assuming initial same as total
            "사용량": item.usedLength,
            "폐기": item.wasteLength,
            "잔량": item.remainingLength,
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "광케이블 재고");
        XLSX.writeFile(wb, `광케이블_재고현황_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const allSelected = rangeFilteredCables.length > 0 && rangeFilteredCables.every(cable => selectedIds.has(cable.id));

    const toggleSelectAll = () => {
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(rangeFilteredCables.map(cable => cable.id)));
        }
    };

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleBulkDelete = () => {
        if (confirm(`선택한 ${selectedIds.size}개 항목을 삭제하시겠습니까?`)) {
            bulkDeleteMutation.mutate(Array.from(selectedIds));
        }
    };

    // openDialog function removed (handled by hook)

    const calculateStatusColor = (status: string) => {
        switch (status) {
            case 'in_stock': return 'bg-green-100 text-green-800';
            case 'assigned': return 'bg-blue-100 text-blue-800';
            case 'used_up': return 'bg-gray-100 text-gray-800';
            case 'returned': return 'bg-orange-100 text-orange-800'; // Usually transitions back to in_stock?
            case 'waste': return 'bg-red-100 text-red-800';
            default: return 'bg-slate-100 text-slate-800';
        }
    };

    const calculateStatusLabel = (status: string) => {
        switch (status) {
            case 'in_stock': return '자재창고 보관';
            case 'assigned': return '현장 불출됨';
            case 'used_up': return '사용 완료';
            case 'returned': return '반납됨';
            case 'waste': return '폐기';
            default: return status;
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full" >
            <div className="flex-shrink-0 space-y-4 pb-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            광케이블 관리
                        </h1>
                        <p className="text-muted-foreground">광케이블 드럼 재고, 불출, 사용 이력을 관리합니다.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 border-green-600 text-green-600 hover:bg-green-50"
                            onClick={handleExcelDownload}
                        >
                            <Download className="h-3 w-3 mr-1" />
                            Excel
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button>
                                    <Plus className="h-4 w-4 mr-2" />
                                    드럼 등록
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openDialog()}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    직접 등록
                                </DropdownMenuItem>
                                {isTenantOwner && (
                                    <DropdownMenuItem onClick={() => setBulkUploadOpen(true)}>
                                        <Upload className="h-4 w-4 mr-2" />
                                        일괄 등록
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="relative max-w-sm">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="드럼번호, 규격 검색..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <div className="w-48">
                            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                <SelectTrigger>
                                    <SelectValue placeholder="구분 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="전체">구분 (전체)</SelectItem>
                                    {categories.filter(c => c !== "전체").map(category => (
                                        <SelectItem key={String(category)} value={String(category)}>
                                            {String(category)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="w-32">
                            <Select value={selectedCoreCount} onValueChange={setSelectedCoreCount}>
                                <SelectTrigger>
                                    <SelectValue placeholder="용량(코어)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="전체">코어 (전체)</SelectItem>
                                    <SelectItem value="24">24c</SelectItem>
                                    <SelectItem value="48">48c</SelectItem>
                                    <SelectItem value="72">72c</SelectItem>
                                    <SelectItem value="96">96c</SelectItem>
                                    <SelectItem value="144">144c</SelectItem>
                                    <SelectItem value="288">288c</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground whitespace-nowrap">잔량:</span>
                            <Input
                                type="number"
                                placeholder="최소"
                                value={minRemaining}
                                onChange={(e) => setMinRemaining(e.target.value)}
                                className="w-20"
                            />
                            <span className="text-muted-foreground">~</span>
                            <Input
                                type="number"
                                placeholder="최대"
                                value={maxRemaining}
                                onChange={(e) => setMaxRemaining(e.target.value)}
                                className="w-20"
                            />
                            {(minRemaining || maxRemaining || selectedCoreCount !== '전체') && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setMinRemaining('');
                                        setMaxRemaining('');
                                        setSelectedCoreCount('전체');
                                    }}
                                    className="h-8 px-2"
                                >
                                    초기화
                                </Button>
                            )}
                        </div>

                        {selectedIds.size > 0 && isTenantOwner && (
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleBulkDelete}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                선택 삭제 ({selectedIds.size})
                            </Button>
                        )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                        총 <span className="font-semibold text-foreground">{rangeFilteredCables.length}</span>개 품목
                    </div>
                </div>
            </div>

            <div className="flex-1 rounded-md border overflow-hidden">
                <div className="h-full overflow-auto relative pb-20">
                    <table className="w-full caption-bottom text-sm table-fixed">
                        <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                            <TableRow className="h-8">
                                <TableHead className="text-center align-middle bg-background" style={{ width: widths.checkbox }}>
                                    {isTenantOwner ? (
                                        <Checkbox
                                            checked={allSelected}
                                            onCheckedChange={toggleSelectAll}
                                        />
                                    ) : null}
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.division }}>
                                    사업
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("division", e)} />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.category }}>
                                    구분
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("category", e)} />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.receivedDate }}>
                                    입고일
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("receivedDate", e)} />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.manufacturer }}>
                                    제조사
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("manufacturer", e)} />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.manufactureYear }}>
                                    제조연도
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("manufactureYear", e)} />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.spec }}>
                                    규격
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("spec", e)} />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.coreCount }}>
                                    코어
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("coreCount", e)} />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.drumNo }}>
                                    제조번호
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("drumNo", e)} />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.location }}>
                                    위치
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("location", e)} />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.totalLength }}>
                                    케이블용량
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("totalLength", e)} />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.incomingLength }}>
                                    입고량
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("incomingLength", e)} />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.usedLength }}>
                                    사용량
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("usedLength", e)} />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.wasteLength }}>
                                    폐기
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("wasteLength", e)} />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.remainingLength }}>
                                    잔량
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("remainingLength", e)} />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.unitPrice }}>
                                    단가
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("unitPrice", e)} />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.totalAmount }}>
                                    금액
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("totalAmount", e)} />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.remark }}>
                                    비고
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("remark", e)} />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background" style={{ width: widths.actions }}></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rangeFilteredCables.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={19} className="text-center py-8 text-muted-foreground">
                                        등록된 광케이블 드럼이 없습니다.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                rangeFilteredCables.map((cable) => (
                                    <TableRow
                                        key={cable.id}
                                        className={`h-6 [&_td]:py-0 cursor-pointer hover:bg-muted/50 ${cable.reservationStatus === 'reserved'
                                            ? 'bg-orange-100/40 hover:bg-orange-100/60'
                                            : cable.status === 'assigned'
                                                ? 'bg-blue-100/30'
                                                : ''
                                            }`}
                                        onDoubleClick={() => {
                                            setHistoryItem(cable);
                                            setHistoryOpen(true);
                                        }}
                                    >
                                        <TableCell className="text-center align-middle">
                                            {isTenantOwner ? (
                                                <Checkbox
                                                    checked={selectedIds.has(cable.id)}
                                                    onCheckedChange={() => toggleSelect(cable.id)}
                                                />
                                            ) : null}
                                        </TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap">{cable.division || "SKT"}</TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap">{cable.category}</TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap">{cable.receivedDate}</TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap">{cable.manufacturer}</TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap">{cable.manufactureYear}</TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap">{cable.spec}</TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap">{cable.coreCount}</TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap font-medium">{cable.drumNo}</TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap">{cable.location}</TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap">{String(cable.totalLength || '')}</TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap">{(cable.remainingLength || 0).toLocaleString()}</TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap">{(cable.usedLength || 0).toLocaleString()}</TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap">{(cable.wasteLength || 0).toLocaleString()}</TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap font-medium">{(cable.remainingLength || 0).toLocaleString()}</TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap">{(cable.unitPrice || 0).toLocaleString()}</TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap">{(cable.totalAmount || 0).toLocaleString()}</TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap" style={{ maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cable.remark}</TableCell>
                                        <TableCell className="text-center align-middle">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-6 w-6 p-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => {
                                                        setHistoryItem(cable);
                                                        setHistoryOpen(true);
                                                    }}>
                                                        <History className="mr-2 h-4 w-4" />
                                                        이력 보기
                                                    </DropdownMenuItem>

                                                    {cable.status === 'in_stock' && (
                                                        <DropdownMenuItem onClick={() => handleAction(cable, 'assign')}>
                                                            <ArrowRightLeft className="mr-2 h-4 w-4" />
                                                            불출 (Assign)
                                                        </DropdownMenuItem>
                                                    )}

                                                    {cable.status === 'assigned' && (
                                                        <>
                                                            <DropdownMenuItem onClick={() => handleAction(cable, 'usage')}>
                                                                <Cable className="mr-2 h-4 w-4" />
                                                                사용 등록 (Usage)
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleAction(cable, 'return')}>
                                                                <ArrowRightLeft className="mr-2 h-4 w-4" />
                                                                반납 (Return)
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}

                                                    {/* Waste is available unless already wasted or used up */}
                                                    {['in_stock', 'assigned', 'returned'].includes(cable.status) && (
                                                        <DropdownMenuItem onClick={() => handleAction(cable, 'waste')} className="text-destructive focus:text-destructive">
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            폐기 (Waste)
                                                        </DropdownMenuItem>
                                                    )}

                                                    <DropdownMenuItem onClick={() => openDialog(cable)}>
                                                        <Pencil className="mr-2 h-4 w-4" />
                                                        수정
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </table>
                </div>
            </div>

            <OpticalCableFormDialog
                open={dialogOpen}
                onOpenChange={(open) => !open && closeDialog()}
                onSubmit={(data) => createMutation.mutate(data)}
                editingItem={editingItem}
            />

            <GenericBulkUploadDialog
                open={bulkUploadOpen}
                onOpenChange={setBulkUploadOpen}
                title="광케이블 일괄 등록"
                description="CSV 파일을 업로드하여 여러 광케이블 드럼을 한번에 등록할 수 있습니다"
                onDownloadTemplate={downloadOpticalTemplate}
                templateFileName="optical_cable_template.csv"
                validateRow={validateOpticalRow}
                transformRow={transformOpticalRow}
                columns={opticalColumns}
                onUpload={(items) => bulkUploadMutation.mutate(items)}
                maxWidth="max-w-7xl"
            />

            <OpticalCableHistoryDialog
                open={historyOpen}
                onOpenChange={setHistoryOpen}
                cableId={historyItem?.id?.toString() || null}
                drumNo={historyItem?.drumNo}
            />

            {
                selectedActionCable && (
                    <OpticalCableActionDialog
                        open={actionDialogOpen}
                        onOpenChange={setActionDialogOpen}
                        cable={selectedActionCable}
                        actionType={actionType}
                        teams={teams}
                    />
                )
            }
        </div >
    );
}
