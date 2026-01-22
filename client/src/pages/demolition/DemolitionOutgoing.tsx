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
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                    resetForm();
                                    setDialogOpen(true);
                                }}>
                                    <Plus className="h-4 w-4 mr-2" />
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
                                    <TableCell colSpan={13} className="h-64 text-center text-muted-foreground flex flex-col items-center justify-center border-none">
                                        <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                                            <Search className="h-6 w-6 text-slate-400" />
                                        </div>
                                        <p className="font-medium text-slate-900">검색 결과가 없습니다</p>
                                        <p className="text-sm text-slate-500 mt-1">새로운 출고 내역을 등록해보세요</p>
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
                                                {hasAttachments ? (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (attachment) {
                                                                downloadAttachment(attachment.storagePath, attachment.name);
                                                            }
                                                        }}
                                                    >
                                                        <Paperclip className="h-3 w-3" />
                                                    </Button>
                                                ) : (
                                                    <span className="text-slate-300">-</span>
                                                )}
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
                <DialogContent className="max-w-[800px] bg-white sm:max-w-[800px]">
                    <DialogHeader>
                        <DialogTitle>{isEditing ? "철거자재 출고 수정" : "철거자재 출고 등록"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>공사번호</Label>
                                <Input
                                    value={formData.projectCode}
                                    onChange={(e) => setFormData({ ...formData, projectCode: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>공사명</Label>
                                <Input
                                    value={formData.projectName}
                                    onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>출고일</Label>
                                <Input
                                    type="date"
                                    value={formData.logDate}
                                    onChange={(e) => setFormData({ ...formData, logDate: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>사업구분</Label>
                                <Select
                                    value={formData.division}
                                    onValueChange={(value) => setFormData({ ...formData, division: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="선택" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="SKT">SKT</SelectItem>
                                        <SelectItem value="SKB">SKB</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>구분</Label>
                                {inputMode.category ? (
                                    <div className="flex gap-2">
                                        <Input
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            className="flex-1"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setInputMode({ ...inputMode, category: false })}
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
                                        <SelectTrigger>
                                            <SelectValue placeholder="선택" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.keys(DEMOLITION_ITEMS).map((key) => (
                                                <SelectItem key={key} value={key}>{key}</SelectItem>
                                            ))}
                                            <SelectItem value="direct">직접입력</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label>품명</Label>
                                {inputMode.productName ? (
                                    <div className="flex gap-2">
                                        <Input
                                            value={formData.productName}
                                            onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                                            className="flex-1"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setInputMode({ ...inputMode, productName: false })}
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
                                        <SelectTrigger>
                                            <SelectValue placeholder="선택" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {formData.category && DEMOLITION_ITEMS[formData.category] &&
                                                Object.keys(DEMOLITION_ITEMS[formData.category]).map((key) => (
                                                    <SelectItem key={key} value={key}>{key}</SelectItem>
                                                ))
                                            }
                                            <SelectItem value="direct">직접입력</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label>규격</Label>
                                {inputMode.spec ? (
                                    <div className="flex gap-2">
                                        <Input
                                            value={formData.spec}
                                            onChange={(e) => setFormData({ ...formData, spec: e.target.value })}
                                            className="flex-1"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setInputMode({ ...inputMode, spec: false })}
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
                                        <SelectTrigger>
                                            <SelectValue placeholder="선택" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {formData.category && formData.productName &&
                                                DEMOLITION_ITEMS[formData.category] &&
                                                DEMOLITION_ITEMS[formData.category][formData.productName] &&
                                                DEMOLITION_ITEMS[formData.category][formData.productName].map((spec: string) => (
                                                    <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                                                ))
                                            }
                                            <SelectItem value="direct">직접입력</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label>수량</Label>
                                <Input
                                    type="number"
                                    value={formData.usedQuantity}
                                    onChange={(e) => setFormData({ ...formData, usedQuantity: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>현장팀 및 수령자</Label>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <Select
                                            value={formData.teamId}
                                            onValueChange={(val) => {
                                                setFormData({ ...formData, teamId: val, workerName: "" });
                                            }}
                                        >
                                            <SelectTrigger><SelectValue placeholder="팀 선택" /></SelectTrigger>
                                            <SelectContent>
                                                {teamsList.map((team: any) => (
                                                    <SelectItem key={team.id} value={team.id?.toString()}>{team.name}</SelectItem>
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
                                            <SelectTrigger><SelectValue placeholder="수령자 선택" /></SelectTrigger>
                                            <SelectContent>
                                                {membersList
                                                    .filter((m: any) => m.teamId?.toString() === formData.teamId?.toString())
                                                    .map((m: any) => (
                                                        <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                            <div className="col-span-2 space-y-2">
                                <Label>첨부파일</Label>
                                <div className="space-y-2">
                                    <Input
                                        type="file"
                                        onChange={handleFileChange}
                                        multiple
                                        className="cursor-pointer"
                                    />
                                    {attachments.length > 0 && (
                                        <div className="space-y-1">
                                            {attachments.map((file, index) => (
                                                <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded-md">
                                                    <span className="text-sm truncate">{file.name}</span>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeAttachment(index)}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="col-span-2 space-y-2">
                                <Label>비고</Label>
                                <Textarea
                                    value={formData.remark}
                                    onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
                            <Button type="submit" disabled={isUploading || createMutation.isPending || updateMutation.isPending}>
                                {isUploading ? "파일 업로드 중..." : (isEditing ? "수정" : "등록")}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
