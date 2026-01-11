import React, { useState } from 'react';
import { useQuery, useMutation } from "@tanstack/react-query";
import { useColumnResize } from "@/hooks/useColumnResize";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil, Trash2, Download, Search, ArrowRightLeft, History, X, Filter, ChevronDown, ChevronUp, MoreHorizontal } from "lucide-react";
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
import { Upload } from "lucide-react";
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
    const [selectedStatus, setSelectedStatus] = useState<string>('전체');
    const [filterOpen, setFilterOpen] = useState(false);
    // Action Dialog State
    const [actionDialogOpen, setActionDialogOpen] = useState(false);
    const [selectedActionCable, setSelectedActionCable] = useState<OpticalCable | null>(null);
    const [actionType, setActionType] = useState<'assign' | 'waste'>('assign');
    const [showWaste, setShowWaste] = useState(false);

    const { data: teams = [] } = useQuery<any[]>({
        queryKey: ["/api/teams"],
        enabled: actionDialogOpen && actionType === 'assign'
    });

    const handleAction = (cable: OpticalCable, type: 'assign' | 'waste') => {
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

        // 상태 필터
        if (selectedStatus !== '전체') {
            if (selectedStatus === '창고') {
                // 창고 보관: in_stock이면서 예약 아님
                if (cable.status !== 'in_stock' || cable.reservationStatus === 'reserved') return false;
            } else if (selectedStatus === '예약') {
                // 예약 중: in_stock이면서 예약됨
                if (cable.status !== 'in_stock' || cable.reservationStatus !== 'reserved') return false;
            } else if (selectedStatus === '불출') {
                if (cable.status !== 'assigned') return false;
            } else if (selectedStatus === '반납') {
                if (cable.status !== 'returned') return false;
            }
        }

        // 폐기 케이블 숨김 처리
        if (!showWaste && cable.status === 'waste') return false;
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
        productName: 90,        // 품명
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
            toast({ title: "광케이블 품명이 등록되었습니다" });
            closeDialog();
        },
        onError: (error: Error) => {
            toast({ title: "등록 실패", description: error.message, variant: "destructive" });
        }
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: OpticalCableFormData }) => {
            const res = await apiRequest("PATCH", `/api/optical-cables/${id}`, data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables"] });
            toast({ title: "광케이블 정보가 수정되었습니다" });
            closeDialog();
        },
        onError: (error: Error) => {
            toast({ title: "수정 실패", description: error.message, variant: "destructive" });
        }
    });

    // Delete Mutation (Permanent)
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            // Using bulk-delete with single ID for now as explicit single delete route might not exist or use same logic
            return apiRequest("POST", "/api/optical-cables/bulk-delete", { ids: [id] });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables"] });
            toast({ title: "광케이블이 삭제되었습니다" });
        },
        onError: (error: Error) => {
            toast({ title: "삭제 실패", description: error.message, variant: "destructive" });
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
            "품명": item.productName,
            "비고": item.remark,
            "입고량": (item.remainingLength || 0) + (item.usedLength || 0) + (item.wasteLength || 0),
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

    const returnApprovalMutation = useMutation({
        mutationFn: async ({ id, action }: { id: string; action: 'approve' | 'reject' }) => {
            return apiRequest("POST", `/api/optical-cables/${id}/approve-return`, { action });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables"] });
            toast({ title: "반납 처리가 완료되었습니다" });
        },
        onError: (error: Error) => {
            toast({ title: "처리 실패", description: error.message, variant: "destructive" });
        }
    });

    const handleReturnApproval = (id: string, action: 'approve' | 'reject') => {
        const actionText = action === 'approve' ? '승인' : '반려';
        if (confirm(`반납을 ${actionText}하시겠습니까?`)) {
            returnApprovalMutation.mutate({ id, action });
        }
    };

    // Helper functions for filter management
    const getActiveFilters = () => {
        const filters: Array<{ key: string; label: string }> = [];

        if (selectedCategory !== '전체') {
            filters.push({ key: 'category', label: selectedCategory });
        }
        if (selectedCoreCount !== '전체') {
            filters.push({ key: 'core', label: `${selectedCoreCount}c` });
        }
        if (selectedStatus !== '전체') {
            filters.push({ key: 'status', label: selectedStatus });
        }
        if (minRemaining || maxRemaining) {
            filters.push({
                key: 'range',
                label: `${minRemaining || 0}~${maxRemaining || '∞'}m`
            });
        }


        return filters;
    };

    const removeFilter = (key: string) => {
        if (key === 'category') setSelectedCategory('전체');
        else if (key === 'core') setSelectedCoreCount('전체');
        else if (key === 'status') setSelectedStatus('전체');
        else if (key === 'range') {
            setMinRemaining('');
            setMaxRemaining('');
        }

    };

    const resetFilters = () => {
        setSelectedCategory('전체');
        setSelectedCoreCount('전체');
        setSelectedStatus('전체');
        setMinRemaining('');
        setMaxRemaining('');
        setShowWaste(false);
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

                {/* Search and Filter Section */}
                {/* Search and Filter Section */}
                <div className="space-y-2">
                    {/* Search Bar and Filter Button */}
                    {/* Search Bar and Filter Button */}
                    <div className="flex items-center gap-2">
                        <div className="relative w-64 md:w-72 lg:w-80 shrink-0">
                            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="드럼번호, 규격 검색..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-8 text-sm"
                            />
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setFilterOpen(!filterOpen)}
                            className="gap-2 h-8 shrink-0"
                        >
                            <Filter className="h-3.5 w-3.5" />
                            필터
                            {filterOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </Button>

                        {/* Active Filter Chips - Moved Here Inline */}
                        {getActiveFilters().length > 0 && (
                            <div className="flex-1 flex flex-wrap items-center gap-1.5 overflow-hidden h-8">
                                <div className="h-4 w-[1px] bg-border mx-1 shrink-0" />
                                {getActiveFilters().map(filter => (
                                    <Badge
                                        key={filter.key}
                                        variant="secondary"
                                        className="gap-1 pr-1 py-0 h-6 text-xs font-normal shrink-0"
                                    >
                                        {filter.label}
                                        <button
                                            onClick={() => removeFilter(filter.key)}
                                            className="ml-0.5 hover:bg-muted-foreground/20 rounded-full p-0.5"
                                        >
                                            <X className="h-2.5 w-2.5" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        )}

                        {/* Spacer to push button to right if no chips or few chips */}



                        <div className="text-sm text-muted-foreground ml-auto whitespace-nowrap pl-2">
                            총 <span className="font-semibold text-foreground">{rangeFilteredCables.length}</span>개 품목
                        </div>
                    </div>

                    {/* Collapsible Filter Panel */}
                    {filterOpen && (
                        <div className="p-3 border rounded-lg bg-muted/30">
                            <div className="flex flex-wrap items-end gap-2">
                                {/* Category Filter */}
                                <div className="w-[110px]">
                                    <label className="text-xs font-medium mb-1 block text-muted-foreground">구분</label>
                                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                        <SelectTrigger className="h-8 text-xs">
                                            <SelectValue placeholder="구분" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="전체">전체</SelectItem>
                                            {categories.filter(c => c !== "전체").map(category => (
                                                <SelectItem key={String(category)} value={String(category)}>
                                                    {String(category)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Core Count Filter */}
                                <div className="w-[100px]">
                                    <label className="text-xs font-medium mb-1 block text-muted-foreground">코어</label>
                                    <Select value={selectedCoreCount} onValueChange={setSelectedCoreCount}>
                                        <SelectTrigger className="h-8 text-xs">
                                            <SelectValue placeholder="코어" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="전체">전체</SelectItem>
                                            <SelectItem value="24">24c</SelectItem>
                                            <SelectItem value="48">48c</SelectItem>
                                            <SelectItem value="72">72c</SelectItem>
                                            <SelectItem value="96">96c</SelectItem>
                                            <SelectItem value="144">144c</SelectItem>
                                            <SelectItem value="288">288c</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Status Filter */}
                                <div className="w-[110px]">
                                    <label className="text-xs font-medium mb-1 block text-muted-foreground">상태</label>
                                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                                        <SelectTrigger className="h-8 text-xs">
                                            <SelectValue placeholder="상태" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="전체">전체</SelectItem>
                                            <SelectItem value="창고">창고 보관</SelectItem>
                                            <SelectItem value="예약">예약 중</SelectItem>
                                            <SelectItem value="불출">현장 불출</SelectItem>
                                            <SelectItem value="반납">반납됨</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Remaining Length Range */}
                                <div className="w-[180px]">
                                    <label className="text-xs font-medium mb-1 block text-muted-foreground">잔량 (m)</label>
                                    <div className="flex items-center gap-1.5">
                                        <Input
                                            type="number"
                                            placeholder="최소"
                                            value={minRemaining}
                                            onChange={(e) => setMinRemaining(e.target.value)}
                                            className="h-8 text-xs px-2"
                                        />
                                        <span className="text-muted-foreground font-light text-xs">~</span>
                                        <Input
                                            type="number"
                                            placeholder="최대"
                                            value={maxRemaining}
                                            onChange={(e) => setMaxRemaining(e.target.value)}
                                            className="h-8 text-xs px-2"
                                        />
                                    </div>
                                </div>

                                {/* Divider for mobile / Spacer */}
                                <div className="flex-1 min-w-[10px]" />

                                {/* Waste Checkbox and Action Buttons */}
                                <div className="flex items-center gap-4 mt-2 sm:mt-0">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="show-waste"
                                            checked={showWaste}
                                            onCheckedChange={(checked) => setShowWaste(checked as boolean)}
                                            className="h-3.5 w-3.5"
                                        />
                                        <label
                                            htmlFor="show-waste"
                                            className="text-xs font-medium leading-none cursor-pointer"
                                        >
                                            폐기 포함
                                        </label>
                                    </div>
                                    <div className="flex gap-1.5">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={resetFilters}
                                            className="h-8 text-xs px-3"
                                        >
                                            초기화
                                        </Button>

                                    </div>
                                </div>
                            </div>
                        </div>
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
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.productName }}>
                                    품명
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("productName", e)} />
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
                                        className={`h-6 [&_td]:py-0 cursor-pointer hover:bg-muted/50 ${cable.returnRequestStatus === 'pending'
                                            ? 'bg-yellow-100/50 hover:bg-yellow-100/70'
                                            : cable.reservationStatus === 'reserved'
                                                ? 'bg-orange-100/40 hover:bg-orange-100/60'
                                                : cable.status === 'assigned'
                                                    ? 'bg-blue-100/30'
                                                    : cable.status === 'waste'
                                                        ? 'bg-red-100 hover:bg-red-200 text-red-900'
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
                                        <TableCell className="text-center align-middle whitespace-nowrap font-medium">{cable.productName}</TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap">{((cable.remainingLength || 0) + (cable.usedLength || 0) + (cable.wasteLength || 0)).toLocaleString()}</TableCell>
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

                                                    {cable.status === 'in_stock' && cable.reservationStatus !== 'reserved' && (
                                                        <DropdownMenuItem onClick={() => handleAction(cable, 'assign')}>
                                                            <ArrowRightLeft className="mr-2 h-4 w-4" />
                                                            불출 (Assign)
                                                        </DropdownMenuItem>
                                                    )}

                                                    {/* 반납 대기 중인 경우 승인/반려 버튼 표시 */}
                                                    {cable.returnRequestStatus === 'pending' && (
                                                        <>
                                                            <DropdownMenuItem
                                                                onClick={() => handleReturnApproval(cable.id, 'approve')}
                                                                className="text-green-600 focus:text-green-600"
                                                            >
                                                                <ArrowRightLeft className="mr-2 h-4 w-4" />
                                                                반납 승인
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => handleReturnApproval(cable.id, 'reject')}
                                                                className="text-orange-600 focus:text-orange-600"
                                                            >
                                                                <ArrowRightLeft className="mr-2 h-4 w-4" />
                                                                반납 반려
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}

                                                    {/* Waste is available unless already wasted or used up or reserved */}
                                                    {['in_stock', 'assigned', 'returned'].includes(cable.status) && cable.reservationStatus !== 'reserved' && (
                                                        <DropdownMenuItem onClick={() => handleAction(cable, 'waste')} className="text-destructive focus:text-destructive">
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            폐기 (Waste)
                                                        </DropdownMenuItem>
                                                    )}

                                                    <DropdownMenuItem onClick={() => openDialog(cable)}>
                                                        <Pencil className="mr-2 h-4 w-4" />
                                                        수정
                                                    </DropdownMenuItem>
                                                    {isTenantOwner && (
                                                        <DropdownMenuItem
                                                            className="text-red-600 focus:text-red-600"
                                                            onClick={() => {
                                                                if (confirm("정말 삭제하시겠습니까? (복구 불가)")) {
                                                                    deleteMutation.mutate(cable.id);
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            완전 삭제
                                                        </DropdownMenuItem>
                                                    )}
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

            {/* Dialogs */}
            <OpticalCableFormDialog
                open={dialogOpen}
                onOpenChange={(open) => !open && closeDialog()}
                onSubmit={(data) => {
                    if (editingItem) {
                        updateMutation.mutate({ id: editingItem.id, data });
                    } else {
                        createMutation.mutate(data);
                    }
                }}
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
};
