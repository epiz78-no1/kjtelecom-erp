import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Loader2, MoreHorizontal, Upload, Download, X, Paperclip, Pencil } from "lucide-react";
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
    creator?: { name: string };
    workerName?: string;
    attributes?: string;
}

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

    const toggleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(new Set(filteredMaterials.map(m => m.id)));
        } else {
            setSelectedIds(new Set());
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
                    <h1 className="text-2xl font-bold">철거자재 입고 내역</h1>
                    <p className="text-muted-foreground">철거 현장에서 회수한 자재를 등록합니다</p>
                </div>
                <Button onClick={() => {
                    resetForm();
                    clearAttachments();
                    setDialogOpen(true);
                }}>
                    <Plus className="h-4 w-4 mr-2" />
                    {isEditing ? "수정" : "입고 등록"}
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
                    총 <span className="font-semibold text-foreground">{filteredMaterials.length}</span>건
                </div>
            </div>

            <div className="flex-1 rounded-md border overflow-hidden">
                <div className="h-full overflow-auto">
                    <table className="w-full caption-bottom text-sm table-fixed">
                        <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                            <TableRow className="h-8">
                                <TableHead className="text-center align-middle bg-background" style={{ width: '40px' }}>
                                    <Checkbox
                                        checked={materials.length > 0 && selectedIds.size === materials.length}
                                        onCheckedChange={toggleSelectAll}
                                    />
                                </TableHead>
                                <TableHead className="text-center align-middle bg-background relative" style={{ width: widths.division }}>
                                    사업
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize('division')} />
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
                                    품목
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize('productName')} />
                                </TableHead>
                                <TableHead className="text-center align-middle bg-background relative" style={{ width: widths.specification }}>
                                    규격
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize('specification')} />
                                </TableHead>
                                <TableHead className="text-center align-middle bg-background relative" style={{ width: widths.originalQuantity }}>
                                    수량
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={handleResize('originalQuantity')} />
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
                                <TableHead className="text-center align-middle bg-background" style={{ width: '50px' }}></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {materials.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={12} className="h-24 text-center">
                                        데이터가 없습니다.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredMaterials.map((material) => (
                                    <TableRow key={material.id} className="h-6 [&_td]:py-0">
                                        <TableCell className="text-center align-middle">
                                            {isTenantOwner && (
                                                <Checkbox
                                                    checked={selectedIds.has(material.id)}
                                                    onCheckedChange={() => toggleSelect(material.id)}
                                                />
                                            )}
                                        </TableCell>

                                        <TableCell className="text-center align-middle max-w-[60px]" style={{ width: widths.division }}>
                                            <div className="truncate" title={material.division}>{material.division}</div>
                                        </TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap" style={{ width: widths.demolitionDate }}>{material.demolitionDate}</TableCell>
                                        <TableCell className="text-center align-middle max-w-[100px]" style={{ width: widths.projectCode }}>
                                            <div className="truncate" title={material.projectCode || ''}>{material.projectCode || ''}</div>
                                        </TableCell>
                                        <TableCell className="text-left align-middle max-w-[220px]" style={{ width: widths.projectName }}>
                                            <div className="truncate" title={material.projectName || ''}>{material.projectName || ''}</div>
                                        </TableCell>
                                        <TableCell className="text-center align-middle max-w-[160px]" style={{ width: widths.productName }}>
                                            <div className="truncate" title={material.productName}>{material.productName}</div>
                                        </TableCell>
                                        <TableCell className="text-center align-middle max-w-[200px]" style={{ width: widths.specification }}>
                                            <div className="truncate" title={material.specification}>{material.specification}</div>
                                        </TableCell>
                                        <TableCell className="text-center align-middle font-medium whitespace-nowrap" style={{ width: widths.originalQuantity }}>{material.originalQuantity.toLocaleString()}</TableCell>

                                        <TableCell className="text-center align-middle max-w-[100px]" style={{ width: widths.workerName }}>
                                            <div className="truncate" title={material.workerName || ''}>{material.workerName || ''}</div>
                                        </TableCell>
                                        <TableCell className="text-center align-middle" style={{ width: widths.creator }}>
                                            {material.creator?.name || ''}
                                        </TableCell>
                                        <TableCell className="text-center align-middle" style={{ width: widths.attachment }}>
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
                                                                    <Button variant="ghost" size="sm" className="h-6 gap-1 px-2">
                                                                        <Paperclip className="h-4 w-4" />
                                                                        <span className="text-xs font-medium">{files.length}</span>
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
                                        <TableCell className="text-center align-middle max-w-[150px]">
                                            <div className="truncate" title={material.remark || ''}>{material.remark || ''}</div>
                                        </TableCell>
                                        <TableCell className="text-center align-middle">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-6 w-6 p-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {isTenantOwner && (
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
                                                                    if (confirm('삭제하시겠습니까?')) {
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
                        <DialogTitle>{isEditing ? "철거자재 입고 수정" : "철거자재 입고 등록"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Row 1: Date, Team, Worker */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                <Label htmlFor="teamId">작업팀</Label>
                                <Select
                                    value={formData.currentTeamId}
                                    onValueChange={(val) => setFormData({ ...formData, currentTeamId: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="팀 선택" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {teamsList.map((team: any) => (
                                            <SelectItem key={team.id} value={team.id}>
                                                {team.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="workerName">작업자</Label>
                                <Select
                                    value={formData.workerName}
                                    onValueChange={(val) => setFormData({ ...formData, workerName: val })}
                                    disabled={!formData.currentTeamId}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={formData.currentTeamId ? "작업자 선택" : "팀을 먼저 선택하세요"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {membersList
                                            .filter((m: any) => m.teamId === formData.currentTeamId)
                                            .map((m: any) => (
                                                <SelectItem key={m.id} value={m.name}>
                                                    {m.name}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Row 2: Project Code, Project Name */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="projectCode">공사번호 *</Label>
                                <Input
                                    id="projectCode"
                                    value={formData.projectCode}
                                    onChange={(e) => setFormData({ ...formData, projectCode: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="md:col-span-2">
                                <Label htmlFor="projectName">공사명 *</Label>
                                <Input
                                    id="projectName"
                                    value={formData.projectName}
                                    onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        {/* Row 3: Category, ProductName, Specification */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="category">품목1</Label>
                                {inputMode.category ? (
                                    <div className="flex gap-2">
                                        <Input
                                            id="category"
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            placeholder="직접 입력"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                                setInputMode(prev => ({ ...prev, category: false }));
                                                setFormData(prev => ({ ...prev, category: "", productName: "", specification: "" }));
                                            }}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <Select
                                        value={formData.category}
                                        onValueChange={(val) => {
                                            if (val === "DIRECT_INPUT") {
                                                setInputMode(prev => ({ ...prev, category: true }));
                                                setFormData(prev => ({ ...prev, category: "", productName: "", specification: "" }));
                                            } else {
                                                setFormData(prev => ({ ...prev, category: val, productName: "", specification: "" }));
                                            }
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="품목1 선택" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.keys(DEMOLITION_ITEMS).map((item) => (
                                                <SelectItem key={item} value={item}>{item}</SelectItem>
                                            ))}
                                            <SelectItem value="DIRECT_INPUT" className="text-muted-foreground font-medium">직접 입력 (기타)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="productName">품목2</Label>
                                {inputMode.productName || inputMode.category ? (
                                    <div className="flex gap-2">
                                        <Input
                                            id="productName"
                                            value={formData.productName}
                                            onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                                            placeholder="직접 입력"
                                        />
                                        {!inputMode.category && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => {
                                                    setInputMode(prev => ({ ...prev, productName: false }));
                                                    setFormData(prev => ({ ...prev, productName: "", specification: "" }));
                                                }}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                ) : (
                                    <Select
                                        value={formData.productName}
                                        onValueChange={(val) => {
                                            if (val === "DIRECT_INPUT") {
                                                setInputMode(prev => ({ ...prev, productName: true }));
                                                setFormData(prev => ({ ...prev, productName: "", specification: "" }));
                                            } else {
                                                setFormData(prev => ({ ...prev, productName: val }));
                                            }
                                        }}
                                        disabled={!formData.category}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="품목2 선택" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {formData.category && DEMOLITION_ITEMS[formData.category] ? (
                                                Object.keys(DEMOLITION_ITEMS[formData.category]).map((item) => (
                                                    <SelectItem key={item} value={item}>{item}</SelectItem>
                                                ))
                                            ) : null}
                                            <SelectItem value="DIRECT_INPUT" className="text-muted-foreground font-medium">직접 입력 (기타)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="specification">규격 *</Label>
                                {inputMode.specification || inputMode.productName || inputMode.category ? (
                                    <div className="flex gap-2">
                                        <Input
                                            id="specification"
                                            value={formData.specification}
                                            onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                                            placeholder="직접 입력"
                                            required
                                        />
                                        {!inputMode.productName && !inputMode.category && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => {
                                                    setInputMode(prev => ({ ...prev, specification: false }));
                                                    setFormData(prev => ({ ...prev, specification: "" }));
                                                }}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                ) : (
                                    <Select
                                        value={formData.specification}
                                        onValueChange={(val) => {
                                            if (val === "DIRECT_INPUT") {
                                                setInputMode(prev => ({ ...prev, specification: true }));
                                                setFormData(prev => ({ ...prev, specification: "" }));
                                            } else {
                                                setFormData(prev => ({ ...prev, specification: val }));
                                            }
                                        }}
                                        disabled={!formData.category}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="규격 선택" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {/* Show all specifications for the selected category, regardless of product name */}
                                            {formData.category && DEMOLITION_ITEMS[formData.category] ? (
                                                (() => {
                                                    // Aggregate all specs from all products in the category, preserving order
                                                    const allSpecs = new Set<string>();
                                                    // Use keys to ensure we iterate in the order defined in DEMOLITION_ITEMS
                                                    // (though object key order isn't strictly guaranteed, most JS engines respect insertion order for string keys)
                                                    Object.keys(DEMOLITION_ITEMS[formData.category]).forEach((productName) => {
                                                        const specs = DEMOLITION_ITEMS[formData.category][productName];
                                                        if (Array.isArray(specs)) {
                                                            specs.forEach(s => allSpecs.add(String(s)));
                                                        }
                                                    });

                                                    // Convert Set to Array directly to preserve insertion order (no sort)
                                                    const sortedSpecs = Array.from(allSpecs);

                                                    return sortedSpecs.map((item) => (
                                                        <SelectItem key={item} value={item}>{item}</SelectItem>
                                                    ));
                                                })()
                                            ) : null}
                                            <SelectItem value="DIRECT_INPUT" className="text-muted-foreground font-medium">직접 입력 (기타)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                        </div>

                        {/* Row 4: Quantity, Remark */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                            <div className="md:col-span-2">
                                <Label htmlFor="remark">비고</Label>
                                <Input
                                    id="remark"
                                    value={formData.remark}
                                    onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                                    placeholder="비고 입력"
                                />
                            </div>
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
                                등록
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div >
    );
}
