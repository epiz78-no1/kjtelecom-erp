import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Loader2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/SearchInput";
import {
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
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/contexts/AppContext";
import { Checkbox } from "@/components/ui/checkbox";

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
    createdAt: string;
}

export default function DemolitionIncoming() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { tenants, currentTenant } = useAppContext();
    const isTenantOwner = tenants.find(t => t.id === currentTenant)?.role === 'owner';

    const [dialogOpen, setDialogOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
    });

    const { data: materials = [], isLoading } = useQuery<DemolitionMaterial[]>({
        queryKey: ["/api/demolition-materials"],
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch("/api/demolition-materials", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
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
        },
        onError: (error: any) => {
            toast({ title: "등록 실패", description: error.message, variant: "destructive" });
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
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate(formData);
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
                    <h1 className="text-2xl font-bold">철거자재 입고 내역</h1>
                    <p className="text-muted-foreground">철거 현장에서 회수한 자재를 등록합니다</p>
                </div>
                <Button onClick={() => {
                    resetForm();
                    setDialogOpen(true);
                }}>
                    <Plus className="h-4 w-4 mr-2" />
                    입고 등록
                </Button>
            </div>

            <div className="flex items-center justify-between gap-4">
                <SearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="품명, 공사명, 관리번호 검색..."
                    className="max-w-sm"
                />
                <div className="text-sm text-muted-foreground">
                    총 <span className="font-semibold text-foreground">{filteredMaterials.length}</span>건
                </div>
            </div>

            <div className="flex-1 rounded-md border overflow-hidden">
                <div className="h-full overflow-auto">
                    <table className="w-full caption-bottom text-sm table-fixed">
                        <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                            <TableRow className="h-8">
                                <TableHead className="w-12 text-center align-middle bg-background">
                                    {isTenantOwner && <Checkbox />}
                                </TableHead>
                                <TableHead className="text-center align-middle bg-background">관리번호</TableHead>
                                <TableHead className="text-center align-middle bg-background">사업</TableHead>
                                <TableHead className="text-center align-middle bg-background">구분</TableHead>
                                <TableHead className="text-center align-middle bg-background">철거일자</TableHead>
                                <TableHead className="text-center align-middle bg-background">공사번호</TableHead>
                                <TableHead className="text-center align-middle bg-background">공사명</TableHead>
                                <TableHead className="text-center align-middle bg-background">품명</TableHead>
                                <TableHead className="text-center align-middle bg-background">규격</TableHead>
                                <TableHead className="text-center align-middle bg-background">수량</TableHead>
                                <TableHead className="text-center align-middle bg-background">상태</TableHead>
                                <TableHead className="text-center align-middle bg-background">비고</TableHead>
                                <TableHead className="w-16 bg-background"></TableHead>
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
                                    <TableRow key={material.id} className="h-6 [\u0026_td]:py-0">
                                        <TableCell className="text-center align-middle">
                                            {isTenantOwner && (
                                                <Checkbox
                                                    checked={selectedIds.has(material.id)}
                                                    onCheckedChange={() => toggleSelect(material.id)}
                                                />
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center align-middle font-medium">{material.managementNo}</TableCell>
                                        <TableCell className="text-center align-middle">{material.division}</TableCell>
                                        <TableCell className="text-center align-middle">{material.category}</TableCell>
                                        <TableCell className="text-center align-middle">{material.demolitionDate}</TableCell>
                                        <TableCell className="text-center align-middle">{material.projectCode}</TableCell>
                                        <TableCell className="text-left align-middle">{material.projectName}</TableCell>
                                        <TableCell className="text-left align-middle">{material.productName}</TableCell>
                                        <TableCell className="text-center align-middle">{material.specification}</TableCell>
                                        <TableCell className="text-right align-middle font-medium">{material.originalQuantity.toLocaleString()}</TableCell>
                                        <TableCell className="text-center align-middle">
                                            <span className={`px-2 py-1 rounded text-xs ${material.status === 'pending_review' ? 'bg-yellow-100 text-yellow-800' :
                                                    material.status === 'approved_reusable' ? 'bg-green-100 text-green-800' :
                                                        material.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                            'bg-gray-100 text-gray-800'
                                                }`}>
                                                {material.status === 'pending_review' ? '검토대기' :
                                                    material.status === 'approved_reusable' ? '재사용가능' :
                                                        material.status === 'rejected' ? '재사용불가' : material.status}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center align-middle">{material.remark || ''}</TableCell>
                                        <TableCell className="text-center align-middle">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-6 w-6 p-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {isTenantOwner && (
                                                        <DropdownMenuItem
                                                            className="text-destructive"
                                                            onClick={() => {
                                                                if (confirm('삭제하시겠습니까?')) {
                                                                    deleteMutation.mutate(material.id);
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            삭제
                                                        </DropdownMenuItem>
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
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>철거자재 입고 등록</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="demolitionDate">철거일자 *</Label>
                                <Input
                                    id="demolitionDate"
                                    type="date"
                                    value={formData.demolitionDate}
                                    onChange={(e) => setFormData({ ...formData, demolitionDate: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="division">사업</Label>
                                <Input
                                    id="division"
                                    value={formData.division}
                                    onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="projectCode">공사번호 *</Label>
                                <Input
                                    id="projectCode"
                                    value={formData.projectCode}
                                    onChange={(e) => setFormData({ ...formData, projectCode: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="projectName">공사명 *</Label>
                                <Input
                                    id="projectName"
                                    value={formData.projectName}
                                    onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="category">구분</Label>
                                <Input
                                    id="category"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    placeholder="전선, 케이블, 기타"
                                />
                            </div>
                            <div>
                                <Label htmlFor="productName">품명 *</Label>
                                <Input
                                    id="productName"
                                    value={formData.productName}
                                    onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="specification">규격 *</Label>
                                <Input
                                    id="specification"
                                    value={formData.specification}
                                    onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="originalQuantity">수량 *</Label>
                                <Input
                                    id="originalQuantity"
                                    type="number"
                                    value={formData.originalQuantity}
                                    onChange={(e) => setFormData({ ...formData, originalQuantity: parseInt(e.target.value) || 0 })}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="remark">비고</Label>
                            <Textarea
                                id="remark"
                                value={formData.remark}
                                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                                rows={3}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                                취소
                            </Button>
                            <Button type="submit" disabled={createMutation.isPending}>
                                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                등록
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
