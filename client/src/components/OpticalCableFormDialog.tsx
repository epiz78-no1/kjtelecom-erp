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
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";

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
    totalLength: number | "";
    unitPrice: number | "";
    totalAmount: number;
    projectCode: string;
    projectName: string;
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
        totalLength: "",
        unitPrice: "",
        totalAmount: 0,
        projectCode: "",
        projectName: "",
    });

    useEffect(() => {
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
                totalLength: editingItem.totalLength,
                unitPrice: editingItem.unitPrice || 0,
                totalAmount: editingItem.totalAmount || 0,
                projectCode: editingItem.projectCode || "",
                projectName: editingItem.projectName || "",
            });
        } else {
            // Reset to clean state for new entry
            setFormData({
                managementNo: `OPT-${new Date().getTime().toString().slice(-6)}`,
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
                totalLength: "",
                unitPrice: "",
                totalAmount: 0,
                projectCode: "",
                projectName: "",
            });
        }
    }, [editingItem, open]);

    const normalizedOnOpenChange = (newOpen: boolean) => {
        if (onOpenChange) {
            onOpenChange(newOpen);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const payload = {
            ...formData,
            coreCount: Number(formData.coreCount),
            totalLength: Number(formData.totalLength),
            unitPrice: Number(formData.unitPrice),
            division: formData.division || "SKT",
        };

        if (onSubmit) {
            onSubmit(payload as any);
            normalizedOnOpenChange(false);
        }
    };

    const handleUnitPriceChange = (price: number | "") => {
        const numPrice = price === "" ? 0 : price;
        const length = formData.totalLength === "" ? 0 : formData.totalLength;
        setFormData(prev => ({
            ...prev,
            unitPrice: price,
            totalAmount: numPrice * length
        }));
    };

    const handleLengthChange = (length: number | "") => {
        const numLength = length === "" ? 0 : length;
        const price = formData.unitPrice === "" ? 0 : formData.unitPrice;
        setFormData(prev => ({
            ...prev,
            totalLength: length,
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
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
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

                        {/* 5. 케이블용량 & 위치 */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="totalLength">케이블용량 (m) <span className="text-red-500">*</span></Label>
                                <Input
                                    id="totalLength"
                                    type="number"
                                    value={formData.totalLength}
                                    onChange={(e) => handleLengthChange(e.target.value === "" ? "" : Number(e.target.value))}
                                    required
                                />
                            </div>
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
