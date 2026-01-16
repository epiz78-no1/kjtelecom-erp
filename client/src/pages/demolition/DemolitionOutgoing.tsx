import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Loader2, MoreHorizontal } from "lucide-react";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/contexts/AppContext";
import { Checkbox } from "@/components/ui/checkbox";

interface DemolitionMaterial {
    id: string;
    managementNo: string;
    projectName: string;
    productName: string;
    specification: string;
    remainingQuantity: number;
    status: string;
}

export default function DemolitionOutgoing() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { tenants, currentTenant } = useAppContext();
    const isTenantOwner = tenants.find(t => t.id === currentTenant)?.role === 'owner';

    const [dialogOpen, setDialogOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const [formData, setFormData] = useState({
        materialId: "",
        teamId: "",
        projectCode: "",
        projectName: "",
        usedQuantity: 0,
        workerName: "",
        usageDate: new Date().toISOString().split('T')[0],
        remark: "",
    });

    const { data: materials = [] } = useQuery<DemolitionMaterial[]>({
        queryKey: ["/api/demolition-materials"],
    });

    const { data: teams = [] } = useQuery<any[]>({
        queryKey: ["/api/teams"],
    });

    const { data: logs = [], isLoading } = useQuery<any[]>({
        queryKey: ["/api/demolition-logs"],
        select: (data) => data.filter((log: any) => log.logType === 'usage'),
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const material = materials.find(m => m.id === data.materialId);
            if (!material) throw new Error("자재를 찾을 수 없습니다");

            const res = await fetch(`/api/demolition-materials/${data.materialId}/usage`, {
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
            queryClient.invalidateQueries({ queryKey: ["/api/demolition-logs"] });
            toast({ title: "출고 등록이 완료되었습니다" });
            setDialogOpen(false);
            resetForm();
        },
        onError: (error: any) => {
            toast({ title: "출고 실패", description: error.message, variant: "destructive" });
        },
    });

    const resetForm = () => {
        setFormData({
            materialId: "",
            teamId: "",
            projectCode: "",
            projectName: "",
            usedQuantity: 0,
            workerName: "",
            usageDate: new Date().toISOString().split('T')[0],
            remark: "",
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate(formData);
    };

    const availableMaterials = materials.filter(m =>
        m.status === 'approved_reusable' && m.remainingQuantity > 0
    );

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
                    <p className="text-muted-foreground">현장팀으로 출고된 철거자재 내역을 조회합니다</p>
                </div>
                <Button onClick={() => {
                    resetForm();
                    setDialogOpen(true);
                }}>
                    <Plus className="h-4 w-4 mr-2" />
                    출고 등록
                </Button>
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
                                <TableHead className="text-center align-middle bg-background">출고일자</TableHead>
                                <TableHead className="text-center align-middle bg-background">관리번호</TableHead>
                                <TableHead className="text-center align-middle bg-background">수령팀</TableHead>
                                <TableHead className="text-center align-middle bg-background">공사번호</TableHead>
                                <TableHead className="text-center align-middle bg-background">공사명</TableHead>
                                <TableHead className="text-center align-middle bg-background">품명</TableHead>
                                <TableHead className="text-center align-middle bg-background">규격</TableHead>
                                <TableHead className="text-center align-middle bg-background">출고량</TableHead>
                                <TableHead className="text-center align-middle bg-background">작업자</TableHead>
                                <TableHead className="text-center align-middle bg-background">비고</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredLogs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                                        출고 내역이 없습니다
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredLogs.map((log: any) => (
                                    <TableRow key={log.id} className="h-6 [\u0026_td]:py-0">
                                        <TableCell className="text-center align-middle">{log.logDate}</TableCell>
                                        <TableCell className="text-center align-middle font-medium">{log.material?.managementNo || ''}</TableCell>
                                        <TableCell className="text-center align-middle">{log.team?.name || ''}</TableCell>
                                        <TableCell className="text-center align-middle">{log.projectCode || ''}</TableCell>
                                        <TableCell className="text-left align-middle">{log.projectName || ''}</TableCell>
                                        <TableCell className="text-left align-middle">{log.material?.productName || ''}</TableCell>
                                        <TableCell className="text-center align-middle">{log.material?.specification || ''}</TableCell>
                                        <TableCell className="text-right align-middle font-medium">{log.usedQuantity?.toLocaleString() || ''}</TableCell>
                                        <TableCell className="text-center align-middle">{log.workerName || ''}</TableCell>
                                        <TableCell className="text-center align-middle">{log.remark || ''}</TableCell>
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
                        <DialogTitle>철거자재 출고 등록</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="materialId">자재 선택 *</Label>
                                <Select
                                    value={formData.materialId}
                                    onValueChange={(value) => {
                                        const material = materials.find(m => m.id === value);
                                        setFormData({
                                            ...formData,
                                            materialId: value,
                                            projectCode: material?.projectCode || "",
                                            projectName: material?.projectName || "",
                                        });
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="자재를 선택하세요" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableMaterials.map((material) => (
                                            <SelectItem key={material.id} value={material.id}>
                                                {material.managementNo} - {material.productName} (잔량: {material.remainingQuantity})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="teamId">수령팀 *</Label>
                                <Select
                                    value={formData.teamId}
                                    onValueChange={(value) => setFormData({ ...formData, teamId: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="팀을 선택하세요" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {teams.map((team) => (
                                            <SelectItem key={team.id} value={team.id}>
                                                {team.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="usageDate">출고일자 *</Label>
                                <Input
                                    id="usageDate"
                                    type="date"
                                    value={formData.usageDate}
                                    onChange={(e) => setFormData({ ...formData, usageDate: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="usedQuantity">출고량 *</Label>
                                <Input
                                    id="usedQuantity"
                                    type="number"
                                    value={formData.usedQuantity}
                                    onChange={(e) => setFormData({ ...formData, usedQuantity: parseInt(e.target.value) || 0 })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
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

                        <div>
                            <Label htmlFor="workerName">작업자</Label>
                            <Input
                                id="workerName"
                                value={formData.workerName}
                                onChange={(e) => setFormData({ ...formData, workerName: e.target.value })}
                            />
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
                                출고 등록
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
