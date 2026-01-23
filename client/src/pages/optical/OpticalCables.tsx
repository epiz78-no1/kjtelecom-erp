import React, { useState, useMemo } from 'react';
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQuery } from "@tanstack/react-query";
import { useColumnResize } from "@/hooks/useColumnResize";
import { useToast } from "@/hooks/use-toast";
import { useOpticalCables } from "@/hooks/useOpticalCables";
import {
    useCreateOpticalCable,
    useUpdateOpticalCable,
    useDeleteOpticalCable,
    useBulkDeleteOpticalCables,
    useBulkUploadOpticalCables,
    useReturnApproval
} from "@/hooks/useOpticalMutations";
import { Loader2, Plus, Pencil, Trash2, Download, ArrowRightLeft, History, Filter, ChevronDown, ChevronUp, MoreHorizontal, Calendar, CalendarX, Send, CheckCircle, XCircle, AlertTriangle, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/SearchInput";
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
import { OpticalReserveDialog } from "@/components/OpticalReserveDialog";
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
    MultiSelectFilter
} from "@/components/ui/multi-select-filter";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { OpticalCable, OpticalCableLog } from "@shared/schema";
import { useDialogState } from "@/hooks/useDialogState";
import { useTableFilters } from "@/hooks/useTableFilters";
import { OPTICAL_CABLE_COLUMNS } from "@/lib/optical-table-columns";
import { useOpticalFilters } from "@/hooks/useOpticalFilters";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { InfiniteScrollLoader } from "@/components/InfiniteScrollLoader";

export default function OpticalCables() {
    const { toast } = useToast();
    const { user, tenants, currentTenant, checkPermission } = useAppContext();
    const isTenantOwner = tenants.find(t => t.id === currentTenant)?.role === 'owner';
    const canWrite = checkPermission('inventory', 'write') || isTenantOwner;

    const { data: cables = [], isLoading } = useOpticalCables();

    const {
        searchQuery,
        setSearchQuery,
        filteredItems: searchedCables,
        categories
    } = useTableFilters(cables, {
        searchFields: ["drumNo", "spec", "productName", "manufacturer", "manufactureYear", "division"],
        categoryField: "category"
    });

    // Extract unique divisions
    const divisions = useMemo(() => {
        return Array.from(new Set(cables.map(c => c.division).filter(Boolean))).sort();
    }, [cables]);

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

    // Delete & Confirmation Dialog States
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

    // Return Approval Dialog State
    const [returnDialogOpen, setReturnDialogOpen] = useState(false);
    const [returnAction, setReturnAction] = useState<{ id: string, action: 'approve' | 'reject' } | null>(null);

    // Reservation Dialog State
    const [reserveDialogOpen, setReserveDialogOpen] = useState(false);
    const [selectedReserveCable, setSelectedReserveCable] = useState<OpticalCable | null>(null);

    // Optical Filters Hook
    const {
        minRemaining, setMinRemaining,
        maxRemaining, setMaxRemaining,
        selectedDivision, setSelectedDivision,
        selectedCategory, setSelectedCategory,
        selectedCoreCount, setSelectedCoreCount,
        selectedStatus, setSelectedStatus,
        filterOpen, setFilterOpen,
        showWaste, setShowWaste,
        filteredCables: rangeFilteredCables,
        getActiveFilters,
        removeFilter,
        resetFilters
    } = useOpticalFilters(searchedCables);

    // Action Dialog State
    const [actionDialogOpen, setActionDialogOpen] = useState(false);
    const [selectedActionCable, setSelectedActionCable] = useState<OpticalCable | null>(null);
    const [actionType, setActionType] = useState<'assign' | 'waste'>('assign');

    const { data: teams = [] } = useQuery<any[]>({
        queryKey: ["/api/teams"],
        enabled: actionDialogOpen && actionType === 'assign'
    });

    const handleAction = (cable: OpticalCable, type: 'assign' | 'waste') => {
        setSelectedActionCable(cable);
        setActionType(type);
        setActionDialogOpen(true);
    };



    const { widths, startResizing } = useColumnResize(OPTICAL_CABLE_COLUMNS);

    const createMutation = useCreateOpticalCable();
    const updateMutation = useUpdateOpticalCable();
    const deleteMutation = useDeleteOpticalCable();
    const bulkDeleteMutation = useBulkDeleteOpticalCables();
    const bulkUploadMutation = useBulkUploadOpticalCables();
    const returnApprovalMutation = useReturnApproval();

    // Filter logic removed (handled by hook)

    const handleExcelDownload = () => {
        const data = rangeFilteredCables.map(item => ({
            "관리번호": item.managementNo,
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

    const {
        items: displayCables,
        hasMore,
        isLoading: scrollLoading,
        observerRef
    } = useInfiniteScroll(rangeFilteredCables, {
        initialPageSize: 100,
        pageSize: 100
    });

    const allSelected = displayCables.length > 0 && displayCables.every(cable => selectedIds.has(cable.id));

    const toggleSelectAll = () => {
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(displayCables.map(cable => cable.id)));
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
        setBulkDeleteDialogOpen(true);
    };

    const handleReturnApproval = (id: string, action: 'approve' | 'reject') => {
        setReturnAction({ id, action });
        setReturnDialogOpen(true);
    };

    const getAllActiveFilters = () => {
        return getActiveFilters();
    };

    const handleRemoveFilter = (key: string) => {
        removeFilter(key);
    };

    const handleResetFilters = () => {
        resetFilters();
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
                <Loader2 className="h-10 w-10 animate-spin text-primary/80" />
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
                            자재현황
                            <span className="flex h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50 animate-pulse"></span>
                        </h1>
                        <div className="h-3 w-px bg-slate-200 dark:bg-slate-800"></div>
                        <span className="text-xs font-medium text-slate-500">{rangeFilteredCables.length} items</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {cables.filter(c => c.returnRequestStatus === 'pending').length > 0 && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex items-center justify-center h-7 w-7 rounded-md bg-amber-50 text-amber-600 animate-pulse cursor-pointer">
                                            <AlertTriangle className="h-3.5 w-3.5" />
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="text-xs">반납 대기 {cables.filter(c => c.returnRequestStatus === 'pending').length}건</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}

                        <SearchInput
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="검색..."
                            className="w-32 focus:w-48 h-7 text-xs rounded-md bg-white border-slate-200 focus:ring-1 focus:ring-primary/20 transition-all font-normal"
                        />

                        <div className="flex items-center gap-1">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant={filterOpen ? "secondary" : "ghost"}
                                            size="icon"
                                            onClick={() => setFilterOpen(!filterOpen)}
                                            className={cn("h-7 w-7 rounded-md", filterOpen && "bg-slate-200 text-slate-900")}
                                        >
                                            <Filter className="h-3.5 w-3.5 text-slate-500" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="text-xs">필터</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>



                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 rounded-md text-emerald-600 hover:bg-emerald-50"
                                            onClick={handleExcelDownload}
                                        >
                                            <Download className="h-3.5 w-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="text-xs">Excel 다운로드</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>

                            <DropdownMenu>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <DropdownMenuTrigger asChild>
                                                <Button disabled={!canWrite} size="icon" className="h-7 w-7 rounded-md bg-primary hover:bg-primary/90 shadow-sm">
                                                    <Plus className="h-3.5 w-3.5 text-white" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" className="text-xs">신규 등록</TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                <DropdownMenuContent align="end" className="w-32 p-1">
                                    <DropdownMenuItem onClick={() => canWrite && openDialog()} className="text-xs py-1.5 cursor-pointer rounded-md">
                                        <Plus className="h-3 w-3 mr-2 text-primary" /> 직접 등록
                                    </DropdownMenuItem>
                                    {isTenantOwner && (
                                        <DropdownMenuItem onClick={() => setBulkUploadOpen(true)} className="text-xs py-1.5 cursor-pointer rounded-md">
                                            <Upload className="h-3 w-3 mr-2 text-blue-600" /> 일괄 등록
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>

                {/* Compact Expandable Filter Panel */}
                {filterOpen && (
                    <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 animate-in fade-in slide-in-from-top-1 duration-200 mt-1">
                        <div className="flex flex-wrap items-end gap-2">

                            <div className="space-y-0.5 min-w-[120px]">
                                <MultiSelectFilter
                                    title="사업 (전체)"
                                    options={divisions.map(d => ({ label: String(d), value: String(d) }))}
                                    selectedValues={selectedDivision}
                                    onChange={setSelectedDivision}
                                    className="w-full"
                                />
                            </div>
                            <div className="space-y-0.5 min-w-[120px]">
                                <MultiSelectFilter
                                    title="구분 (전체)"
                                    options={categories.filter(c => c !== "전체").map(c => ({ label: String(c), value: String(c) }))}
                                    selectedValues={selectedCategory}
                                    onChange={setSelectedCategory}
                                    className="w-full"
                                />
                            </div>
                            <div className="space-y-0.5 min-w-[120px]">
                                <MultiSelectFilter
                                    title="상태 (전체)"
                                    options={[
                                        { label: "창고 보관", value: "창고" },
                                        { label: "예약 중", value: "예약" },
                                        { label: "현장 불출", value: "불출" },
                                        { label: "반납신청", value: "반납" },
                                        { label: "폐기", value: "폐기" },
                                    ]}
                                    selectedValues={selectedStatus}
                                    onChange={setSelectedStatus}
                                    className="w-full"
                                />
                            </div>
                            <div className="space-y-0.5 min-w-[120px]">
                                <MultiSelectFilter
                                    title="코어 (전체)"
                                    options={[
                                        { label: "24c", value: "24" },
                                        { label: "48c", value: "48" },
                                        { label: "72c", value: "72" },
                                        { label: "96c", value: "96" },
                                        { label: "144c", value: "144" },
                                        { label: "288c", value: "288" },
                                    ]}
                                    selectedValues={selectedCoreCount}
                                    onChange={setSelectedCoreCount}
                                    className="w-full"
                                />
                            </div>
                            <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5 h-7">
                                    <Input type="number" value={minRemaining} onChange={e => setMinRemaining(e.target.value)} placeholder="Min (m)" className="h-full text-xs rounded-md bg-slate-50/50 w-[70px]" />
                                    <span className="text-slate-300 text-[10px]">-</span>
                                    <Input type="number" value={maxRemaining} onChange={e => setMaxRemaining(e.target.value)} placeholder="Max (m)" className="h-full text-xs rounded-md bg-slate-50/50 w-[70px]" />
                                </div>
                            </div>
                            <div className="flex items-center space-x-2 h-7 ml-auto">
                                <Checkbox id="show-waste" checked={showWaste} onCheckedChange={(checked) => setShowWaste(checked as boolean)} className="h-3.5 w-3.5" />
                                <label htmlFor="show-waste" className="text-xs font-medium leading-none text-slate-600 cursor-pointer">
                                    폐기 포함
                                </label>
                            </div>

                            {getAllActiveFilters().length > 0 && (
                                <div className="flex items-center gap-1 flex-wrap justify-end mt-2 pt-1 border-t border-slate-100 dark:border-zinc-800">
                                    {getAllActiveFilters().map(filter => (
                                        <Badge
                                            key={filter.key}
                                            variant="secondary"
                                            className="h-5 px-1.5 rounded-md bg-slate-100 text-slate-700 border-0 text-[10px]"
                                        >
                                            {filter.label}
                                            <button
                                                onClick={() => handleRemoveFilter(filter.key)}
                                                className="ml-1 hover:bg-slate-300 rounded-full p-0.5"
                                            >
                                                <X className="h-2 w-2" />
                                            </button>
                                        </Badge>
                                    ))}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleResetFilters}
                                        className="h-5 text-[10px] text-muted-foreground hover:text-foreground px-1.5"
                                    >
                                        초기화
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>  {/* Bulk Action Bar */}
            {selectedIds.size > 0 && isTenantOwner && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-4">
                    <span className="font-semibold text-sm">{selectedIds.size}개 항목 선택됨</span>
                    <div className="h-4 w-px bg-white/20" />
                    <button
                        onClick={handleBulkDelete}
                        disabled={bulkDeleteMutation.isPending || !canWrite}
                        className="text-red-400 hover:text-red-300 text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                    >
                        {bulkDeleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        선택 삭제
                    </button>
                </div>
            )}


            {/* Main Table Area */}
            <div className="flex-1 rounded-3xl border border-slate-200 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-xl shadow-slate-200/50 dark:shadow-black/50 overflow-hidden flex flex-col relative z-0">
                <div className="flex-1 overflow-auto custom-scrollbar relative">
                    <table className="w-full text-sm border-collapse table-fixed">
                        <TableHeader className="sticky top-0 bg-slate-50/95 backdrop-blur z-20 shadow-sm">
                            <TableRow className="h-10 border-b border-slate-200">
                                <TableHead className="w-[40px] text-center p-0">
                                    {isTenantOwner && <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} className="translate-y-[2px]" />}
                                </TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.division }}>사업<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("division", e)} /></TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.category }}>구분<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("category", e)} /></TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.receivedDate }}>입고일<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("receivedDate", e)} /></TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.manufacturer }}>제조사<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("manufacturer", e)} /></TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.manufactureYear }}>연도<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("manufactureYear", e)} /></TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.spec }}>규격<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("spec", e)} /></TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.coreCount }}>코어<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("coreCount", e)} /></TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.drumNo }}>제조번호<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("drumNo", e)} /></TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.location }}>위치<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("location", e)} /></TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.productName }}>품명<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("productName", e)} /></TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.incomingLength }}>입고량<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("incomingLength", e)} /></TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.usedLength }}>사용량<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("usedLength", e)} /></TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.wasteLength }}>폐기<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("wasteLength", e)} /></TableHead>
                                <TableHead className="font-semibold text-primary text-center" style={{ width: widths.remainingLength }}>잔량<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("remainingLength", e)} /></TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.remark }}>비고<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("remark", e)} /></TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.unitPrice }}>단가<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("unitPrice", e)} /></TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.totalAmount }}>금액<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("totalAmount", e)} /></TableHead>
                                <TableHead className="w-[40px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {displayCables.length === 0 && rangeFilteredCables.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={19} className="h-64 text-center text-muted-foreground flex flex-col items-center justify-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                                                <Search className="h-6 w-6 text-slate-400 opacity-50" />
                                            </div>
                                            <p className="font-medium">검색 결과가 없습니다.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                displayCables.map((cable, index) => (
                                    <TableRow
                                        key={cable.id}
                                        className={`group h-10 border-b border-slate-100 dark:border-zinc-800 transition-colors cursor-pointer text-xs
                                            ${!cable.tangoRegistered ? 'bg-red-100/80 hover:bg-red-200/80 border-l-[6px] border-l-red-600'
                                                : cable.returnRequestStatus === 'pending' ? 'bg-amber-50/50 hover:bg-amber-100/50'
                                                    : cable.reservationStatus === 'reserved' ? 'bg-orange-50/50 hover:bg-orange-100/50'
                                                        : cable.status === 'assigned' ? 'bg-blue-50/30 hover:bg-blue-50/60'
                                                            : cable.status === 'waste' ? 'bg-red-50/30 text-red-900 opacity-70 hover:opacity-100'
                                                                : 'hover:bg-slate-50/80'
                                            }
                                        `}
                                        onDoubleClick={() => {
                                            setHistoryItem(cable);
                                            setHistoryOpen(true);
                                        }}
                                    >
                                        <TableCell className="text-center p-0">
                                            {isTenantOwner && (
                                                <Checkbox
                                                    checked={selectedIds.has(cable.id)}
                                                    onCheckedChange={() => toggleSelect(cable.id)}
                                                    className="translate-y-[2px] opacity-0 group-hover:opacity-100 data-[state=checked]:opacity-100 transition-opacity"
                                                />
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center px-1 font-medium text-slate-700">{cable.division || "SKT"}</TableCell>
                                        <TableCell className="text-center px-1 text-slate-500">{cable.category}</TableCell>
                                        <TableCell className="text-center px-1 text-slate-500">{cable.receivedDate}</TableCell>
                                        <TableCell className="text-center px-1 text-slate-500 truncate" title={cable.manufacturer || ''}>{cable.manufacturer}</TableCell>
                                        <TableCell className="text-center px-1 text-slate-500">{cable.manufactureYear}</TableCell>
                                        <TableCell className="text-center px-1 font-medium">{cable.spec}</TableCell>
                                        <TableCell className="text-center px-1 text-slate-500">{cable.coreCount}C</TableCell>
                                        <TableCell className="text-center px-1 font-mono text-slate-700">{cable.drumNo}</TableCell>
                                        <TableCell className="text-center px-1 text-slate-500 truncate">{cable.location}</TableCell>
                                        <TableCell className="text-center px-2">
                                            <div className="w-full truncate font-medium text-slate-700 text-center" title={cable.productName || ''}>
                                                {cable.productName}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center px-2 text-slate-500 font-mono">{((cable.remainingLength || 0) + (cable.usedLength || 0) + (cable.wasteLength || 0)).toLocaleString()}</TableCell>
                                        <TableCell className="text-center px-2 text-slate-500 font-mono">{(cable.usedLength || 0).toLocaleString()}</TableCell>
                                        <TableCell className="text-center px-2 text-slate-400 font-mono">{(cable.wasteLength || 0).toLocaleString()}</TableCell>
                                        <TableCell className="text-center px-2 font-bold font-mono text-primary">{(cable.remainingLength || 0).toLocaleString()}</TableCell>
                                        <TableCell className="text-center px-2 text-slate-400 truncate max-w-[100px]" title={cable.remark || ""}>{cable.remark}</TableCell>
                                        <TableCell className="text-right px-2 text-slate-400 font-mono">{(cable.unitPrice || 0).toLocaleString()}</TableCell>
                                        <TableCell className="text-right px-2 text-slate-500 font-mono">{(cable.totalAmount || 0).toLocaleString()}</TableCell>

                                        <TableCell className="text-center p-0">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <MoreHorizontal className="h-4 w-4 text-slate-400" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48 shadow-xl rounded-xl">
                                                    <DropdownMenuItem onClick={() => { setHistoryItem(cable); setHistoryOpen(true); }} className="gap-2">
                                                        <History className="h-4 w-4" /> 이력 보기
                                                    </DropdownMenuItem>
                                                    {canWrite && (
                                                        <>
                                                            {cable.status === 'in_stock' && cable.reservationStatus !== 'reserved' && (
                                                                <TooltipProvider>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <div>
                                                                                <DropdownMenuItem
                                                                                    onClick={() => {
                                                                                        if (!cable.tangoRegistered) {
                                                                                            toast({ title: "출고 불가", description: "Tango 미등록 케이블은 출고할 수 없습니다. 먼저 등록 상태를 변경해주세요.", variant: "destructive" });
                                                                                            return;
                                                                                        }
                                                                                        setSelectedReserveCable(cable);
                                                                                        setReserveDialogOpen(true);
                                                                                    }}
                                                                                    className="gap-2"
                                                                                    disabled={!cable.tangoRegistered}
                                                                                >
                                                                                    <Calendar className="h-4 w-4" /> 자재 예약
                                                                                </DropdownMenuItem>
                                                                            </div>
                                                                        </TooltipTrigger>
                                                                        {!cable.tangoRegistered && (
                                                                            <TooltipContent side="left" className="text-xs bg-amber-600">
                                                                                Tango 미등록 케이블은 예약할 수 없습니다
                                                                            </TooltipContent>
                                                                        )}
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            )}
                                                            {cable.reservationStatus === 'reserved' && (
                                                                <DropdownMenuItem onClick={() => { setSelectedReserveCable(cable); setReserveDialogOpen(true); }} className="gap-2 text-orange-600">
                                                                    <CalendarX className="h-4 w-4" /> 예약 해제
                                                                </DropdownMenuItem>
                                                            )}
                                                            {cable.status === 'in_stock' && cable.reservationStatus !== 'reserved' && (
                                                                <TooltipProvider>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <div>
                                                                                <DropdownMenuItem
                                                                                    onClick={() => {
                                                                                        if (!cable.tangoRegistered) {
                                                                                            toast({ title: "출고 불가", description: "Tango 미등록 케이블은 출고할 수 없습니다. 먼저 등록 상태를 변경해주세요.", variant: "destructive" });
                                                                                            return;
                                                                                        }
                                                                                        handleAction(cable, 'assign');
                                                                                    }}
                                                                                    className="gap-2 text-blue-600"
                                                                                    disabled={!cable.tangoRegistered}
                                                                                >
                                                                                    <Send className="h-4 w-4" /> 불출 (Assign)
                                                                                </DropdownMenuItem>
                                                                            </div>
                                                                        </TooltipTrigger>
                                                                        {!cable.tangoRegistered && (
                                                                            <TooltipContent side="left" className="text-xs bg-amber-600">
                                                                                Tango 미등록 케이블은 출고할 수 없습니다
                                                                            </TooltipContent>
                                                                        )}
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            )}
                                                            <DropdownMenuItem onClick={() => openDialog(cable)} className="gap-2">
                                                                <Pencil className="h-4 w-4" /> 정보 수정
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                    {isTenantOwner && (
                                                        <>
                                                            <div className="h-px bg-slate-100 my-1" />
                                                            <DropdownMenuItem className="text-red-600 gap-2 focus:text-red-700 focus:bg-red-50"
                                                                onClick={() => {
                                                                    setItemToDelete(cable.id);
                                                                    setDeleteDialogOpen(true);
                                                                }}>
                                                                <Trash2 className="h-4 w-4" /> 완전 삭제
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </table>
                    <InfiniteScrollLoader
                        hasMore={hasMore}
                        isLoading={scrollLoading}
                        observerRef={observerRef}
                        itemCount={displayCables.length}
                        totalCount={rangeFilteredCables.length}
                    />
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
                templateFileName="optical_incoming_template.csv"
                validateRow={validateOpticalRow}
                transformRow={transformOpticalRow}
                columns={opticalColumns}
                onUpload={(items) => {
                    bulkUploadMutation.mutate(items, {
                        onSuccess: () => setBulkUploadOpen(false)
                    });
                }}
                isLoading={bulkUploadMutation.isPending}
            />

            <OpticalCableHistoryDialog
                open={historyOpen}
                onOpenChange={setHistoryOpen}
                cableId={historyItem?.id?.toString() || null}
                drumNo={historyItem?.drumNo}
                initialCable={historyItem}
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

            <OpticalReserveDialog
                open={reserveDialogOpen}
                onOpenChange={setReserveDialogOpen}
                cable={selectedReserveCable}
            />

            {/* Delete Confirmation */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>자재 영구 삭제</AlertDialogTitle>
                        <AlertDialogDescription>
                            이 자재를 시스템에서 영구적으로 삭제하시겠습니까?
                            <br />
                            관련된 모든 입출고 내역도 함께 삭제될 수 있으며, 이 작업은 되돌릴 수 없습니다.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (itemToDelete) {
                                    deleteMutation.mutate(itemToDelete);
                                    setDeleteDialogOpen(false);
                                    setItemToDelete(null);
                                }
                            }}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        >
                            {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            삭제
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Bulk Delete Confirmation */}
            <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>자재 일괄 삭제</AlertDialogTitle>
                        <AlertDialogDescription>
                            선택한 {selectedIds.size}개의 자재를 영구적으로 삭제하시겠습니까?
                            <br />
                            이 작업은 되돌릴 수 없습니다.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                bulkDeleteMutation.mutate(Array.from(selectedIds), {
                                    onSuccess: () => {
                                        setSelectedIds(new Set());
                                        setBulkDeleteDialogOpen(false);
                                    }
                                });
                            }}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        >
                            {bulkDeleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            일괄 삭제
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Return Approval/Rejection Confirmation */}
            <AlertDialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>반납 {returnAction?.action === 'approve' ? '승인' : '반려'}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {returnAction?.action === 'approve'
                                ? '이 반납 요청을 승인하여 자재를 "창고(보관)" 상태로 변경하시겠습니까?'
                                : '이 반납 요청을 반려하시겠습니까?'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (returnAction) {
                                    returnApprovalMutation.mutate({ id: returnAction.id, action: returnAction.action });
                                    setReturnDialogOpen(false);
                                    setReturnAction(null);
                                }
                            }}
                            className={returnAction?.action === 'approve' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}
                        >
                            {returnApprovalMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {returnAction?.action === 'approve' ? '승인' : '반려'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </div >
    );
};
