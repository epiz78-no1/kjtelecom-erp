import React, { useState } from 'react';
import { Loader2, ArrowUpFromLine, Search, Plus, MoreHorizontal, Pencil, Download, Paperclip, FileText } from "lucide-react";
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
import { useColumnResize } from "@/hooks/useColumnResize";
import { Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
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
import { useAppContext } from "@/contexts/AppContext";
import OpticalAssignmentDialog from "@/components/OpticalAssignmentDialog";
import { OpticalLogEditDialog } from "@/components/OpticalLogEditDialog";
import type { OpticalCable, OpticalCableLog } from "@shared/schema";
import { useOpticalLogs } from "@/hooks/useOpticalCables";
import {
    useDeleteOpticalLog,
    useBulkDeleteOpticalLogs,
    useUpdateOpticalLog
} from "@/hooks/useOpticalMutations";

import { useDownload } from "@/hooks/useDownload";
import { useDialogState } from "@/hooks/useDialogState";
import { useTableFilters } from "@/hooks/useTableFilters";

export default function OpticalOutgoing() {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const { toast } = useToast();
    const { teams, tenants, currentTenant } = useAppContext();
    const isTenantOwner = tenants.find(t => t.id === currentTenant)?.role === 'owner';
    const { open: dialogOpen, editingItem: editingLog, handleOpen: openDialog, handleClose: closeDialog } = useDialogState<OpticalCableLog>();
    const { downloadFile } = useDownload();

    const { widths, startResizing } = useColumnResize({
        checkbox: 40,
        division: 60,           // 사업
        category: 50,           // 구분
        date: 95,               // 출고일자
        projectCode: 120,       // 공사번호 (T210177093003 형식)
        projectName: 250,       // 공사명 (긴 텍스트)
        manufacturer: 90,       // 제조사
        manufactureYear: 70,    // 제조연도
        spec: 50,               // 규격
        coreCount: 50,          // 코어
        drumNo: 70,             // 제조번호
        location: 70,           // 위치
        amount: 90,             // 출고량
        recipient: 80,          // 수령자
        remark: 80,             // 비고
        createdBy: 80,          // 입력자
        attachment: 60,         // 첨부
        actions: 50             // 작업
    });

    const { data: logs = [], isLoading } = useOpticalLogs();

    const outgoingLogs = logs.filter(l => l.logType === 'assign');

    const bulkDeleteMutation = useBulkDeleteOpticalLogs();
    const deleteMutation = useDeleteOpticalLog();
    const updateLogMutation = useUpdateOpticalLog();

    // 데이터를 평탄화하여 검색 및 필터링에 사용
    const searchableLogs = outgoingLogs.map(log => ({
        ...log,
        drumNo: log.cable?.drumNo || '',
        spec: log.cable?.spec || '',
        teamName: teams.find(t => t.id === log.teamId)?.name || ''
    }));

    const {
        searchQuery,
        setSearchQuery,
        filteredItems: filteredLogs
    } = useTableFilters(searchableLogs, {
        searchFields: ["drumNo", "spec", "teamName"]
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
            bulkDeleteMutation.mutate(Array.from(selectedIds));
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
                        출고 내역
                    </h1>
                    <p className="text-muted-foreground">현장팀으로 불출된 광케이블 이력을 조회합니다.</p>
                </div>
                <OpticalAssignmentDialog
                    trigger={
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            신규 출고 등록
                        </Button>
                    }
                />
            </div>

            <div className="flex items-center gap-4">
                <div className="relative max-w-sm flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="드럼번호, 팀명 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
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
                                    <div
                                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                                        onMouseDown={(e) => startResizing("division", e)}
                                    />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.category }}>
                                    구분
                                    <div
                                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                                        onMouseDown={(e) => startResizing("category", e)}
                                    />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.date }}>
                                    출고일자
                                    <div
                                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                                        onMouseDown={(e) => startResizing("date", e)}
                                    />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.projectCode }}>
                                    공사번호
                                    <div
                                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                                        onMouseDown={(e) => startResizing("projectCode", e)}
                                    />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.projectName }}>
                                    공사명
                                    <div
                                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                                        onMouseDown={(e) => startResizing("projectName", e)}
                                    />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.manufacturer }}>
                                    제조사
                                    <div
                                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                                        onMouseDown={(e) => startResizing("manufacturer", e)}
                                    />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.manufactureYear }}>
                                    제조연도
                                    <div
                                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                                        onMouseDown={(e) => startResizing("manufactureYear", e)}
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
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.drumNo }}>
                                    제조번호
                                    <div
                                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                                        onMouseDown={(e) => startResizing("drumNo", e)}
                                    />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.location }}>
                                    위치
                                    <div
                                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                                        onMouseDown={(e) => startResizing("location", e)}
                                    />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.amount }}>
                                    출고량(m)
                                    <div
                                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                                        onMouseDown={(e) => startResizing("amount", e)}
                                    />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.recipient }}>
                                    수령자
                                    <div
                                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                                        onMouseDown={(e) => startResizing("recipient", e)}
                                    />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.remark }}>
                                    비고
                                    <div
                                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                                        onMouseDown={(e) => startResizing("remark", e)}
                                    />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.createdBy }}>
                                    입력자
                                    <div
                                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                                        onMouseDown={(e) => startResizing("createdBy", e)}
                                    />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.attachment }}>
                                    첨부
                                    <div
                                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                                        onMouseDown={(e) => startResizing("attachment", e)}
                                    />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background" style={{ width: widths.actions }}></TableHead>

                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredLogs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={20} className="text-center py-8 text-muted-foreground">
                                        출고 내역이 없습니다.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredLogs.map((log) => {
                                    const teamName = teams.find(t => t.id === log.teamId)?.name || `Team ${log.teamId}`;
                                    return (
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
                                            <TableCell className="text-center align-middle whitespace-nowrap">
                                                {(log.afterRemaining || 0).toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-center align-middle whitespace-nowrap">{(log as any).workerName || ''}</TableCell>
                                            <TableCell className="align-middle p-0">
                                                <div className="w-full truncate text-center px-2" title={(() => {
                                                    try {
                                                        const attrs = JSON.parse((log as any).attributes || "{}");
                                                        return attrs.remark || "";
                                                    } catch { return ""; }
                                                })()}>
                                                    {(() => {
                                                        try {
                                                            const attrs = JSON.parse((log as any).attributes || "{}");
                                                            return attrs.remark || "";
                                                        } catch {
                                                            return "";
                                                        }
                                                    })()}
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
                                                                        downloadFile(`/api/optical-cables/logs/${log.id}`, attachments[0].name);
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
                                                                                    downloadFile(`/api/optical-cables/logs/${log.id}`, file.name);
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
                                                        <DropdownMenuLabel>출고 관리</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={() => openDialog(log)}
                                                        >
                                                            <Pencil className="mr-2 h-4 w-4" />
                                                            수정
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            className="text-destructive"
                                                            onClick={() => {
                                                                if (confirm('이 출고 내역을 삭제하시겠습니까?')) {
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
                                    );
                                })
                            )}
                        </TableBody>
                    </table>
                </div>
            </div>

            <OpticalLogEditDialog
                open={!!editingLog}
                onOpenChange={(open) => !open && closeDialog()}
                log={editingLog}
                onSubmit={async (id, data) => updateLogMutation.mutateAsync({ id, data })}
            />
        </div>
    );
}
