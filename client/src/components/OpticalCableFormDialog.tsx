import React, { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar as CalendarIcon, Upload, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { useFileUpload } from "@/hooks/useFileUpload";
import type { OpticalCable } from "@shared/schema";

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
    isWaste?: boolean;
    wasteReason?: string;
    wasteLength?: number;
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

    // Hook integration
    const {
        attachments,
        setAttachments,
        handleFileChange,
        removeAttachment,
        clearAttachments,
        isUploading
    } = useFileUpload({
        maxFiles: 4,
        maxSizeMB: 10
    });

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

    // Immediate waste option state
    const [isImmediateWaste, setIsImmediateWaste] = useState(false);
    const [wasteReason, setWasteReason] = useState("");
    const [wasteLength, setWasteLength] = useState<number | "">("");

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
                    // Reset waste option for editing
                    setIsImmediateWaste(false);
                    setWasteReason("");
                    setWasteLength("");
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
                    // Reset waste option for new entry
                    setIsImmediateWaste(false);
                    setWasteReason("");
                    setWasteLength("");
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Calculate final remaining length
        const currentIncoming = Number(incomingLength);
        const used = editingItem ? (editingItem.usedLength || 0) : 0;
        const waste = editingItem ? (editingItem.wasteLength || 0) : 0;

        // New immediate waste amount
        const newWaste = isImmediateWaste ? Number(wasteLength) : 0;

        // Final remaining = Incoming - Used - Existing Waste - New Waste
        const finalRemaining = currentIncoming - used - waste - newWaste;

        const payload = {
            ...formData,
            coreCount: Number(formData.coreCount),
            productName: String(formData.productName),
            unitPrice: Number(formData.unitPrice),
            division: formData.division || "SKT",
            remainingLength: finalRemaining,
            attributes: JSON.stringify({ attachments }),
            isWaste: isImmediateWaste,
            wasteReason: isImmediateWaste ? wasteReason : undefined,
            wasteLength: isImmediateWaste ? Number(wasteLength) : 0
        };

        if (onSubmit) {
            // 품명이 비어있으면 자동 생성 (규격_코어C)
            const finalProductName = formData.productName || `${formData.spec}_${formData.coreCount}C`;

            // @ts-ignore
            onSubmit({
                ...payload,
                productName: finalProductName
            });
            normalizedOnOpenChange(false);
        }
    };

    const handleUnitPriceChange = (price: number | "") => {
        const numPrice = price === "" ? 0 : price;
        const length = incomingLength === "" ? 0 : incomingLength;
        setFormData(prev => ({
            ...prev,
            unitPrice: price,
            totalAmount: numPrice * length
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
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto border-none bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl shadow-2xl p-0 gap-0">
                <DialogHeader className="p-6 pb-4 border-b border-slate-100 dark:border-zinc-800 space-y-1">
                    <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        {editingItem ? (
                            <>
                                <div className="h-8 w-1 rounded-full bg-indigo-500" />
                                <span>광케이블 드럼 수정</span>
                            </>
                        ) : (
                            <>
                                <div className="h-8 w-1 rounded-full bg-emerald-500" />
                                <span>광케이블 드럼 등록</span>
                            </>
                        )}
                    </DialogTitle>
                    <DialogDescription className="text-sm font-medium text-slate-500 pl-3">
                        {editingItem ? "드럼 정보를 수정합니다." : "새로운 광케이블 드럼을 등록합니다."}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">

                        <div className="grid grid-cols-2 gap-4 px-6">
                            <div className="grid gap-1.5">
                                <Label htmlFor="receivedDate" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">입고일자 <span className="text-red-500">*</span></Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal h-9 bg-slate-50/50 border-slate-200 hover:bg-slate-100 hover:border-slate-300 transition-all",
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
                            <div className="grid gap-1.5">
                                <Label htmlFor="division" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">사업 <span className="text-red-500">*</span></Label>
                                <Select
                                    value={formData.division}
                                    onValueChange={(value) => setFormData({ ...formData, division: value })}
                                    required
                                >
                                    <SelectTrigger className="h-9 bg-slate-50/50 border-slate-200 hover:bg-slate-100 hover:border-slate-300 transition-all">
                                        <SelectValue placeholder="사업 선택" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="SKT">SKT</SelectItem>
                                        <SelectItem value="SKB">SKB</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 px-6">
                            <div className="grid gap-1.5">
                                <Label htmlFor="projectCode" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">공사번호</Label>
                                <Input
                                    id="projectCode"
                                    value={formData.projectCode}
                                    onChange={(e) => setFormData({ ...formData, projectCode: e.target.value })}
                                    className="h-9 bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="projectName" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">공사명</Label>
                                <Input
                                    id="projectName"
                                    value={formData.projectName}
                                    onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                                    className="h-9 bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                                />
                            </div>
                        </div>

                        {/* 3. 구분 & 제조사 */}
                        <div className="grid grid-cols-2 gap-4 px-6">
                            <div className="grid gap-1.5">
                                <Label htmlFor="category" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">구분 <span className="text-red-500">*</span></Label>
                                <Input
                                    id="category"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    required
                                    className="h-9 bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="manufacturer" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">제조사 <span className="text-red-500">*</span></Label>
                                <Input
                                    id="manufacturer"
                                    value={formData.manufacturer}
                                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                                    required
                                    className="h-9 bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                                />
                            </div>
                        </div>

                        {/* 4. 제조년도 & 규격 */}
                        <div className="grid grid-cols-2 gap-4 px-6">
                            <div className="grid gap-1.5">
                                <Label htmlFor="manufactureYear" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">제조년도 <span className="text-red-500">*</span></Label>
                                <Input
                                    id="manufactureYear"
                                    value={formData.manufactureYear}
                                    onChange={(e) => setFormData({ ...formData, manufactureYear: e.target.value })}
                                    required
                                    className="h-9 bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="spec" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">규격 <span className="text-red-500">*</span></Label>
                                <Input
                                    id="spec"
                                    value={formData.spec}
                                    onChange={(e) => handleSpecChange(e.target.value)}
                                    required
                                    className="h-9 bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                                />
                            </div>
                        </div>

                        {/* 5. 코어 수 & 제조번호 */}
                        <div className="grid grid-cols-2 gap-4 px-6">
                            <div className="grid gap-1.5">
                                <Label htmlFor="coreCount" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">코어 수 <span className="text-red-500">*</span></Label>
                                <Input
                                    id="coreCount"
                                    type="number"
                                    value={formData.coreCount}
                                    onChange={(e) => setFormData({ ...formData, coreCount: e.target.value === "" ? "" : Number(e.target.value) })}
                                    required
                                    min="0"
                                    className="h-9 bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="drumNo" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">제조번호 (Drum No) <span className="text-red-500">*</span></Label>
                                <Input
                                    id="drumNo"
                                    value={formData.drumNo}
                                    onChange={(e) => setFormData({ ...formData, drumNo: e.target.value })}
                                    required
                                    className="h-9 bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                                />
                            </div>
                        </div>

                        {/* 6. 보관장소 & 입고량 */}
                        <div className="grid grid-cols-2 gap-4 px-6">
                            <div className="grid gap-1.5">
                                <Label htmlFor="location" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">보관장소 <span className="text-red-500">*</span></Label>
                                <Input
                                    id="location"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    required
                                    className="h-9 bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="incomingLength" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">입고량(m) <span className="text-red-500">*</span></Label>
                                <Input
                                    id="incomingLength"
                                    type="number"
                                    value={incomingLength}
                                    onChange={(e) => handleIncomingLengthChange(e.target.value === "" ? "" : Number(e.target.value))}
                                    required
                                    min="0"
                                    className="h-9 bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                                />
                            </div>
                        </div>

                        {/* 7. 단가 */}
                        <div className="grid grid-cols-1 gap-4 px-6">
                            <div className="grid gap-1.5">
                                <Label htmlFor="unitPrice" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">단가 (원) <span className="text-red-500">*</span></Label>
                                <Input
                                    id="unitPrice"
                                    type="number"
                                    value={formData.unitPrice}
                                    onChange={(e) => handleUnitPriceChange(e.target.value === "" ? "" : Number(e.target.value))}
                                    required
                                    min="0"
                                    className="h-9 bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                                />
                            </div>
                        </div>

                        {/* 9. 비고 */}
                        <div className="grid grid-cols-1 gap-1.5 px-6">
                            <Label htmlFor="remark" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">비고</Label>
                            <Input
                                id="remark"
                                value={formData.remark}
                                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                                className="h-9 bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                            />
                        </div>

                        {/* 8. 즉시 폐기 옵션 */}
                        <div className="grid gap-2 border-t border-slate-100 dark:border-zinc-800 pt-4 px-6">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="immediateWaste"
                                    checked={isImmediateWaste}
                                    onCheckedChange={(checked) => {
                                        const isChecked = checked as boolean;
                                        setIsImmediateWaste(isChecked);
                                        if (isChecked && incomingLength) {
                                            setWasteLength(Number(incomingLength));
                                        } else if (!isChecked) {
                                            setWasteLength("");
                                        }
                                    }}
                                />
                                <Label htmlFor="immediateWaste" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-destructive">
                                    입고 즉시 폐기 처리
                                </Label>
                            </div>

                            {isImmediateWaste && (
                                <div className="mt-2 animate-in slide-in-from-top-2 fade-in duration-200 grid grid-cols-2 gap-4 bg-red-50/50 p-4 rounded-lg border border-red-100">
                                    <div className="col-span-1">
                                        <Label htmlFor="wasteReason">폐기 사유 <span className="text-red-500">*</span></Label>
                                        <Textarea
                                            id="wasteReason"
                                            placeholder="폐기 사유를 입력하세요"
                                            value={wasteReason}
                                            onChange={(e) => setWasteReason(e.target.value)}
                                            className="h-[80px] resize-none mt-1.5"
                                            required={isImmediateWaste}
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <Label htmlFor="wasteLength">폐기 수량 (m) <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="wasteLength"
                                            type="number"
                                            value={wasteLength}
                                            onChange={(e) => setWasteLength(e.target.value === "" ? "" : Number(e.target.value))}
                                            className="mt-1.5 border-red-200 focus-visible:ring-red-500"
                                            required={isImmediateWaste}
                                            min={0}
                                            max={Number(incomingLength) || undefined}
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">
                                            * 입력한 수량만큼 잔량이 차감됩니다.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 10. 첨부파일 */}
                        <div className="grid grid-cols-4 items-start gap-4 border-t border-slate-100 dark:border-zinc-800 pt-4 px-6 pb-2">
                            <Label className="text-right pt-2 col-span-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                첨부파일
                            </Label>
                            <div className="col-span-3">
                                <div className="relative">
                                    <input
                                        type="file"
                                        id={uniqueId}
                                        className="hidden"
                                        multiple
                                        accept="image/*,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                                        onChange={handleFileChange}
                                        disabled={isUploading}
                                    />
                                    {/* Standard UI from Guide */}
                                    {attachments.length < 4 && (
                                        <label
                                            htmlFor={uniqueId}
                                            className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
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
                                        <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-md border">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                                                <span className="text-xs text-muted-foreground">({((file.originalSize || 0) / 1024).toFixed(1)} KB)</span>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeAttachment(index);
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                    </div>
                    <div className="flex justify-end gap-2 p-6 pt-0">
                        <Button type="button" variant="outline" onClick={() => normalizedOnOpenChange(false)} className="h-9">
                            취소
                        </Button>
                        <Button type="submit" disabled={isUploading} className="h-9 bg-primary/90 hover:bg-primary">
                            {isUploading ? (
                                <>
                                    <Upload className="mr-2 h-4 w-4 animate-spin" />
                                    업로드 중
                                </>
                            ) : (
                                "등록"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
