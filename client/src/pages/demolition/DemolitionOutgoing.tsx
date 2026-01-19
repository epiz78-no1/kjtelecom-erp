import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Loader2, Download, Pencil, Paperclip, MoreHorizontal } from "lucide-react";
import { useColumnResize } from "@/hooks/useColumnResize";
import { useDownload } from "@/hooks/useDownload";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/SearchInput";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/contexts/AppContext";
import { Checkbox } from "@/components/ui/checkbox";
import { DemolitionOutgoingDialog } from "@/components/DemolitionOutgoingDialog";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

interface DemolitionMaterial {
    id: string;
    managementNo: string;
    projectName: string;
    productName: string;
    specification: string;
    remainingQuantity: number;
    status: string;
    projectCode?: string;
    division: string;
}

export default function DemolitionOutgoing() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { tenants, currentTenant } = useAppContext();
    const isTenantOwner = tenants.find(t => t.id === currentTenant)?.role === 'owner';

    const [dialogOpen, setDialogOpen] = useState(false);
    const [alertDialogOpen, setAlertDialogOpen] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [editingId, setEditingId] = useState<string | null>(null);

    const { widths, handleResize } = useColumnResize('demolition-outgoing-widths', {
        select: 40,
        logDate: 100,
        team: 100,
        projectCode: 100,
        projectName: 220,
        productName: 160,
        specification: 200,
        usedQuantity: 80,
        workerName: 100,
        creator: 80,
        attachment: 60,
        remark: 150,
        actions: 80,
    });

    const { downloadAttachment } = useDownload();

    const { data: materials = [] } = useQuery<DemolitionMaterial[]>({
        queryKey: ["/api/demolition-materials"],
    });

    const { data: teams = [] } = useQuery<any[]>({
        queryKey: ["/api/teams"],
    });

    const { data: members = [] } = useQuery<any[]>({
        queryKey: ["/api/members/basic"],
    });

    const { data: logs = [], isLoading } = useQuery<any[]>({
        queryKey: ["/api/demolition-logs"],
        select: (data) => data.filter((log: any) => log.logType === 'outgoing'),
    });

    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch(`/api/demolition-logs/${editingId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
                credentials: "include",
            });
            if (!res.ok) throw new Error(await res.text());
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/demolition-materials"] });
            queryClient.invalidateQueries({ queryKey: ["/api/demolition-logs"] });
            toast({ title: "출고 내역이 수정되었습니다" });
            setDialogOpen(false);
            setEditingId(null);
        },
        onError: (error: any) => {
            toast({ title: "수정 실패", description: error.message, variant: "destructive" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/demolition-logs/${id}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (!res.ok) throw new Error(await res.text());
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/demolition-materials"] });
            queryClient.invalidateQueries({ queryKey: ["/api/demolition-logs"] });
            toast({ title: "출고 내역이 삭제되었습니다" });
            setAlertDialogOpen(false);
            setDeleteTargetId(null);
            setSelectedIds(prev => {
                const newSet = new Set(prev);
                if (deleteTargetId) newSet.delete(deleteTargetId);
                return newSet;
            });
        },
        onError: (error: any) => {
            toast({ title: "삭제 실패", description: error.message, variant: "destructive" });
        },
    });

    const bulkDeleteMutation = useMutation({
        mutationFn: async (ids: string[]) => {
            const res = await fetch("/api/demolition-logs/bulk-delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids }),
                credentials: "include",
            });
            if (!res.ok) throw new Error(await res.text());
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["/api/demolition-materials"] });
            queryClient.invalidateQueries({ queryKey: ["/api/demolition-logs"] });
            toast({ title: `${data.deletedCount}건의 내역이 삭제되었습니다` });
            setSelectedIds(new Set());
        },
        onError: (error: any) => {
            toast({ title: "일괄 삭제 실패", description: error.message, variant: "destructive" });
        },
    });

    const handleEdit = (log: any) => {
        setEditingId(log.id);
        setDialogOpen(true);
    };

    const handleDeleteClick = (id: string) => {
        setDeleteTargetId(id);
        setAlertDialogOpen(true);
    };

    const handleDeleteConfirm = () => {
        if (deleteTargetId) {
            deleteMutation.mutate(deleteTargetId);
        }
    };

    const handleBulkDelete = () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`${selectedIds.size}건의 내역을 삭제하시겠습니까?`)) return;
        bulkDeleteMutation.mutate(Array.from(selectedIds));
    };

    const toggleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(new Set(filteredLogs.map((log: any) => log.id)));
        } else {
            setSelectedIds(new Set());
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

    const handleDialogSubmit = async (data: any) => {
        // Edit Mode
        if (editingId) {
            const item = data.items[0];
            if (!item) return;

            updateMutation.mutate({
                materialId: item.materialId,
                usedQuantity: parseInt(item.usedQuantity),
                remark: item.remark,
                teamId: data.teamId,
                projectCode: data.projectCode,
                projectName: data.projectName,
                workerName: data.workerName,
                logDate: format(data.usageDate, "yyyy-MM-dd"),
                logType: 'outgoing', // 출고 타입 유지
                attributes: JSON.stringify({ attachments: data.attachments })
            });
            return;
        }

        // Create Mode (Bulk)
        try {
            setDialogOpen(false);
            toast({ title: "등록중입니다", description: `${data.items.length}건의 출고 등록을 진행합니다.` });

            let successCount = 0;
            for (const item of data.items) {
                if (!item.materialId || !item.usedQuantity) continue;

                await apiRequest("POST", `/api/demolition-materials/${item.materialId}/usage`, {
                    materialId: item.materialId,
                    logType: 'outgoing', // Office-led outgoing
                    teamId: data.teamId,
                    projectCode: data.projectCode,
                    projectName: data.projectName,
                    workerName: data.workerName,
                    usedQuantity: parseInt(item.usedQuantity),
                    remark: item.remark,
                    logDate: format(data.usageDate, "yyyy-MM-dd"),
                    attributes: JSON.stringify({ attachments: data.attachments })
                });
                successCount++;
            }

            queryClient.invalidateQueries({ queryKey: ["/api/demolition-materials"] });
            queryClient.invalidateQueries({ queryKey: ["/api/demolition-logs"] });
            toast({ title: "등록 완료", description: `${successCount}건의 출고 내역이 저장되었습니다.` });

        } catch (error: any) {
            toast({ title: "등록 실패", description: error.message, variant: "destructive" });
        }
    };

    const filteredLogs = logs.filter((log: any) =>
        log.material?.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.projectName?.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                    <h1 className="text-2xl font-bold">철거자재 출고 내역</h1>
                    <p className="text-muted-foreground">현장팀으로 출고된 철거자재 내역을 조회하고 관리합니다</p>
                </div>
                <div className="flex items-center gap-2">
                    {selectedIds.size > 0 && (
                        <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            {selectedIds.size}건 삭제
                        </Button>
                    )}
                    <Button onClick={() => {
                        setEditingId(null);
                        setDialogOpen(true);
                    }}>
                        <Plus className="h-4 w-4 mr-2" />
                        출고 등록
                    </Button>
                </div>
            </div>

            <div className="flex items-center justify-between gap-4">
                <SearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="품명, 공사명 검색..."
                    className="max-w-sm"
                />
                <div className="text-sm text-muted-foreground">
                    총 <span className="font-semibold text-foreground">{filteredLogs.length}</span>건
                </div>
            </div>

            <div className="flex-1 rounded-md border overflow-hidden">
                <div className="h-full overflow-auto">
                    <table className="w-full caption-bottom text-sm table-fixed">
                        <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                            <TableRow className="h-8">
                                <TableHead className="text-center align-middle bg-background" style={{ width: widths.select }}>
                                    <Checkbox
                                        checked={filteredLogs.length > 0 && selectedIds.size === filteredLogs.length}
                                        onCheckedChange={toggleSelectAll}
                                        aria-label="Select all"
                                    />
                                </TableHead>
                                <TableHead className="text-center align-middle bg-background relative" style={{ width: widths.logDate }}>
                                    출고일자
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize('logDate')} />
                                </TableHead>
                                <TableHead className="text-center align-middle bg-background relative" style={{ width: widths.team }}>
                                    수령팀
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize('team')} />
                                </TableHead>
                                <TableHead className="text-center align-middle bg-background relative" style={{ width: widths.projectCode }}>
                                    공사번호
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize('projectCode')} />
                                </TableHead>
                                <TableHead className="text-left align-middle bg-background relative" style={{ width: widths.projectName }}>
                                    공사명
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize('projectName')} />
                                </TableHead>
                                <TableHead className="text-center align-middle bg-background relative" style={{ width: widths.productName }}>
                                    품명
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize('productName')} />
                                </TableHead>
                                <TableHead className="text-center align-middle bg-background relative" style={{ width: widths.specification }}>
                                    규격
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize('specification')} />
                                </TableHead>
                                <TableHead className="text-center align-middle bg-background relative" style={{ width: widths.usedQuantity }}>
                                    출고량
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize('usedQuantity')} />
                                </TableHead>
                                <TableHead className="text-center align-middle bg-background relative" style={{ width: widths.workerName }}>
                                    작업자
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize('workerName')} />
                                </TableHead>
                                <TableHead className="text-center align-middle bg-background relative" style={{ width: widths.creator }}>
                                    입력자
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize('creator')} />
                                </TableHead>
                                <TableHead className="text-center align-middle bg-background relative" style={{ width: widths.attachment }}>
                                    첨부
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize('attachment')} />
                                </TableHead>
                                <TableHead className="text-center align-middle bg-background relative" style={{ width: widths.remark }}>
                                    비고
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize('remark')} />
                                </TableHead>
                                <TableHead className="text-center align-middle bg-background relative" style={{ width: widths.actions }}>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredLogs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                                        출고 내역이 없습니다
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredLogs.map((log: any) => (
                                    <TableRow key={log.id} className="h-6 [&_td]:py-0 hover:bg-muted/50">
                                        <TableCell className="text-center align-middle">
                                            <Checkbox
                                                checked={selectedIds.has(log.id)}
                                                onCheckedChange={() => toggleSelect(log.id)}
                                            />
                                        </TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap">{log.logDate}</TableCell>

                                        <TableCell className="text-center align-middle max-w-[100px]">
                                            <div className="truncate" title={log.team?.name || ''}>{log.team?.name || ''}</div>
                                        </TableCell>
                                        <TableCell className="text-center align-middle max-w-[100px]">
                                            <div className="truncate" title={log.projectCode || ''}>{log.projectCode || ''}</div>
                                        </TableCell>
                                        <TableCell className="text-left align-middle max-w-[220px]">
                                            <div className="truncate" title={log.projectName || ''}>{log.projectName || ''}</div>
                                        </TableCell>
                                        <TableCell className="text-center align-middle max-w-[160px]">
                                            <div className="truncate" title={log.material?.productName || ''}>{log.material?.productName || ''}</div>
                                        </TableCell>
                                        <TableCell className="text-center align-middle max-w-[200px]">
                                            <div className="truncate" title={log.material?.specification || ''}>{log.material?.specification || ''}</div>
                                        </TableCell>
                                        <TableCell className="text-center align-middle font-medium whitespace-nowrap">{log.usedQuantity?.toLocaleString() || ''}</TableCell>
                                        <TableCell className="text-center align-middle max-w-[100px]">
                                            <div className="truncate" title={log.workerName || ''}>{log.workerName || ''}</div>
                                        </TableCell>
                                        <TableCell className="text-center align-middle max-w-[80px]">
                                            <div className="truncate" title={log.creator?.name || ''}>{log.creator?.name || ''}</div>
                                        </TableCell>
                                        <TableCell className="text-center align-middle">
                                            {(() => {
                                                if (!log.attributes) return null;
                                                try {
                                                    const attrs = typeof log.attributes === 'string' ? JSON.parse(log.attributes) : log.attributes;
                                                    const files = attrs.attachments || (attrs.attachment ? [attrs.attachment] : []);
                                                    if (files.length === 0) return null;

                                                    if (files.length === 1) {
                                                        return (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-6 w-6 p-0"
                                                                onClick={() => downloadAttachment(files[0])}
                                                                title={files[0].name}
                                                            >
                                                                <Download className="h-4 w-4" />
                                                            </Button>
                                                        );
                                                    } else {
                                                        return (
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-6 gap-1 px-2"
                                                                    >
                                                                        <Paperclip className="h-4 w-4" />
                                                                        <span className="text-xs font-medium">{files.length}</span>
                                                                    </Button>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-auto p-2" align="center">
                                                                    <div className="flex flex-col gap-1">
                                                                        <div className="text-xs font-semibold px-2 py-1 mb-1 border-b">
                                                                            첨부파일 {files.length}개
                                                                        </div>
                                                                        {files.map((file: any, index: number) => (
                                                                            <Button
                                                                                key={index}
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                className="justify-start h-auto py-1 px-2 font-normal text-xs overflow-hidden max-w-[200px]"
                                                                                onClick={() => downloadAttachment(file)}
                                                                            >
                                                                                <Download className="h-3 w-3 mr-2 shrink-0" />
                                                                                <span className="truncate">{file.name}</span>
                                                                            </Button>
                                                                        ))}
                                                                    </div>
                                                                </PopoverContent>
                                                            </Popover>
                                                        );
                                                    }
                                                } catch (e) { }
                                                return null;
                                            })()}
                                        </TableCell>
                                        <TableCell className="text-center align-middle max-w-[150px]">
                                            <div className="truncate" title={log.remark || ''}>{log.remark || ''}</div>
                                        </TableCell>
                                        <TableCell className="text-center align-middle">
                                            <div className="flex items-center justify-center">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <span className="sr-only">메뉴 열기</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleEdit(log)}>
                                                            <Pencil className="mr-2 h-4 w-4" />
                                                            <span>수정</span>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleDeleteClick(log.id)}
                                                            className="text-destructive focus:text-destructive"
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            <span>삭제</span>
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </table>
                </div>
            </div>

            <DemolitionOutgoingDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                onSubmit={handleDialogSubmit}
                editingRecord={logs.find((l: any) => l.id === editingId) || null}
                materials={materials}
                teams={teams}
                members={members}
            />

            <AlertDialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>출고 내역 삭제</AlertDialogTitle>
                        <AlertDialogDescription>
                            이 출고 내역을 삭제하시겠습니까? 삭제된 수량은 자재 잔량으로 복구됩니다.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
                            삭제
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
