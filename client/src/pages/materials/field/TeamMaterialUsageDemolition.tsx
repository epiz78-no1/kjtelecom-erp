import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Loader2,
    Plus,
    Trash2,
    Calendar,
    Paperclip,
    Download,
    Upload,
    MoreHorizontal,
    FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/SearchInput";
import {
    Table,
    TableHeader,
    TableRow,
    TableHead,
    TableBody,
    TableCell,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/contexts/AppContext";
import { useTableFilters } from "@/hooks/useTableFilters";
import { useColumnResize } from "@/hooks/useColumnResize";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useDownload } from "@/hooks/useDownload";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";
import { exportToExcel } from "@/lib/excel";

import { DemolitionMaterial } from "@/types/demolition";
import { parseAttributes } from "@/utils/demolitionUtils";

export default function TeamMaterialUsageDemolition() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { user, tenants, currentTenant, teams } = useAppContext();
    const { downloadFile, downloadAttachment } = useDownload();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    const {
        attachments,
        setAttachments,
        handleFileChange,
        removeAttachment,
        clearAttachments
    } = useFileUpload();

    const { widths, startResizing } = useColumnResize({
        checkbox: 40,
        date: 90,
        division: 60,
        team: 100,
        projectCode: 100,
        projectName: 220,
        productName: 160,
        specification: 150,
        quantity: 80,
        recipient: 80,
        remark: 150,
        createdBy: 80,
        attachment: 60,
        actions: 60
    });

    const activeTenant = tenants.find(t => t.id === currentTenant);
    const initialTeamId = activeTenant?.teamId;

    const [formData, setFormData] = useState({
        recipient: user?.name || "",
        teamId: initialTeamId ? String(initialTeamId) : "",
        projectCode: "",
        projectName: "",
        items: [{
            id: crypto.randomUUID(),
            materialId: "",
            usedQuantity: "",
            remark: ""
        }]
    });

    const lastItemRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (formData.items && formData.items.length > 1) {
            setTimeout(() => {
                lastItemRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }, 100);
        }
    }, [formData.items.length]);

    // Auto-select Team and User (Recipient) when they become available
    useEffect(() => {
        if (activeTenant?.teamId && formData.teamId !== String(activeTenant.teamId)) {
            setFormData(prev => ({
                ...prev,
                teamId: String(activeTenant.teamId),
                recipient: user?.name || prev.recipient || ""
            }));
        } else if (!formData.recipient && user?.name) {
            setFormData(prev => ({ ...prev, recipient: user.name as string }));
        }
    }, [activeTenant?.teamId, user?.name]);

    const { data: materials = [] } = useQuery<DemolitionMaterial[]>({
        queryKey: ["/api/demolition-materials"],
        select: (data) => data.filter(m => {
            const isUsable = (m.status === 'approved_reusable' || m.status === 'in_use') && m.remainingQuantity > 0;
            return isUsable;
        }),
    });

    const filteredMaterials = useMemo(() => {
        if (!formData.teamId) return [];
        return materials.filter(m => {
            // 필드팀으로 로그인한 경우 강제로 본인 팀 자재만 출력
            if (activeTenant?.teamId) {
                return String(m.currentTeamId) === String(activeTenant.teamId);
            }
            // 그 외(관리자 등)는 선택된 팀으로 필터링
            return String(m.currentTeamId) === String(formData.teamId);
        });
    }, [materials, formData.teamId, activeTenant?.teamId]);

    const { data: logs = [], isLoading } = useQuery<any[]>({
        queryKey: ["/api/demolition-logs"],
        select: (data) => {
            const usageLogs = data.filter((log: any) => ['usage', 'dispose'].includes(log.logType));
            if (activeTenant?.teamId) {
                return usageLogs.filter((log: any) => log.teamId === activeTenant.teamId);
            }
            return usageLogs;
        },
    });

    const { data: members = [] } = useQuery<any[]>({
        queryKey: ["/api/members/basic"],
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            return apiRequest("POST", `/api/demolition-materials/${data.materialId}/usage`, data);
        },
        onSuccess: () => { },
        onError: (error: any) => { console.error(error); },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return apiRequest("DELETE", `/api/demolition-logs/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/demolition-logs"] });
            queryClient.invalidateQueries({ queryKey: ["/api/demolition-materials"] });
            toast({ title: "삭제되었습니다" });
        },
        onError: () => {
            toast({ title: "삭제 실패", variant: "destructive" });
        },
    });

    const bulkDeleteMutation = useMutation({
        mutationFn: async (ids: string[]) => {
            return apiRequest("POST", "/api/demolition-logs/bulk-delete", { ids });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/demolition-logs"] });
            queryClient.invalidateQueries({ queryKey: ["/api/demolition-materials"] });
            toast({ title: `${selectedIds.size}건이 삭제되었습니다` });
            setSelectedIds(new Set());
            setBulkDeleteOpen(false);
        },
        onError: () => {
            toast({ title: "삭제 실패", variant: "destructive" });
        },
    });

    const resetForm = () => {
        setFormData({
            recipient: user?.name || "",
            teamId: initialTeamId || "",
            projectCode: "",
            projectName: "",
            items: [{
                id: crypto.randomUUID(),
                materialId: "",
                usedQuantity: "",
                remark: ""
            }]
        });
        clearAttachments();
        setSelectedDate(new Date());
    };

    const addItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, {
                id: crypto.randomUUID(),
                materialId: "",
                usedQuantity: "",
                remark: ""
            }]
        }));
    };

    const removeItem = (id: string) => {
        if (formData.items.length === 1) return;
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter(item => item.id !== id)
        }));
    };

    const updateItem = (id: string, field: string, value: any) => {
        setFormData(prev => {
            const newItems = prev.items.map(item => {
                if (item.id !== id) return item;
                return { ...item, [field]: value };
            });

            // Auto-Add Logic
            const isLastItem = prev.items[prev.items.length - 1].id === id;
            if (isLastItem) {
                if ((field === 'materialId' && value) || (field === 'usedQuantity' && value && value !== '0')) {
                    newItems.push({
                        id: crypto.randomUUID(),
                        materialId: "",
                        usedQuantity: "",
                        remark: ""
                    });
                }
            }

            return {
                ...prev,
                items: newItems
            };
        });
    };

    const handleSubmit = async () => {
        if (!selectedDate || !formData.recipient) {
            toast({ title: "필수 항목 누락", description: "사용일자와 작업자는 필수입니다.", variant: "destructive" });
            return;
        }

        const validItems = formData.items.filter(item => item.materialId && item.usedQuantity);
        if (validItems.length === 0) {
            toast({ title: "품목 누락", description: "최소 하나의 유효한 품목(자재 및 수량)을 입력해주세요.", variant: "destructive" });
            return;
        }

        try {
            setDialogOpen(false);
            toast({ title: "등록중입니다", description: `${validItems.length}건의 자재 출고 등록을 진행합니다.` });

            let successCount = 0;

            for (let i = 0; i < validItems.length; i++) {
                const item = validItems[i];
                const attributesObj: any = {};
                if (i === 0 && attachments && attachments.length > 0) {
                    attributesObj.attachments = attachments;
                    attributesObj.attachment = attachments[0];
                }

                const data = {
                    materialId: item.materialId,
                    teamId: formData.teamId,
                    projectCode: formData.projectCode,
                    projectName: formData.projectName,
                    usedQuantity: parseInt(item.usedQuantity) || 0,
                    workerName: formData.recipient,
                    logDate: format(selectedDate, "yyyy-MM-dd"),
                    logType: 'usage',
                    remark: item.remark,
                    attributes: JSON.stringify(attributesObj)
                };

                await apiRequest("POST", `/api/demolition-materials/${data.materialId}/usage`, data);
                successCount++;
            }

            queryClient.invalidateQueries({ queryKey: ["/api/demolition-logs"] });
            queryClient.invalidateQueries({ queryKey: ["/api/demolition-materials"] });
            toast({ title: "등록 완료", description: `${successCount}건의 사용 내역이 저장되었습니다.` });
            resetForm();

        } catch (error: any) {
            toast({
                title: "등록 실패",
                description: error.message || "오류가 발생했습니다",
                variant: "destructive"
            });
        }
    };

    const formattedLogs = logs.map(log => ({
        ...log,
        division: log.material?.division || "SKT",
        teamName: log.team?.name || "미지정",
        productName: log.material?.productName || "",
        spec: log.material?.specification || "",
        mgmtNo: log.material?.managementNo || "",
        creatorName: log.creator?.name || "관리자"
    }));

    const {
        searchQuery: query,
        setSearchQuery: setQuery,
        selectedDivision: div,
        setSelectedDivision: setDiv,
        selectedCategory: team,
        setSelectedCategory: setTeam,
        filteredItems: displayedLogs,
        categories: teamsList
    } = useTableFilters(formattedLogs, {
        searchFields: ["productName", "projectName", "workerName", "remark"],
        divisionField: "division",
        categoryField: "teamName"
    });

    const handleExportExcel = () => {
        const dataToExport = displayedLogs.map((log: any) => ({
            "사용일자": log.logDate,
            "사업": log.division,
            "사용팀": log.teamName,
            "공사번호": log.projectCode || "",
            "공사명": log.projectName || "",
            "품명": log.productName,
            "규격": log.spec,
            "수량": log.usedQuantity,
            "사용자": log.workerName,
            "비고": log.remark || "",
            "입력자": log.creatorName
        }));
        exportToExcel(dataToExport, "철거자재_사용내역");
    };

    const allSelected = displayedLogs.length > 0 && displayedLogs.every((r: any) => selectedIds.has(r.id));
    const toggleSelectAll = () => {
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(displayedLogs.map((r: any) => r.id)));
        }
    };
    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
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
            {/* Desktop View */}
            <div className="hidden md:flex flex-col h-full">
                {/* Ultra Compact Header Section */}
                <div className="flex flex-col gap-2 flex-shrink-0 mb-2 pt-1">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 px-1">
                            <h1 className="text-base font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                철거자재 사용 목록
                                <span className="flex h-1.5 w-1.5 rounded-full bg-red-500 shadow-sm shadow-red-500/50 animate-pulse"></span>
                            </h1>
                            <div className="h-3 w-px bg-slate-200 dark:bg-slate-800"></div>
                            <span className="text-xs font-medium text-slate-500">
                                {displayedLogs.length}건 / 수량 {displayedLogs.reduce((acc, curr) => acc + (curr.usedQuantity || 0), 0).toLocaleString()}
                            </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <SearchInput
                                value={query}
                                onChange={setQuery}
                                placeholder="품명, 공사명, 수령인..."
                                className="w-40 focus:w-56 h-7 text-xs rounded-md bg-white border-slate-200 focus:ring-1 focus:ring-primary/20 transition-all font-normal"
                            />

                            {selectedIds.size > 0 && (
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="h-7 border-destructive/20 text-xs px-2 gap-1.5"
                                    onClick={() => setBulkDeleteOpen(true)}
                                >
                                    <Trash2 className="h-3 w-3" />
                                    삭제 ({selectedIds.size})
                                </Button>
                            )}

                            <div className="w-[140px]">
                                <Select value={team} onValueChange={setTeam}>
                                    <SelectTrigger className="h-7 text-xs rounded-md bg-white border-slate-200">
                                        <SelectValue placeholder="팀 선택" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="전체" className="text-xs">전체 팀</SelectItem>
                                        {teamsList.filter(t => t !== "전체").map(t => (
                                            <SelectItem key={String(t)} value={String(t)} className="text-xs">
                                                {String(t)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

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
                                    <TooltipContent side="bottom" className="text-xs">Excel 다운로드</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            size="icon"
                                            className="h-7 w-7 rounded-md bg-primary hover:bg-primary/90 shadow-sm p-0"
                                            onClick={() => {
                                                resetForm();
                                                setDialogOpen(true);
                                            }}
                                        >
                                            <Plus className="h-3.5 w-3.5 text-white" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>철거자재 등록</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>


                        </div>
                    </div>
                </div>

                {/* Main Table Area */}
                <div className="flex-1 rounded-3xl border border-slate-200 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-xl shadow-slate-200/50 dark:shadow-black/50 overflow-hidden flex flex-col relative z-0">
                    <div className="flex-1 overflow-auto custom-scrollbar relative">
                        <table className="w-full text-sm border-collapse table-fixed">
                            <TableHeader className="sticky top-0 bg-slate-50/95 backdrop-blur z-20 shadow-sm">
                                <TableRow className="h-10 border-b border-slate-200">
                                    <TableHead className="w-[40px] text-center p-0 align-middle bg-slate-50/50 border-r" style={{ width: widths.checkbox }}>
                                        <Checkbox
                                            checked={allSelected}
                                            onCheckedChange={toggleSelectAll}
                                            aria-label="Select all"
                                            className="translate-y-[2px]"
                                        />
                                    </TableHead>
                                    <TableHead className="font-semibold text-slate-600 text-center relative select-none" style={{ width: widths.date }}>
                                        사용일
                                        <div onMouseDown={(e) => startResizing('date', e)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" />
                                    </TableHead>
                                    <TableHead className="font-semibold text-slate-600 text-center relative select-none" style={{ width: widths.division }}>
                                        사업
                                        <div onMouseDown={(e) => startResizing('division', e)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" />
                                    </TableHead>
                                    <TableHead className="font-semibold text-slate-600 text-center relative select-none" style={{ width: widths.team }}>
                                        사용팀
                                        <div onMouseDown={(e) => startResizing('team', e)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" />
                                    </TableHead>
                                    <TableHead className="font-semibold text-slate-600 text-center relative select-none" style={{ width: widths.projectCode }}>
                                        공사번호
                                        <div onMouseDown={(e) => startResizing('projectCode', e)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" />
                                    </TableHead>
                                    <TableHead className="font-semibold text-slate-600 text-center relative select-none" style={{ width: widths.projectName }}>
                                        공사명
                                        <div onMouseDown={(e) => startResizing('projectName', e)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" />
                                    </TableHead>
                                    <TableHead className="font-semibold text-slate-600 text-center relative select-none" style={{ width: widths.productName }}>
                                        품명
                                        <div onMouseDown={(e) => startResizing('productName', e)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" />
                                    </TableHead>
                                    <TableHead className="font-semibold text-slate-600 text-center relative select-none" style={{ width: widths.specification }}>
                                        규격
                                        <div onMouseDown={(e) => startResizing('specification', e)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" />
                                    </TableHead>
                                    <TableHead className="font-semibold text-slate-600 text-center relative select-none" style={{ width: widths.quantity }}>
                                        수량
                                        <div onMouseDown={(e) => startResizing('quantity', e)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" />
                                    </TableHead>
                                    <TableHead className="font-semibold text-slate-600 text-center relative select-none" style={{ width: widths.recipient }}>
                                        사용자
                                        <div onMouseDown={(e) => startResizing('recipient', e)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" />
                                    </TableHead>
                                    <TableHead className="font-semibold text-slate-600 text-center relative select-none" style={{ width: widths.remark }}>
                                        비고
                                        <div onMouseDown={(e) => startResizing('remark', e)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" />
                                    </TableHead>
                                    <TableHead className="font-semibold text-slate-600 text-center relative select-none" style={{ width: widths.createdBy }}>
                                        입력자
                                        <div onMouseDown={(e) => startResizing('createdBy', e)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" />
                                    </TableHead>
                                    <TableHead className="font-semibold text-slate-600 text-center relative select-none" style={{ width: widths.attachment }}>
                                        첨부
                                        <div onMouseDown={(e) => startResizing('attachment', e)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 z-50" />
                                    </TableHead>
                                    <TableHead className="font-semibold text-slate-600 text-center relative select-none" style={{ width: widths.actions }}></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {displayedLogs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={14} className="h-64 text-center text-muted-foreground">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <FileText className="h-8 w-8 text-slate-300" />
                                                <p>사용 내역이 없습니다</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    displayedLogs.map((log: any) => {

                                        const rowColor = log.logType === 'dispose' ? 'bg-red-50/50 hover:bg-red-100/50' : 'hover:bg-slate-50/80';

                                        return (
                                            <TableRow key={log.id} className={`group h-10 border-b border-slate-100 dark:border-zinc-800 transition-colors ${rowColor} text-xs`}>
                                                <TableCell className="text-center p-0 px-1">
                                                    <Checkbox
                                                        checked={selectedIds.has(log.id)}
                                                        onCheckedChange={() => toggleSelect(log.id)}
                                                        className="translate-y-[2px] opacity-0 group-hover:opacity-100 data-[state=checked]:opacity-100 transition-opacity"
                                                    />
                                                </TableCell>
                                                <TableCell className="text-center p-0 px-1 text-[11px] text-slate-500 font-mono">{log.logDate || ''}</TableCell>
                                                <TableCell className="text-center p-0 px-1 text-slate-600">{log.division || ''}</TableCell>
                                                <TableCell className="text-center p-0 px-1 font-medium text-slate-700">{log.teamName || ''}</TableCell>
                                                <TableCell className="text-center p-0 px-1 text-slate-600 truncate" title={log.projectCode}>{log.projectCode || ''}</TableCell>
                                                <TableCell className="text-left p-0 px-2 text-slate-800 font-medium truncate" title={log.projectName}>{log.projectName || ''}</TableCell>
                                                <TableCell className="text-center p-0 px-2 text-slate-700 font-medium truncate" title={log.productName}>{log.productName || ''}</TableCell>
                                                <TableCell className="text-center p-0 px-1 text-slate-500 truncate" title={log.spec}>{log.spec || ''}</TableCell>
                                                <TableCell className="text-center p-0 px-2 font-bold font-mono text-primary">{log.usedQuantity?.toLocaleString() || '0'}</TableCell>
                                                <TableCell className="text-center p-0 px-1 text-slate-600">{log.workerName || ''}</TableCell>
                                                <TableCell className="text-left p-0 px-2 text-slate-400 italic truncate" title={log.remark || ''}>{log.remark || ''}</TableCell>
                                                <TableCell className="text-center p-0 px-1 text-slate-400">{(log as any).createdByName || (log as any).creatorName || "-"}</TableCell>
                                                <TableCell className="text-center px-1">
                                                    {(() => {
                                                        let hasAttachments = false;
                                                        let attachments: any[] = [];
                                                        try {
                                                            const parsed = typeof log.attributes === 'string'
                                                                ? JSON.parse(log.attributes)
                                                                : log.attributes || {};

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

                                                        if (!hasAttachments) return <span className="text-slate-300">-</span>;

                                                        if (attachments.length === 1) {
                                                            return (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-6 w-6 p-0 hover:bg-slate-100"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        downloadAttachment(attachments[0]);
                                                                    }}
                                                                    title={attachments[0].name}
                                                                >
                                                                    <Download className="h-3 w-3 text-slate-500" />
                                                                </Button>
                                                            );
                                                        }

                                                        return (
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-slate-100 gap-0.5" onClick={(e) => e.stopPropagation()}>
                                                                        <Paperclip className="h-3 w-3 text-slate-500" />
                                                                        <span className="text-[9px] font-medium text-slate-600">{attachments.length}</span>
                                                                    </Button>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-auto p-2" align="center">
                                                                    <div className="flex flex-col gap-1">
                                                                        <div className="text-xs font-semibold px-2 py-1 mb-1 border-b">첨부파일 {attachments.length}개</div>
                                                                        {attachments.map((file: any, index: number) => (
                                                                            <Button
                                                                                key={index}
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                className="justify-start h-auto py-1 px-2 font-normal text-xs overflow-hidden max-w-[200px]"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    downloadAttachment(file);
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
                                                <TableCell className="text-center px-1">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-6 w-6 p-0 hover:bg-slate-100">
                                                                <span className="sr-only">메뉴</span>
                                                                <MoreHorizontal className="h-3 w-3 text-slate-400" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem
                                                                onClick={() => deleteMutation.mutate(log.id)}
                                                                className="text-red-600 focus:text-red-600 text-xs"
                                                            >
                                                                <Trash2 className="mr-2 h-3 w-3" />
                                                                <span>삭제</span>
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Mobile View */}
            <div className="md:hidden flex flex-col h-full space-y-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-lg font-bold">자재 사용등록내역</h1>
                        <p className="text-xs text-muted-foreground">{displayedLogs.length}건 / 수량 {displayedLogs.reduce((acc, curr) => acc + (curr.usedQuantity || 0), 0).toLocaleString()}</p>
                    </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                    <SearchInput
                        value={query}
                        onChange={setQuery}
                        placeholder="품명, 공사명..."
                        className="max-w-sm"
                        size="sm"
                    />
                    <Button size="sm" onClick={() => {
                        resetForm();
                        setDialogOpen(true);
                    }}>
                        <Plus className="h-4 w-4 mr-2" />
                        등록
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/10">
                    {displayedLogs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                            <p className="text-sm">사용 내역이 없습니다</p>
                        </div>
                    ) : (
                        displayedLogs.map((log: any) => (
                            <div key={log.id} className="bg-card border rounded-lg p-3 shadow-sm">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold">{log.logDate}</span>
                                            <span className="text-xs px-1.5 py-0.5 bg-secondary rounded">{log.division}</span>
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-0.5">
                                            {log.teamName}
                                        </div>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                onClick={() => deleteMutation.mutate(log.id)}
                                                className="text-red-600 focus:text-red-600"
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                <span>삭제</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <div className="space-y-1 mb-2">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-sm font-medium">{log.productName}</span>
                                        <span className="text-xs text-muted-foreground">{log.spec}</span>
                                    </div>
                                    {log.projectName && (
                                        <div className="text-xs text-muted-foreground truncate">
                                            {log.projectName}
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t">
                                    <div className="text-xs text-muted-foreground">{log.workerName}</div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-xs text-muted-foreground">수량:</span>
                                        <span className="text-base font-bold text-primary">
                                            {log.usedQuantity?.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Registration Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>철거자재 사용 등록</DialogTitle>
                        <DialogDescription>
                            현장팀의 철거자재 사용 내역을 일괄 등록합니다.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        <div className="grid gap-4 py-4">
                            {/* Row 1: Date | Team | User */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>사용일 *</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                className={`w-full justify-start text-left font-normal ${!selectedDate && "text-muted-foreground"}`}
                                            >
                                                <Calendar className="mr-2 h-4 w-4" />
                                                {selectedDate ? format(selectedDate, "yyyy-MM-dd", { locale: ko }) : <span>날짜 선택</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <CalendarComponent
                                                mode="single"
                                                selected={selectedDate}
                                                onSelect={(date) => date && setSelectedDate(date)}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="space-y-2">
                                    <Label>사용팀 *</Label>
                                    <Select
                                        value={String(formData.teamId)}
                                        onValueChange={(val) => setFormData(prev => ({ ...prev, teamId: val }))}
                                        disabled={!!activeTenant?.teamId} // User's team if field team
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="팀 선택" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {teams.map(t => (
                                                <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>사용자 *</Label>
                                    <Select
                                        value={formData.recipient}
                                        onValueChange={(val) => setFormData(prev => ({ ...prev, recipient: val }))}
                                        disabled={!formData.teamId}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={formData.teamId ? "사용자 선택" : "팀을 먼저 선택하세요"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {members
                                                .filter(m => String(m.teamId) === String(formData.teamId))
                                                .map(m => (
                                                    <SelectItem key={m.id} value={m.name}>
                                                        {m.name}
                                                    </SelectItem>
                                                ))}
                                            {members.filter(m => String(m.teamId) === String(formData.teamId)).length === 0 && (
                                                <SelectItem value="none" disabled>팀원 없음</SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Row 2: Project Info */}
                            <div className="grid grid-cols-4 gap-4">
                                <div className="col-span-1 space-y-2">
                                    <Label>공사번호</Label>
                                    <Input
                                        value={formData.projectCode}
                                        onChange={(e) => setFormData(prev => ({ ...prev, projectCode: e.target.value }))}
                                        placeholder="공사번호"
                                    />
                                </div>
                                <div className="col-span-3 space-y-2">
                                    <Label>공사명</Label>
                                    <Input
                                        value={formData.projectName}
                                        onChange={(e) => setFormData(prev => ({ ...prev, projectName: e.target.value }))}
                                        placeholder="공사명 입력"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-base font-medium">사용 자재 목록</Label>

                                <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-sm font-medium">보유 자재 선택</h4>

                                    </div>

                                    {formData.items.map((item, index) => (
                                        <div
                                            key={item.id}
                                            className="grid gap-3 border p-3 rounded-md bg-muted/20 relative"
                                            ref={index === formData.items.length - 1 ? lastItemRef : null}
                                        >
                                            {formData.items.length > 1 && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="absolute right-2 top-2 h-6 w-6 text-muted-foreground hover:text-destructive"
                                                    onClick={() => removeItem(item.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}

                                            <div className="grid gap-2">
                                                <Label className="text-xs text-muted-foreground">보유 자재 선택</Label>
                                                <Select
                                                    value={item.materialId}
                                                    onValueChange={(val) => updateItem(item.id, 'materialId', val)}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={!formData.teamId ? "팀을 먼저 선택하세요" : "자재 선택"} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {filteredMaterials
                                                            .filter((m: DemolitionMaterial) => {
                                                                // 2. Exclude already selected items (except current row)
                                                                const isAlreadySelected = formData.items.some((existingItem, i) =>
                                                                    i !== index && String(existingItem.materialId) === String(m.id) && existingItem.materialId !== ""
                                                                );
                                                                return !isAlreadySelected;
                                                            })
                                                            .map((m: DemolitionMaterial) => (
                                                                <SelectItem key={m.id} value={m.id}>
                                                                    [{m.division || 'SKT'}] {m.productName} ({m.specification}) - 잔량: {m.remainingQuantity}
                                                                </SelectItem>
                                                            ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="grid gap-2">
                                                    <Label className="text-xs text-muted-foreground">수량 *</Label>
                                                    <Input
                                                        type="number"
                                                        value={item.usedQuantity}
                                                        onChange={(e) => updateItem(item.id, 'usedQuantity', e.target.value)}
                                                        placeholder="0"
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label className="text-xs text-muted-foreground">비고</Label>
                                                    <Input
                                                        value={item.remark}
                                                        onChange={(e) => updateItem(item.id, 'remark', e.target.value)}
                                                        placeholder="비고"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-4 items-start gap-4">
                                <Label className="text-right pt-2">첨부파일</Label>
                                <div className="col-span-3">
                                    <div className="relative">
                                        <Input
                                            id="demolition-usage-file-upload"
                                            type="file"
                                            multiple
                                            accept="image/*,application/pdf,.xlsx,.xls"
                                            className="hidden"
                                            onChange={handleFileChange}
                                        />
                                        {attachments.length < 4 && (
                                            <label
                                                htmlFor="demolition-usage-file-upload"
                                                className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-primary/30 rounded-lg cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                                            >
                                                <Upload className="h-5 w-5 text-primary" />
                                                <span className="text-sm font-medium text-primary">
                                                    파일 선택 ({attachments.length}/4) - 이미지, PDF, 엑셀
                                                </span>
                                            </label>
                                        )}
                                    </div>
                                    <div className="space-y-2 mt-2">
                                        {attachments.map((file, index) => (
                                            <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                                                <span className="text-sm text-muted-foreground truncate flex-1">
                                                    📎 {file.name}
                                                </span>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => removeAttachment(index)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="mt-4 border-t pt-4">
                        <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                            취소
                        </Button>
                        <Button type="button" onClick={handleSubmit} disabled={createMutation.isPending}>
                            {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            등록
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bulk Delete Alert Dialog */}
            <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>선택한 항목 삭제</DialogTitle>
                        <DialogDescription>
                            선택한 {selectedIds.size}개의 사용 내역을 삭제하시겠습니까?
                            <br />
                            삭제 시 해당 자재의 잔량이 복구됩니다.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setBulkDeleteOpen(false)}>취소</Button>
                        <Button
                            variant="destructive"
                            onClick={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}
                            disabled={bulkDeleteMutation.isPending}
                        >
                            {bulkDeleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            삭제
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
