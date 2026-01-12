import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OpticalCable } from "@shared/schema";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Upload, Trash2, FileCheck } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { compressImage, formatFileSize } from "@/lib/imageCompression";
import { useToast } from "@/hooks/use-toast";

export interface OpticalCableFormData {
    managementNo: string;
    division: string;
    category: string;
    receivedDate: string;
    manufacturer: string;
    manufactureYear: string;
    spec: string;
    coreCount: number | "";
    drumNo: string;
    location: string;
    remark: string;
    productName: string;
    unitPrice: number | "";
    totalAmount: number;
    projectCode: string;
    projectName: string;
    attributes?: string; // JSON string for attachments
}

interface OpticalCableFormDialogProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onSubmit?: (data: OpticalCableFormData) => void;
    editingItem?: OpticalCable | null;
    trigger?: React.ReactNode;
}

export function OpticalCableFormDialog({ open: controlledOpen, onOpenChange: setControlledOpen, onSubmit, editingItem, trigger }: OpticalCableFormDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const { toast } = useToast();

    // ID 중복 방지를 위한 고유 ID 생성
    const [uniqueId] = useState(`optical-upload-${Math.random().toString(36).slice(2)}`);

    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : internalOpen;
    const onOpenChange = isControlled ? setControlledOpen : setInternalOpen;

    const [formData, setFormData] = useState<OpticalCableFormData>({
        managementNo: "",
        division: "",
        category: "",
        receivedDate: new Date().toISOString().split('T')[0],
        manufacturer: "",
        manufactureYear: "",
        spec: "",
        coreCount: "",
        drumNo: "",
        location: "",
        remark: "",
        productName: "",
        unitPrice: "",
        totalAmount: 0,
        projectCode: "",
        projectName: "",
    });

    const [incomingLength, setIncomingLength] = useState<number | "">("");
    const [attachments, setAttachments] = useState<{ name: string; data: string }[]>([]);

    // 리렌더링 시 초기화 방지를 위한 ID 트래킹
    const [currentEditingId, setCurrentEditingId] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            const newItemId = editingItem ? String(editingItem.id) : "new";

            // ID가 변경되었을 때만 초기화 로직 실행 (리렌더링 방어)
            if (currentEditingId !== newItemId) {
                if (editingItem) {
                    setFormData({
                        managementNo: editingItem.managementNo || "",
                        division: editingItem.division || "",
                        category: editingItem.category || "",
                        receivedDate: editingItem.receivedDate || new Date().toISOString().split('T')[0],
                        manufacturer: editingItem.manufacturer || "",
                        manufactureYear: editingItem.manufactureYear || "",
                        spec: editingItem.spec,
                        coreCount: editingItem.coreCount,
                        drumNo: editingItem.drumNo,
                        location: editingItem.location || "",
                        remark: editingItem.remark || "",
                        productName: editingItem.productName || "",
                        unitPrice: editingItem.unitPrice || 0,
                        totalAmount: editingItem.totalAmount || 0,
                        projectCode: editingItem.projectCode || "",
                        projectName: editingItem.projectName || "",
                    });
                    // Calculate initial incoming length (Remaining + Used + Waste)
                    const calculatedIncoming = (editingItem.remainingLength || 0) + (editingItem.usedLength || 0) + (editingItem.wasteLength || 0);
                    setIncomingLength(calculatedIncoming);

                    // Load attachments
                    if (editingItem.attributes) {
                        try {
                            const attrs = JSON.parse(editingItem.attributes);
                            if (attrs.attachments && Array.isArray(attrs.attachments)) {
                                setAttachments(attrs.attachments);
                            } else if (attrs.attachment) {
                                setAttachments([attrs.attachment]);
                            } else {
                                setAttachments([]);
                            }
                        } catch (e) {
                            setAttachments([]);
                        }
                    } else {
                        setAttachments([]);
                    }
                } else {
                    // Reset to clean state for new entry
                    setFormData({
                        managementNo: `OPT-${new Date().getTime().toString().slice(-6)}`,
                        division: "SKT", // Default
                        category: "",
                        receivedDate: new Date().toISOString().split('T')[0],
                        manufacturer: "",
                        manufactureYear: "",
                        spec: "",
                        coreCount: "",
                        drumNo: "",
                        location: "",
                        remark: "",
                        productName: "",
                        unitPrice: "",
                        totalAmount: 0,
                        projectCode: "",
                        projectName: "",
                    });
                    setIncomingLength("");
                    setAttachments([]);
                }
                setCurrentEditingId(newItemId);
            }
        } else {
            setCurrentEditingId(null); // 다이얼로그 닫히면 ID 초기화
        }
    }, [editingItem, open, currentEditingId]);

    const normalizedOnOpenChange = (newOpen: boolean) => {
        if (onOpenChange) {
            onOpenChange(newOpen);
        }
    };

    const handleProductNameChange = (val: string) => {
        setFormData(prev => ({ ...prev, productName: val }));
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const currentCount = attachments.length;
        if (currentCount + files.length > 4) {
            toast({
                title: "파일 개수 초과",
                description: `최대 4개까지 첨부할 수 있습니다. (현재 ${currentCount}개)`,
                variant: "destructive"
            });
            e.target.value = ''; // Reset input
            return;
        }

        const processedFiles: { name: string; data: string }[] = [];

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
                        maxWidth: 1280,
                        maxHeight: 1280,
                        quality: 0.7,
                        maxSizeMB: 1
                    });
                    processedFile = compressed;

                    const originalSize = formatFileSize(file.size);
                    const compressedSize = formatFileSize(compressed.size);
                    toast({
                        title: "이미지 압축 완료",
                        description: `${originalSize} → ${compressedSize}`,
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

                processedFiles.push(processedFile);

            } catch (error: any) {
                console.error("File processing error:", error);
                toast({
                    title: "파일 처리 실패",
                    description: `${file.name}: ${error.message}`,
                    variant: "destructive"
                });
            }
        }

        // 함수형 업데이트로 안전하게 상태 반영
        setAttachments(prev => [...prev, ...processedFiles]);
        e.target.value = ''; // Reset for next selection
    };

    const removeAttachment = (index: number) => {
        const newAttachments = attachments.filter((_, i) => i !== index);
        setAttachments(newAttachments);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Calculate final remaining length
        const currentIncoming = Number(incomingLength);
        const used = editingItem ? (editingItem.usedLength || 0) : 0;
        const waste = editingItem ? (editingItem.wasteLength || 0) : 0;
        const finalRemaining = currentIncoming - used - waste;

        const payload = {
            ...formData,
            coreCount: Number(formData.coreCount),
            productName: String(formData.productName), // Ensure string
            unitPrice: Number(formData.unitPrice),
            division: formData.division || "SKT",
            remainingLength: finalRemaining, // Send calculated remaining
            attributes: JSON.stringify({ attachments }), // Serialize attachments
        };

        if (onSubmit) {
            // @ts-ignore
            onSubmit(payload);
            normalizedOnOpenChange(false);
        }
    };

    const handleUnitPriceChange = (price: number | "") => {
        const numPrice = price === "" ? 0 : price;
        const length = incomingLength === "" ? 0 : incomingLength;
        setFormData(prev => ({
            ...prev,
            unitPrice: price,
            totalAmount: numPrice * length // Restore calculation with incomingLength
        }));
    };

    const handleIncomingLengthChange = (length: number | "") => {
        setIncomingLength(length);
        const numLength = length === "" ? 0 : length;
        const price = formData.unitPrice === "" ? 0 : formData.unitPrice;
        setFormData(prev => ({
            ...prev,
            totalAmount: price * numLength
        }));
    };

    const handleSpecChange = (val: string) => {
        setFormData(prev => ({ ...prev, spec: val }));
    };

    const handleDateSelect = (date: Date | undefined) => {
        if (date) {
            setFormData({ ...formData, receivedDate: format(date, "yyyy-MM-dd") });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{editingItem ? "광케이블 드럼 수정" : "광케이블 드럼 등록"}</DialogTitle>
                    <DialogDescription>
                        {editingItem ? "드럼 정보를 수정합니다." : "새로운 광케이블 드럼을 등록합니다."}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">

                        {/* 1. 입고일자 & 사업 */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="receivedDate">입고일자 <span className="text-red-500">*</span></Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !formData.receivedDate && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {formData.receivedDate ? (
                                                format(new Date(formData.receivedDate), "PPP", { locale: ko })
                                            ) : (
                                                <span>날짜 선택</span>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={formData.receivedDate ? new Date(formData.receivedDate) : undefined}
                                            onSelect={handleDateSelect}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="division">사업 <span className="text-red-500">*</span></Label>
                                <Input
                                    id="division"
                                    value={formData.division}
                                    onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        {/* 2. 구분 & 제조사 */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="category">구분 <span className="text-red-500">*</span></Label>
                                <Input
                                    id="category"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="manufacturer">제조사 <span className="text-red-500">*</span></Label>
                                <Input
                                    id="manufacturer"
                                    value={formData.manufacturer}
                                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        {/* 3. 제조년도 & 규격 */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="manufactureYear">제조년도 <span className="text-red-500">*</span></Label>
                                <Input
                                    id="manufactureYear"
                                    value={formData.manufactureYear}
                                    onChange={(e) => setFormData({ ...formData, manufactureYear: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="spec">규격 <span className="text-red-500">*</span></Label>
                                <Input
                                    id="spec"
                                    value={formData.spec}
                                    onChange={(e) => handleSpecChange(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {/* 4. 코어 수 & 제조번호 */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="coreCount">코어 수 <span className="text-red-500">*</span></Label>
                                <Input
                                    id="coreCount"
                                    type="number"
                                    value={formData.coreCount}
                                    onChange={(e) => setFormData({ ...formData, coreCount: e.target.value === "" ? "" : Number(e.target.value) })}
                                    required
                                    min="0"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="drumNo">제조번호 (Drum No) <span className="text-red-500">*</span></Label>
                                <Input
                                    id="drumNo"
                                    value={formData.drumNo}
                                    onChange={(e) => setFormData({ ...formData, drumNo: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="productName">품명 <span className="text-red-500">*</span></Label>
                                <Input
                                    id="productName"
                                    value={formData.productName}
                                    onChange={(e) => handleProductNameChange(e.target.value)}
                                    required
                                    placeholder="예: MT_72C"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="incomingLength">입고량(m) <span className="text-red-500">*</span></Label>
                                <Input
                                    id="incomingLength"
                                    type="number"
                                    value={incomingLength}
                                    onChange={(e) => handleIncomingLengthChange(e.target.value === "" ? "" : Number(e.target.value))}
                                    required
                                    min="0"
                                />
                            </div>
                        </div>

                        {/* 5-2. 보관장소 */}
                        <div className="grid grid-cols-1 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="location">보관장소 <span className="text-red-500">*</span></Label>
                                <Input
                                    id="location"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        {/* 6. 단가 & 금액 */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="unitPrice">단가 (원) <span className="text-red-500">*</span></Label>
                                <Input
                                    id="unitPrice"
                                    type="number"
                                    value={formData.unitPrice}
                                    onChange={(e) => handleUnitPriceChange(e.target.value === "" ? "" : Number(e.target.value))}
                                    required
                                    min="0"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="totalAmount">금액 (원)</Label>
                                <Input
                                    id="totalAmount"
                                    type="number"
                                    value={formData.totalAmount}
                                    readOnly
                                    className="bg-slate-100"
                                />
                            </div>
                        </div>

                        {/* 7. 비고 */}
                        <div className="grid grid-cols-1 gap-2">
                            <Label htmlFor="remark">비고</Label>
                            <Input
                                id="remark"
                                value={formData.remark}
                                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                            />
                        </div>

                        {/* 8. 첨부파일 */}
                        <div className="grid grid-cols-4 items-start gap-4 border-t pt-4">
                            <Label className="text-right pt-2">첨부파일 (최대 4개)</Label>
                            <div className="col-span-3">
                                <div className="relative">
                                    <Input
                                        id={uniqueId}
                                        type="file"
                                        accept="image/*,application/pdf,.xlsx,.xls"
                                        multiple
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                    {attachments.length < 4 && (
                                        <label
                                            htmlFor={uniqueId}
                                            className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-primary/30 rounded-lg cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                                        >
                                            <Upload className="h-5 w-5 text-primary" />
                                            <span className="text-sm font-medium text-primary">
                                                파일 선택 ({attachments.length}/4) - 이미지, PDF, 엑셀
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

                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => normalizedOnOpenChange(false)}>
                            취소
                        </Button>
                        <Button type="submit">
                            {editingItem ? "수정" : "등록"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
