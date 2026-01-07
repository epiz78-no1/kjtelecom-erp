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
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { compressImage, formatFileSize } from "@/lib/imageCompression";
import { useToast } from "@/hooks/use-toast";
import { InventoryItemSelector } from "@/components/InventoryItemSelector";
import type { OutgoingRecord, InventoryItem } from "@shared/schema";

interface OutgoingDialogProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: {
        date: Date;
        division: string;
        teamCategory: string;
        projectName: string;
        recipient: string;
        attachment: { name: string; data: string } | null;
        items: Array<{
            id: string;
            productName: string;
            specification: string;
            quantity: string;
            inventoryItemId?: number;
            remark: string;
        }>;
    }) => void;
    editingRecord: OutgoingRecord | null;
    inventoryItems: InventoryItem[];
    teams: any[];
    members: any[];
}

export function OutgoingDialog({
    open,
    onClose,
    onSubmit,
    editingRecord,
    inventoryItems,
    teams,
    members,
}: OutgoingDialogProps) {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [formData, setFormData] = useState({
        division: "SKT",
        teamCategory: "",
        projectName: "",
        recipient: "",
        attachments: [] as { name: string; data: string }[],
        items: [{
            id: Date.now().toString(),
            productName: "",
            specification: "",
            quantity: "",
            inventoryItemId: undefined as number | undefined,
            remark: "",
        }]
    });

    const { toast } = useToast();

    // Reset form when dialog opens/closes or editing record changes
    useEffect(() => {
        if (open && editingRecord) {
            // Editing mode
            let loadedAttachments: { name: string; data: string }[] = [];
            try {
                const attrs = JSON.parse(editingRecord.attributes || "{}");
                if (attrs.attachments && Array.isArray(attrs.attachments)) {
                    loadedAttachments = attrs.attachments;
                } else if (attrs.attachment) {
                    loadedAttachments = [attrs.attachment];
                }
            } catch (e) { }

            setFormData({
                division: editingRecord.division,
                teamCategory: editingRecord.teamCategory || "",
                projectName: editingRecord.projectName,
                recipient: editingRecord.recipient,
                attachments: loadedAttachments,
                items: [{
                    id: Date.now().toString(),
                    productName: editingRecord.productName,
                    specification: editingRecord.specification,
                    quantity: editingRecord.quantity.toString(),
                    inventoryItemId: editingRecord.inventoryItemId || undefined,
                    remark: editingRecord.remark || "",
                }]
            });
            setSelectedDate(new Date(editingRecord.date));
        } else if (open) {
            // New record mode
            setFormData({
                division: "SKT",
                teamCategory: "",
                projectName: "",
                recipient: "",
                attachments: [],
                items: [{
                    id: Date.now().toString(),
                    productName: "",
                    specification: "",
                    quantity: "",
                    inventoryItemId: undefined,
                    remark: "",
                }]
            });
            setSelectedDate(new Date());
        }
    }, [open, editingRecord]);

    const handleSubmit = () => {
        onSubmit({
            date: selectedDate,
            ...formData,
            attachment: formData.attachments[0] || null,
            attributes: JSON.stringify({ attachments: formData.attachments })
        } as any);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const currentCount = formData.attachments.length;
        if (currentCount + files.length > 4) {
            toast({
                title: "파일 개수 초과",
                description: `최대 4개까지 첨부할 수 있습니다. (현재 ${currentCount}개)`,
                variant: "destructive"
            });
            e.target.value = '';
            return;
        }

        const newAttachments = [...formData.attachments];

        for (const file of files) {
            if (file.size > 10 * 1024 * 1024) {
                toast({
                    title: "용량 초과",
                    description: `${file.name} 파일이 10MB를 초과합니다.`,
                    variant: "destructive"
                });
                continue;
            }

            try {
                let processedFile: { name: string; data: string };

                if (file.type.startsWith('image/')) {
                    const compressed = await compressImage(file, {
                        maxWidth: 1920,
                        maxHeight: 1920,
                        quality: 0.8,
                        maxSizeMB: 5
                    });
                    processedFile = compressed;

                    const originalSize = formatFileSize(file.size);
                    const compressedSize = formatFileSize(compressed.size);
                    toast({
                        title: "이미지 압축 완료",
                        description: `${originalSize} → ${compressedSize}`,
                    });
                } else {
                    const base64 = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result as string);
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    });
                    processedFile = { name: file.name, data: base64 };
                }

                newAttachments.push(processedFile);

            } catch (error: any) {
                toast({
                    title: "파일 업로드 실패",
                    description: `${file.name}: ${error.message}`,
                    variant: "destructive"
                });
            }
        }

        setFormData({ ...formData, attachments: newAttachments });
        e.target.value = '';
    };

    const removeAttachment = (index: number) => {
        const newAttachments = formData.attachments.filter((_, i) => i !== index);
        setFormData({ ...formData, attachments: newAttachments });
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-[800px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>출고 내역 {editingRecord ? "수정" : "등록"}</DialogTitle>
                    <DialogDescription>
                        {editingRecord ? "출고 내역을 수정합니다." : "새로운 자재 출고 내역을 등록합니다."}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* 공통 필드 */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>출고일 *</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="justify-start text-left font-normal"
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
                            <Label>사업 *</Label>
                            <Select
                                value={formData.division}
                                onValueChange={(value) => setFormData({
                                    ...formData,
                                    division: value,
                                    items: formData.items.map(item => ({
                                        ...item,
                                        productName: "",
                                        specification: "",
                                        inventoryItemId: undefined
                                    }))
                                })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="사업 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Array.from(new Set(inventoryItems.map(item => item.division).filter(d => d && d.trim() !== ''))).sort().map((div) => (
                                        <SelectItem key={div} value={div}>
                                            {div}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>수령팀 *</Label>
                            <Select
                                value={formData.teamCategory}
                                onValueChange={(value) => {
                                    const team = teams.find((t: any) => t.name === value);
                                    setFormData({ ...formData, teamCategory: value, recipient: "" });
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="팀 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    {teams.map((team) => (
                                        <SelectItem key={team.id} value={team.name}>
                                            {team.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>수령인 *</Label>
                            <Select
                                value={formData.recipient}
                                onValueChange={(value) => setFormData({ ...formData, recipient: value })}
                                disabled={!formData.teamCategory}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={formData.teamCategory ? "수령인 선택" : "팀 선택 필요"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {members
                                        .filter((m: any) => {
                                            if (!formData.teamCategory) return false;
                                            const selectedTeam = teams.find(t => t.name === formData.teamCategory);
                                            return selectedTeam && m.teamId === selectedTeam.id;
                                        })
                                        .map((member: any) => (
                                            <SelectItem key={member.id} value={member.name}>
                                                {member.name} ({member.username})
                                            </SelectItem>
                                        ))}
                                    {members.filter((m: any) => {
                                        const t = teams.find(tm => tm.name === formData.teamCategory);
                                        return t && m.teamId === t.id;
                                    }).length === 0 && (
                                            <SelectItem value="none" disabled>팀원 없음</SelectItem>
                                        )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label>공사명 *</Label>
                        <Input
                            value={formData.projectName}
                            onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                            placeholder="공사명 입력"
                        />
                    </div>

                    {/* 품목 목록 */}
                    <div className="space-y-4">
                        <Label>출고 품목 목록</Label>
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
                                        onClick={() => {
                                            const newItems = formData.items.filter((_, i) => i !== index);
                                            setFormData({ ...formData, items: newItems });
                                        }}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}

                                <div className="grid gap-2">
                                    <Label className="text-xs text-muted-foreground">품명 ({index + 1}) *</Label>
                                    <InventoryItemSelector
                                        value={item.inventoryItemId}
                                        division={formData.division}
                                        excludeItems={formData.items
                                            .filter((_, i) => i !== index && !!formData.items[i].inventoryItemId)
                                            .map(i => i.inventoryItemId as number)
                                        }
                                        onChange={(id, selectedItem) => {
                                            const newItems = [...formData.items];
                                            newItems[index] = {
                                                ...newItems[index],
                                                productName: selectedItem.productName,
                                                specification: selectedItem.specification,
                                                inventoryItemId: id
                                            };

                                            // 마지막 항목에 품명을 선택하면 새 항목 추가
                                            if (index === formData.items.length - 1) {
                                                newItems.push({
                                                    id: Date.now().toString(),
                                                    productName: "",
                                                    specification: "",
                                                    quantity: "",
                                                    inventoryItemId: undefined,
                                                    remark: "",
                                                });
                                            }

                                            setFormData({ ...formData, items: newItems });
                                        }}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label className="text-xs text-muted-foreground">수량 *</Label>
                                    <Input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => {
                                            const newItems = [...formData.items];
                                            newItems[index].quantity = e.target.value;
                                            setFormData({ ...formData, items: newItems });
                                        }}
                                        placeholder="수량"
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label className="text-xs text-muted-foreground">비고</Label>
                                    <Input
                                        value={item.remark}
                                        onChange={(e) => {
                                            const newItems = [...formData.items];
                                            newItems[index].remark = e.target.value;
                                            setFormData({ ...formData, items: newItems });
                                        }}
                                        placeholder="비고"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 첨부파일 */}
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
                                {formData.attachments.length < 4 && (
                                    <label
                                        htmlFor="outgoing-file-upload"
                                        className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-primary/30 rounded-lg cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                                    >
                                        <Upload className="h-5 w-5 text-primary" />
                                        <span className="text-sm font-medium text-primary">
                                            파일 선택 ({formData.attachments.length}/4) - 이미지, PDF, 엑셀
                                        </span>
                                    </label>
                                )}
                            </div>

                            <div className="space-y-2 mt-2">
                                {formData.attachments.map((file, index) => (
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
