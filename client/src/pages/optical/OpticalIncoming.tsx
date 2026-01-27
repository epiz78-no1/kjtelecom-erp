import React, { useState, useMemo } from 'react';
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, ArrowDownToLine, Plus, MoreHorizontal, Pencil, Download, Paperclip, FileText, Search } from "lucide-react";
import * as XLSX from "xlsx";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
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
import { Card, CardContent } from "@/components/ui/card";
import {
    TableHeader,
    TableRow,
    TableHead,
    TableBody,
    TableCell,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useAppContext } from "@/contexts/AppContext";
import { useColumnResize } from "@/hooks/useColumnResize";
import { Trash2 } from "lucide-react";
import { SearchInput } from "@/components/ui/SearchInput";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { OpticalCableFormDialog } from "@/components/optical/OpticalCableFormDialog";
import { useToast } from "@/hooks/use-toast";
import type { OpticalCable, OpticalCableLog } from "@shared/schema";
import { useOpticalLogs } from "@/hooks/useOpticalCables";
import {
    useCreateOpticalCable,
    useUpdateOpticalCable,
    useDeleteOpticalLog,
    useBulkDeleteOpticalLogs,
    useBulkUploadOpticalCables
} from "@/hooks/useOpticalMutations";

import { useDownload } from "@/hooks/useDownload";
import { useDialogState } from "@/hooks/useDialogState";
import { useTableFilters } from "@/hooks/useTableFilters";
import { GenericBulkUploadDialog } from "@/components/dialogs/GenericBulkUploadDialog";
import { validateOpticalRow, transformOpticalRow, opticalColumns, downloadOpticalTemplate } from "@/lib/bulk-configs/optical";
import { Upload } from "lucide-react";
import { OPTICAL_LOG_COLUMNS } from "@/lib/optical-table-columns";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { InfiniteScrollLoader } from "@/components/layout/InfiniteScrollLoader";

export default function OpticalIncoming() {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const { toast } = useToast();
    const { tenants, currentTenant, checkPermission } = useAppContext();
    const isTenantOwner = tenants.find(t => t.id === currentTenant)?.role === 'owner';
    const canWrite = checkPermission('incoming', 'write') || isTenantOwner;
    const { open: dialogOpen, editingItem: editingCable, handleOpen: openDialog, handleClose: closeDialog } = useDialogState<OpticalCable>();
    const { downloadFile, downloadAttachment } = useDownload();
    const [bulkUploadOpen, setBulkUploadOpen] = useState(false);

    // Delete Dialog State
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

    const bulkUploadMutation = useBulkUploadOpticalCables();

    const handleBulkUpload = (items: any[]) => {
        bulkUploadMutation.mutate(items, {
            onSuccess: () => {
                setBulkUploadOpen(false);
            }
        });
    };

    const handleExcelDownload = () => {
        const data = filteredLogs.map((item: any) => ({
            "사업": item.cable?.division || "SKT",
            "구분": item.cable?.category || "-",
            "입고일자": item.receivedDate || item.usageDate || item.createdAt,
            "공사번호": item.projectCode || "-",
            "공사명": item.projectName || item.cable?.projectName || "-",
            "제조사": item.cable?.manufacturer || "-",
            "제조연도": item.cable?.manufactureYear || "-",
            "규격": item.cable?.spec || "-",
            "코어": item.cable?.coreCount || "-",
            "제조번호": item.drumNo || item.cable?.drumNo || "-",
            "위치": item.cable?.location || "-",
            "품명": item.cable?.productName || "-",
            "입고량": (item.cable?.remainingLength || 0) + (item.cable?.usedLength || 0) + (item.cable?.wasteLength || 0),
            "비고": item.cable?.remark || item.remark || "-",
            "입력자": item.createdByName || "-",
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "광케이블 입고내역");
        XLSX.writeFile(wb, `광케이블_입고내역_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const { widths, startResizing } = useColumnResize(OPTICAL_LOG_COLUMNS);

    const { data: logs = [], isLoading } = useOpticalLogs();

    const createMutation = useCreateOpticalCable();

    const updateMutation = useUpdateOpticalCable();

    const bulkDeleteMutation = useBulkDeleteOpticalLogs();

    const deleteMutation = useDeleteOpticalLog();

    const incomingLogs = logs.filter(l => ['receive', 'create', 'incoming'].includes(l.logType));

    const {
        searchQuery,
        setSearchQuery,
        filteredItems: filteredLogs
    } = useTableFilters(incomingLogs.map(log => ({
        ...log,
        drumNo: log.cable?.drumNo || '',
        spec: log.cable?.spec || ''
    })), {
        searchFields: ["drumNo", "spec"]
    });

    const {
        items: displayLogs,
        hasMore,
        isLoading: scrollLoading,
        observerRef
    } = useInfiniteScroll(filteredLogs, {
        initialPageSize: 100,
        pageSize: 100
    });

    const allSelected = displayLogs.length > 0 && displayLogs.every(log => selectedIds.has(log.id));

    const toggleSelectAll = () => {
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(displayLogs.map(log => log.id)));
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

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>

        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-zinc-950/50 p-2 overflow-hidden">
            {/* Header Section */}
            {/* Ultra Compact Header Section */}
            <div className="flex flex-col gap-2 flex-shrink-0 mb-2 pt-1">
                <div className="flex items-center justify-between gap-2 px-1">
                    <div className="flex items-center gap-2">
                        <h1 className="text-base font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            광케이블 입고
                            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse"></span>
                        </h1>
                        <div className="h-3 w-px bg-slate-200 dark:bg-slate-800"></div>
                        <span className="text-xs font-medium text-slate-500">{filteredLogs.length} Records</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {selectedIds.size > 0 && isTenantOwner && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="destructive"
                                            size="icon"
                                            onClick={handleBulkDelete}
                                            disabled={bulkDeleteMutation.isPending || !canWrite}
                                            className="h-7 w-7 rounded-md shadow-sm"
                                        >
                                            {bulkDeleteMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="text-xs">선택 삭제 ({selectedIds.size})</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}

                        <SearchInput
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="검색..."
                            className="w-32 focus:w-48 h-7 text-xs rounded-md bg-white border-slate-200 focus:ring-1 focus:ring-primary/20 transition-all font-normal"
                        />

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
                                    <TooltipContent side="bottom" className="text-xs">입고 등록</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <DropdownMenuContent align="end" className="w-32 p-1">
                                <DropdownMenuItem onSelect={() => canWrite && openDialog()} className="text-xs py-1.5 cursor-pointer rounded-md">
                                    <Plus className="h-3 w-3 mr-2 text-primary" />
                                    직접 등록
                                </DropdownMenuItem>
                                {isTenantOwner && (
                                    <DropdownMenuItem onSelect={() => setBulkUploadOpen(true)} className="text-xs py-1.5 cursor-pointer rounded-md">
                                        <Upload className="h-3 w-3 mr-2 text-blue-600" />
                                        일괄 등록
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>

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
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.receivedDate }}>입고일자<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("receivedDate", e)} /></TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.projectCode }}>공사번호<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("projectCode", e)} /></TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.projectName }}>공사명<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("projectName", e)} /></TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.manufacturer }}>제조사<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("manufacturer", e)} /></TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.manufactureYear }}>연도<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("manufactureYear", e)} /></TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.spec }}>규격<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("spec", e)} /></TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.coreCount }}>코어<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("coreCount", e)} /></TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.drumNo }}>제조번호<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("drumNo", e)} /></TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.location }}>위치<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("location", e)} /></TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.totalLength }}>품명<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("totalLength", e)} /></TableHead>
                                <TableHead className="font-semibold text-primary text-center" style={{ width: 90 }}>입고량</TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.remark }}>비고<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("remark", e)} /></TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.createdBy }}>입력자<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("createdBy", e)} /></TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.attachment }}>첨부<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("attachment", e)} /></TableHead>
                                <TableHead className="w-[40px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {displayLogs.length === 0 && filteredLogs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={18} className="h-64 text-center text-muted-foreground flex flex-col items-center justify-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                                                <Search className="h-6 w-6 text-slate-400 opacity-50" />
                                            </div>
                                            <p className="font-medium">입고 내역이 없습니다.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                displayLogs.map((log) => (
                                    <TableRow
                                        key={log.id}
                                        className="group h-10 border-b border-slate-100 dark:border-zinc-800 hover:bg-slate-50/80 transition-colors cursor-default text-xs"
                                    >
                                        <TableCell className="text-center p-0">
                                            {isTenantOwner && (
                                                <Checkbox
                                                    checked={selectedIds.has(log.id)}
                                                    onCheckedChange={() => toggleSelect(log.id)}
                                                    className="translate-y-[2px] opacity-0 group-hover:opacity-100 data-[state=checked]:opacity-100 transition-opacity"
                                                />
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center px-1 font-medium text-slate-700">{log.cable?.division || 'SKT'}</TableCell>
                                        <TableCell className="text-center px-1 text-slate-500">{log.cable?.category || '-'}</TableCell>
                                        <TableCell className="text-center px-1 text-slate-500 font-mono">
                                            {log.usageDate
                                                ? format(new Date(log.usageDate), 'yyyy-MM-dd')
                                                : format(new Date(log.createdAt), 'yyyy-MM-dd')}
                                        </TableCell>
                                        <TableCell className="text-center px-1 text-slate-500 font-mono">{(log as any).projectCode || '-'}</TableCell>
                                        <TableCell className="px-2">
                                            <div className="w-full truncate text-slate-600 text-left" title={(log as any).projectNameUsage || log.cable?.projectName || ''}>
                                                {(log as any).projectNameUsage || log.cable?.projectName || ''}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center px-1 text-slate-500 truncate" title={log.cable?.manufacturer || ''}>{log.cable?.manufacturer || ''}</TableCell>
                                        <TableCell className="text-center px-1 text-slate-500">{log.cable?.manufactureYear || ''}</TableCell>
                                        <TableCell className="text-center px-1 font-medium text-slate-700">{log.cable?.spec || ''}</TableCell>
                                        <TableCell className="text-center px-1 text-slate-500">{log.cable?.coreCount || '-'}C</TableCell>
                                        <TableCell className="text-center px-1 font-mono text-slate-700">{log.cable?.drumNo || ''}</TableCell>
                                        <TableCell className="text-center px-1 text-slate-500">{log.cable?.location || ''}</TableCell>
                                        <TableCell className="px-2 text-center">
                                            <div className="w-full truncate font-medium text-slate-700 text-center" title={String(log.cable?.productName || '')}>
                                                {String(log.cable?.productName || '')}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center px-1 font-bold text-emerald-600 font-mono">
                                            {((log.cable?.remainingLength || 0) + (log.cable?.usedLength || 0) + (log.cable?.wasteLength || 0)).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="px-2 text-slate-400 truncate max-w-[100px] text-center" title={log.cable?.remark || ''}>{log.cable?.remark || ''}</TableCell>
                                        <TableCell className="text-center px-1 text-slate-500">{(log as any).createdByName || "-"}</TableCell>
                                        <TableCell className="text-center p-0">
                                            {(() => {
                                                try {
                                                    let attrs: any = {};
                                                    if (typeof (log as any).attributes === 'string') {
                                                        attrs = JSON.parse((log as any).attributes);
                                                    } else if (typeof (log as any).attributes === 'object' && (log as any).attributes !== null) {
                                                        attrs = (log as any).attributes;
                                                    }
                                                    const attachments = attrs.attachments || (attrs.attachment ? [attrs.attachment] : []);

                                                    if (attachments.length === 0) return "-";

                                                    if (attachments.length === 1) {
                                                        return (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-6 w-6 p-0 hover:bg-blue-50 hover:text-blue-600"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (attachments[0].storageUrl) {
                                                                        downloadAttachment(attachments[0]);
                                                                    } else {
                                                                        downloadFile(`/api/optical-cables/logs/${log.id}`, attachments[0].name);
                                                                    }
                                                                }}
                                                                title={attachments[0].name}
                                                            >
                                                                <Download className="h-3.5 w-3.5" />
                                                            </Button>
                                                        );
                                                    }

                                                    return (
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-6 gap-1 px-1.5 hover:bg-blue-50 hover:text-blue-600"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <Paperclip className="h-3.5 w-3.5" />
                                                                    <span className="text-[10px] font-medium">{attachments.length}</span>
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-auto p-2" align="end">
                                                                <div className="flex flex-col gap-1">
                                                                    {attachments.map((file: any, idx: number) => (
                                                                        <Button
                                                                            key={idx}
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="justify-start h-8 text-xs max-w-[200px]"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                if (file.storageUrl) {
                                                                                    downloadAttachment(file);
                                                                                } else {
                                                                                    downloadFile(`/api/optical-cables/logs/${log.id}`, file.name);
                                                                                }
                                                                            }}
                                                                            title={file.name}
                                                                        >
                                                                            <Download className="h-3 w-3 mr-2 shrink-0" />
                                                                            <span className="truncate">{file.name}</span>
                                                                        </Button>
                                                                    ))}
                                                                </div>
                                                            </PopoverContent>
                                                        </Popover>
                                                    );
                                                } catch {
                                                    return "-";
                                                }
                                            })()}
                                        </TableCell>
                                        <TableCell className="text-center p-0">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <MoreHorizontal className="h-4 w-4 text-slate-400" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="rounded-xl shadow-xl w-40">
                                                    <DropdownMenuLabel className="text-xs text-muted-foreground p-2">입고 관리</DropdownMenuLabel>
                                                    <DropdownMenuSeparator />
                                                    {canWrite && (
                                                        <DropdownMenuItem onClick={() => { if (log.cable) openDialog(log.cable); }} className="gap-2">
                                                            <Pencil className="h-4 w-4" /> 수정
                                                        </DropdownMenuItem>
                                                    )}
                                                    {canWrite && (
                                                        <DropdownMenuItem
                                                            className="text-red-600 gap-2 focus:text-red-700 focus:bg-red-50"
                                                            onClick={() => {
                                                                setItemToDelete(log.id);
                                                                setDeleteDialogOpen(true);
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4" /> 삭제
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

                    <InfiniteScrollLoader
                        hasMore={hasMore}
                        isLoading={scrollLoading}
                        observerRef={observerRef}
                        itemCount={displayLogs.length}
                        totalCount={filteredLogs.length}
                    />
                </div>
            </div>

            <OpticalCableFormDialog
                open={dialogOpen}
                onOpenChange={(open) => {
                    if (!open) closeDialog();
                }}
                editingItem={editingCable}
                onSubmit={(data) => {
                    if (editingCable) {
                        updateMutation.mutate({ id: editingCable.id, data });
                    } else {
                        createMutation.mutate(data);
                    }
                }}
            />

            <GenericBulkUploadDialog
                open={bulkUploadOpen}
                onOpenChange={setBulkUploadOpen}
                title="광케이블 일괄등록"
                description="CSV 파일을 업로드하여 여러 광케이블 드럼을 한번에 등록할 수 있습니다"
                onDownloadTemplate={downloadOpticalTemplate}
                templateFileName="optical_incoming_template.csv"
                validateRow={validateOpticalRow}
                transformRow={transformOpticalRow}
                columns={opticalColumns}
                onUpload={handleBulkUpload}
                isLoading={bulkUploadMutation.isPending}
            />

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>입고 내역 삭제</AlertDialogTitle>
                        <AlertDialogDescription>
                            선택한 입고 내역을 정말 삭제하시겠습니까?
                            <br />
                            이 작업은 되돌릴 수 없습니다.
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

            <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>입고 내역 일괄 삭제</AlertDialogTitle>
                        <AlertDialogDescription>
                            선택한 {selectedIds.size}개의 입고 내역을 정말 삭제하시겠습니까?
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
        </div>
    );
}
