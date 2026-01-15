import { useState, useMemo } from "react";
import { Search, Loader2, Trash2, Plus, Pencil, MoreHorizontal, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { exportToExcel } from "@/lib/excel";
import { useToast } from "@/hooks/use-toast";
import { useDialogState } from "@/hooks/useDialogState";
import { useTableFilters } from "@/hooks/useTableFilters";
import type { OpticalCable, OpticalCableLog } from "@shared/schema";
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useAppContext } from "@/contexts/AppContext";
import { OpticalUsageDialog } from "@/components/OpticalUsageDialog";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { useDownload } from "@/hooks/useDownload";
import { Paperclip, Upload } from "lucide-react";
import { GenericBulkUploadDialog } from "@/components/GenericBulkUploadDialog";
import {
    downloadOpticalUsageTemplate,
    validateOpticalUsageRow,
    transformOpticalUsageRow,
    opticalUsageColumns,
    type ParsedOpticalUsageRow
} from "@/lib/bulk-configs/optical-usage";

export default function FieldOpticalUsage() {
    const { toast } = useToast();
    const { tenants, currentTenant, teams, checkPermission } = useAppContext();
    const isTenantOwner = tenants.find(t => t.id === currentTenant)?.role === 'owner';

    const canWrite = checkPermission("usage", "write");
    const currentTenantData = tenants.find(t => t.id === currentTenant);
    const teamCategories = ["접속팀", "외선팀", "유지보수팀", "설치팀"];
    const team = teams.find(t => t.id === currentTenantData?.teamId);
    const isFieldTeam = team ? teamCategories.includes(team.teamCategory) : false;
    const { downloadFile } = useDownload();

    const canManage = canWrite && !isFieldTeam;
    const canRegister = true;

    const { widths, startResizing } = useColumnResize({
        checkbox: 40,
        date: 100,
        division: 50,
        teamCategory: 80,
        projectCode: 100,
        projectName: 200, // 공사명 길어짐
        drumNo: 120,
        spec: 100,
        installLength: 70,
        wasteLength: 70,
        remainingLength: 70,
        attachment: 60,
        user: 80,
        creator: 80,
        actions: 50
    });


    const teamId = currentTenantData?.teamId;
    const isTeamResolved = !teamId || !!(teamId && team);

    // 광케이블 데이터 조회 (검증용)
    const { data: cables = [] } = useQuery<(OpticalCable & { logs: OpticalCableLog[] })[]>({
        queryKey: ["/api/optical-cables"],
        enabled: isTeamResolved,
    });

    // 현재 팀에 할당된 케이블만 필터링
    // 관리자 계정(teamId 없음)인 경우 모든 assigned 케이블 사용
    const assignedCables = cables.filter(c => {
        if (c.status !== 'assigned') return false;
        // teamId가 있으면 해당 팀 케이블만, 없으면 모든 assigned 케이블
        if (teamId) {
            return c.currentTeamId === teamId;
        }
        return true; // 관리자는 모든 assigned 케이블 볼 수 있음
    });

    // 모든 광케이블의 사용 로그를 개별적으로 조회
    // 최적화: logType='usage'인 것만, 그리고 필요 시 teamId로 필터링하여 가져옴
    const { data: allCableLogs = [], isLoading } = useQuery<OpticalCableLog[]>({
        queryKey: ["/api/optical-cables/logs", isFieldTeam && currentTenant ? currentTenant : undefined], // Filter by team if field team
        enabled: isTeamResolved,
        queryFn: async () => {
            const params = new URLSearchParams();
            params.append('type', 'usage');
            if (isFieldTeam && currentTenant) {
                // currentTenant acts as teamId context here for field teams
                params.append('teamId', currentTenant);
            }
            const res = await apiRequest("GET", `/api/optical-cables/logs?${params.toString()}`);
            return res.json();
        }
    });

    // Extract all usage logs
    // Already filtered by server, but we keep the structure
    const allLogs = useMemo(() => {
        const logs: (OpticalCableLog & { cable: OpticalCable })[] = [];
        allCableLogs
            .filter(log => log.logType === 'usage') // Double check, though server filters it
            .forEach(log => {
                // Find cable info
                // We need cable info. getAllOpticalCableLogs joins cable info!
                // So log.cable should be populated if we updated the interface.
                // But wait, the client type `OpticalCableLog` might not have `cable` property?
                // The server returns `OpticalCableLog & { cable: OpticalCable ... }`.
                // Let's use `any` cast or trust the response.
                // But previously `allCableLogs` was just logs and we mapped it to cables?
                // No, the previous code filtered `allCableLogs`.
                // Let's check how `allCableLogs` is used.

                // Existing logic:
                // allCableLogs.filter(...)
                // The server implementation of getAllOpticalCableLogs ALREADY includes `cable` relation.
                // See: `with: { cable: true }` in storage.
                // So we can just use it.

                const logWithCable = log as OpticalCableLog & { cable: OpticalCable };
                if (logWithCable.cable) {
                    logs.push(logWithCable);
                }
            });
        return logs.sort((a, b) => new Date(b.usageDate || b.createdAt).getTime() - new Date(a.usageDate || a.createdAt).getTime());
    }, [allCableLogs]);

    const {
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        filteredItems: filteredLogs,
    } = useTableFilters(allLogs.map(log => ({
        ...log,
        division: log.cable.division,
        drumNo: log.cable.drumNo,
        spec: log.cable.spec,
        projectNameUsage: (log as any).projectNameUsage || log.cable.projectName || '',
        sectionName: (log as any).sectionName || ''
    })), {
        searchFields: ["drumNo", "spec", "projectNameUsage", "sectionName"],
        categoryField: "division"
    });

    const {
        open: dialogOpen,
        editingItem: editingLog,
        handleOpen: openDialog,
        handleClose: closeDialog
    } = useDialogState<OpticalCableLog>();

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
    const [deleteLog, setDeleteLog] = useState<OpticalCableLog | null>(null);
    const [bulkUploadOpen, setBulkUploadOpen] = useState(false);

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return apiRequest("DELETE", `/api/optical-cables/logs/${id}`, {});
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables"] });
            queryClient.resetQueries({ queryKey: ["/api/optical-cables/logs"] });
            toast({ title: "사용 내역이 삭제되었습니다" });
            setDeleteLog(null);
        },
        onError: (error: any) => {
            toast({
                title: "삭제 실패",
                description: error?.message || "삭제 실패",
                variant: "destructive"
            });
        },
    });

    const bulkDeleteMutation = useMutation({
        mutationFn: async (ids: string[]) => {
            return Promise.all(ids.map(id => apiRequest("DELETE", `/api/optical-cables/logs/${id}`, {})));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables"] });
            queryClient.resetQueries({ queryKey: ["/api/optical-cables/logs"] });
            toast({ title: `${selectedIds.size}건의 사용 내역이 삭제되었습니다` });
            setSelectedIds(new Set());
            setBulkDeleteOpen(false);
        },
        onError: (error: any) => {
            toast({
                title: "삭제 실패",
                description: error?.message || "삭제 실패",
                variant: "destructive"
            });
        },
    });

    // Filter Logic Removed (Handled by hook)

    const totalRecords = filteredLogs.length;
    const totalLength = filteredLogs.reduce((sum, log) => sum + (log.installLength || 0) + (log.wasteLength || 0), 0);

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredLogs.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredLogs.map(log => log.id)));
        }
    };

    const allSelected = filteredLogs.length > 0 && selectedIds.size === filteredLogs.length;

    // Dialog handlers removed (Handled by hook)

    const handleExportExcel = () => {
        const dataToExport = filteredLogs.map(log => {
            const teamName = teams.find(t => t.id === log.teamId)?.name || '';
            return {
                "사용일": log.usageDate || new Date(log.createdAt).toISOString().split('T')[0],
                "사업": log.cable.division,
                "팀": teamName,
                "공사명": (log as any).projectNameUsage || log.cable.projectName || '',
                "공사번호": (log as any).projectCode || '',
                "제조번호": log.cable.drumNo,
                "규격": log.cable.spec,
                "설치(m)": log.installLength || 0,
                "폐기(m)": log.wasteLength || 0,
                "합계(m)": (log.installLength || 0) + (log.wasteLength || 0),
                "잔량(m)": (log as any).afterRemaining || 0,
                "첨부": (() => {
                    try {
                        const attr = (log as any).attributes ? JSON.parse((log as any).attributes) : null;
                        if (!attr) return '';
                        if (attr.attachments && Array.isArray(attr.attachments) && attr.attachments.length > 0) return `📎 ${attr.attachments.length}`;
                        if (attr.attachment) return '📎 1';
                        return '';
                    } catch { return ''; }
                })(),
                "사용자": (log as any).workerName || '',
                "입력자": (log as any).createdByName || ''
            };
        });

        exportToExcel(dataToExport, "광케이블_사용등록내역");
    };

    if (isLoading || !isTeamResolved) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="hidden md:block flex-shrink-0 space-y-4 pb-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">자재 사용등록내역 (광케이블)</h1>
                        <p className="text-muted-foreground">현장팀 자재 사용 이력을 조회합니다</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="전체" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="전체">전체</SelectItem>
                                <SelectItem value="SKT">SKT</SelectItem>
                                <SelectItem value="SKB">SKB</SelectItem>
                            </SelectContent>
                        </Select>
                        {canManage && (
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
                        {canRegister && isTenantOwner && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button>
                                        <Plus className="h-4 w-4 mr-2" />
                                        등록
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => openDialog()}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        직접 등록
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setBulkUploadOpen(true)}>
                                        <Upload className="h-4 w-4 mr-2" />
                                        일괄 등록
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="relative max-w-sm">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="제조번호, 규격, 공사번호, 공사명 검색..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        {selectedIds.size > 0 && isTenantOwner && (
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setBulkDeleteOpen(true)}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                선택 삭제 ({selectedIds.size})
                            </Button>
                        )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">{totalRecords}</span>건 /
                        사용량 <span className="font-semibold text-foreground">{totalLength.toLocaleString()}</span>m
                    </div>
                </div>
            </div>

            <div className="flex-1 rounded-md border bg-background overflow-hidden relative">
                {/* PC View: Table */}
                <div className="hidden md:block h-full overflow-auto">
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
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.date }}>
                                    사용일
                                    <div
                                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                                        onMouseDown={(e) => startResizing("date", e)}
                                    />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.division }}>
                                    사업
                                    <div
                                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                                        onMouseDown={(e) => startResizing("division", e)}
                                    />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.teamCategory }}>
                                    팀
                                    <div
                                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                                        onMouseDown={(e) => startResizing("teamCategory", e)}
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
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.installLength }}>
                                    설치(m)
                                    <div
                                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                                        onMouseDown={(e) => startResizing("installLength", e)}
                                    />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.wasteLength }}>
                                    폐기(m)
                                    <div
                                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                                        onMouseDown={(e) => startResizing("wasteLength", e)}
                                    />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.remainingLength }}>
                                    잔량(m)
                                    <div
                                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                                        onMouseDown={(e) => startResizing("remainingLength", e)}
                                    />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.attachment }}>
                                    첨부
                                    <div
                                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                                        onMouseDown={(e) => startResizing("attachment", e)}
                                    />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.user }}>
                                    사용자
                                    <div
                                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                                        onMouseDown={(e) => startResizing("user", e)}
                                    />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.creator }}>
                                    입력자
                                    <div
                                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                                        onMouseDown={(e) => startResizing("creator", e)}
                                    />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background" style={{ width: widths.actions }}></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredLogs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={15} className="text-center py-8 text-muted-foreground">
                                        사용 내역이 없습니다
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredLogs.map((log) => {
                                    const teamName = teams.find(t => t.id === log.teamId)?.name || '';
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
                                            <TableCell className="text-center align-middle whitespace-nowrap">
                                                {log.usageDate || new Date(log.createdAt).toISOString().split('T')[0]}
                                            </TableCell>
                                            <TableCell className="text-center align-middle whitespace-nowrap">{log.cable.division}</TableCell>
                                            <TableCell className="text-center align-middle whitespace-nowrap">{teamName}</TableCell>
                                            <TableCell className="align-middle p-0">
                                                <div className="w-full truncate text-center mx-auto" title={(log as any).projectCode || ""}>
                                                    {(log as any).projectCode || ""}
                                                </div>
                                            </TableCell>
                                            <TableCell className="align-middle p-0">
                                                <div className="w-full truncate text-left pl-2" title={(log as any).projectNameUsage || log.cable.projectName || ''}>
                                                    {(log as any).projectNameUsage || log.cable.projectName || ''}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center align-middle whitespace-nowrap font-medium">
                                                {log.cable.drumNo}
                                            </TableCell>
                                            <TableCell className="text-center align-middle whitespace-nowrap">{log.cable.spec}</TableCell>
                                            <TableCell className="text-right align-middle whitespace-nowrap">
                                                {(log.installLength || 0).toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right align-middle whitespace-nowrap">
                                                {(log.wasteLength || 0).toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right align-middle whitespace-nowrap font-medium text-primary">
                                                {((log as any).afterRemaining || 0).toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-center align-middle whitespace-nowrap">
                                                {(() => {
                                                    try {
                                                        const attr = (log as any).attributes ? JSON.parse((log as any).attributes) : null;
                                                        if (!attr) return '-';

                                                        const attachments: { name: string }[] = [];
                                                        if (attr.attachments && Array.isArray(attr.attachments)) {
                                                            attachments.push(...attr.attachments);
                                                        } else if (attr.attachment && typeof attr.attachment === 'object') {
                                                            attachments.push(attr.attachment);
                                                        }

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
                                                    } catch (e) {
                                                        return '-';
                                                    }
                                                })()}
                                            </TableCell>
                                            <TableCell className="text-center align-middle whitespace-nowrap">
                                                {(log as any).workerName || ''}
                                            </TableCell>
                                            <TableCell className="text-center align-middle whitespace-nowrap">
                                                {(log as any).createdByName || ''}
                                            </TableCell>
                                            <TableCell className="text-center align-middle">
                                                {(canManage || isFieldTeam) && (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => openDialog(log)}>
                                                                <Pencil className="mr-2 h-4 w-4" />
                                                                수정
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => setDeleteLog(log)}
                                                                className="text-destructive"
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                삭제
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </table>
                </div>

                {/* Mobile View: Card List */}
                <div className="md:hidden h-full flex flex-col overflow-hidden">
                    {/* Mobile Header with Add Button */}
                    <div className="flex-shrink-0 p-4 border-b bg-background">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h2 className="text-lg font-bold">사용 등록 내역</h2>
                                <p className="text-xs text-muted-foreground">
                                    {totalRecords}건 / 설치 {totalLength.toLocaleString()}m
                                </p>
                            </div>
                            {canRegister && (
                                <Button
                                    size="sm"
                                    className="h-9"
                                    onClick={() => openDialog()}
                                >
                                    <Plus className="h-4 w-4 mr-1" />
                                    등록
                                </Button>
                            )}
                        </div>

                        {/* Mobile Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="제조번호, 규격, 공사명 검색..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-9 text-sm"
                            />
                        </div>
                    </div>

                    {/* Mobile Card List */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {filteredLogs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                                <p className="text-sm">사용 내역이 없습니다</p>
                            </div>
                        ) : (
                            filteredLogs.map((log) => {
                                const teamName = teams.find(t => t.id === log.teamId)?.name || '';
                                return (
                                    <div
                                        key={log.id}
                                        className="bg-card border rounded-lg p-3 shadow-sm"
                                    >
                                        {/* Header: Date + Actions */}
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-semibold">
                                                        {log.usageDate || new Date(log.createdAt).toISOString().split('T')[0]}
                                                    </span>
                                                    <span className="text-xs px-1.5 py-0.5 bg-secondary rounded">
                                                        {log.cable.division}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-0.5">
                                                    {teamName}
                                                </div>
                                            </div>
                                            {(canManage || isFieldTeam) && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => openDialog(log)}>
                                                            <Pencil className="mr-2 h-4 w-4" /> 수정
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => setDeleteLog(log)}
                                                            className="text-destructive"
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" /> 삭제
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>

                                        {/* Cable Info */}
                                        <div className="space-y-1 mb-2">
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-sm font-medium">{log.cable.drumNo}</span>
                                                <span className="text-xs text-muted-foreground">{log.cable.spec}</span>
                                            </div>
                                            {((log as any).projectNameUsage || log.cable.projectName) && (
                                                <div className="text-xs text-muted-foreground truncate">
                                                    공사: {(log as any).projectNameUsage || log.cable.projectName}
                                                </div>
                                            )}
                                            {(log as any).projectCode && (
                                                <div className="text-xs text-muted-foreground truncate">
                                                    번호: {(log as any).projectCode}
                                                </div>
                                            )}
                                        </div>

                                        {/* Footer: Usage + Recipient */}
                                        <div className="flex items-center justify-between pt-2 border-t">
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <span>{(log as any).workerName || '-'}</span>
                                                {(() => {
                                                    try {
                                                        const attr = (log as any).attributes ? JSON.parse((log as any).attributes) : null;
                                                        if (!attr) return null;

                                                        const attachments: { name: string }[] = [];
                                                        if (attr.attachments && Array.isArray(attr.attachments)) {
                                                            attachments.push(...attr.attachments);
                                                        } else if (attr.attachment && typeof attr.attachment === 'object') {
                                                            attachments.push(attr.attachment);
                                                        }

                                                        if (attachments.length === 0) return null;

                                                        if (attachments.length === 1) {
                                                            return (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-5 px-1"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        downloadFile(`/api/optical-cables/logs/${log.id}`, attachments[0].name);
                                                                    }}
                                                                >
                                                                    <Download className="h-3 w-3" />
                                                                </Button>
                                                            );
                                                        }

                                                        return (
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-5 gap-1 px-1"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        <Paperclip className="h-3 w-3" />
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
                                                    } catch (e) {
                                                        return null;
                                                    }
                                                })()}
                                            </div>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-xs text-muted-foreground">사용:</span>
                                                <span className="text-base font-bold text-primary">
                                                    {(log.installLength || 0).toLocaleString()}
                                                </span>
                                                <span className="text-xs text-muted-foreground ml-1">
                                                    (잔여: {((log as any).afterRemaining || 0).toLocaleString()})
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Dialogs */}
            <OpticalUsageDialog
                key={editingLog ? editingLog.id : dialogOpen ? 'new' : 'closed'}
                open={dialogOpen}
                onOpenChange={(open) => !open && closeDialog()}
                editingLog={editingLog}
            />

            <AlertDialog open={!!deleteLog} onOpenChange={() => setDeleteLog(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>사용 내역 삭제</AlertDialogTitle>
                        <AlertDialogDescription>
                            이 사용 내역을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteLog && deleteMutation.mutate(deleteLog.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            삭제
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>선택 항목 삭제</AlertDialogTitle>
                        <AlertDialogDescription>
                            선택한 {selectedIds.size}건의 사용 내역을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={bulkDeleteMutation.isPending}>취소</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                if (bulkDeleteMutation.isPending) {
                                    e.preventDefault();
                                    return;
                                }
                                e.preventDefault();
                                bulkDeleteMutation.mutate(Array.from(selectedIds));
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={bulkDeleteMutation.isPending}
                        >
                            {bulkDeleteMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    삭제 중...
                                </>
                            ) : (
                                "삭제"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <GenericBulkUploadDialog<ParsedOpticalUsageRow>
                open={bulkUploadOpen}
                onOpenChange={setBulkUploadOpen}
                title="광케이블 사용 내역 일괄등록"
                description="엑셀 파일을 업로드하여 여러 건의 사용 내역을 한번에 등록합니다. 사용일자 순서대로 자동 처리됩니다."
                onDownloadTemplate={downloadOpticalUsageTemplate}
                validateRow={(row, index) => {
                    return validateOpticalUsageRow(row, index, assignedCables, teamId || "");
                }}
                transformRow={transformOpticalUsageRow}
                columns={opticalUsageColumns}
                onUpload={async (data) => {
                    try {
                        await apiRequest("POST", "/api/optical-cables/usage/bulk", {
                            items: data.map(item => ({
                                ...item,
                                teamId: teamId || currentTenantData?.teamId || ""
                            }))
                        });
                        queryClient.invalidateQueries({ queryKey: ["/api/optical-cables"] });
                        queryClient.resetQueries({ queryKey: ["/api/optical-cables/logs"] });
                        toast({ title: `${data.length}건의 사용 내역이 등록되었습니다` });
                        setBulkUploadOpen(false);
                    } catch (error: any) {
                        toast({
                            title: "일괄등록 실패",
                            description: error.message || "등록 중 오류가 발생했습니다",
                            variant: "destructive"
                        });
                        throw error;
                    }
                }}
            />
        </div>
    );
}
