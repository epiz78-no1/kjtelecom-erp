import { useState, useEffect } from "react";
import { Calendar, Trash2, Check, ChevronsUpDown, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useFileUpload } from "@/hooks/useFileUpload";

import { DemolitionMaterial } from "@/types/demolition";
import { parseAttributes } from "@/utils/demolitionUtils";

interface DemolitionOutgoingDialogProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: {
        usageDate: Date;
        teamId: string;
        projectCode: string;
        projectName: string;
        workerName: string;
        attachments: { name: string; storageUrl: string; storagePath: string }[];
        items: Array<{
            id: string;
            materialId: string;
            usedQuantity: string;
            remark: string;
            remainingQuantity: number;
            productName: string;
            specification: string;
        }>;
    }) => void;
    editingRecord: any | null;
    materials: DemolitionMaterial[];
    teams: any[];
    members: any[];
}

export function DemolitionOutgoingDialog({
    open,
    onClose,
    onSubmit,
    editingRecord,
    materials,
    teams,
    members,
}: DemolitionOutgoingDialogProps) {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [formData, setFormData] = useState({
        teamId: "",
        projectCode: "",
        projectName: "",
        workerName: "",
        items: [{
            id: Date.now().toString(),
            materialId: "",
            usedQuantity: "",
            remark: "",
            remainingQuantity: 0,
            productName: "",
            specification: "",
            managementNo: "",
        }]
    });

    const {
        attachments,
        setAttachments,
        handleFileChange,
        removeAttachment,
        clearAttachments
    } = useFileUpload();

    const { toast } = useToast();

    // Reset/Initialize form
    useEffect(() => {
        if (open && editingRecord) {
            // Editing mode
            const initializeForm = (record: any, attachments: any[] = []) => {
                const material = materials.find(m => m.id === record.materialId);

                setFormData({
                    teamId: record.teamId || "",
                    projectCode: record.projectCode || "",
                    projectName: record.projectName || "",
                    workerName: record.workerName || "", // Assuming workerName stores the name
                    items: [{
                        id: Date.now().toString(),
                        materialId: record.materialId,
                        usedQuantity: record.usedQuantity.toString(),
                        remark: record.remark || "",
                        remainingQuantity: material ? material.remainingQuantity + record.usedQuantity : 0,
                        productName: material?.productName || "",
                        specification: material?.specification || "",
                        managementNo: material?.managementNo || "",
                    }]
                });

                setAttachments(attachments.map(att => ({
                    name: att.name,
                    storageUrl: att.storageUrl || "",
                    storagePath: att.storagePath || ""
                })));

                setSelectedDate(new Date(record.logDate));
            };

            let initialAttachments: any[] = [];

            const attrs = parseAttributes(editingRecord?.attributes);
            initialAttachments = attrs.attachments || [];

            initializeForm(editingRecord, initialAttachments);

        } else if (open) {
            // New record mode
            setFormData({
                teamId: "",
                projectCode: "",
                projectName: "",
                workerName: "",
                items: [{
                    id: Date.now().toString(),
                    materialId: "",
                    usedQuantity: "",
                    remark: "",
                    remainingQuantity: 0,
                    productName: "",
                    specification: "",
                    managementNo: "",
                }]
            });
            clearAttachments();
            setSelectedDate(new Date());
        }
    }, [open, editingRecord, materials]);

    const handleSubmit = () => {
        // Validation
        if (!formData.teamId) {
            toast({
                variant: "destructive",
                title: "입력 오류",
                description: "수령팀을 선택해주세요.",
            });
            return;
        }

        const validItems = formData.items.filter(item => item.materialId && item.usedQuantity);
        if (validItems.length === 0) {
            toast({
                variant: "destructive",
                title: "입력 오류",
                description: "최소 하나의 자재를 선택하고 수량을 입력해주세요.",
            });
            return;
        }

        onSubmit({
            usageDate: selectedDate,
            teamId: formData.teamId,
            projectCode: formData.projectCode,
            projectName: formData.projectName,
            workerName: formData.workerName,
            attachments,
            items: validItems.map(item => ({
                id: item.id,
                materialId: item.materialId,
                usedQuantity: item.usedQuantity,
                remark: item.remark,
                remainingQuantity: item.remainingQuantity,
                productName: item.productName,
                specification: item.specification
            }))
        });
    };

    const updateItem = (index: number, updates: Partial<typeof formData.items[0]>) => {
        const newItems = [...formData.items];
        newItems[index] = { ...newItems[index], ...updates };
        setFormData({ ...formData, items: newItems });
    };

    const addItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, {
                id: Date.now().toString(),
                materialId: "",
                usedQuantity: "",
                remark: "",
                remainingQuantity: 0,
                productName: "",
                specification: "",
                managementNo: "",
            }]
        });
    };

    const removeItem = (index: number) => {
        if (formData.items.length === 1) return;
        const newItems = formData.items.filter((_, i) => i !== index);
        setFormData({ ...formData, items: newItems });
    };

    // Filter available materials
    const getAvailableMaterials = (currentMaterialId?: string) => {
        return materials.filter(m => {
            // 1. Basic usability check
            const isUsable = (m.status === 'approved_reusable' || m.status === 'in_use' || m.id === currentMaterialId) &&
                (m.remainingQuantity > 0 || m.id === currentMaterialId);
            if (!isUsable) return false;

            // 2. Team Filter
            if (formData.teamId) {
                // 이미 해당 팀에 할당되어 있거나, 아직 어디에도 할당되지 않은(null) 경우만 표시
                if (m.currentTeamId && String(m.currentTeamId) !== String(formData.teamId)) return false;
            } else {
                return false; // 팀을 먼저 선택해야 함
            }

            return true;
        });
    };

    // Filter members by selected team
    const filteredMembers = formData.teamId
        ? members.filter(m => m.teamId && m.teamId.toString() === formData.teamId.toString())
        : [];

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-[700px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>철거자재 출고 {editingRecord ? "수정" : "등록"}</DialogTitle>
                    <DialogDescription>
                        {editingRecord ? "철거자재 출고 내역을 수정합니다." : "현장팀으로 출고할 철거자재를 등록합니다."}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Row 1: Date, Team, Recipient */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="grid gap-2">
                            <Label>출고일 *</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="justify-start text-left font-normal w-full"
                                    >
                                        <Calendar className="mr-2 h-4 w-4" />
                                        {selectedDate ? format(selectedDate, "PPP", { locale: ko }) : <span>날짜 선택</span>}
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
                        <div className="grid gap-2">
                            <Label>수령팀 *</Label>
                            <Select
                                value={formData.teamId}
                                onValueChange={(value) => {
                                    setFormData(prev => ({
                                        ...prev,
                                        teamId: value,
                                        workerName: "" // Reset worker when team changes
                                    }));
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="팀 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    {teams.map((team) => (
                                        <SelectItem key={team.id} value={team.id.toString()}>
                                            {team.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>수령인(작업자)</Label>
                            <Select
                                value={formData.workerName}
                                onValueChange={(value) => setFormData({ ...formData, workerName: value })}
                                disabled={!formData.teamId}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={!formData.teamId ? "팀을 먼저 선택하세요" : "수령인 선택"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {filteredMembers.map((member) => (
                                        <SelectItem key={member.id} value={member.name}>
                                            {member.name} {member.position ? `(${member.position})` : ""}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Row 2: Project Code, Project Name */}
                    <div className="grid grid-cols-5 gap-4">
                        <div className="col-span-2 grid gap-2">
                            <Label>공사번호</Label>
                            <Input
                                value={formData.projectCode}
                                onChange={(e) => setFormData({ ...formData, projectCode: e.target.value })}
                                placeholder="공사번호"
                            />
                        </div>
                        <div className="col-span-3 grid gap-2">
                            <Label>공사명</Label>
                            <Input
                                value={formData.projectName}
                                onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                                placeholder="공사명"
                            />
                        </div>
                    </div>

                    {/* Items List */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label>출고 자재 목록</Label>
                        </div>

                        {formData.items.map((item, index) => (
                            <div
                                key={item.id}
                                className="grid gap-3 border p-3 rounded-md bg-muted/20 relative"
                            >
                                {formData.items.length > 1 && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-2 top-2 h-6 w-6 text-muted-foreground hover:text-destructive"
                                        onClick={() => removeItem(index)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}

                                <div className="grid gap-2">
                                    <Label className="text-xs text-muted-foreground">자재 선택 *</Label>
                                    <Select
                                        value={item.materialId}
                                        onValueChange={(value) => {
                                            const material = materials.find(m => m.id === value);
                                            // 1. Update the item
                                            updateItem(index, {
                                                materialId: value,
                                                productName: material?.productName || "",
                                                specification: material?.specification || "",
                                                managementNo: material?.managementNo || "",
                                                remainingQuantity: material?.remainingQuantity || 0
                                            });

                                            // 2. Auto-fill project info if not already set
                                            if (material && (!formData.projectCode || !formData.projectName)) {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    projectCode: (!prev.projectCode && material.projectCode) ? material.projectCode : prev.projectCode,
                                                    projectName: (!prev.projectName && material.projectName) ? material.projectName : prev.projectName,
                                                }));
                                            }

                                            // 3. Add new line if this is the last item and we are not editing
                                            if (index === formData.items.length - 1 && !editingRecord) {
                                                // We must simulate the add item action but be careful with state updates
                                                // Using setTimeout to avoid state race conditions in this render cycle
                                                setTimeout(() => {
                                                    setFormData(current => ({
                                                        ...current,
                                                        items: [...current.items, {
                                                            id: Date.now().toString(),
                                                            materialId: "",
                                                            usedQuantity: "",
                                                            remark: "",
                                                            remainingQuantity: 0,
                                                            productName: "",
                                                            specification: "",
                                                            managementNo: "",
                                                        }]
                                                    }));
                                                }, 0);
                                            }
                                        }}
                                        disabled={!!editingRecord}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="자재를 선택하세요" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {getAvailableMaterials(item.materialId)
                                                .filter(m => {
                                                    // 3. Exclude already selected items (except current row)
                                                    const isAlreadySelected = formData.items.some((existingItem, i) =>
                                                        i !== index && String(existingItem.materialId) === String(m.id) && existingItem.materialId !== ""
                                                    );
                                                    return !isAlreadySelected;
                                                })
                                                .map((material) => (
                                                    <SelectItem key={material.id} value={material.id}>
                                                        [{material.division}] {material.productName} ({material.specification}) - 잔량: {material.remainingQuantity}
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
                                            onChange={(e) => updateItem(index, { usedQuantity: e.target.value })}
                                            min="0"
                                            placeholder="출고 수량"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="text-xs text-muted-foreground">비고</Label>
                                        <Input
                                            value={item.remark}
                                            onChange={(e) => updateItem(index, { remark: e.target.value })}
                                            placeholder="비고"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Attachments */}
                    <div className="grid grid-cols-4 items-start gap-4">
                        <Label className="text-right pt-2">첨부파일 (최대 4개)</Label>
                        <div className="col-span-3">
                            <div className="relative">
                                <Input
                                    id="outgoing-file-upload"
                                    type="file"
                                    accept="image/*,application/pdf,.xlsx,.xls"
                                    multiple
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                                {attachments.length < 4 && (
                                    <label
                                        htmlFor="outgoing-file-upload"
                                        className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-primary/30 rounded-lg cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                                    >
                                        <Upload className="h-5 w-5 text-primary" />
                                        <span className="text-sm font-medium text-primary">
                                            파일 선택 ({attachments.length}/4)
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

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        취소
                    </Button>
                    <Button onClick={handleSubmit}>
                        {editingRecord ? "수정" : "등록"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
