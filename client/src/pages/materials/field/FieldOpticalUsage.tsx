import { useState, useMemo } from "react";
import { Loader2, Trash2, Plus, Pencil, MoreHorizontal, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/SearchInput";
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
import { OpticalUsageDialog } from "@/components/optical/OpticalUsageDialog";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDownload } from "@/hooks/useDownload";
import { Paperclip, Upload } from "lucide-react";
import { GenericBulkUploadDialog } from "@/components/dialogs/GenericBulkUploadDialog";
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

    // 현장팀 판별: usage만 write이고 나머지가 모두 none인 경우
    const isFieldTeam = currentTenantData?.permissions &&
        currentTenantData.permissions.usage === 'write' &&
        currentTenantData.permissions.incoming === 'none' &&
        currentTenantData.permissions.outgoing === 'none' &&
        currentTenantData.permissions.inventory === 'none';

    const { downloadFile, downloadAttachment } = useDownload();

    const canManage = canWrite && !isFieldTeam;
    const canRegister = canWrite;

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
    const team = teams.find(t => t.id === teamId);
    const isTeamResolved = !teamId || !!team;

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
        queryKey: ["/api/optical-cables/logs", isFieldTeam && currentTenantData?.teamId ? currentTenantData.teamId : undefined], // Filter by team if field team
        enabled: isTeamResolved,
        queryFn: async () => {
            const params = new URLSearchParams();
            params.append('type', 'usage');
            if (isFieldTeam && currentTenantData?.teamId) {
                params.append('teamId', currentTenantData.teamId);
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
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-zinc-950/50 p-2 overflow-hidden">
            <div className="hidden md:flex flex-col gap-2 flex-shrink-0 mb-2 pt-1">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 px-1">
                        <h1 className="text-base font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            자재 사용등록내역 (광케이블)
                            <span className="flex h-1.5 w-1.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50 animate-pulse"></span>
                        </h1>
                        <div className="h-3 w-px bg-slate-200 dark:bg-slate-800"></div>
                        <span className="text-xs font-medium text-slate-500">{totalRecords} items</span>
                    </div>

                    <div className="flex items-center gap-1.5">


                        <SearchInput
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="제조번호, 규격, 공사명..."
                            className="w-40 focus:w-56 h-7 text-xs rounded-md bg-white border-slate-200 focus:ring-1 focus:ring-primary/20 transition-all font-normal"
                        />

                        <div className="w-[120px]">
                            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                <SelectTrigger className="h-7 text-xs rounded-md bg-white border-slate-200">
                                    <SelectValue placeholder="사업부" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="전체" className="text-xs">전체 사업부</SelectItem>
                                    <SelectItem value="SKT" className="text-xs">SKT</SelectItem>
                                    <SelectItem value="SKB" className="text-xs">SKB</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {canManage && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 rounded-md text-emerald-600 hover:bg-emerald-50"
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

                        {canRegister && (
                            <DropdownMenu>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <DropdownMenuTrigger asChild>
                                                <Button className="h-7 w-7 rounded-md bg-primary hover:bg-primary/90 shadow-sm p-0" size="icon">
                                                    <Plus className="h-3.5 w-3.5 text-white" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>사용 등록</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => openDialog()}>
                                        <Plus className="h-3.5 w-3.5 mr-2" />
                                        직접 등록
                                    </DropdownMenuItem>
                                    {isTenantOwner && (
                                        <DropdownMenuItem onClick={() => setBulkUploadOpen(true)}>
                                            <Upload className="h-3.5 w-3.5 mr-2" />
                                            일괄 등록
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        {selectedIds.size > 0 && isTenantOwner && (
                            <Button
                                variant="destructive"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => setBulkDeleteOpen(true)}
                            >
                                <Trash2 className="h-3 w-3 mr-1" />
                                삭제
                            </Button>
                        )}
                    </div>
                </div>


            </div>

            <div className="flex-1 rounded-3xl border border-slate-200 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-xl shadow-slate-200/50 dark:shadow-black/50 overflow-hidden flex flex-col relative z-0">
                {/* PC View: Table */}
                <div className="hidden md:block h-full overflow-auto">
                    <table className="w-full caption-bottom text-sm table-fixed">
                        <TableHeader className="sticky top-0 bg-slate-50/95 backdrop-blur z-20 shadow-sm">
                            <TableRow className="h-10 border-b border-slate-200">

                                <TableHead className="text-center align-middle bg-transparent p-0" style={{ width: widths.checkbox }}>
                                    {isTenantOwner ? (
                                        <Checkbox
                                            checked={allSelected}
                                            onCheckedChange={toggleSelectAll}
                                            className="translate-y-[2px]"
                                        />
                                    ) : null}
                                </TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.date }}>
                                    사용일
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("date", e)} />
                                </TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.division }}>
                                    사업
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("division", e)} />
                                </TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.teamCategory }}>
                                    팀
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("teamCategory", e)} />
                                </TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.projectCode }}>
                                    공사번호
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("projectCode", e)} />
                                </TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.projectName }}>
                                    공사명
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("projectName", e)} />
                                </TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.drumNo }}>
                                    제조번호
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("drumNo", e)} />
                                </TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.spec }}>
                                    규격
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("spec", e)} />
                                </TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.installLength }}>
                                    설치(m)
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("installLength", e)} />
                                </TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.wasteLength }}>
                                    폐기(m)
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("wasteLength", e)} />
                                </TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.remainingLength }}>
                                    잔량(m)
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("remainingLength", e)} />
                                </TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.attachment }}>
                                    첨부
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("attachment", e)} />
                                </TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.user }}>
                                    사용자
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("user", e)} />
                                </TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.creator }}>
                                    입력자
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("creator", e)} />
                                </TableHead>
                                <TableHead className="w-[50px]"></TableHead>
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
                                        <TableRow key={log.id} className="group h-10 border-b border-slate-100 dark:border-zinc-800 transition-colors hover:bg-slate-50/80 text-xs text-slate-600">
                                            <TableCell className="text-center align-middle p-0">
                                                {isTenantOwner ? (
                                                    <Checkbox
                                                        checked={selectedIds.has(log.id)}
                                                        onCheckedChange={() => toggleSelect(log.id)}
                                                        className="translate-y-[2px] opacity-0 group-hover:opacity-100 data-[state=checked]:opacity-100 transition-opacity"
                                                    />
                                                ) : null}
                                            </TableCell>
                                            <TableCell className="text-center p-0 px-1">
                                                {log.usageDate || new Date(log.createdAt).toISOString().split('T')[0]}
                                            </TableCell>
                                            <TableCell className="text-center p-0 px-1">{log.cable.division}</TableCell>
                                            <TableCell className="text-center p-0 px-1 truncate" title={teamName}>{teamName}</TableCell>
                                            <TableCell className="text-center p-0 px-1 font-mono text-slate-500">
                                                <div className="w-full truncate text-center mx-auto" title={(log as any).projectCode || ""}>
                                                    {(log as any).projectCode || ""}
                                                </div>
                                            </TableCell>
                                            <TableCell className="p-0 px-2 text-slate-700">
                                                <div className="w-full truncate text-left" title={(log as any).projectNameUsage || log.cable.projectName || ''}>
                                                    {(log as any).projectNameUsage || log.cable.projectName || ''}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center p-0 px-1 font-mono text-slate-700 font-medium">
                                                {log.cable.drumNo}
                                            </TableCell>
                                            <TableCell className="text-center p-0 px-1 text-slate-500">{log.cable.spec}</TableCell>
                                            <TableCell className="text-right p-0 px-2 font-mono">
                                                {(log.installLength || 0).toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right p-0 px-2 font-mono text-slate-400">
                                                {(log.wasteLength || 0).toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right p-0 px-2 font-mono font-bold text-emerald-600">
                                                {((log as any).afterRemaining || 0).toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-center px-1">
                                                {(() => {
                                                    let hasAttachments = false;
                                                    let attachments: any[] = [];
                                                    try {
                                                        const parsed = typeof (log as any).attributes === 'string'
                                                            ? JSON.parse((log as any).attributes)
                                                            : (log as any).attributes || {};

                                                        if (parsed.attachments && parsed.attachments.length > 0) {
                                                            attachments = parsed.attachments;
                                                            hasAttachments = true;
                                                        } else if (parsed.attachment) {
                                                            attachments = [parsed.attachment];
                                                            hasAttachments = true;
                                                        } else if ((log as any).attachment) { // Legacy fallback
                                                            attachments = [(log as any).attachment];
                                                            hasAttachments = true;
                                                        }
                                                    } catch (e) {
                                                        hasAttachments = false;
                                                    }

                                                    if (!hasAttachments) return "";

                                                    if (attachments.length === 1) {
                                                        return (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (attachments[0].storagePath || attachments[0].storageUrl) {
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
                                                                                if (file.storagePath || file.storageUrl) {
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
                                                })()}
                                            </TableCell>
                                            <TableCell className="text-center px-1 truncate max-w-[80px]" title={(log as any).workerName || ''}>
                                                {(log as any).workerName || ''}
                                            </TableCell>
                                            <TableCell className="text-center px-1 truncate max-w-[80px]" title={(log as any).createdByName || ''}>
                                                {(log as any).createdByName || ''}
                                            </TableCell>
                                            <TableCell className="text-center p-0">
                                                {(canManage || isFieldTeam) && (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <MoreHorizontal className="h-4 w-4 text-slate-400" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-32">
                                                            <DropdownMenuItem onClick={() => openDialog(log)} className="text-xs">
                                                                <Pencil className="mr-2 h-3.5 w-3.5" />
                                                                수정
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => setDeleteLog(log)}
                                                                className="text-red-600 focus:text-red-700 focus:bg-red-50 text-xs"
                                                            >
                                                                <Trash2 className="mr-2 h-3.5 w-3.5" />
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
                        <SearchInput
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="제조번호, 규격, 공사명 검색..."
                            size="sm"
                        />
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
                                                    let hasAttachments = false;
                                                    let attachments: any[] = [];
                                                    try {
                                                        const parsed = typeof (log as any).attributes === 'string'
                                                            ? JSON.parse((log as any).attributes)
                                                            : (log as any).attributes || {};

                                                        if (parsed.attachments && parsed.attachments.length > 0) {
                                                            attachments = parsed.attachments;
                                                            hasAttachments = true;
                                                        } else if (parsed.attachment) {
                                                            attachments = [parsed.attachment];
                                                            hasAttachments = true;
                                                        } else if ((log as any).attachment) { // Legacy fallback
                                                            attachments = [(log as any).attachment];
                                                            hasAttachments = true;
                                                        }
                                                    } catch (e) {
                                                        hasAttachments = false;
                                                    }

                                                    if (!hasAttachments) return null;

                                                    if (attachments.length === 1) {
                                                        return (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-5 w-5 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (attachments[0].storagePath || attachments[0].storageUrl) {
                                                                        downloadAttachment(attachments[0]);
                                                                    } else {
                                                                        downloadFile(`/api/optical-cables/logs/${log.id}`, attachments[0].name);
                                                                    }
                                                                }}
                                                                title={attachments[0].name}
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
                                                                    className="h-5 gap-1 px-1 hover:bg-blue-50 hover:text-blue-600"
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
                                                                                if (file.storagePath || file.storageUrl) {
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
