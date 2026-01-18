import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Loader2, MoreHorizontal, Upload, Download } from "lucide-react";
import { useColumnResize } from "@/hooks/useColumnResize";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useDownload } from "@/hooks/useDownload";
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
    projectCode?: string;
}

export default function DemolitionOutgoing() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { tenants, currentTenant } = useAppContext();
    const isTenantOwner = tenants.find(t => t.id === currentTenant)?.role === 'owner';

    const [dialogOpen, setDialogOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const { widths, handleResize } = useColumnResize('demolition-outgoing-widths', {
        logDate: 100,
        team: 100,
        projectCode: 100,
        projectName: 220,
        productName: 160,
        specification: 200,
        usedQuantity: 80,
        workerName: 100,
        creator: 80,
        attachment: 60,
        remark: 150,
    });
    const { attachments, setAttachments, handleFileChange, removeAttachment, clearAttachments, isUploading } = useFileUpload();
    const { downloadAttachment } = useDownload();

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
            queryClient.invalidateQueries({ queryKey: ["/api/demolition-logs"] });
            toast({ title: "출고 등록이 완료되었습니다" });
            setDialogOpen(false);
            resetForm();
            clearAttachments();
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
                    clearAttachments();
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
                                <TableHead className="text-center align-middle bg-background relative" style={{ width: widths.logDate }}>
                                    출고일자
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize('logDate')} />
                                </TableHead>
                                <TableHead className="text-center align-middle bg-background relative" style={{ width: widths.team }}>
                                    수령팀
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize('team')} />
                                </TableHead>
                                <TableHead className="text-center align-middle bg-background relative" style={{ width: widths.projectCode }}>
                                    공사번호
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize('projectCode')} />
                                </TableHead>
                                <TableHead className="text-left align-middle bg-background relative" style={{ width: widths.projectName }}>
                                    공사명
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize('projectName')} />
                                </TableHead>
                                <TableHead className="text-left align-middle bg-background relative" style={{ width: widths.productName }}>
                                    품명
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize('productName')} />
                                </TableHead>
                                <TableHead className="text-center align-middle bg-background relative" style={{ width: widths.specification }}>
                                    규격
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize('specification')} />
                                </TableHead>
                                <TableHead className="text-right align-middle bg-background relative" style={{ width: widths.usedQuantity }}>
                                    출고량
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize('usedQuantity')} />
                                </TableHead>
                                <TableHead className="text-center align-middle bg-background relative" style={{ width: widths.workerName }}>
                                    작업자
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize('workerName')} />
                                </TableHead>
                                <TableHead className="text-center align-middle bg-background relative" style={{ width: widths.creator }}>
                                    입력자
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize('creator')} />
                                </TableHead>
                                <TableHead className="text-center align-middle bg-background relative" style={{ width: widths.attachment }}>
                                    첨부
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize('attachment')} />
                                </TableHead>
                                <TableHead className="text-center align-middle bg-background relative" style={{ width: widths.remark }}>
                                    비고
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize('remark')} />
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredLogs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                                        출고 내역이 없습니다
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredLogs.map((log: any) => (
                                    <TableRow key={log.id} className="h-6 [&_td]:py-0">
                                        <TableCell className="text-center align-middle whitespace-nowrap">{log.logDate}</TableCell>

                                        <TableCell className="text-center align-middle max-w-[100px]">
                                            <div className="truncate" title={log.team?.name || ''}>{log.team?.name || ''}</div>
                                        </TableCell>
                                        <TableCell className="text-center align-middle max-w-[100px]">
                                            <div className="truncate" title={log.projectCode || ''}>{log.projectCode || ''}</div>
                                        </TableCell>
                                        <TableCell className="text-left align-middle max-w-[220px]">
                                            <div className="truncate" title={log.projectName || ''}>{log.projectName || ''}</div>
                                        </TableCell>
                                        <TableCell className="text-left align-middle max-w-[160px]">
                                            <div className="truncate" title={log.material?.productName || ''}>{log.material?.productName || ''}</div>
                                        </TableCell>
                                        <TableCell className="text-center align-middle max-w-[200px]">
                                            <div className="truncate" title={log.material?.specification || ''}>{log.material?.specification || ''}</div>
                                        </TableCell>
                                        <TableCell className="text-right align-middle font-medium whitespace-nowrap">{log.usedQuantity?.toLocaleString() || ''}</TableCell>
                                        <TableCell className="text-center align-middle max-w-[100px]">
                                            <div className="truncate" title={log.workerName || ''}>{log.workerName || ''}</div>
                                        </TableCell>
                                        <TableCell className="text-center align-middle max-w-[80px]">
                                            <div className="truncate" title={log.creator?.name || ''}>{log.creator?.name || ''}</div>
                                        </TableCell>
                                        <TableCell className="text-center align-middle">
                                            {(() => {
                                                if (!log.attributes) return null;
                                                try {
                                                    const attrs = typeof log.attributes === 'string' ? JSON.parse(log.attributes) : log.attributes;
                                                    const files = attrs.attachments || (attrs.attachment ? [attrs.attachment] : []);
                                                    if (files.length > 0) {
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
                                                    }
                                                } catch (e) { }
                                                return null;
                                            })()}
                                        </TableCell>
                                        <TableCell className="text-center align-middle max-w-[150px]">
                                            <div className="truncate" title={log.remark || ''}>{log.remark || ''}</div>
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

                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label className="text-right pt-2">첨부파일 (최대 4개)</Label>
                            <div className="col-span-3">
                                <div className="relative">
                                    <input
                                        type="file"
                                        id="file-upload"
                                        className="hidden"
                                        multiple
                                        onChange={handleFileChange}
                                        accept="image/*,.pdf,.xlsx,.xls"
                                    />
                                    {attachments.length < 4 && (
                                        <Label
                                            htmlFor="file-upload"
                                            className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-primary/30 rounded-lg cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                                        >
                                            <Upload className="h-5 w-5 text-primary" />
                                            <span className="text-sm font-medium text-primary">
                                                {isUploading ? "업로드 중..." : `파일 선택 (${attachments.length}/4) - 이미지, PDF, 엑셀`}
                                            </span>
                                        </Label>
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
