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

import { DemolitionOutgoingRecord } from "@/types/demolition";
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

export default function DemolitionOutgoing() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { tenants, currentTenant, user } = useAppContext();
    const isTenantOwner = tenants.find(t => t.id === currentTenant)?.role === 'owner';

    const [dialogOpen, setDialogOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);

    const { widths, handleResize } = useColumnResize('demolition-outgoing-widths', {
        division: 60,
        logDate: 100,
        projectCode: 120,
        projectName: 300,
        productName: 150,
        spec: 180,
        usedQuantity: 80,
        team: 100,
        workerName: 90,
        remark: 150,
        author: 90,
        attachment: 60,
    });

    const { attachments, setAttachments, handleFileChange, removeAttachment, clearAttachments, isUploading } = useFileUpload();
    const { downloadAttachment } = useDownload();

    const [formData, setFormData] = useState({
        projectCode: "",
        projectName: "",
        logDate: new Date().toISOString().split('T')[0],
        division: "SKT",
        category: "",
        productName: "",
        spec: "",
        usedQuantity: 0,
        remark: "",
        teamId: "",
        workerName: "",
    });

    const [inputMode, setInputMode] = useState({
        category: false,
        productName: false,
        spec: false,
    });

    // Fetch teams
    const { data: teamsData = [] } = useQuery({
        queryKey: ["/api/teams"],
    });
    const teamsList = Array.isArray(teamsData) ? teamsData : [];

    // Fetch members for receiver dropdown
    const { data: membersData = [] } = useQuery({
        queryKey: ["/api/members/basic"],
    });
    const membersList = Array.isArray(membersData) ? membersData : [];

    const { data: records = [], isLoading } = useQuery<DemolitionOutgoingRecord[]>({
        queryKey: ["/api/demolition-outgoing"],
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch("/api/demolition-outgoing", {
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
            queryClient.invalidateQueries({ queryKey: ["/api/demolition-outgoing"] });
            toast({ title: "철거자재 출고가 등록되었습니다" });
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
            const res = await fetch(`/api/demolition-outgoing/${editId}`, {
                method: "PUT",
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
            queryClient.invalidateQueries({ queryKey: ["/api/demolition-outgoing"] });
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
            const res = await fetch(`/api/demolition-outgoing/${id}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (!res.ok) throw new Error(await res.text());
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/demolition-outgoing"] });
            toast({ title: "삭제되었습니다" });
        },
    });

    const resetForm = () => {
        setFormData({
            projectCode: "",
            projectName: "",
            logDate: new Date().toISOString().split('T')[0],
            division: "SKT",
            category: "",
            productName: "",
            spec: "",
            usedQuantity: 0,
            remark: "",
            teamId: "",
            workerName: "",
        });
        setInputMode({
            category: false,
            productName: false,
            spec: false,
        });
        setIsEditing(false);
        setEditId(null);
    };

    const handleEdit = (record: DemolitionOutgoingRecord) => {
        setFormData({
            projectCode: record.projectCode || "",
            projectName: record.projectName || "",
            logDate: record.logDate || new Date().toISOString().split('T')[0],
            division: record.division || "",
            category: record.category || "",
            productName: record.productName || "",
            spec: record.spec || "",
            usedQuantity: record.usedQuantity,
            remark: record.remark || "",
            teamId: String(record.teamId) || "",
            workerName: record.workerName || "",
        });

        if (record.attributes) {
            try {
                const attrs = typeof record.attributes === 'string' ? JSON.parse(record.attributes) : record.attributes;
                const files = attrs.attachments || (attrs.attachment ? [attrs.attachment] : []);
                setAttachments(files);
            } catch (e) {
                clearAttachments();
            }
        } else {
            clearAttachments();
        }

        setIsEditing(true);
        setEditId(record.id);
        setDialogOpen(true);
    };

    // Auto-select team for field team users
    useEffect(() => {
        if (dialogOpen && tenants && currentTenant && user) {
            const currentUserTenant = tenants.find(t => t.id === currentTenant);
            if (currentUserTenant?.teamId && !formData.teamId) {
                setFormData(prev => ({
                    ...prev,
                    teamId: currentUserTenant.teamId!,
                    receiverName: user.name || ""
                }));
            }
        }
    }, [dialogOpen, user, tenants, currentTenant]);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEditing) {
            updateMutation.mutate(formData);
        } else {
            createMutation.mutate(formData);
        }
    };

    const filteredRecords = records.filter(r =>
        r.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.projectName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.workerName?.toLowerCase().includes(searchQuery.toLowerCase())
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
        if (selectedIds.size === filteredRecords.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredRecords.map(r => r.id)));
        }
    };

    const handleBulkDelete = () => {
        if (!confirm("선택한 항목을 삭제하시겠습니까?")) return;
        selectedIds.forEach(id => deleteMutation.mutate(id));
        setSelectedIds(new Set());
    };

    const getTeamName = (teamId: number | string | null | undefined) => {
        if (!teamId) return "-";
        // Ensure type compatibility for comparison
        const idToCompare = typeof teamId === 'string' ? parseInt(teamId) : teamId;
        const team = teamsList.find((t: any) => t.id === idToCompare);
        return team ? team.name : "-";
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
                            철거 자재 출고
                            <span className="flex h-1.5 w-1.5 rounded-full bg-orange-500 shadow-sm shadow-orange-500/50 animate-pulse"></span>
                        </h1>
                        <div className="h-3 w-px bg-slate-200 dark:bg-slate-800"></div>
                        <span className="text-xs font-medium text-slate-500">{filteredRecords.length} Records</span>
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
                                    <TooltipContent side="bottom" className="text-xs">출고 등록</TooltipContent>
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
                                        checked={selectedIds.size === filteredRecords.length && filteredRecords.length > 0}
                                        onCheckedChange={toggleSelectAll}
                                        className="translate-y-[2px]"
                                    />
                                </TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center text-xs" style={{ width: widths.logDate }}>출고일<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize("logDate")} /></TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center text-xs" style={{ width: widths.division }}>사업<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize("division")} /></TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center text-xs" style={{ width: widths.projectCode }}>공사번호<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize("projectCode")} /></TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center text-xs" style={{ width: widths.projectName }}>공사명<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize("projectName")} /></TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center text-xs" style={{ width: widths.productName }}>품명<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize("productName")} /></TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center text-xs" style={{ width: widths.spec }}>규격<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize("spec")} /></TableHead>
                                <TableHead className="font-semibold text-orange-600 text-center text-xs" style={{ width: widths.usedQuantity }}>출고량<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize("usedQuantity")} /></TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center text-xs" style={{ width: widths.team }}>현장팀<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize("team")} /></TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center text-xs" style={{ width: widths.workerName }}>수령자<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize("workerName")} /></TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center text-xs" style={{ width: widths.remark }}>비고<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize("remark")} /></TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center text-xs" style={{ width: widths.author }}>입력자<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize("author")} /></TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center text-xs" style={{ width: widths.attachment }}>첨부<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 z-50" onMouseDown={handleResize("attachment")} /></TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredRecords.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={14} className="h-64 border-none p-0">
                                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                                            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                                                <Search className="h-6 w-6 text-slate-400" />
                                            </div>
                                            <p className="font-medium text-slate-900">검색 결과가 없습니다</p>
                                            <p className="text-sm text-slate-500 mt-1">새로운 출고 내역을 등록해보세요</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredRecords.map((record) => {
                                    const { hasAttachments, attachment } = parseAttributes(record.attributes);

                                    return (
                                        <TableRow key={record.id} className="h-[40px] border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                                            <TableCell className="text-center p-0">
                                                <Checkbox
                                                    checked={selectedIds.has(record.id)}
                                                    onCheckedChange={() => toggleSelect(record.id)}
                                                />
                                            </TableCell>
                                            <TableCell className="text-center text-xs text-slate-600 p-0 border-r border-slate-100/50">{record.logDate}</TableCell>
                                            <TableCell className="text-center text-xs text-slate-600 p-0 border-r border-slate-100/50">{record.division}</TableCell>
                                            <TableCell className="text-center text-xs text-slate-600 p-0 border-r border-slate-100/50 truncate max-w-[100px]" title={record.projectCode}>{record.projectCode}</TableCell>
                                            <TableCell className="text-left px-2 text-xs text-slate-700 font-medium border-r border-slate-100/50 truncate max-w-[200px]" title={record.projectName}>{record.projectName}</TableCell>
                                            <TableCell className="text-center px-2 text-xs text-slate-700 p-0 border-r border-slate-100/50 truncate max-w-[150px]" title={record.productName}>{record.productName}</TableCell>
                                            <TableCell className="text-center text-xs text-slate-600 p-0 border-r border-slate-100/50 truncate max-w-[100px]" title={record.spec}>{record.spec}</TableCell>
                                            <TableCell className="text-center px-2 text-xs font-bold text-orange-600 p-0 border-r border-slate-100/50 bg-orange-50/30">{record.usedQuantity.toLocaleString()}</TableCell>
                                            <TableCell className="text-center text-xs text-slate-600 p-0 border-r border-slate-100/50">{getTeamName(record.teamId)}</TableCell>
                                            <TableCell className="text-center text-xs text-slate-600 p-0 border-r border-slate-100/50 truncate max-w-[80px]">{record.workerName}</TableCell>
                                            <TableCell className="text-left px-2 text-xs text-slate-500 p-0 border-r border-slate-100/50 truncate max-w-[150px]" title={record.remark || ""}>{record.remark}</TableCell>
                                            <TableCell className="text-center text-xs text-slate-500 p-0 border-r border-slate-100/50 truncate max-w-[80px]">{record.creatorName}</TableCell>
                                            <TableCell className="text-center p-0 border-r border-slate-100/50">
                                                {(() => {
                                                    let hasAttachments = false;
                                                    let attachments: any[] = [];
                                                    try {
                                                        const parsed = typeof record.attributes === 'string'
                                                            ? JSON.parse(record.attributes)
                                                            : record.attributes || {};

                                                        if (parsed.attachments && parsed.attachments.length > 0) {
                                                            attachments = parsed.attachments;
                                                            hasAttachments = true;
                                                        } else if (parsed.attachment) {
                                                            attachments = [parsed.attachment];
                                                            hasAttachments = true;
                                                        } else if ((record as any).attachment) { // Legacy fallback
                                                            attachments = [(record as any).attachment];
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
                                                        <DropdownMenuItem onClick={() => handleEdit(record)} className="text-xs">
                                                            <Pencil className="h-3 w-3 mr-2" />
                                                            수정
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => {
                                                            if (confirm("삭제하시겠습니까?")) {
                                                                deleteMutation.mutate(record.id);
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
                    <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500" />

                    <div className="px-6 pt-6 pb-2">
                        <DialogHeader className="mb-4">
                            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                                {isEditing ? "철거자재 출고 수정" : "철거자재 출고 등록"}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-500">
                                {isEditing ? "등록된 철거자재 출고 정보를 수정합니다." : "현장팀으로 불출되는 철거자재 내역을 등록합니다."}
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="px-6 pb-6 overflow-y-auto custom-scrollbar flex-1">
                        <form onSubmit={handleSubmit} className="grid gap-6">
                            {/* 공사 정보 */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="h-4 w-1 bg-orange-500 rounded-full" />
                                    <h4 className="font-bold text-[13px] text-slate-700">공사 정보</h4>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5 flex flex-col">
                                        <div className="flex justify-between items-center">
                                            <Label htmlFor="projectCode" className="text-[12px] font-semibold text-slate-500 ml-1">공사번호</Label>
                                            <span className="text-[10px] text-orange-500 font-medium">*필수</span>
                                        </div>
                                        <Input
                                            id="projectCode"
                                            value={formData.projectCode}
                                            onChange={(e) => setFormData({ ...formData, projectCode: e.target.value })}
                                            className="h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white focus:border-orange-500/50 transition-all font-mono text-xs"
                                            placeholder="공사번호를 입력하세요"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="projectName" className="text-[12px] font-semibold text-slate-500 ml-1">공사명</Label>
                                        <Input
                                            id="projectName"
                                            value={formData.projectName}
                                            onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                                            className="h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white focus:border-orange-500/50 transition-all text-xs"
                                            placeholder="공사명을 입력하세요"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="logDate" className="text-[12px] font-semibold text-slate-500 ml-1">출고일</Label>
                                        <Input
                                            id="logDate"
                                            type="date"
                                            value={formData.logDate}
                                            onChange={(e) => setFormData({ ...formData, logDate: e.target.value })}
                                            className="h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white focus:border-orange-500/50 transition-all text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="division" className="text-[12px] font-semibold text-slate-500 ml-1">사업구분</Label>
                                        <Select
                                            value={formData.division}
                                            onValueChange={(value) => setFormData({ ...formData, division: value })}
                                        >
                                            <SelectTrigger className="h-9 bg-slate-50/50 border-slate-200/60 focus:ring-orange-500/20 text-xs">
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
                                    <div className="h-4 w-1 bg-amber-500 rounded-full" />
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
                                                    className="flex-1 h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white focus:border-orange-500/50 transition-all text-xs"
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
                                                        setFormData({ ...formData, category: value, productName: "", spec: "" });
                                                    }
                                                }}
                                            >
                                                <SelectTrigger className="h-9 bg-slate-50/50 border-slate-200/60 focus:ring-orange-500/20 text-xs text-left">
                                                    <SelectValue placeholder="자재 구분 선택" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Object.keys(DEMOLITION_ITEMS).map((key) => (
                                                        <SelectItem key={key} value={key} className="text-xs">{key}</SelectItem>
                                                    ))}
                                                    <SelectItem value="direct" className="text-xs font-semibold text-orange-600">직접 입력</SelectItem>
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
                                                    className="flex-1 h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white focus:border-orange-500/50 transition-all text-xs"
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
                                                        setFormData({ ...formData, productName: value, spec: "" });
                                                    }
                                                }}
                                                disabled={!formData.category || inputMode.category}
                                            >
                                                <SelectTrigger className="h-9 bg-slate-50/50 border-slate-200/60 focus:ring-orange-500/20 text-xs text-left">
                                                    <SelectValue placeholder="품명 선택" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {formData.category && DEMOLITION_ITEMS[formData.category] &&
                                                        Object.keys(DEMOLITION_ITEMS[formData.category]).map((key) => (
                                                            <SelectItem key={key} value={key} className="text-xs">{key}</SelectItem>
                                                        ))
                                                    }
                                                    <SelectItem value="direct" className="text-xs font-semibold text-orange-600">직접 입력</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5 flex flex-col">
                                        <Label htmlFor="spec" className="text-[12px] font-semibold text-slate-500 ml-1">규격</Label>
                                        {inputMode.spec ? (
                                            <div className="flex gap-2">
                                                <Input
                                                    value={formData.spec}
                                                    onChange={(e) => setFormData({ ...formData, spec: e.target.value })}
                                                    className="flex-1 h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white focus:border-orange-500/50 transition-all text-xs"
                                                    placeholder="직접 입력"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setInputMode({ ...inputMode, spec: false })}
                                                    className="h-9 px-3 text-xs text-slate-500 border border-slate-200 hover:bg-slate-50"
                                                >
                                                    선택
                                                </Button>
                                            </div>
                                        ) : (
                                            <Select
                                                value={formData.spec}
                                                onValueChange={(value) => {
                                                    if (value === "direct") {
                                                        setInputMode({ ...inputMode, spec: true });
                                                        setFormData({ ...formData, spec: "" });
                                                    } else {
                                                        setFormData({ ...formData, spec: value });
                                                    }
                                                }}
                                                disabled={!formData.productName || inputMode.productName}
                                            >
                                                <SelectTrigger className="h-9 bg-slate-50/50 border-slate-200/60 focus:ring-orange-500/20 text-xs text-left">
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
                                                    <SelectItem value="direct" className="text-xs font-semibold text-orange-600">직접 입력</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </div>

                                    <div className="space-y-1.5 flex flex-col">
                                        <Label htmlFor="usedQuantity" className="text-[12px] font-semibold text-slate-500 ml-1">출고 수량</Label>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                value={formData.usedQuantity}
                                                onChange={(e) => setFormData({ ...formData, usedQuantity: parseInt(e.target.value) || 0 })}
                                                className="h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white focus:border-orange-500/50 transition-all font-mono text-right pr-2"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-slate-100" />

                            {/* 작업자 및 첨부 */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="h-4 w-1 bg-yellow-500 rounded-full" />
                                    <h4 className="font-bold text-[13px] text-slate-700">작업자 및 기타</h4>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5 flex flex-col">
                                        <Label htmlFor="teamAndWorker" className="text-[12px] font-semibold text-slate-500 ml-1">현장팀 및 수령자</Label>
                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                <Select
                                                    value={formData.teamId}
                                                    onValueChange={(val) => {
                                                        setFormData({ ...formData, teamId: val, workerName: "" });
                                                    }}
                                                >
                                                    <SelectTrigger className="h-9 bg-slate-50/50 border-slate-200/60 focus:ring-orange-500/20 text-xs text-left">
                                                        <SelectValue placeholder="팀 선택" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {teamsList.map((team: any) => (
                                                            <SelectItem key={team.id} value={team.id?.toString()} className="text-xs">{team.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="flex-1">
                                                <Select
                                                    value={formData.workerName}
                                                    onValueChange={(val) => setFormData({ ...formData, workerName: val })}
                                                    disabled={!formData.teamId}
                                                >
                                                    <SelectTrigger className="h-9 bg-slate-50/50 border-slate-200/60 focus:ring-orange-500/20 text-xs text-left">
                                                        <SelectValue placeholder="수령자 선택" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {membersList
                                                            .filter((m: any) => m.teamId?.toString() === formData.teamId?.toString())
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
                                                        <Paperclip className="h-3.5 w-3.5 text-orange-500" />
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
                                        className="min-h-[60px] bg-slate-50/50 border-slate-200/60 focus:bg-white focus:border-orange-500/50 text-xs resize-none"
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
                                    className="h-9 px-6 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-md shadow-orange-200"
                                >
                                    {isUploading ? (
                                        <>
                                            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                            업로드 중...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="mr-2 h-3.5 w-3.5" />
                                            {isEditing ? "수정 완료" : "출고 등록"}
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
