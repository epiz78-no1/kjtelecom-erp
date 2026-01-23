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
import { queryClient } from "@/lib/queryClient";
import { useFileUpload } from "@/hooks/useFileUpload";

interface OutgoingDialogProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: {
        date: Date;
        division: string;
        teamCategory: string;
        projectName: string;
        recipient: string;
        attachments: { name: string; storageUrl: string; storagePath: string }[];
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
        items: [{
            id: Date.now().toString(),
            productName: "",
            specification: "",
            quantity: "",
            inventoryItemId: undefined as number | undefined,
            remark: "",
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

    // Reset form when dialog opens/closes or editing record changes
    useEffect(() => {
        if (open && editingRecord) {
            // Editing mode: Set initial data from props
            const initializeForm = (record: OutgoingRecord, attachments: any[] = []) => {
                setFormData({
                    division: record.division,
                    teamCategory: record.teamCategory || "",
                    projectName: record.projectName,
                    recipient: record.recipient,
                    items: [{
                        id: Date.now().toString(),
                        productName: record.productName,
                        specification: record.specification,
                        quantity: record.quantity.toString(),
                        inventoryItemId: record.inventoryItemId || undefined,
                        remark: record.remark || "",
                    }]
                });

                // Initialize attachments via hook
                setAttachments(attachments.map(att => ({
                    name: att.name,
                    storageUrl: att.storageUrl || "",
                    storagePath: att.storagePath || ""
                })));

                setSelectedDate(new Date(record.date));
            };

            // 1. Initial render with existing data
            let initialAttachments: any[] = [];
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
                    const fullRecord = await queryClient.fetchQuery<OutgoingRecord>({
                        queryKey: [`/api/outgoing/${editingRecord.id}`],
                        staleTime: 0
                    });

                    if (fullRecord && fullRecord.attributes) {
                        try {
                            const attrs = JSON.parse(fullRecord.attributes);
                            let loadedAttachments: any[] = [];
                            if (attrs.attachments && Array.isArray(attrs.attachments)) {
                                loadedAttachments = attrs.attachments;
                            } else if (attrs.attachment) {
                                loadedAttachments = [attrs.attachment];
                            }

                            // Update attachments in state via hook
                            if (loadedAttachments.length > 0) {
                                const formattedAttachments = loadedAttachments.map(att => ({
                                    name: att.name,
                                    storageUrl: att.storageUrl || "",
                                    storagePath: att.storagePath || ""
                                }));
                                setAttachments(formattedAttachments);
                            }
                        } catch (e) {
                            console.error("Failed to parse attributes from full record", e);
                        }
                    }
                } catch (error) {
                    console.error("Failed to fetch full outgoing record", error);
                }
            };

            fetchFullDetails();
        } else if (open) {
            // New record mode
            setFormData({
                division: "SKT",
                teamCategory: "",
                projectName: "",
                recipient: "",
                items: [{
                    id: Date.now().toString(),
                    productName: "",
                    specification: "",
                    quantity: "",
                    inventoryItemId: undefined,
                    remark: "",
                }]
            });
            clearAttachments();
            setSelectedDate(new Date());
        }
    }, [open, editingRecord]); // setAttachments and clearAttachments are stable

    const handleSubmit = () => {
        // 유효성 검사: 수령팀과 수령인 필수
        if (!formData.teamCategory) {
            toast({
                variant: "destructive",
                title: "입력 오류",
                description: "수령팀을 선택해주세요.",
            });
            return;
        }

        if (!formData.recipient) {
            toast({
                variant: "destructive",
                title: "입력 오류",
                description: "수령인을 선택해주세요.",
            });
            return;
        }

        onSubmit({
            date: selectedDate,
            ...formData,
            attachments
        });
    };



    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-[750px] p-0 overflow-hidden border-white/20 bg-background/80 backdrop-blur-xl shadow-2xl flex flex-col max-h-[90vh]">
                {/* Top Gradient Indicator */}
                <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500" />

                <div className="px-6 pt-6 pb-2">
                    <DialogHeader className="mb-4">
                        <DialogTitle className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                            출고 내역 {editingRecord ? "수정" : "등록"}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            {editingRecord ? "기존 출고 내역을 수정하여 데이터를 갱신합니다." : "새로운 자재 출고 내역을 시스템에 등록합니다."}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="px-6 pb-6 overflow-y-auto custom-scrollbar flex-1">
                    <div className="grid gap-6">

                        {/* 기본 정보 */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="h-4 w-1 bg-orange-500 rounded-full" />
                                <h4 className="font-bold text-[13px] text-slate-700">기본 정보</h4>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-1.5">
                                    <Label className="text-[12px] font-semibold text-slate-500 ml-1">출고일 <span className="text-red-500">*</span></Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    "h-9 justify-start text-left font-normal bg-slate-50/50 border-slate-200/60 hover:bg-white hover:border-orange-500/50 transition-all",
                                                    !selectedDate && "text-muted-foreground"
                                                )}
                                            >
                                                <Calendar className="mr-2 h-4 w-4 text-orange-600" />
                                                {selectedDate ? format(selectedDate, "PPP", { locale: ko }) : <span>날짜 선택</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 border-orange-100 shadow-xl" align="start">
                                            <CalendarComponent
                                                mode="single"
                                                selected={selectedDate}
                                                onSelect={(date) => date && setSelectedDate(date)}
                                                initialFocus
                                                className="p-3"
                                                classNames={{
                                                    day_selected: "bg-orange-500 text-white hover:bg-orange-600 focus:bg-orange-600",
                                                    day_today: "bg-orange-50 text-orange-600",
                                                }}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div className="grid gap-1.5">
                                    <Label className="text-[12px] font-semibold text-slate-500 ml-1">사업 <span className="text-red-500">*</span></Label>
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
                                        <SelectTrigger className="h-9 bg-slate-50/50 border-slate-200/60 focus:ring-orange-500/20 text-xs">
                                            <SelectValue placeholder="사업 선택" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Array.from(new Set(inventoryItems.map(item => item.division).filter(d => d && d.trim() !== ''))).sort().map((div) => (
                                                <SelectItem key={div} value={div} className="text-xs">
                                                    {div}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-1.5">
                                    <Label className="text-[12px] font-semibold text-slate-500 ml-1">수령팀 <span className="text-red-500">*</span></Label>
                                    <Select
                                        value={formData.teamCategory}
                                        onValueChange={(value) => {
                                            const team = teams.find((t: any) => t.name === value);
                                            setFormData({ ...formData, teamCategory: value, recipient: "" });
                                        }}
                                    >
                                        <SelectTrigger className="h-9 bg-slate-50/50 border-slate-200/60 focus:ring-orange-500/20 text-xs">
                                            <SelectValue placeholder="팀 선택" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {teams.map((team) => (
                                                <SelectItem key={team.id} value={team.name} className="text-xs">
                                                    {team.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-1.5">
                                    <Label className="text-[12px] font-semibold text-slate-500 ml-1">수령인 <span className="text-red-500">*</span></Label>
                                    <Select
                                        value={formData.recipient}
                                        onValueChange={(value) => setFormData({ ...formData, recipient: value })}
                                        disabled={!formData.teamCategory}
                                    >
                                        <SelectTrigger className="h-9 bg-slate-50/50 border-slate-200/60 focus:ring-orange-500/20 text-xs">
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

                            <div className="grid gap-1.5">
                                <Label className="text-[12px] font-semibold text-slate-500 ml-1">공사명 <span className="text-red-500">*</span></Label>
                                <Input
                                    value={formData.projectName}
                                    onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                                    placeholder="공사명 입력"
                                    className="h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white transition-all focus:border-orange-500/50"
                                />
                            </div>
                        </div>

                        <div className="h-px bg-slate-100" />

                        {/* 출고 품목 */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-1 bg-orange-500 rounded-full" />
                                    <h4 className="font-bold text-[13px] text-slate-700">출고 품목</h4>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {formData.items.map((item, index) => (
                                    <div
                                        key={item.id}
                                        className="group relative grid gap-3 p-4 rounded-xl border border-slate-200/60 bg-white/50 hover:bg-white hover:shadow-md transition-all duration-300"
                                    >
                                        {formData.items.length > 1 && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="absolute right-2 top-2 h-6 w-6 text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                                                onClick={() => {
                                                    const newItems = formData.items.filter((_, i) => i !== index);
                                                    setFormData({ ...formData, items: newItems });
                                                }}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="grid gap-1.5">
                                                <Label className="text-[11px] font-semibold text-slate-500 ml-1">품명 검색 ({index + 1}) <span className="text-red-500">*</span></Label>
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

                                                        // 마지막 항목 입력 시 자동 추가
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
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="grid gap-1.5">
                                                    <Label className="text-[11px] font-semibold text-slate-500 ml-1">수량 <span className="text-red-500">*</span></Label>
                                                    <Input
                                                        type="number"
                                                        value={item.quantity || ''}
                                                        onChange={(e) => {
                                                            const newItems = [...formData.items];
                                                            newItems[index].quantity = e.target.value;
                                                            setFormData({ ...formData, items: newItems });
                                                        }}
                                                        min="0"
                                                        placeholder="0"
                                                        className="h-9 font-mono text-right bg-slate-50/50 border-slate-200/60 focus:bg-white focus:ring-orange-500/20"
                                                    />
                                                </div>
                                                <div className="grid gap-1.5">
                                                    <Label className="text-[11px] font-semibold text-slate-500 ml-1">비고</Label>
                                                    <Input
                                                        value={item.remark}
                                                        onChange={(e) => {
                                                            const newItems = [...formData.items];
                                                            newItems[index].remark = e.target.value;
                                                            setFormData({ ...formData, items: newItems });
                                                        }}
                                                        placeholder="내용 입력"
                                                        className="h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white focus:ring-orange-500/20"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="h-px bg-slate-100" />

                        {/* 첨부파일 섹션 */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="h-4 w-1 bg-slate-400 rounded-full" />
                                <h4 className="font-bold text-[13px] text-slate-700">첨부파일</h4>
                                <span className="text-[11px] text-slate-400 font-normal ml-auto">최대 4개 / 이미지, PDF, 엑셀 지원</span>
                            </div>

                            <div className="space-y-3">
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
                                        className="group flex flex-col items-center justify-center gap-2 w-full h-24 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-orange-400 hover:bg-orange-50/30 transition-all duration-200"
                                    >
                                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                                            <Upload className="h-4 w-4 text-slate-400 group-hover:text-orange-600" />
                                        </div>
                                        <span className="text-xs font-medium text-slate-500 group-hover:text-orange-600">
                                            클릭하여 파일 업로드 또는 드래그 앤 드롭
                                        </span>
                                    </label>
                                )}

                                {attachments.length > 0 && (
                                    <div className="grid grid-cols-2 gap-2">
                                        {attachments.map((file, index) => (
                                            <div key={index} className="flex items-center justify-between p-2.5 bg-white border border-slate-100 rounded-lg shadow-sm hover:shadow-md transition-all">
                                                <div className="flex items-center gap-2.5 overflow-hidden">
                                                    <div className="h-8 w-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0 text-lg">
                                                        {file.name.endsWith('.pdf') ? '📄' :
                                                            file.name.endsWith('.xls') || file.name.endsWith('.xlsx') ? '📊' : '🖼️'}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-xs font-medium text-slate-700 truncate block max-w-[120px]">
                                                            {file.name}
                                                        </span>
                                                        <span className="text-[10px] text-orange-600">업로드 완료</span>
                                                    </div>
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

                <DialogFooter className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between gap-2">
                    <Button variant="ghost" className="h-9 text-slate-500 hover:text-slate-900" onClick={onClose}>
                        취소
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        className="h-9 px-6 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-md shadow-orange-200"
                    >
                        <Check className="h-3.5 w-3.5 mr-2" />
                        {editingRecord ? "출고 수정 완료" : "출고 등록 완료"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
