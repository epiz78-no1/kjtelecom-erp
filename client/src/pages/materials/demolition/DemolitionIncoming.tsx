import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Loader2, MoreHorizontal, Upload, Download, X, Paperclip, Pencil, Search } from "lucide-react";
import { useColumnResize } from "@/hooks/useColumnResize";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useDownload } from "@/hooks/useDownload";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/SearchInput";
import {
    TableHeader,
    TableRow,
    TableHead,
    TableBody,
    TableCell,
    Table
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/contexts/AppContext";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

import { DemolitionMaterial } from "@/types/demolition";
import { parseAttributes } from "@/utils/demolitionUtils";

const DEMOLITION_ITEMS: Record<string, any> = {
    "철거 접속함체": {
        "직선형": ["12C"],
        "돔형": ["24C"],
        "무여장": ["48C"],
        "중간분기": ["72C"],
        "사각돔형": ["96C", "144C", "288C"],
        "중간분기형 함체": []
    },
    "철거 OFD": {
        "OFD": ["12C_1U"],
        "광분배함 및 저장함": ["24C_3U", "48C_4U", "72C_4U", "144C_4U", "광분배함 OFD-12C1U_강화플라스틱"]
    },
    "철거 단자함": {
        "광단자함": ["조가선취부형 8Port"],
        "광단자함(표준형)": ["조가선취부형 16Port"],
        "광분배함 및 저장함": ["조가선취부형_48분기", "광단자함 벽부취부형 A-Type", "광단자함 조가선취부형_48분기"]
    },
    "철거 IJP": {
        "IJP": ["4C"]
    },
    "철거 IP": {
        "강관주": ["7m,120Kg", "8m,150Kg", "9m,150Kg"]
    }
};

export default function DemolitionIncoming() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { tenants, currentTenant, user } = useAppContext();
    const isTenantOwner = tenants.find(t => t.id === currentTenant)?.role === 'owner';

    const [dialogOpen, setDialogOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);

    const { widths, handleResize } = useColumnResize('demolition-incoming-widths', {
        division: 60,
        demolitionDate: 100,
        projectCode: 120,
        projectName: 300,
        productName: 150,
        specification: 180,
        originalQuantity: 80,
        status: 100,
        remark: 150,
        workerName: 90,
        creator: 90,
        attachment: 60,
    });

    const { attachments, setAttachments, handleFileChange, removeAttachment, clearAttachments, isUploading } = useFileUpload();
    const { downloadAttachment } = useDownload();

    const [formData, setFormData] = useState({
        projectCode: "",
        projectName: "",
        demolitionDate: new Date().toISOString().split('T')[0],
        division: "SKT",
        category: "",
        productName: "",
        specification: "",
        originalQuantity: 0,
        remark: "",
        workerName: "",
        currentTeamId: "",
    });

    const [inputMode, setInputMode] = useState({
        category: false,
        productName: false,
        specification: false,
    });

    // Fetch teams
    const { data: teamsData = [] } = useQuery({
        queryKey: ["/api/teams"],
    });

    // Filter teams by division if needed, or just show all teams
    const teamsList = Array.isArray(teamsData) ? teamsData : [];

    // Fetch members for worker dropdown
    const { data: membersData = [] } = useQuery({
        queryKey: ["/api/members/basic"],
    });
    const membersList = Array.isArray(membersData) ? membersData : [];

    const { data: materials = [], isLoading } = useQuery<DemolitionMaterial[]>({
        queryKey: ["/api/demolition-materials"],
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch("/api/demolition-materials", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...data,
                    attributes: JSON.stringify({ attachments })
                }),
                credentials: "include",
            });
            if (!res.ok) throw new Error(await res.text());
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/demolition-materials"] });
            toast({ title: "철거자재가 등록되었습니다" });
            setDialogOpen(false);
            resetForm();
            clearAttachments();
        },
        onError: (error: any) => {
            toast({ title: "등록 실패", description: error.message, variant: "destructive" });
        },
    });

    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch(`/api/demolition-materials/${editId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...data,
                    attributes: JSON.stringify({ attachments })
                }),
                credentials: "include",
            });
            if (!res.ok) throw new Error(await res.text());
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/demolition-materials"] });
            toast({ title: "수정되었습니다" });
            setDialogOpen(false);
            resetForm();
            clearAttachments();
        },
        onError: (error: any) => {
            toast({ title: "수정 실패", description: error.message, variant: "destructive" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/demolition-materials/${id}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (!res.ok) throw new Error(await res.text());
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/demolition-materials"] });
            toast({ title: "삭제되었습니다" });
        },
    });

    const resetForm = () => {
        setFormData({
            projectCode: "",
            projectName: "",
            demolitionDate: new Date().toISOString().split('T')[0],
            division: "SKT",
            category: "",
            productName: "",
            specification: "",
            originalQuantity: 0,
            remark: "",
            workerName: "",
            currentTeamId: "",
        });
        setInputMode({
            category: false,
            productName: false,
            specification: false,
        });
        setIsEditing(false);
        setEditId(null);
    };

    const handleEdit = (material: DemolitionMaterial) => {
        const worker = membersList.find((m: any) => m.name === material.workerName);

        setFormData({
            projectCode: material.projectCode,
            projectName: material.projectName,
            demolitionDate: material.demolitionDate,
            division: material.division,
            category: material.category,
            productName: material.productName,
            specification: material.specification,
            originalQuantity: material.originalQuantity,
            remark: material.remark || "",
            workerName: material.workerName || "",
            currentTeamId: worker ? worker.teamId : "",
        });

        if (material.attributes) {
            try {
                const attrs = typeof material.attributes === 'string' ? JSON.parse(material.attributes) : material.attributes;
                const files = attrs.attachments || (attrs.attachment ? [attrs.attachment] : []);
                setAttachments(files);
            } catch (e) {
                clearAttachments();
            }
        } else {
            clearAttachments();
        }

        setIsEditing(true);
        setEditId(material.id);
        setDialogOpen(true);
    };

    // Auto-select team and worker for field team users
    useEffect(() => {
        if (dialogOpen && tenants && currentTenant && user) {
            const currentUserTenant = tenants.find(t => t.id === currentTenant);
            // Check if user has a team assigned and no team is currently selected in form
            if (currentUserTenant?.teamId && !formData.currentTeamId) {
                setFormData(prev => ({
                    ...prev,
                    currentTeamId: currentUserTenant.teamId!,
                    workerName: user.name || ""
                }));
            }
        }
    }, [dialogOpen, user, tenants, currentTenant]); // Check against open state and contexts

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // 입고 수량 유효성 검사
        if (formData.originalQuantity <= 0) {
            toast({
                title: "입고 수량 오류",
                description: "입고 수량은 0보다 커야 합니다.",
                variant: "destructive"
            });
            return;
        }

        if (isEditing) {
            updateMutation.mutate(formData);
        } else {
            createMutation.mutate(formData);
        }
    };

    const filteredMaterials = materials.filter(m =>
        m.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.projectName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.managementNo?.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
        if (selectedIds.size === filteredMaterials.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredMaterials.map(m => m.id)));
        }
    };

    const handleBulkDelete = () => {
        if (!confirm("선택한 항목을 삭제하시겠습니까?")) return;
        // Implement bulk delete logic here
        // For now, sequentially delete (can be improved with bulk API)
        selectedIds.forEach(id => deleteMutation.mutate(id));
        setSelectedIds(new Set());
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
                            철거 자재 입고
                            <span className="flex h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50 animate-pulse"></span>
                        </h1>
                        <div className="h-3 w-px bg-slate-200 dark:bg-slate-800"></div>
                        <span className="text-xs font-medium text-slate-500">{filteredMaterials.length} Records</span>
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
                                            className="h-7 w-7 rounded-md shadow-sm"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
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

                        <DropdownMenu>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <DropdownMenuTrigger asChild>
                                            <Button size="icon" className="h-7 w-7 rounded-md bg-primary hover:bg-primary/90 shadow-sm">
                                                <Plus className="h-3.5 w-3.5 text-white" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="text-xs">입고 등록</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <DropdownMenuContent align="end" className="w-32 p-1">
                                <DropdownMenuItem onClick={() => {
                                    resetForm();
                                    setDialogOpen(true);
                                }} className="text-xs py-1.5 cursor-pointer rounded-md">
                                    <Plus className="h-3 w-3 mr-2 text-primary" />
                                    직접 등록
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>

            {/* Main Table Area */}
            <div className="flex-1 rounded-3xl border border-slate-200 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-xl shadow-slate-200/50 dark:shadow-black/50 overflow-hidden flex flex-col relative z-0">
                <div className="flex-1 overflow-auto custom-scrollbar relative">
                    <Table className="w-full text-sm border-collapse table-fixed">
                        <TableHeader className="sticky top-0 bg-slate-50/95 backdrop-blur z-20 shadow-sm">
                            <TableRow className="h-10 border-b border-slate-200">
                                <TableHead className="w-[40px] text-center p-0">
                                    <Checkbox
                                        checked={selectedIds.size === filteredMaterials.length && filteredMaterials.length > 0}
                                        onCheckedChange={toggleSelectAll}
                                        className="translate-y-[2px]"
                                    />
                                </TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center text-xs" style={{ width: widths.demolitionDate }}>철거일<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize("demolitionDate")} /></TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center text-xs" style={{ width: widths.division }}>사업<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize("division")} /></TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center text-xs" style={{ width: widths.projectCode }}>공사번호<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize("projectCode")} /></TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center text-xs" style={{ width: widths.projectName }}>공사명<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize("projectName")} /></TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center text-xs" style={{ width: widths.productName }}>품명<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize("productName")} /></TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center text-xs" style={{ width: widths.specification }}>규격<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize("specification")} /></TableHead>
                                <TableHead className="font-semibold text-indigo-600 text-center text-xs" style={{ width: widths.originalQuantity }}>입고량<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize("originalQuantity")} /></TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center text-xs" style={{ width: widths.status }}>상태<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize("status")} /></TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center text-xs" style={{ width: widths.remark }}>비고<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize("remark")} /></TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center text-xs" style={{ width: widths.workerName }}>작업자<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize("workerName")} /></TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center text-xs" style={{ width: widths.attachment }}>첨부<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 z-50" onMouseDown={handleResize("attachment")} /></TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredMaterials.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={13} className="h-64 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                                                <Search className="h-6 w-6 text-slate-400" />
                                            </div>
                                            <p className="font-medium text-slate-900">검색 결과가 없습니다</p>
                                            <p className="text-sm text-slate-500">새로운 철거 자재를 등록해보세요</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredMaterials.map((material) => {
                                    const { hasAttachments, attachment } = parseAttributes(material.attributes);

                                    return (
                                        <TableRow key={material.id} className="h-[40px] border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                                            <TableCell className="text-center p-0">
                                                <Checkbox
                                                    checked={selectedIds.has(material.id)}
                                                    onCheckedChange={() => toggleSelect(material.id)}
                                                />
                                            </TableCell>
                                            <TableCell className="text-center text-xs text-slate-600 p-0 border-r border-slate-100/50">{material.demolitionDate}</TableCell>
                                            <TableCell className="text-center text-xs text-slate-600 p-0 border-r border-slate-100/50">{material.division}</TableCell>
                                            <TableCell className="text-center text-xs text-slate-600 p-0 border-r border-slate-100/50 truncate max-w-[100px]" title={material.projectCode}>{material.projectCode}</TableCell>
                                            <TableCell className="text-left px-2 text-xs text-slate-700 font-medium border-r border-slate-100/50 truncate max-w-[200px]" title={material.projectName}>{material.projectName}</TableCell>
                                            <TableCell className="text-center px-2 text-xs text-slate-700 p-0 border-r border-slate-100/50 truncate max-w-[150px]" title={material.productName}>{material.productName}</TableCell>
                                            <TableCell className="text-center text-xs text-slate-600 p-0 border-r border-slate-100/50 truncate max-w-[100px]" title={material.specification}>{material.specification}</TableCell>
                                            <TableCell className="text-center px-2 text-xs font-bold text-indigo-600 p-0 border-r border-slate-100/50 bg-indigo-50/30">{material.originalQuantity.toLocaleString()}</TableCell>
                                            <TableCell className="text-center text-xs text-slate-600 p-0 border-r border-slate-100/50">
                                                {material.remainingQuantity === 0 ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                                        출고완료
                                                    </span>
                                                ) : material.remainingQuantity < material.originalQuantity ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                        부분출고
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                        입고
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-left px-2 text-xs text-slate-500 p-0 border-r border-slate-100/50 truncate max-w-[150px]" title={material.remark || ""}>{material.remark}</TableCell>
                                            <TableCell className="text-center text-xs text-slate-500 p-0 border-r border-slate-100/50 truncate max-w-[80px]">{material.workerName}</TableCell>
                                            <TableCell className="text-center p-0 border-r border-slate-100/50">
                                                {(() => {
                                                    let hasAttachments = false;
                                                    let attachments: any[] = [];
                                                    try {
                                                        const parsed = typeof material.attributes === 'string'
                                                            ? JSON.parse(material.attributes)
                                                            : material.attributes || {};

                                                        if (parsed.attachments && parsed.attachments.length > 0) {
                                                            attachments = parsed.attachments;
                                                            hasAttachments = true;
                                                        } else if (parsed.attachment) {
                                                            attachments = [parsed.attachment];
                                                            hasAttachments = true;
                                                        } else if ((material as any).attachment) { // Legacy fallback
                                                            attachments = [(material as any).attachment];
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
                                                                size="icon"
                                                                className="h-6 w-6 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    downloadAttachment(attachments[0]);
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
                                            <TableCell className="text-center p-0">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-slate-600">
                                                            <MoreHorizontal className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleEdit(material)} className="text-xs">
                                                            <Pencil className="h-3 w-3 mr-2" />
                                                            수정
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => {
                                                            if (confirm("삭제하시겠습니까?")) {
                                                                deleteMutation.mutate(material.id);
                                                            }
                                                        }} className="text-xs text-red-600 focus:text-red-600">
                                                            <Trash2 className="h-3 w-3 mr-2" />
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
                    </Table>
                </div>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-[750px] p-0 overflow-hidden border-white/20 bg-background/80 backdrop-blur-xl shadow-2xl flex flex-col max-h-[90vh]">
                    <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-blue-500 to-sky-500" />

                    <div className="px-6 pt-6 pb-2">
                        <DialogHeader className="mb-4">
                            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                                {isEditing ? "철거자재 입고 정보 수정" : "철거자재 입고 등록"}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-500">
                                {isEditing ? "등록된 철거자재의 입고 정보를 수정합니다." : "현장에서 수거된 철거자재 입고 내역을 등록합니다."}
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="px-6 pb-6 overflow-y-auto custom-scrollbar flex-1">
                        <form onSubmit={handleSubmit} className="grid gap-6">
                            {/* 공사 정보 */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="h-4 w-1 bg-indigo-500 rounded-full" />
                                    <h4 className="font-bold text-[13px] text-slate-700">공사 정보</h4>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5 flex flex-col">
                                        <div className="flex justify-between items-center">
                                            <Label htmlFor="projectCode" className="text-[12px] font-semibold text-slate-500 ml-1">공사번호</Label>
                                            <span className="text-[10px] text-indigo-500 font-medium">*필수</span>
                                        </div>
                                        <Input
                                            id="projectCode"
                                            value={formData.projectCode}
                                            onChange={(e) => setFormData({ ...formData, projectCode: e.target.value })}
                                            className="h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white focus:border-indigo-500/50 transition-all font-mono text-xs"
                                            placeholder="공사번호를 입력하세요"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="projectName" className="text-[12px] font-semibold text-slate-500 ml-1">공사명</Label>
                                        <Input
                                            id="projectName"
                                            value={formData.projectName}
                                            onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                                            className="h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white focus:border-indigo-500/50 transition-all text-xs"
                                            placeholder="공사명을 입력하세요"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="demolitionDate" className="text-[12px] font-semibold text-slate-500 ml-1">철거일</Label>
                                        <Input
                                            id="demolitionDate"
                                            type="date"
                                            value={formData.demolitionDate}
                                            onChange={(e) => setFormData({ ...formData, demolitionDate: e.target.value })}
                                            className="h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white focus:border-indigo-500/50 transition-all text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="division" className="text-[12px] font-semibold text-slate-500 ml-1">사업구분</Label>
                                        <Select
                                            value={formData.division}
                                            onValueChange={(value) => setFormData({ ...formData, division: value })}
                                        >
                                            <SelectTrigger className="h-9 bg-slate-50/50 border-slate-200/60 focus:ring-indigo-500/20 text-xs">
                                                <SelectValue placeholder="선택" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="SKT" className="text-xs">SKT</SelectItem>
                                                <SelectItem value="SKB" className="text-xs">SKB</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-slate-100" />

                            {/* 자재 정보 */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="h-4 w-1 bg-blue-500 rounded-full" />
                                    <h4 className="font-bold text-[13px] text-slate-700">자재 정보</h4>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5 flex flex-col">
                                        <Label htmlFor="category" className="text-[12px] font-semibold text-slate-500 ml-1">자재 구분</Label>
                                        {inputMode.category ? (
                                            <div className="flex gap-2">
                                                <Input
                                                    value={formData.category}
                                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                    className="flex-1 h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white focus:border-indigo-500/50 transition-all text-xs"
                                                    placeholder="직접 입력"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setInputMode({ ...inputMode, category: false })}
                                                    className="h-9 px-3 text-xs text-slate-500 border border-slate-200 hover:bg-slate-50"
                                                >
                                                    선택
                                                </Button>
                                            </div>
                                        ) : (
                                            <Select
                                                value={formData.category}
                                                onValueChange={(value) => {
                                                    if (value === "direct") {
                                                        setInputMode({ ...inputMode, category: true });
                                                        setFormData({ ...formData, category: "" });
                                                    } else {
                                                        setFormData({ ...formData, category: value, productName: "", specification: "" });
                                                    }
                                                }}
                                            >
                                                <SelectTrigger className="h-9 bg-slate-50/50 border-slate-200/60 focus:ring-indigo-500/20 text-xs text-left">
                                                    <SelectValue placeholder="자재 구분 선택" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Object.keys(DEMOLITION_ITEMS).map((key) => (
                                                        <SelectItem key={key} value={key} className="text-xs">{key}</SelectItem>
                                                    ))}
                                                    <SelectItem value="direct" className="text-xs font-semibold text-indigo-600">직접 입력</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </div>

                                    <div className="space-y-1.5 flex flex-col">
                                        <Label htmlFor="productName" className="text-[12px] font-semibold text-slate-500 ml-1">품명</Label>
                                        {inputMode.productName ? (
                                            <div className="flex gap-2">
                                                <Input
                                                    value={formData.productName}
                                                    onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                                                    className="flex-1 h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white focus:border-indigo-500/50 transition-all text-xs"
                                                    placeholder="직접 입력"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setInputMode({ ...inputMode, productName: false })}
                                                    className="h-9 px-3 text-xs text-slate-500 border border-slate-200 hover:bg-slate-50"
                                                >
                                                    선택
                                                </Button>
                                            </div>
                                        ) : (
                                            <Select
                                                value={formData.productName}
                                                onValueChange={(value) => {
                                                    if (value === "direct") {
                                                        setInputMode({ ...inputMode, productName: true });
                                                        setFormData({ ...formData, productName: "" });
                                                    } else {
                                                        setFormData({ ...formData, productName: value, specification: "" });
                                                    }
                                                }}
                                                disabled={!formData.category || inputMode.category}
                                            >
                                                <SelectTrigger className="h-9 bg-slate-50/50 border-slate-200/60 focus:ring-indigo-500/20 text-xs text-left">
                                                    <SelectValue placeholder="품명 선택" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {formData.category && DEMOLITION_ITEMS[formData.category] &&
                                                        Object.keys(DEMOLITION_ITEMS[formData.category]).map((key) => (
                                                            <SelectItem key={key} value={key} className="text-xs">{key}</SelectItem>
                                                        ))
                                                    }
                                                    <SelectItem value="direct" className="text-xs font-semibold text-indigo-600">직접 입력</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5 flex flex-col">
                                        <Label htmlFor="specification" className="text-[12px] font-semibold text-slate-500 ml-1">규격</Label>
                                        {inputMode.specification ? (
                                            <div className="flex gap-2">
                                                <Input
                                                    value={formData.specification}
                                                    onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                                                    className="flex-1 h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white focus:border-indigo-500/50 transition-all text-xs"
                                                    placeholder="직접 입력"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setInputMode({ ...inputMode, specification: false })}
                                                    className="h-9 px-3 text-xs text-slate-500 border border-slate-200 hover:bg-slate-50"
                                                >
                                                    선택
                                                </Button>
                                            </div>
                                        ) : (
                                            <Select
                                                value={formData.specification}
                                                onValueChange={(value) => {
                                                    if (value === "direct") {
                                                        setInputMode({ ...inputMode, specification: true });
                                                        setFormData({ ...formData, specification: "" });
                                                    } else {
                                                        setFormData({ ...formData, specification: value });
                                                    }
                                                }}
                                                disabled={!formData.productName || inputMode.productName}
                                            >
                                                <SelectTrigger className="h-9 bg-slate-50/50 border-slate-200/60 focus:ring-indigo-500/20 text-xs text-left">
                                                    <SelectValue placeholder="규격 선택" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {formData.category && formData.productName &&
                                                        DEMOLITION_ITEMS[formData.category] &&
                                                        DEMOLITION_ITEMS[formData.category][formData.productName] &&
                                                        DEMOLITION_ITEMS[formData.category][formData.productName].map((spec: string) => (
                                                            <SelectItem key={spec} value={spec} className="text-xs">{spec}</SelectItem>
                                                        ))
                                                    }
                                                    <SelectItem value="direct" className="text-xs font-semibold text-indigo-600">직접 입력</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </div>

                                    <div className="space-y-1.5 flex flex-col">
                                        <Label htmlFor="originalQuantity" className="text-[12px] font-semibold text-slate-500 ml-1">입고 수량</Label>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                value={formData.originalQuantity}
                                                onChange={(e) => setFormData({ ...formData, originalQuantity: parseInt(e.target.value) || 0 })}
                                                className="h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white focus:border-indigo-500/50 transition-all font-mono text-right pr-2"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-slate-100" />

                            {/* 작업자 및 첨부 */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="h-4 w-1 bg-sky-500 rounded-full" />
                                    <h4 className="font-bold text-[13px] text-slate-700">작업자 및 기타</h4>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5 flex flex-col">
                                        <Label htmlFor="worker" className="text-[12px] font-semibold text-slate-500 ml-1">작업자</Label>
                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                <Select
                                                    value={formData.currentTeamId}
                                                    onValueChange={(val) => {
                                                        setFormData({ ...formData, currentTeamId: val, workerName: "" });
                                                    }}
                                                >
                                                    <SelectTrigger className="h-9 bg-slate-50/50 border-slate-200/60 focus:ring-indigo-500/20 text-xs">
                                                        <SelectValue placeholder="팀 선택" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {teamsList.map((team: any) => (
                                                            <SelectItem key={team.id} value={team.id} className="text-xs">{team.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="flex-1">
                                                <Select
                                                    value={formData.workerName}
                                                    onValueChange={(val) => setFormData({ ...formData, workerName: val })}
                                                    disabled={!formData.currentTeamId}
                                                >
                                                    <SelectTrigger className="h-9 bg-slate-50/50 border-slate-200/60 focus:ring-indigo-500/20 text-xs">
                                                        <SelectValue placeholder="작업자 선택" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {membersList
                                                            .filter((m: any) => m.teamId === formData.currentTeamId)
                                                            .map((m: any) => (
                                                                <SelectItem key={m.id} value={m.name} className="text-xs">{m.name}</SelectItem>
                                                            ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5 flex flex-col">
                                        <Label className="text-[12px] font-semibold text-slate-500 ml-1">첨부파일</Label>
                                        <div className="relative">
                                            <Input
                                                type="file"
                                                id="file-upload"
                                                className="hidden"
                                                onChange={handleFileChange}
                                                multiple
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => document.getElementById('file-upload')?.click()}
                                                className="w-full h-9 bg-slate-50/50 border-slate-200 border-dashed hover:bg-slate-100 hover:border-slate-300 text-slate-500 text-xs"
                                            >
                                                <Upload className="h-3.5 w-3.5 mr-2" />
                                                {attachments.length > 0 ? `${attachments.length}개 파일 선택됨` : "파일 첨부하기"}
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {attachments.length > 0 && (
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        {attachments.map((file, index) => (
                                            <div key={index} className="flex items-center justify-between p-2 rounded-lg border border-slate-200 bg-slate-50/50">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <div className="p-1.5 bg-white rounded-md border border-slate-100 shadow-sm shrink-0">
                                                        <Paperclip className="h-3.5 w-3.5 text-indigo-500" />
                                                    </div>
                                                    <span className="text-xs text-slate-600 truncate">{file.name}</span>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 w-6 p-0 hover:bg-red-50 hover:text-red-500 rounded-full"
                                                    onClick={() => removeAttachment(index)}
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <Label htmlFor="remark" className="text-[12px] font-semibold text-slate-500 ml-1">비고</Label>
                                    <Textarea
                                        value={formData.remark}
                                        onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                                        className="min-h-[60px] bg-slate-50/50 border-slate-200/60 focus:bg-white focus:border-indigo-500/50 text-xs resize-none"
                                        placeholder="비고 사항을 입력하세요"
                                    />
                                </div>
                            </div>

                            <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between gap-2 -mx-6 -mb-6 mt-2">
                                <Button type="button" variant="ghost" className="h-9 text-slate-500 hover:text-slate-900" onClick={() => setDialogOpen(false)}>
                                    취소
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isUploading || createMutation.isPending || updateMutation.isPending}
                                    className="h-9 px-6 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-md shadow-indigo-200"
                                >
                                    {isUploading ? (
                                        <>
                                            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                            업로드 중...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="mr-2 h-3.5 w-3.5" />
                                            {isEditing ? "수정 완료" : "입고 등록"}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
