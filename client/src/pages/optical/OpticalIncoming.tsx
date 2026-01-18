import React, { useState } from 'react';
import { Loader2, ArrowDownToLine, Plus, MoreHorizontal, Pencil, Download, Paperclip, FileText } from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
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
import { OpticalCableFormDialog } from "@/components/OpticalCableFormDialog";
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
import { GenericBulkUploadDialog } from "@/components/GenericBulkUploadDialog";
import { validateOpticalRow, transformOpticalRow, opticalColumns, downloadOpticalTemplate } from "@/lib/bulk-configs/optical";
import { Upload } from "lucide-react";
import { OPTICAL_LOG_COLUMNS } from "@/lib/optical-table-columns";

export default function OpticalIncoming() {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const { toast } = useToast();
    const { tenants, currentTenant } = useAppContext();
    const isTenantOwner = tenants.find(t => t.id === currentTenant)?.role === 'owner';
    const { open: dialogOpen, editingItem: editingCable, handleOpen: openDialog, handleClose: closeDialog } = useDialogState<OpticalCable>();
    const { downloadFile, downloadAttachment } = useDownload();
    const [bulkUploadOpen, setBulkUploadOpen] = useState(false);

    const bulkUploadMutation = useBulkUploadOpticalCables();

    const handleBulkUpload = (items: any[]) => {
        bulkUploadMutation.mutate(items, {
            onSuccess: () => {
                setBulkUploadOpen(false);
            }
        });
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

    const allSelected = filteredLogs.length > 0 && filteredLogs.every(log => selectedIds.has(log.id));

    const toggleSelectAll = () => {
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredLogs.map(log => log.id)));
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
            bulkDeleteMutation.mutate(Array.from(selectedIds), {
                onSuccess: () => {
                    setSelectedIds(new Set());
                }
            });
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
        <div className="flex flex-col h-full space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        입고 내역
                    </h1>
                    <p className="text-muted-foreground">광케이블 드럼의 입고 이력을 조회합니다.</p>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            입고 등록
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => openDialog()}>
                            <Plus className="h-4 w-4 mr-2" />
                            직접 등록
                        </DropdownMenuItem>
                        {isTenantOwner && (
                            <DropdownMenuItem onSelect={() => setBulkUploadOpen(true)}>
                                <Upload className="h-4 w-4 mr-2" />
                                일괄 등록
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>

                <OpticalCableFormDialog
                    open={dialogOpen}
                    onOpenChange={(open) => {
                        if (!open) closeDialog();
                    }}
                    onSubmit={(data) => createMutation.mutate(data)}
                />
            </div>

            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <SearchInput
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder="드럼번호, 규격 검색..."
                        className="max-w-sm"
                    />
                    {selectedIds.size > 0 && isTenantOwner && (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleBulkDelete}
                            disabled={bulkDeleteMutation.isPending}
                        >
                            {bulkDeleteMutation.isPending ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Trash2 className="h-4 w-4 mr-2" />
                            )}
                            선택 삭제 ({selectedIds.size})
                        </Button>
                    )}
                </div>
                <div className="text-sm text-muted-foreground">
                    총 <span className="font-semibold text-foreground">{filteredLogs.length}</span>건
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
                                    입고일자
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("receivedDate", e)} />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.projectCode }}>
                                    공사번호
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("projectCode", e)} />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.projectName }}>
                                    공사명
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("projectName", e)} />
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
                                    품명
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("totalLength", e)} />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background" style={{ width: 90 }}>
                                    입고량
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.remark }}>
                                    비고
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("remark", e)} />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.createdBy }}>
                                    입력자
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("createdBy", e)} />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.attachment }}>
                                    첨부
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("attachment", e)} />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background" style={{ width: widths.actions }}></TableHead>

                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredLogs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={18} className="text-center py-8 text-muted-foreground">
                                        입고 내역이 없습니다.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredLogs.map((log) => (
                                    <TableRow key={log.id} className="h-6 [&_td]:py-0">
                                        <TableCell className="text-center align-middle">
                                            {isTenantOwner ? (
                                                <Checkbox
                                                    checked={selectedIds.has(log.id)}
                                                    onCheckedChange={() => toggleSelect(log.id)}
                                                />
                                            ) : null}
                                        </TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap">{log.cable?.division || 'SKT'}</TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap">{log.cable?.category || ''}</TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap">
                                            {log.usageDate
                                                ? format(new Date(log.usageDate), 'yyyy-MM-dd')
                                                : format(new Date(log.createdAt), 'yyyy-MM-dd')}
                                        </TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap">{(log as any).projectCode || ''}</TableCell>
                                        <TableCell className="align-middle p-0 text-left">
                                            <div className="w-full truncate px-2" title={(log as any).projectNameUsage || log.cable?.projectName || ''}>
                                                {(log as any).projectNameUsage || log.cable?.projectName || ''}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap">{log.cable?.manufacturer || ''}</TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap">{log.cable?.manufactureYear || ''}</TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap">{log.cable?.spec || ''}</TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap">{log.cable?.coreCount || ''}</TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap font-medium">{log.cable?.drumNo || ''}</TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap">{log.cable?.location || ''}</TableCell>
                                        <TableCell className="align-middle p-0">
                                            <div className="w-full truncate text-center font-medium px-2" title={String(log.cable?.productName || '')}>
                                                {String(log.cable?.productName || '')}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center align-middle font-bold">
                                            {((log.cable?.remainingLength || 0) + (log.cable?.usedLength || 0) + (log.cable?.wasteLength || 0)).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="align-middle p-0">
                                            <div className="w-full truncate text-center px-2" title={log.cable?.remark || ''}>
                                                {log.cable?.remark || ''}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center align-middle">
                                            {(log as any).createdByName || "-"}
                                        </TableCell>
                                        <TableCell className="text-center align-middle">
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
                                                                className="h-8 w-8 p-0"
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
                                                                <Download className="h-4 w-4" />
                                                            </Button>
                                                        );
                                                    }

                                                    return (
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 gap-1 px-2"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <Paperclip className="h-4 w-4" />
                                                                    <span className="text-xs font-medium">{attachments.length}</span>
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
                                        <TableCell className="text-center align-middle">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-6 w-6 p-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>입고 관리</DropdownMenuLabel>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            if (log.cable) {
                                                                openDialog(log.cable);
                                                            }
                                                        }}
                                                    >
                                                        <Pencil className="mr-2 h-4 w-4" />
                                                        수정
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-destructive"
                                                        onClick={() => {
                                                            if (confirm('이 입고 내역을 삭제하시겠습니까?')) {
                                                                deleteMutation.mutate(log.id);
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        삭제
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
        </div>
    );
}
