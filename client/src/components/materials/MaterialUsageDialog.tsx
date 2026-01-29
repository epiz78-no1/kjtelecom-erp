import { useState, useRef, useEffect } from "react";
import { Loader2, Trash2, Calendar, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useFileUpload } from "@/hooks/useFileUpload";
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
import { TeamInventorySelector } from "@/components/inventory/TeamInventorySelector";

interface MaterialUsageDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingRecord: any | null;
    selectedDate: Date | undefined;
    setSelectedDate: (date: Date | undefined) => void;
    formData: {
        teamCategory: string;
        recipient: string;
        projectName: string;
        items: Array<{
            id: string;
            division: string;
            category: string;
            productName: string;
            specification: string;
            quantity: string;
            inventoryItemId?: number;
            remark: string;
        }>;
    };
    setFormData: (data: any) => void;
    teamInventory: any[];
    teams: any[];
    members: any[];
    canManage: boolean;
    onSubmit: () => void;
    isSubmitting: boolean;
}

export function MaterialUsageDialog({
    open,
    onOpenChange,
    editingRecord,
    selectedDate,
    setSelectedDate,
    formData,
    setFormData,
    teamInventory,
    teams,
    members,
    canManage,
    onSubmit,
    isSubmitting,
}: MaterialUsageDialogProps) {
    const { toast } = useToast();
    const {
        attachments,
        setAttachments,
        handleFileChange,
        removeAttachment,
        clearAttachments,
    } = useFileUpload();

    const lastItemRef = useRef<HTMLDivElement>(null);

    // Auto scroll when items added
    useEffect(() => {
        if (formData.items && formData.items.length > 1) {
            setTimeout(() => {
                lastItemRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }, 100);
        }
    }, [formData.items?.length]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[750px] p-0 overflow-hidden border-white/20 bg-background/80 backdrop-blur-xl shadow-2xl flex flex-col max-h-[90vh]">
                {/* Top Gradient Indicator */}
                <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-slate-500 to-zinc-500" />

                <div className="px-6 pt-6 pb-2">
                    <DialogHeader className="mb-4">
                        <DialogTitle className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                            {editingRecord ? "자재 사용 내역 수정" : "자재 사용 내역 등록"}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            일반 자재의 사용 내역을 {editingRecord ? "수정하여 데이터를 갱신합니다." : "새로 등록합니다."}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6">
                    <div className="grid gap-6">
                        {/* 기본 정보 */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="h-4 w-1 bg-indigo-500 rounded-full" />
                                <h4 className="font-bold text-[13px] text-slate-700">작업 기본 정보</h4>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[12px] font-semibold text-slate-500 ml-1">사용일자 <span className="text-red-500">*</span></Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    "w-full justify-start text-left font-normal h-9 bg-slate-50/50 border-slate-200/60 hover:bg-white hover:border-indigo-500/50 transition-all text-xs",
                                                    !selectedDate && "text-muted-foreground"
                                                )}
                                            >
                                                <Calendar className="mr-2 h-4 w-4 text-indigo-600" />
                                                {selectedDate ? format(selectedDate, "yyyy-MM-dd") : <span>날짜 선택</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 border-indigo-100 shadow-xl" align="start">
                                            <CalendarComponent
                                                mode="single"
                                                selected={selectedDate}
                                                onSelect={setSelectedDate}
                                                initialFocus
                                                className="p-3"
                                                classNames={{
                                                    day_selected: "bg-indigo-500 text-white hover:bg-indigo-600 focus:bg-indigo-600",
                                                    day_today: "bg-indigo-50 text-indigo-600",
                                                }}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-[12px] font-semibold text-slate-500 ml-1">사용팀 <span className="text-red-500">*</span></Label>
                                    <Select
                                        value={formData.teamCategory}
                                        onValueChange={(value) => {
                                            const team = teams.find((t: any) => t.name === value);
                                            setFormData({ ...formData, teamCategory: value, teamId: team?.id, recipient: "" });
                                        }}
                                        disabled={!canManage}
                                    >
                                        <SelectTrigger data-testid="select-usage-team" className="h-9 bg-slate-50/50 border-slate-200/60 focus:ring-indigo-500/20 text-xs">
                                            <SelectValue placeholder="팀 선택" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {teams.map((t) => (
                                                <SelectItem key={t.id} value={t.name} className="text-xs">
                                                    {t.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-[12px] font-semibold text-slate-500 ml-1">사용자 <span className="text-red-500">*</span></Label>
                                    <Select
                                        value={formData.recipient}
                                        onValueChange={(value) => setFormData({ ...formData, recipient: value })}
                                        disabled={!formData.teamCategory || !canManage}
                                    >
                                        <SelectTrigger data-testid="select-usage-recipient" className="h-9 bg-slate-50/50 border-slate-200/60 focus:ring-indigo-500/20 text-xs">
                                            <SelectValue placeholder={formData.teamCategory ? "사용자 선택" : "팀 선택 필요"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {members
                                                .filter((m: any) => {
                                                    if (!formData.teamCategory) return false;
                                                    const selectedTeam = teams.find(t => t.name === formData.teamCategory);
                                                    return selectedTeam && m.teamId === selectedTeam.id;
                                                })
                                                .map((member: any) => (
                                                    <SelectItem key={member.id} value={member.name} className="text-xs">
                                                        {member.name} ({member.username})
                                                    </SelectItem>
                                                ))}
                                            {members.filter((m: any) => {
                                                const t = teams.find(tm => tm.name === formData.teamCategory);
                                                return t && m.teamId === t.id;
                                            }).length === 0 && (
                                                    <SelectItem value="none" disabled className="text-xs">팀원 없음</SelectItem>
                                                )}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-slate-100" />

                        {/* 공사 정보 */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="h-4 w-1 bg-slate-500 rounded-full" />
                                <h4 className="font-bold text-[13px] text-slate-700">공사 정보</h4>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[12px] font-semibold text-slate-500 ml-1">공사명</Label>
                                <Input
                                    value={formData.projectName}
                                    onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                                    className="h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white focus:border-slate-500/50 transition-all text-xs"
                                    placeholder="공사명을 입력하세요"
                                    data-testid="input-usage-project"
                                />
                            </div>
                        </div>

                        <div className="h-px bg-slate-100" />

                        {/* 자재 목록 */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="h-4 w-1 bg-zinc-500 rounded-full" />
                                <h4 className="font-bold text-[13px] text-slate-700">사용 자재 목록</h4>
                            </div>

                            {formData.items.map((item, index) => (
                                <div
                                    key={item.id}
                                    ref={index === formData.items.length - 1 ? lastItemRef : null}
                                    className="relative p-4 rounded-xl border border-slate-200 bg-slate-50/30 hover:bg-slate-50/80 transition-all group"
                                >
                                    {formData.items.length > 1 && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-2 top-2 h-6 w-6 text-slate-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                                            onClick={() => {
                                                const newItems = formData.items.filter((_, i) => i !== index);
                                                setFormData({ ...formData, items: newItems });
                                            }}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    )}

                                    <div className="grid gap-4">
                                        {/* 자재 선택 */}
                                        <div className="space-y-1.5">
                                            <Label className="text-[11px] font-semibold text-slate-500 ml-1">보유 자재 선택 ({index + 1})</Label>
                                            <TeamInventorySelector
                                                items={teamInventory.filter(inv => {
                                                    const isAlreadySelected = formData.items.some((existingItem, i) =>
                                                        i !== index && existingItem.inventoryItemId === inv.inventoryItemId
                                                    );
                                                    if (isAlreadySelected) return false;

                                                    const firstDivision = formData.items.find(i => i.division)?.division;
                                                    if (firstDivision && inv.division !== firstDivision) return false;

                                                    return true;
                                                })}
                                                disabled={!formData.teamCategory}
                                                value={teamInventory.find(inv =>
                                                    (item.inventoryItemId && inv.inventoryItemId === item.inventoryItemId) ||
                                                    (!item.inventoryItemId && inv.productName === item.productName && inv.specification === item.specification)
                                                )?.id || ""}
                                                onChange={(id: string, selectedInventory: any) => {
                                                    const newItems = [...formData.items];
                                                    newItems[index] = {
                                                        ...newItems[index],
                                                        division: selectedInventory.division,
                                                        category: selectedInventory.category,
                                                        productName: selectedInventory.productName,
                                                        specification: selectedInventory.specification,
                                                        inventoryItemId: selectedInventory.inventoryItemId || undefined,
                                                    };

                                                    if (index === formData.items.length - 1) {
                                                        newItems.push({
                                                            id: Date.now().toString(),
                                                            division: "",
                                                            category: "",
                                                            productName: "",
                                                            specification: "",
                                                            quantity: "",
                                                            inventoryItemId: undefined,
                                                            remark: ""
                                                        });
                                                    }

                                                    setFormData({ ...formData, items: newItems });
                                                }}
                                            />
                                        </div>

                                        {/* 수량 및 비고 */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-[11px] font-semibold text-slate-500 ml-1">수량 <span className="text-red-500">*</span></Label>
                                                <Input
                                                    type="number"
                                                    value={item.quantity || ''}
                                                    onChange={(e) => {
                                                        const newItems = [...formData.items];
                                                        const val = Math.max(0, parseInt(e.target.value) || 0);
                                                        newItems[index].quantity = val.toString();
                                                        setFormData({ ...formData, items: newItems });
                                                    }}
                                                    min="0"
                                                    className="h-8 font-mono bg-white border-slate-200 focus:border-indigo-500 transition-all text-right text-xs"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[11px] font-semibold text-slate-500 ml-1">비고</Label>
                                                <Input
                                                    value={item.remark}
                                                    onChange={(e) => {
                                                        const newItems = [...formData.items];
                                                        newItems[index].remark = e.target.value;
                                                        setFormData({ ...formData, items: newItems });
                                                    }}
                                                    className="h-8 bg-white border-slate-200 focus:border-indigo-500 transition-all text-xs"
                                                    placeholder="비고 입력"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="h-px bg-slate-100" />

                        {/* 첨부파일 */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="h-4 w-1 bg-slate-400 rounded-full" />
                                <h4 className="font-bold text-[13px] text-slate-700">첨부파일</h4>
                                <span className="text-[11px] text-slate-400 font-normal ml-auto">최대 4개 / 이미지, PDF, 엑셀 지원</span>
                            </div>

                            <div className="space-y-3">
                                <div className="relative">
                                    <Input
                                        id="usage-file-upload"
                                        type="file"
                                        accept="image/*,application/pdf,.xlsx,.xls"
                                        multiple
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                    {attachments.length < 4 && (
                                        <label
                                            htmlFor="usage-file-upload"
                                            className="group flex flex-col items-center justify-center gap-2 w-full h-24 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all duration-200"
                                        >
                                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                                                <Upload className="h-4 w-4 text-slate-400 group-hover:text-indigo-600" />
                                            </div>
                                            <span className="text-xs font-medium text-slate-500 group-hover:text-indigo-600">
                                                클릭하여 파일 업로드 또는 드래그 앤 드롭 ({attachments.length}/4)
                                            </span>
                                        </label>
                                    )}
                                </div>

                                {attachments.length > 0 && (
                                    <div className="grid grid-cols-2 gap-2">
                                        {attachments.map((file, index) => (
                                            <div key={index} className="flex items-center justify-between p-2.5 bg-white border border-slate-100 rounded-lg shadow-sm hover:shadow-md transition-all">
                                                <div className="flex items-center gap-2.5 overflow-hidden">
                                                    <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 text-lg">
                                                        {file.name.endsWith('.pdf') ? '📄' :
                                                            file.name.endsWith('.xls') || file.name.endsWith('.xlsx') ? '📊' : '🖼️'}
                                                    </div>
                                                    <span className="text-xs font-medium text-slate-700 truncate block max-w-[120px]">
                                                        {file.name}
                                                    </span>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full"
                                                    onClick={() => removeAttachment(index)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-end gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="h-9 px-4 text-xs font-medium"
                    >
                        취소
                    </Button>
                    <Button
                        onClick={onSubmit}
                        disabled={isSubmitting}
                        data-testid="button-submit-usage"
                        className="h-9 px-6 bg-gradient-to-r from-indigo-600 to-slate-600 hover:from-indigo-700 hover:to-slate-700 text-white shadow-md transition-all duration-200 text-xs font-medium"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
                                처리 중...
                            </>
                        ) : (editingRecord ? "수정" : "등록")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
