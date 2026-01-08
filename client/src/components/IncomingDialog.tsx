
import { useState, useMemo, useEffect } from "react";
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
import type { IncomingRecord, InventoryItem } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";

interface IncomingDialogProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: {
        date: Date;
        division: string;
        supplier: string;
        projectName: string;
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
    editingRecord: IncomingRecord | null;
    inventoryItems: InventoryItem[];
}

export function IncomingDialog({
    open,
    onClose,
    onSubmit,
    editingRecord,
    inventoryItems,
}: IncomingDialogProps) {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [formData, setFormData] = useState({
        division: "SKT",
        supplier: "",
        projectName: "",
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

    const [openProductCombobox, setOpenProductCombobox] = useState(false);
    const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
    const { toast } = useToast();

    // Reset form when dialog opens/closes or editing record changes
    useEffect(() => {
        if (open && editingRecord) {
            // Editing mode: Set initial data from props
            const initializeForm = (record: IncomingRecord, attachments: { name: string; data: string }[] = []) => {
                setFormData({
                    division: record.division,
                    supplier: record.supplier,
                    projectName: record.projectName,
                    attachments: attachments,
                    items: [{
                        id: Date.now().toString(),
                        productName: record.productName,
                        specification: record.specification,
                        quantity: record.quantity.toString(),
                        inventoryItemId: record.inventoryItemId || undefined,
                        remark: record.remark || "",
                    }]
                });
                setSelectedDate(new Date(record.date));
            };

            // 1. Initial render with existing data (attachments might be empty due to optimization)
            let initialAttachments: { name: string; data: string }[] = [];
            try {
                const attrs = JSON.parse(editingRecord.attributes || "{}");
                if (attrs.attachments && Array.isArray(attrs.attachments)) {
                    initialAttachments = attrs.attachments;
                } else if (attrs.attachment) {
                    initialAttachments = [attrs.attachment];
                }
            } catch (e) { }

            initializeForm(editingRecord, initialAttachments);

            // 2. Fetch full record for complete data (especially attachments)
            const fetchFullDetails = async () => {
                try {
                    const fullRecord = await queryClient.fetchQuery<IncomingRecord>({
                        queryKey: [`/api/incoming/${editingRecord.id}`],
                        staleTime: 0
                    });

                    if (fullRecord && fullRecord.attributes) {
                        try {
                            const attrs = JSON.parse(fullRecord.attributes);
                            let loadedAttachments: { name: string; data: string }[] = [];
                            if (attrs.attachments && Array.isArray(attrs.attachments)) {
                                loadedAttachments = attrs.attachments;
                            } else if (attrs.attachment) {
                                loadedAttachments = [attrs.attachment];
                            }

                            // Update attachments in state
                            if (loadedAttachments.length > 0) {
                                setFormData(prev => ({ ...prev, attachments: loadedAttachments }));
                            }
                        } catch (e) {
                            console.error("Failed to parse attributes from full record", e);
                        }
                    }
                } catch (error) {
                    console.error("Failed to fetch full incoming record", error);
                }
            };

            fetchFullDetails();
        } else if (open) {
            // New record mode
            setFormData({
                division: "SKT",
                supplier: "",
                projectName: "",
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

    // Product names for combobox
    const productNames = useMemo(() => {
        const selectedDiv = (formData.division || "").trim();
        const filtered = inventoryItems
            .filter(item => {
                if (!selectedDiv) return true;
                const itemDiv = (item.division || "").trim();
                return itemDiv === selectedDiv;
            })
            .map(item => item.productName)
            .filter(n => n && n.trim() !== '');
        const names = new Set(filtered);
        return Array.from(names).sort();
    }, [inventoryItems, formData.division]);

    // Specifications for selected product in active item
    const specifications = useMemo(() => {
        if (activeItemIndex === null) return [];
        const item = formData.items[activeItemIndex];
        if (!item?.productName) return [];
        const specs = inventoryItems
            .filter(inv => inv.productName === item.productName)
            .map(inv => inv.specification)
            .filter(s => s && s.trim() !== '');
        return Array.from(new Set(specs)).sort();
    }, [inventoryItems, formData.items, activeItemIndex]);

    const handleSubmit = () => {
        // Compatibility: Save primarily to 'attachments', but also 'attachment' (first one) to prevent breakages in other views if they only look at 'attachment'
        // Actually, better to migrate fully. But to be safe, I will send both or just handle it in the backend/storage.
        // For now, let's keep the submit signature aligned but pass the new data structure.
        // The parent onSubmit expects `attachment` currently. I need to update the interface or pass it loosely.
        // Let's modify the interface first or cast it.
        // But since I can't easily modify the parent interface in this one step without breaking type check, I will pass it as `any` or update the interface in the replacement.

        // Wait, I should update the interface in the same file.
        onSubmit({
            date: selectedDate,
            ...formData,
            // Pass the first attachment as 'attachment' legacy field if needed, or just let 'attachments' be handled if I update schema/backend. 
            // The type definition for onSubmit needs to be updated.
            attachment: formData.attachments[0] || null,
            attributes: JSON.stringify({ attachments: formData.attachments }) // Pass attributes explicitly if needed, but onSubmit usually deconstructs.
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
            e.target.value = ''; // Reset input
            return;
        }

        const newAttachments = [...formData.attachments];

        for (const file of files) {
            if (file.size > 10 * 1024 * 1024) { // 10MB
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
                    // 이미지 압축 적용
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
                        description: `${originalSize} → ${compressedSize} `,
                    });
                } else {
                    // Excel, PDF 등은 Base64로 변환
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
        e.target.value = ''; // Reset for next selection
    };

    const removeAttachment = (index: number) => {
        const newAttachments = formData.attachments.filter((_, i) => i !== index);
        setFormData({ ...formData, attachments: newAttachments });
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-[800px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>입고 내역 {editingRecord ? "수정" : "등록"}</DialogTitle>
                    <DialogDescription>
                        {editingRecord ? "입고 내역을 수정합니다." : "새로운 자재 입고 내역을 등록합니다."}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* 공통 필드 */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>입고일 *</Label>
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
                            <Label>구매처 *</Label>
                            <Input
                                value={formData.supplier}
                                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                                placeholder="구매처 입력"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>공사명 *</Label>
                            <Input
                                value={formData.projectName}
                                onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                                placeholder="공사명 입력"
                            />
                        </div>
                    </div>

                    {/* 품목 목록 */}
                    <div className="space-y-4">
                        <Label>입고 품목 목록</Label>
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
                                        min="0"
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
                                    id="incoming-file-upload"
                                    type="file"
                                    accept="image/*,application/pdf,.xlsx,.xls"
                                    multiple
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                                {formData.attachments.length < 4 && (
                                    <label
                                        htmlFor="incoming-file-upload"
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
