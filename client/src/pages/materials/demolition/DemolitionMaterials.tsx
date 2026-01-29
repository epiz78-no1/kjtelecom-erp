import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchInput } from "@/components/ui/SearchInput";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    TableHeader,
    TableRow,
    TableHead,
    TableBody,
    TableCell,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/contexts/AppContext";
import { Loader2, MoreHorizontal, CheckCircle, XCircle, Pencil, Trash2, Download, Paperclip, Filter, X } from "lucide-react";
import { useColumnResize } from "@/hooks/useColumnResize";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { DemolitionMaterial } from "@/types/demolition";
import { parseAttributes } from "@/utils/demolitionUtils";

export default function DemolitionMaterials() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { tenants, currentTenant } = useAppContext();
    const isTenantOwner = tenants.find(t => t.id === currentTenant)?.role === 'owner';

    const { widths, handleResize } = useColumnResize('demolition-materials-widths', {
        division: 60,
        category: 100,
        demolitionDate: 100,
        projectCode: 120,
        projectName: 250,
        productName: 150,
        specification: 180,
        originalQuantity: 80,
        usedQuantity: 80,
        remainingQuantity: 80,
        status: 120, // '승인(미사용)' 등 긴 텍스트 고려
        attachment: 60,
        remark: 150,
    });

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("전체");

    // Filter State
    const [filterOpen, setFilterOpen] = useState(false);

    // New state for filtering completed/disposed items
    const [showCompleted, setShowCompleted] = useState(false);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<DemolitionMaterial>>({});

    // Dispose Reason Dialog State
    const [disposeDialogOpen, setDisposeDialogOpen] = useState(false);
    const [disposeReason, setDisposeReason] = useState("");
    const [selectedDisposeId, setSelectedDisposeId] = useState<string | null>(null);

    const downloadAttachment = async (file: any) => {
        try {
            if (!file || !file.url) return;
            const response = await fetch(file.url);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Download failed:', error);
            toast({ title: "다운로드 실패", variant: "destructive" });
        }
    };

    const { data: materials = [], isLoading } = useQuery<DemolitionMaterial[]>({
        queryKey: ["/api/demolition-materials"],
    });

    const reviewMutation = useMutation({
        mutationFn: async ({ id, decision, note }: { id: string; decision: 'approved' | 'rejected'; note?: string }) => {
            const res = await fetch(`/api/demolition-materials/${id}/review`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ decision, note }),
                credentials: "include",
            });
            if (!res.ok) throw new Error(await res.text());
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/demolition-materials"] });
            toast({ title: "검토가 완료되었습니다" });
        },
        onError: (error: any) => {
            toast({ title: "검토 실패", description: error.message, variant: "destructive" });
        },
    });

    const disposeMutation = useMutation({
        mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
            const res = await fetch(`/api/demolition-materials/${id}/dispose`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ disposedQuantity: quantity }),
                credentials: "include",
            });
            if (!res.ok) throw new Error(await res.text());
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/demolition-materials"] });
            toast({ title: "폐기 처리되었습니다" });
        },
        onError: (error: any) => {
            toast({ title: "폐기 실패", description: error.message, variant: "destructive" });
        },
    });

    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch(`/api/demolition-materials/${editId}`, {
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
            toast({ title: "수정되었습니다" });
            setDialogOpen(false);
            setEditId(null);
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
            setDialogOpen(false);
            setEditId(null);
        },
        onError: (error: any) => {
            toast({ title: "삭제 실패", description: error.message, variant: "destructive" });
        },
    });

    const filteredMaterials = materials.filter(m => {
        const matchesSearch =
            m.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.projectName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.managementNo?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus =
            selectedStatus === "전체" ||
            (selectedStatus === "검토대기" && m.status === "pending_review") ||
            (selectedStatus === "재사용가능" && m.status === "approved_reusable") ||
            (selectedStatus === "재사용불가" && m.status === "rejected");

        // Hide completed/disposed items unless checkbox is checked
        // Completed: remainingQuantity === 0 OR status is 'disposed' or 'rejected'
        const isCompleted = m.remainingQuantity === 0 || m.status === 'disposed';
        const matchesCompletion = showCompleted ? true : !isCompleted;

        return matchesSearch && matchesStatus && matchesCompletion;
    });

    const handleReview = (id: string, decision: 'approved' | 'rejected') => {
        const decisionText = decision === 'approved' ? '재사용 가능' : '재사용 불가';
        if (confirm(`이 자재를 "${decisionText}"로 판정하시겠습니까?`)) {
            reviewMutation.mutate({ id, decision });
        }
    };

    const handleDispose = (material: DemolitionMaterial) => {
        const quantity = prompt(`폐기할 수량을 입력하세요 (최대: ${material.remainingQuantity})`);
        if (quantity) {
            const qty = parseInt(quantity);
            if (qty > 0 && qty <= material.remainingQuantity) {
                disposeMutation.mutate({ id: material.id, quantity: qty });
            } else {
                toast({ title: "잘못된 수량", description: "유효한 수량을 입력하세요", variant: "destructive" });
            }
        }
    };

    const handleEdit = (material: DemolitionMaterial) => {
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
            status: material.status === 'rejected' ? 'waste' : material.status,
        });
        setEditId(material.id);
        setDialogOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editId) {
            updateMutation.mutate(formData);
        }
    };

    const handleResetFilters = () => {
        setSelectedStatus("전체");
        setShowCompleted(false);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
                <Loader2 className="h-10 w-10 animate-spin text-primary/80" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-zinc-950/50 p-2 overflow-hidden">
            <div className="flex flex-col gap-2 flex-shrink-0 mb-2 pt-1">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 px-1">
                        <h1 className="text-base font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            철거자재 현황
                            <span className="flex h-1.5 w-1.5 rounded-full bg-red-500 shadow-sm shadow-red-500/50 animate-pulse"></span>
                        </h1>
                        <div className="h-3 w-px bg-slate-200 dark:bg-slate-800"></div>
                        <span className="text-xs font-medium text-slate-500">{filteredMaterials.length} items</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {materials.filter(m => m.status === 'pending_review').length > 0 && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex items-center justify-center h-7 w-auto px-2 rounded-md bg-yellow-50 text-yellow-700 animate-pulse cursor-pointer border border-yellow-200">
                                            <span className="text-[10px] font-bold">검토 대기 {materials.filter(m => m.status === 'pending_review').length}건</span>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="text-xs">재사용 여부 검토가 필요한 자재입니다</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>

                        <SearchInput
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="품명, 공사명, 관리번호..."
                            className="w-48 focus:w-64 h-7 text-xs rounded-md bg-white border-slate-200 focus:ring-1 focus:ring-primary/20 transition-all font-normal"
                        />

                        <div className="flex items-center gap-1">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant={filterOpen ? "secondary" : "ghost"}
                                            size="icon"
                                            onClick={() => setFilterOpen(!filterOpen)}
                                            className={cn("h-7 w-7 rounded-md", filterOpen && "bg-slate-200 text-slate-900")}
                                        >
                                            <Filter className="h-3.5 w-3.5 text-slate-500" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="text-xs">필터</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </div>
                </div>

                {filterOpen && (
                    <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 animate-in fade-in slide-in-from-top-1 duration-200 mt-1">
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                            <div className="space-y-0.5">
                                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                                    <SelectTrigger className="h-7 text-xs rounded-md border-slate-200 bg-slate-50/50">
                                        <SelectValue placeholder="상태" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="전체" className="text-xs">전체 상태</SelectItem>
                                        <SelectItem value="검토대기" className="text-xs">
                                            <div className="flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                                                <span>검토대기</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="재사용가능" className="text-xs">
                                            <div className="flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                <span>재사용가능</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="재사용불가" className="text-xs">
                                            <div className="flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                                <span>재사용불가</span>
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100 dark:border-zinc-800">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="show-completed"
                                    checked={showCompleted}
                                    onCheckedChange={(checked) => setShowCompleted(checked as boolean)}
                                    className="h-3.5 w-3.5 border-slate-300 data-[state=checked]:bg-slate-600 data-[state=checked]:border-slate-600"
                                />
                                <label
                                    htmlFor="show-completed"
                                    className="text-[11px] font-medium text-slate-600 leading-none cursor-pointer select-none"
                                >
                                    사용완료/폐기 포함
                                </label>
                            </div>

                            {(selectedStatus !== "전체" || showCompleted) && (
                                <div className="flex items-center gap-1 flex-wrap justify-end">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleResetFilters}
                                        className="h-5 text-[10px] text-muted-foreground hover:text-foreground px-1.5"
                                    >
                                        초기화
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-1 rounded-3xl border border-slate-200 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-xl shadow-slate-200/50 dark:shadow-black/50 overflow-hidden flex flex-col relative z-0">
                <div className="flex-1 overflow-auto custom-scrollbar relative">
                    <table className="w-full text-sm border-collapse table-fixed">
                        <TableHeader className="sticky top-0 bg-slate-50/95 backdrop-blur z-20 shadow-sm">
                            <TableRow className="h-10 border-b border-slate-200">
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.division }}>
                                    사업
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize('division')} />
                                </TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.category }}>
                                    구분
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize('category')} />
                                </TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.demolitionDate }}>
                                    철거일자
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize('demolitionDate')} />
                                </TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.projectCode }}>
                                    공사번호
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize('projectCode')} />
                                </TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.projectName }}>
                                    공사명
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize('projectName')} />
                                </TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.productName }}>
                                    품명
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize('productName')} />
                                </TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.specification }}>
                                    규격
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize('specification')} />
                                </TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.originalQuantity }}>
                                    원수량
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize('originalQuantity')} />
                                </TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.usedQuantity }}>
                                    사용/출고
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize('usedQuantity')} />
                                </TableHead>
                                <TableHead className="font-semibold text-primary text-center" style={{ width: widths.remainingQuantity }}>
                                    잔량
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize('remainingQuantity')} />
                                </TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.attachment }}>
                                    첨부
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 z-50" onMouseDown={handleResize('attachment')} />
                                </TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.remark }}>
                                    비고
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize('remark')} />
                                </TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredMaterials.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                                        등록된 철거자재가 없습니다
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredMaterials.map((material) => (
                                    <TableRow
                                        key={material.id}
                                        className={`group h-10 border-b border-slate-100 dark:border-zinc-800 transition-colors cursor-pointer text-xs ${material.status === 'pending_review' ? 'bg-yellow-50/40 hover:bg-yellow-100/40' :
                                            (material.status === 'rejected' || material.status === 'disposed' || material.remainingQuantity === 0) ? 'bg-slate-50/50 hover:bg-slate-100/50 text-slate-400' :
                                                (material.status === 'in_use') ? 'bg-blue-50/20 hover:bg-blue-100/20' :
                                                    'hover:bg-slate-50/80'
                                            }`}
                                    >
                                        <TableCell className="text-center align-middle px-1">{material.division}</TableCell>
                                        <TableCell className="text-center align-middle px-1">{material.category}</TableCell>
                                        <TableCell className="text-center align-middle px-1 text-slate-500">{material.demolitionDate}</TableCell>
                                        <TableCell className="text-center align-middle px-1 font-mono text-slate-500">{material.projectCode}</TableCell>
                                        <TableCell className="text-left align-middle px-2">
                                            <div className="w-full truncate font-medium text-slate-700" title={material.projectName}>
                                                {material.projectName}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center align-middle px-1">
                                            <div className="w-full truncate text-center" title={material.productName}>{material.productName}</div>
                                        </TableCell>
                                        <TableCell className="text-center align-middle px-1 text-slate-500">{material.specification}</TableCell>
                                        <TableCell className="text-center align-middle px-2 font-mono text-slate-600">{material.originalQuantity.toLocaleString()}</TableCell>
                                        <TableCell className="text-center align-middle px-2 font-mono text-slate-400">{material.usedQuantity.toLocaleString()}</TableCell>
                                        <TableCell className="text-center align-middle px-2 font-mono font-bold text-indigo-600">
                                            {material.remainingQuantity.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-center align-middle px-0">
                                            {(() => {
                                                const { attachments: files } = parseAttributes(material.attributes);
                                                if (!files || files.length === 0) return null;

                                                if (files.length === 1) {
                                                    return (
                                                        <div className="flex justify-center items-center w-full">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-6 w-6 p-0 hover:bg-slate-100 rounded-full"
                                                                onClick={() => downloadAttachment(files[0])}
                                                                title={files[0].name}
                                                            >
                                                                <Download className="h-3.5 w-3.5 text-slate-500" />
                                                            </Button>
                                                        </div>
                                                    );
                                                } else if (files.length > 1) {
                                                    return (
                                                        <div className="flex justify-center items-center w-full">
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-6 w-auto px-1.5 text-[10px] flex items-center justify-center gap-1 hover:bg-slate-100 rounded-full">
                                                                        <Paperclip className="h-3 w-3 text-slate-500" />
                                                                        <span className="font-medium text-slate-600">{files.length}</span>
                                                                    </Button>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-auto p-1" align="center">
                                                                    <div className="flex flex-col gap-0.5">
                                                                        <div className="text-[10px] font-semibold px-2 py-1 text-slate-500 border-b border-slate-100 mb-0.5">
                                                                            첨부파일 ({files.length})
                                                                        </div>
                                                                        {files.map((file: any, idx: number) => (
                                                                            <Button
                                                                                key={idx}
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                className="justify-start h-auto py-1 px-2 font-normal text-xs overflow-hidden max-w-[200px]"
                                                                                onClick={() => downloadAttachment(file)}
                                                                                title={file.name}
                                                                            >
                                                                                <Download className="h-3 w-3 mr-2 shrink-0 text-slate-400" />
                                                                                <span className="truncate">{file.name}</span>
                                                                            </Button>
                                                                        ))}
                                                                    </div>
                                                                </PopoverContent>
                                                            </Popover>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </TableCell>
                                        <TableCell className="text-center align-middle truncate px-1 text-slate-400" title={material.remark || ''}>
                                            {material.remark || ''}
                                        </TableCell>
                                        <TableCell className="text-center align-middle p-0">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <MoreHorizontal className="h-4 w-4 text-slate-400" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-32 shadow-xl rounded-xl">
                                                    {material.status === 'pending_review' && isTenantOwner && (
                                                        <>
                                                            <DropdownMenuItem
                                                                onClick={() => handleReview(material.id, 'approved')}
                                                                className="text-green-600 focus:text-green-700 focus:bg-green-50 text-xs gap-2"
                                                            >
                                                                <CheckCircle className="h-3.5 w-3.5" />
                                                                재사용 가능
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => {
                                                                    setSelectedDisposeId(material.id);
                                                                    setDisposeReason("");
                                                                    setDisposeDialogOpen(true);
                                                                }}
                                                                className="text-red-600 focus:text-red-700 focus:bg-red-50 text-xs gap-2"
                                                            >
                                                                <XCircle className="h-3.5 w-3.5" />
                                                                폐기
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                    {material.remainingQuantity > 0 && isTenantOwner && (
                                                        <>
                                                            <DropdownMenuItem
                                                                onClick={() => handleEdit(material)}
                                                                className="text-xs gap-2"
                                                            >
                                                                <Pencil className="h-3.5 w-3.5" />
                                                                수정
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                className="text-red-600 focus:text-red-700 focus:bg-red-50 text-xs gap-2"
                                                                onClick={() => {
                                                                    if (confirm('정말 삭제하시겠습니까?')) {
                                                                        deleteMutation.mutate(material.id);
                                                                    }
                                                                }}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                                삭제
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
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

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-[750px] p-0 overflow-hidden border-white/20 bg-background/80 backdrop-blur-xl shadow-2xl flex flex-col max-h-[90vh]">
                    <div className="h-1.5 w-full bg-gradient-to-r from-red-500 via-orange-500 to-amber-500" />

                    <div className="px-6 pt-6 pb-2">
                        <DialogHeader className="mb-4">
                            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                                철거자재 정보 수정
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-500">
                                선택한 철거자재의 상세 정보를 수정하고 상태를 업데이트합니다.
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="px-6 pb-6 overflow-y-auto custom-scrollbar flex-1">
                        <form onSubmit={handleSubmit} className="grid gap-6">
                            {/* 기본 정보 */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="h-4 w-1 bg-red-500 rounded-full" />
                                    <h4 className="font-bold text-[13px] text-slate-700">기본 정보</h4>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="demolitionDate" className="text-[12px] font-semibold text-slate-500 ml-1">철거일자</Label>
                                        <Input
                                            id="demolitionDate"
                                            type="date"
                                            value={formData.demolitionDate}
                                            onChange={(e) => setFormData({ ...formData, demolitionDate: e.target.value })}
                                            className="h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white focus:border-red-500/50 transition-all text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="division" className="text-[12px] font-semibold text-slate-500 ml-1">사업</Label>
                                        <Select
                                            value={formData.division}
                                            onValueChange={(val) => setFormData({ ...formData, division: val })}
                                        >
                                            <SelectTrigger className="h-9 bg-slate-50/50 border-slate-200/60 focus:ring-red-500/20 text-xs">
                                                <SelectValue placeholder="사업 선택" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="SKT" className="text-xs">SKT</SelectItem>
                                                <SelectItem value="SKB" className="text-xs">SKB</SelectItem>
                                                <SelectItem value="KT" className="text-xs">KT</SelectItem>
                                                <SelectItem value="LG" className="text-xs">LG</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="projectCode" className="text-[12px] font-semibold text-slate-500 ml-1">공사번호</Label>
                                        <Input
                                            id="projectCode"
                                            value={formData.projectCode}
                                            onChange={(e) => setFormData({ ...formData, projectCode: e.target.value })}
                                            className="h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white focus:border-red-500/50 transition-all font-mono text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="projectName" className="text-[12px] font-semibold text-slate-500 ml-1">공사명</Label>
                                        <Input
                                            id="projectName"
                                            value={formData.projectName}
                                            onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                                            className="h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white focus:border-red-500/50 transition-all text-xs"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="category" className="text-[12px] font-semibold text-slate-500 ml-1">구분</Label>
                                        <Input
                                            id="category"
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            className="h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white focus:border-red-500/50 transition-all text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="productName" className="text-[12px] font-semibold text-slate-500 ml-1">품명</Label>
                                        <Input
                                            id="productName"
                                            value={formData.productName}
                                            onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                                            className="h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white focus:border-red-500/50 transition-all text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="specification" className="text-[12px] font-semibold text-slate-500 ml-1">규격</Label>
                                        <Input
                                            id="specification"
                                            value={formData.specification}
                                            onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                                            className="h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white focus:border-red-500/50 transition-all text-xs"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-slate-100" />

                            {/* 상태 및 수량 */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="h-4 w-1 bg-orange-500 rounded-full" />
                                    <h4 className="font-bold text-[13px] text-slate-700">상태 및 수량</h4>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="originalQuantity" className="text-[12px] font-semibold text-slate-500 ml-1">원수량</Label>
                                        <div className="relative">
                                            <Input
                                                id="originalQuantity"
                                                type="number"
                                                value={formData.originalQuantity}
                                                onChange={(e) => setFormData({ ...formData, originalQuantity: parseInt(e.target.value) || 0 })}
                                                className="h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white focus:border-red-500/50 transition-all text-right font-mono pr-2"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="status" className="text-[12px] font-semibold text-slate-500 ml-1">상태</Label>
                                        <Select
                                            value={formData.status}
                                            onValueChange={(val) => setFormData({ ...formData, status: val })}
                                        >
                                            <SelectTrigger className="h-9 bg-slate-50/50 border-slate-200/60 focus:ring-red-500/20 text-xs">
                                                <SelectValue placeholder="상태 선택" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="pending_review" className="text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                                                        <span>검토대기</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="approved_reusable" className="text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                        <span>재사용가능</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="waste" className="text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                                        <span>폐기</span>
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="remark" className="text-[12px] font-semibold text-slate-500 ml-1">비고</Label>
                                    <Input
                                        id="remark"
                                        value={formData.remark}
                                        onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                                        className="h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white focus:border-red-500/50 transition-all text-xs"
                                        placeholder="비고 사항을 입력하세요"
                                    />
                                </div>

                                {(formData.status === 'waste' || formData.status === 'rejected') && (
                                    <div className="space-y-1.5 p-3 rounded-xl bg-red-50 border border-red-100">
                                        <Label htmlFor="reason" className="text-[12px] font-semibold text-red-600 ml-1">폐기 사유</Label>
                                        <Textarea
                                            id="reason"
                                            value={formData.remark || ""}
                                            onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                                            placeholder="폐기 사유를 상세히 입력하세요"
                                            className="bg-white border-red-200 focus:border-red-400 focus:ring-red-500/20 text-xs min-h-[60px]"
                                        />
                                    </div>
                                )}
                            </div>
                        </form>
                    </div>

                    <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between gap-2">
                        <Button type="button" variant="ghost" className="h-9 text-slate-500 hover:text-slate-900" onClick={() => setDialogOpen(false)}>
                            취소
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            className="h-9 px-6 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white shadow-md shadow-red-200"
                        >
                            <CheckCircle className="h-3.5 w-3.5 mr-2" />
                            수정 사항 저장
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={disposeDialogOpen} onOpenChange={setDisposeDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>폐기 사유 입력</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="dispose-reason">사유</Label>
                            <Textarea
                                id="dispose-reason"
                                value={disposeReason}
                                onChange={(e) => setDisposeReason(e.target.value)}
                                placeholder="폐기 사유를 입력하세요"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDisposeDialogOpen(false)}>취소</Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (selectedDisposeId) {
                                    reviewMutation.mutate({
                                        id: selectedDisposeId,
                                        decision: 'rejected',
                                        note: disposeReason,
                                    });
                                    setDisposeDialogOpen(false);
                                }
                            }}
                        >
                            폐기 처리
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
}
