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

    const isEdit = !!editingItem;
    const themeColor = isEdit ? "indigo" : "emerald";
    const GradientLine = isEdit
        ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-500"
        : "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500";
    const TitleGradient = isEdit
        ? "bg-gradient-to-r from-slate-900 to-slate-600"
        : "bg-gradient-to-r from-slate-900 to-slate-600";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="max-w-[750px] p-0 overflow-hidden border-white/20 bg-background/80 backdrop-blur-xl shadow-2xl flex flex-col max-h-[90vh]">
                {/* Top Gradient Indicator */}
                <div className={`h-1.5 w-full ${GradientLine} shrink-0`} />

                <div className="px-6 pt-6 pb-2 shrink-0">
                    <DialogHeader className="mb-4">
                        <DialogTitle className={`text-xl font-bold ${TitleGradient} bg-clip-text text-transparent`}>
                            {isEdit ? "광케이블 드럼 수정" : "신규 광케이블 드럼 등록"}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            {isEdit
                                ? "기존 드럼 정보를 수정합니다. 변경된 내용은 즉시 반영됩니다."
                                : "새로운 광케이블 드럼을 입고 처리하고 재고에 반영합니다."}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="px-6 pb-6 overflow-y-auto custom-scrollbar flex-1">
                    <form id="optical-cable-form" onSubmit={handleSubmit} className="grid gap-6">

                        {/* 기본 정보 Section */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-1">
                                <div className={`h-4 w-1 rounded-full ${isEdit ? "bg-indigo-500" : "bg-emerald-500"}`} />
                                <h4 className="font-bold text-[13px] text-slate-700">입고 기본 정보</h4>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[12px] font-semibold text-slate-500 ml-1">입고일자 <span className="text-red-500">*</span></Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full justify-start text-left font-normal h-9 bg-slate-50/50 border-slate-200/60 hover:bg-white transition-all text-xs",
                                                    !formData.receivedDate && "text-muted-foreground",
                                                    isEdit ? "hover:border-indigo-500/50" : "hover:border-emerald-500/50"
                                                )}
                                            >
                                                <CalendarIcon className={`mr-2 h-4 w-4 ${isEdit ? "text-indigo-600" : "text-emerald-600"}`} />
                                                {formData.receivedDate ? (
                                                    format(new Date(formData.receivedDate), "PPP", { locale: ko })
                                                ) : (
                                                    <span>날짜 선택</span>
                                                )}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className={`w-auto p-0 shadow-xl ${isEdit ? "border-indigo-100" : "border-emerald-100"}`} align="start">
                                            <Calendar
                                                mode="single"
                                                selected={formData.receivedDate ? new Date(formData.receivedDate) : undefined}
                                                onSelect={handleDateSelect}
                                                initialFocus
                                                className="p-3"
                                                classNames={{
                                                    day_selected: isEdit
                                                        ? "bg-indigo-500 text-white hover:bg-indigo-600 focus:bg-indigo-600"
                                                        : "bg-emerald-500 text-white hover:bg-emerald-600 focus:bg-emerald-600",
                                                    day_today: isEdit
                                                        ? "bg-indigo-50 text-indigo-600"
                                                        : "bg-emerald-50 text-emerald-600",
                                                }}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[12px] font-semibold text-slate-500 ml-1">사업 구분 <span className="text-red-500">*</span></Label>
                                    <Select
                                        value={formData.division}
                                        onValueChange={(value) => setFormData({ ...formData, division: value })}
                                    >
                                        <SelectTrigger className={`h-9 bg-slate-50/50 border-slate-200/60 text-xs ${isEdit ? "focus:ring-indigo-500/20" : "focus:ring-emerald-500/20"}`}>
                                            <SelectValue placeholder="사업 선택" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="SKT" className="text-xs">SKT</SelectItem>
                                            <SelectItem value="SKB" className="text-xs">SKB</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[12px] font-semibold text-slate-500 ml-1">공사번호</Label>
                                    <Input
                                        value={formData.projectCode}
                                        onChange={(e) => setFormData({ ...formData, projectCode: e.target.value })}
                                        className={`h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white transition-all ${isEdit ? "focus:border-indigo-500/50" : "focus:border-emerald-500/50"}`}
                                        placeholder="공사번호 입력"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[12px] font-semibold text-slate-500 ml-1">공사명</Label>
                                    <Input
                                        value={formData.projectName}
                                        onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                                        className={`h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white transition-all ${isEdit ? "focus:border-indigo-500/50" : "focus:border-emerald-500/50"}`}
                                        placeholder="공사명 입력"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-slate-100" />

                        {/* 자재 상세 정보 Section */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-1">
                                <div className={`h-4 w-1 rounded-full ${isEdit ? "bg-purple-500" : "bg-teal-500"}`} />
                                <h4 className="font-bold text-[13px] text-slate-700">자재 상세 스펙</h4>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[12px] font-semibold text-slate-500 ml-1">구분 (케이블 종류) <span className="text-red-500">*</span></Label>
                                    <Input
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        required
                                        className={`h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white transition-all ${isEdit ? "focus:border-indigo-500/50" : "focus:border-emerald-500/50"}`}
                                        placeholder="예: 광케이블"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[12px] font-semibold text-slate-500 ml-1">제조사 <span className="text-red-500">*</span></Label>
                                    <Input
                                        value={formData.manufacturer}
                                        onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                                        required
                                        className={`h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white transition-all ${isEdit ? "focus:border-indigo-500/50" : "focus:border-emerald-500/50"}`}
                                        placeholder="제조사 입력"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[12px] font-semibold text-slate-500 ml-1">제조년도 <span className="text-red-500">*</span></Label>
                                    <Input
                                        value={formData.manufactureYear}
                                        onChange={(e) => setFormData({ ...formData, manufactureYear: e.target.value })}
                                        required
                                        className={`h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white transition-all ${isEdit ? "focus:border-indigo-500/50" : "focus:border-emerald-500/50"}`}
                                        placeholder="YYYY"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[12px] font-semibold text-slate-500 ml-1">규격 <span className="text-red-500">*</span></Label>
                                    <Input
                                        value={formData.spec}
                                        onChange={(e) => handleSpecChange(e.target.value)}
                                        required
                                        className={`h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white transition-all ${isEdit ? "focus:border-indigo-500/50" : "focus:border-emerald-500/50"}`}
                                        placeholder="규격 입력"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[12px] font-semibold text-slate-500 ml-1">코어 수 <span className="text-red-500">*</span></Label>
                                    <Input
                                        type="number"
                                        value={formData.coreCount}
                                        onChange={(e) => setFormData({ ...formData, coreCount: e.target.value === "" ? "" : Number(e.target.value) })}
                                        required
                                        min="0"
                                        className={`h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white transition-all ${isEdit ? "focus:border-indigo-500/50" : "focus:border-emerald-500/50"}`}
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-slate-100" />

                        {/* 재고 및 위치 정보 Section */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-1">
                                <div className={`h-4 w-1 rounded-full ${isEdit ? "bg-violet-500" : "bg-cyan-500"}`} />
                                <h4 className="font-bold text-[13px] text-slate-700">재고 및 위치 정보</h4>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[12px] font-semibold text-slate-500 ml-1">제조번호 (Drum No) <span className="text-red-500">*</span></Label>
                                    <Input
                                        value={formData.drumNo}
                                        onChange={(e) => setFormData({ ...formData, drumNo: e.target.value })}
                                        required
                                        className={`h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white transition-all font-mono ${isEdit ? "focus:border-indigo-500/50" : "focus:border-emerald-500/50"}`}
                                        placeholder="Drum No 입력"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[12px] font-semibold text-slate-500 ml-1">보관장소 <span className="text-red-500">*</span></Label>
                                    <Input
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        required
                                        className={`h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white transition-all ${isEdit ? "focus:border-indigo-500/50" : "focus:border-emerald-500/50"}`}
                                        placeholder="보관장소 입력"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[12px] font-semibold text-slate-500 ml-1">입고량(m) <span className="text-red-500">*</span></Label>
                                    <Input
                                        type="number"
                                        value={incomingLength}
                                        onChange={(e) => handleIncomingLengthChange(e.target.value === "" ? "" : Number(e.target.value))}
                                        required
                                        min="0"
                                        className={`h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white transition-all text-right font-mono ${isEdit ? "focus:border-indigo-500/50" : "focus:border-emerald-500/50"}`}
                                        placeholder="0"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[12px] font-semibold text-slate-500 ml-1">단가 (원) <span className="text-red-500">*</span></Label>
                                    <Input
                                        type="number"
                                        value={formData.unitPrice}
                                        onChange={(e) => handleUnitPriceChange(e.target.value === "" ? "" : Number(e.target.value))}
                                        required
                                        min="0"
                                        className={`h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white transition-all text-right font-mono ${isEdit ? "focus:border-indigo-500/50" : "focus:border-emerald-500/50"}`}
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 비고 */}
                        <div className="space-y-1.5">
                            <Label className="text-[12px] font-semibold text-slate-500 ml-1">비고</Label>
                            <Input
                                value={formData.remark}
                                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                                className={`h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white transition-all ${isEdit ? "focus:border-indigo-500/50" : "focus:border-emerald-500/50"}`}
                                placeholder="특이사항 입력"
                            />
                        </div>

                        {/* 폐기 옵션 */}
                        <div className="grid gap-2 border-t border-slate-100 pt-4">
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
                                    className={isEdit ? "data-[state=checked]:bg-indigo-500" : "data-[state=checked]:bg-destructive"}
                                />
                                <Label htmlFor="immediateWaste" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-destructive">
                                    입고 즉시 폐기 처리
                                </Label>
                            </div>

                            {isImmediateWaste && (
                                <div className="mt-2 animate-in slide-in-from-top-2 fade-in duration-200 grid grid-cols-2 gap-4 bg-red-50/50 p-4 rounded-xl border border-red-100">
                                    <div className="col-span-1 space-y-1.5">
                                        <Label className="text-[12px] font-semibold text-slate-500 ml-1">폐기 사유 <span className="text-red-500">*</span></Label>
                                        <Textarea
                                            value={wasteReason}
                                            onChange={(e) => setWasteReason(e.target.value)}
                                            className="h-[80px] resize-none bg-white border-red-200 focus:border-red-400 focus:ring-red-200"
                                            placeholder="폐기 사유를 입력하세요"
                                            required={isImmediateWaste}
                                        />
                                    </div>
                                    <div className="col-span-1 space-y-1.5">
                                        <Label className="text-[12px] font-semibold text-slate-500 ml-1">폐기 수량 (m) <span className="text-red-500">*</span></Label>
                                        <Input
                                            type="number"
                                            value={wasteLength}
                                            onChange={(e) => setWasteLength(e.target.value === "" ? "" : Number(e.target.value))}
                                            className="bg-white border-red-200 focus:border-red-400 focus:ring-red-200 text-right"
                                            required={isImmediateWaste}
                                            min={0}
                                            max={Number(incomingLength) || undefined}
                                        />
                                        <p className="text-[11px] text-red-500/80 mt-1">
                                            * 입력한 수량만큼 잔량이 차감됩니다.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 첨부파일 */}
                        <div className="space-y-3 pb-2">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="h-4 w-1 bg-slate-400 rounded-full" />
                                <h4 className="font-bold text-[13px] text-slate-700">첨부파일</h4>
                                <span className="text-[11px] text-slate-400 font-normal ml-auto">최대 4개 / 이미지, PDF, 엑셀 지원</span>
                            </div>

                            <div className="space-y-3">
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
                                    {attachments.length < 4 && (
                                        <label
                                            htmlFor={uniqueId}
                                            className={`group flex flex-col items-center justify-center gap-2 w-full h-24 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer transition-all duration-200 ${isUploading ? "opacity-50 cursor-wait" :
                                                isEdit ? "hover:border-indigo-400 hover:bg-indigo-50/30" : "hover:border-emerald-400 hover:bg-emerald-50/30"
                                                }`}
                                        >
                                            <div className={`h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center transition-colors ${isEdit ? "group-hover:bg-indigo-100" : "group-hover:bg-emerald-100"
                                                }`}>
                                                <Upload className={`h-4 w-4 text-slate-400 ${isEdit ? "group-hover:text-indigo-600" : "group-hover:text-emerald-600"
                                                    }`} />
                                            </div>
                                            <span className={`text-xs font-medium text-slate-500 ${isEdit ? "group-hover:text-indigo-600" : "group-hover:text-emerald-600"
                                                }`}>
                                                {isUploading ? "업로드 중..." : "클릭하여 파일 업로드 또는 드래그 앤 드롭"}
                                            </span>
                                        </label>
                                    )}
                                </div>

                                {attachments.length > 0 && (
                                    <div className="grid grid-cols-2 gap-2">
                                        {attachments.map((file, index) => (
                                            <div key={index} className="flex items-center justify-between p-2.5 bg-white border border-slate-100 rounded-lg shadow-sm hover:shadow-md transition-all">
                                                <div className="flex items-center gap-2.5 overflow-hidden">
                                                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 text-lg ${isEdit ? "bg-indigo-50" : "bg-emerald-50"
                                                        }`}>
                                                        {file.name.endsWith('.pdf') ? '📄' :
                                                            file.name.endsWith('.xls') || file.name.endsWith('.xlsx') ? '📊' : '🖼️'}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-xs font-medium text-slate-700 truncate block max-w-[120px]">
                                                            {file.name}
                                                        </span>
                                                        <span className={`text-[10px] ${isEdit ? "text-indigo-600" : "text-emerald-600"}`}>
                                                            {((file.originalSize || 0) / 1024).toFixed(1)} KB
                                                        </span>
                                                    </div>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeAttachment(index);
                                                    }}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                    </form>
                </div>

                <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between sm:justify-between gap-2 shrink-0">
                    <Button type="button" variant="ghost" onClick={() => normalizedOnOpenChange(false)} className="h-9 text-slate-500 hover:text-slate-900">
                        취소
                    </Button>
                    <Button
                        type="submit"
                        form="optical-cable-form"
                        disabled={isUploading}
                        className={`h-9 px-6 text-white shadow-md ${isEdit
                            ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-indigo-200"
                            : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-200"
                            }`}
                    >
                        {isUploading ? (
                            <>
                                <Upload className="mr-2 h-3.5 w-3.5 animate-spin" />
                                업로드 중
                            </>
                        ) : (
                            <>
                                {isEdit ? "수정 사항 저장" : "신규 드럼 등록"}
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
