import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchInput } from "@/components/ui/SearchInput";
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
import { Loader2, MoreHorizontal, CheckCircle, XCircle, Pencil, Trash2, Download, Paperclip } from "lucide-react";
import { useColumnResize } from "@/hooks/useColumnResize";

interface DemolitionMaterial {
    id: string;
    managementNo: string;
    division: string;
    category: string;
    projectCode: string;
    projectName: string;
    demolitionDate: string;
    productName: string;
    specification: string;
    originalQuantity: number;
    remainingQuantity: number;
    status: string;
    remark?: string;
    attributes?: any;
}

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
        attachment: 60,
        remark: 150,
    });

    const [searchQuery, setSearchQuery] = useState("");

    const [selectedStatus, setSelectedStatus] = useState("전체");

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

        return matchesSearch && matchesStatus;
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
                    <h1 className="text-2xl font-bold">철거자재 현황</h1>
                    <p className="text-muted-foreground">철거자재의 검토 및 재사용 판정을 관리합니다</p>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="상태 선택" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="전체">전체</SelectItem>
                        <SelectItem value="검토대기">검토대기</SelectItem>
                        <SelectItem value="재사용가능">재사용가능</SelectItem>
                        <SelectItem value="재사용불가">재사용불가</SelectItem>
                    </SelectContent>
                </Select>

                <SearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="품명, 공사명, 관리번호 검색..."
                    className="max-w-sm"
                />

                <div className="ml-auto text-sm text-muted-foreground flex items-center gap-3">
                    {materials.filter(m => m.status === 'pending_review').length > 0 && (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-50 border border-yellow-200 rounded text-xs">
                            <span className="text-yellow-700">검토 대기</span>
                            <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 bg-yellow-400 text-white text-[10px] font-bold rounded-full">
                                {materials.filter(m => m.status === 'pending_review').length}
                            </span>
                        </div>
                    )}
                    <span>총 <span className="font-semibold text-foreground">{filteredMaterials.length}</span>건</span>
                </div>
            </div>

            <div className="flex-1 rounded-md border overflow-hidden">
                <div className="h-full overflow-auto">
                    <table className="w-full caption-bottom text-sm table-fixed">
                        <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                            <TableRow className="h-8">
                                <TableHead className="text-center align-middle bg-background relative" style={{ width: widths.division }}>
                                    사업
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize('division')} />
                                </TableHead>
                                <TableHead className="text-center align-middle bg-background relative" style={{ width: widths.category }}>
                                    구분
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize('category')} />
                                </TableHead>
                                <TableHead className="text-center align-middle bg-background relative" style={{ width: widths.demolitionDate }}>
                                    철거일자
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize('demolitionDate')} />
                                </TableHead>
                                <TableHead className="text-center align-middle bg-background relative" style={{ width: widths.projectCode }}>
                                    공사번호
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize('projectCode')} />
                                </TableHead>
                                <TableHead className="text-center align-middle bg-background relative" style={{ width: widths.projectName }}>
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
                                <TableHead className="text-center align-middle bg-background relative" style={{ width: widths.attachment }}>
                                    첨부
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize('attachment')} />
                                </TableHead>
                                <TableHead className="text-center align-middle bg-background relative" style={{ width: widths.remark }}>
                                    비고
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize('remark')} />
                                </TableHead>
                                <TableHead className="w-16 bg-background"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredMaterials.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                                        등록된 철거자재가 없습니다
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredMaterials.map((material) => (
                                    <TableRow
                                        key={material.id}
                                        className={`h-6 [\u0026_td]:py-0 ${material.status === 'pending_review' ? 'bg-yellow-50/50 hover:bg-yellow-50/80' :
                                            material.status === 'rejected' ? 'bg-red-50/50 hover:bg-red-50/80' :
                                                ''
                                            }`}
                                    >
                                        <TableCell className="text-center align-middle">{material.division}</TableCell>
                                        <TableCell className="text-center align-middle">{material.category}</TableCell>
                                        <TableCell className="text-center align-middle">{material.demolitionDate}</TableCell>
                                        <TableCell className="text-center align-middle">{material.projectCode}</TableCell>
                                        <TableCell className="text-left align-middle">{material.projectName}</TableCell>
                                        <TableCell className="text-center align-middle">{material.productName}</TableCell>
                                        <TableCell className="text-center align-middle">{material.specification}</TableCell>
                                        <TableCell className="text-center align-middle">
                                            {(() => {
                                                if (!material.attributes) return null;
                                                try {
                                                    const attrs = typeof material.attributes === 'string' ? JSON.parse(material.attributes) : material.attributes;
                                                    const files = attrs.attachments || (attrs.attachment ? [attrs.attachment] : []);
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
                                                    } else if (files.length > 1) {
                                                        return (
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <Button variant="ghost" size="sm" className="h-6 px-1 text-xs">
                                                                        <Paperclip className="h-3 w-3 mr-1" />
                                                                        <span>{files.length}</span>
                                                                    </Button>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-auto p-2" align="center">
                                                                    <div className="flex flex-col gap-1">
                                                                        <div className="text-xs font-semibold px-2 py-1 mb-1 border-b">
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
                                        <TableCell className="text-center align-middle">{material.remark || ''}</TableCell>
                                        <TableCell className="text-center align-middle">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-5 w-5 p-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {material.status === 'pending_review' && isTenantOwner && (
                                                        <>
                                                            <DropdownMenuItem
                                                                onClick={() => handleReview(material.id, 'approved')}
                                                                className="text-green-600"
                                                            >
                                                                <CheckCircle className="mr-2 h-4 w-4" />
                                                                재사용 가능
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => {
                                                                    setSelectedDisposeId(material.id);
                                                                    setDisposeReason("");
                                                                    setDisposeDialogOpen(true);
                                                                }}
                                                                className="text-red-600"
                                                            >
                                                                <XCircle className="mr-2 h-4 w-4" />
                                                                폐기
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                    {material.remainingQuantity > 0 && isTenantOwner && (
                                                        <>
                                                            <DropdownMenuItem
                                                                onClick={() => handleEdit(material)}
                                                            >
                                                                <Pencil className="mr-2 h-4 w-4" />
                                                                수정
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                className="text-destructive"
                                                                onClick={() => {
                                                                    if (confirm('정말 삭제하시겠습니까?')) {
                                                                        deleteMutation.mutate(material.id);
                                                                    }
                                                                }}
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4" />
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
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>철거자재 수정</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="demolitionDate">철거일자</Label>
                                <Input
                                    id="demolitionDate"
                                    type="date"
                                    value={formData.demolitionDate}
                                    onChange={(e) => setFormData({ ...formData, demolitionDate: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label htmlFor="division">사업</Label>
                                <Select
                                    value={formData.division}
                                    onValueChange={(val) => setFormData({ ...formData, division: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="사업 선택" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="SKT">SKT</SelectItem>
                                        <SelectItem value="SKB">SKB</SelectItem>
                                        <SelectItem value="KT">KT</SelectItem>
                                        <SelectItem value="LG">LG</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="projectCode">공사번호</Label>
                                <Input
                                    id="projectCode"
                                    value={formData.projectCode}
                                    onChange={(e) => setFormData({ ...formData, projectCode: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label htmlFor="projectName">공사명</Label>
                                <Input
                                    id="projectName"
                                    value={formData.projectName}
                                    onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="category">구분</Label>
                                <Input
                                    id="category"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label htmlFor="productName">품명</Label>
                                <Input
                                    id="productName"
                                    value={formData.productName}
                                    onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label htmlFor="specification">규격</Label>
                                <Input
                                    id="specification"
                                    value={formData.specification}
                                    onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="originalQuantity">원수량</Label>
                                <Input
                                    id="originalQuantity"
                                    type="number"
                                    value={formData.originalQuantity}
                                    onChange={(e) => setFormData({ ...formData, originalQuantity: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div>
                                <Label htmlFor="remark">비고</Label>
                                <Input
                                    id="remark"
                                    value={formData.remark}
                                    onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="status">상태</Label>
                            <Select
                                value={formData.status}
                                onValueChange={(val) => setFormData({ ...formData, status: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="상태 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pending_review">검토대기</SelectItem>
                                    <SelectItem value="approved_reusable">재사용가능</SelectItem>
                                    <SelectItem value="waste">폐기</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {(formData.status === 'waste' || formData.status === 'rejected') && (
                            <div className="grid gap-2">
                                <Label htmlFor="reason">폐기 사유</Label>
                                <Textarea
                                    id="reason"
                                    value={formData.remark || ""}
                                    onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                                    placeholder="폐기 사유를 입력하세요"
                                />
                            </div>
                        )}

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
                            <Button type="submit">수정 저장</Button>
                        </DialogFooter>
                    </form>
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
        </div>
    );
}
