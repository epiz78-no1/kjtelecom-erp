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
import { OpticalBulkUploadDialog } from "@/components/OpticalBulkUploadDialog";
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

export default function OpticalCables() {
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all"); // New category filter
    const [dialogOpen, setDialogOpen] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [bulkUploadOpen, setBulkUploadOpen] = useState(false); // New bulk upload dialog
    const [editingItem, setEditingItem] = useState<OpticalCable | null>(null);
    const [historyItem, setHistoryItem] = useState<OpticalCable | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

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

    const { user, tenants, currentTenant } = useAppContext();
    const isTenantOwner = tenants.find(t => t.id === currentTenant)?.role === 'owner';

    const { data: cables = [], isLoading } = useQuery<(OpticalCable & { logs: OpticalCableLog[] })[]>({
        queryKey: ["/api/optical-cables"],
    });

    const { widths, startResizing } = useColumnResize({
        checkbox: 40,
        division: 50,
        category: 60,
        receivedDate: 90,
        manufacturer: 80,
        manufactureYear: 70,
        spec: 100,
        coreCount: 50,
        drumNo: 120,
        location: 60,
        totalLength: 80,
        incomingLength: 80,
        usedLength: 80,
        wasteLength: 60,
        remainingLength: 80,
        unitPrice: 90,
        totalAmount: 110,
        remark: 60,
        actions: 50
    });

    const createMutation = useMutation({
        mutationFn: async (data: OpticalCableFormData) => {
            const res = await apiRequest("POST", "/api/optical-cables", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables"] });
            toast({ title: "광케이블 드럼이 등록되었습니다" });
            setDialogOpen(false);
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

    const categories = Array.from(new Set(cables.map(c => c.category).filter(Boolean)));

    // Filter
    const filteredCables = cables.filter(cable => {
        const matchesSearch = cable.drumNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
            cable.spec.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === "all" || cable.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

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

    const allSelected = filteredCables.length > 0 && filteredCables.every(cable => selectedIds.has(cable.id));

    const toggleSelectAll = () => {
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredCables.map(cable => cable.id)));
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

    const openDialog = (item?: OpticalCable) => {
        setEditingItem(item || null);
        setDialogOpen(true);
    };

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
                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="구분 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">전체</SelectItem>
                                    {categories.map(category => (
                                        <SelectItem key={category} value={category}>
                                            {category}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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
                        총 <span className="font-semibold text-foreground">{filteredCables.length}</span>개 품목
                    </div>
                </div>
            </div>

            <div className="flex-1 rounded-md border overflow-hidden">
                <div className="h-full overflow-auto relative pb-20">
                    <table className="w-max caption-bottom text-sm table-fixed">
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
                            {filteredCables.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={19} className="text-center py-8 text-muted-foreground">
                                        등록된 광케이블 드럼이 없습니다.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredCables.map((cable) => (
                                    <TableRow key={cable.id} className="h-8 [&_td]:py-1">
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
                onOpenChange={setDialogOpen}
                onSubmit={(data) => createMutation.mutate(data)}
                editingItem={editingItem}
            />

            <OpticalBulkUploadDialog
                open={bulkUploadOpen}
                onOpenChange={setBulkUploadOpen}
                onUpload={(items) => bulkUploadMutation.mutate(items)}
            />

            <OpticalCableHistoryDialog
                open={historyOpen}
                onOpenChange={setHistoryOpen}
                cableId={historyItem?.id?.toString() || null}
                drumNo={historyItem?.drumNo}
            />

            {selectedActionCable && (
                <OpticalCableActionDialog
                    open={actionDialogOpen}
                    onOpenChange={setActionDialogOpen}
                    cable={selectedActionCable}
                    actionType={actionType}
                    teams={teams}
                />
            )}
        </div >
    );
}
