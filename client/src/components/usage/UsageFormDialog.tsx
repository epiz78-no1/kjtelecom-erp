import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { Calendar, Loader2, Trash2, Upload } from "lucide-react";
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
import { useFileUpload } from "@/hooks/useFileUpload";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { MaterialUsageRecord } from "@shared/schema";

interface UsageFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingRecord: MaterialUsageRecord | null;
    teams: any[];
    members: any[];
    getTeamInventory: (teamCategory: string) => any[];
    canManage: boolean;
    defaultDivision?: string;
    defaultTeam?: string;
    defaultRecipient?: string;
}

export function UsageFormDialog({
    open,
    onOpenChange,
    editingRecord,
    teams,
    members,
    getTeamInventory,
    canManage,
    defaultDivision = "SKT",
    defaultTeam = "",
    defaultRecipient = "",
}: UsageFormDialogProps) {
    const { toast } = useToast();
    const {
        attachments,
        setAttachments,
        handleFileChange,
        removeAttachment,
        clearAttachments
    } = useFileUpload();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState(() => {
        if (editingRecord) {
            const teamName = (editingRecord.teamCategory || "").trim();
            const foundTeam = teams.find(t => t.id === editingRecord.teamId || t.name === teamName);
            return {
                teamCategory: foundTeam ? foundTeam.name : teamName,
                teamId: foundTeam ? foundTeam.id : (editingRecord.teamId || undefined),
                projectName: editingRecord.projectName || "",
                recipient: editingRecord.recipient || "",
                items: [{
                    id: Date.now().toString(),
                    division: editingRecord.division,
                    category: editingRecord.category || "",
                    productName: editingRecord.productName,
                    specification: editingRecord.specification,
                    quantity: editingRecord.quantity.toString(),
                    inventoryItemId: editingRecord.inventoryItemId || undefined,
                    remark: editingRecord.remark || ""
                }]
            };
        }
        return {
            teamCategory: defaultTeam,
            teamId: undefined,
            projectName: "",
            recipient: defaultRecipient,
            items: [{
                id: Date.now().toString(),
                division: defaultDivision,
                category: "",
                productName: "",
                specification: "",
                quantity: "",
                inventoryItemId: undefined,
                remark: ""
            }]
        };
    });

    const [selectedDate, setSelectedDate] = useState<Date | undefined>(() =>
        editingRecord ? new Date(editingRecord.date) : new Date()
    );

    const lastItemRef = useRef<HTMLDivElement>(null);

    // 아이템 추가 시 자동 스크롤
    useEffect(() => {
        if (formData.items && formData.items.length > 1) {
            setTimeout(() => {
                lastItemRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }, 100);
        }
    }, [formData.items?.length]);

    // 첨부파일 로드 (수정 모드일 때만)
    useEffect(() => {
        if (editingRecord) {
            (async () => {
                try {
                    const fullRecord = await queryClient.fetchQuery<MaterialUsageRecord>({
                        queryKey: [`/api/material-usage/${editingRecord.id}`],
                        staleTime: 0
                    });

                    // 상세 데이터로 폼 업데이트 (백엔드 목록 조회 이슈 우회)
                    if (fullRecord) {
                        const teamName = (fullRecord.teamCategory || "").trim();
                        const foundTeam = teams.find(t => t.id === fullRecord.teamId || t.name === teamName);

                        setFormData(prev => ({
                            ...prev,
                            teamCategory: foundTeam ? foundTeam.name : teamName,
                            teamId: foundTeam ? foundTeam.id : (fullRecord.teamId || undefined),
                            projectName: fullRecord.projectName || "",
                            recipient: fullRecord.recipient || "",
                            items: [{
                                id: Date.now().toString(),
                                division: fullRecord.division,
                                category: fullRecord.category || "",
                                productName: fullRecord.productName,
                                specification: fullRecord.specification,
                                quantity: fullRecord.quantity.toString(),
                                inventoryItemId: fullRecord.inventoryItemId || undefined,
                                remark: fullRecord.remark || ""
                            }]
                        }));
                        setSelectedDate(new Date(fullRecord.date));
                    }

                    if (fullRecord?.attributes) {
                        let attrs: any = {};
                        if (typeof fullRecord.attributes === 'string') {
                            attrs = JSON.parse(fullRecord.attributes);
                        } else {
                            attrs = fullRecord.attributes;
                        }

                        if (attrs.attachments && Array.isArray(attrs.attachments)) {
                            const formattedAttachments = attrs.attachments.map((att: any) => ({
                                name: att.name,
                                storageUrl: att.storageUrl || "",
                                storagePath: att.storagePath || ""
                            }));
                            setAttachments(formattedAttachments);
                        } else if (attrs.attachment) {
                            setAttachments([{
                                name: attrs.attachment.name,
                                storageUrl: attrs.attachment.storageUrl || "",
                                storagePath: attrs.attachment.storagePath || ""
                            }]);
                        }
                    }
                } catch (e) {
                    console.error("Failed to fetch full record details", e);
                }
            })();
        }
    }, [editingRecord, teams]); // editingRecord 변경 시 실행 (key 변경으로 인해 마운트 시 1회 실행)

    const handleSubmit = async () => {
        if (!selectedDate || !formData.teamCategory || !formData.recipient) {
            toast({ title: "필수 항목 누락", description: "날짜, 팀, 사용자는 필수입니다.", variant: "destructive" });
            return;
        }

        const validItems = formData.items.filter(item => item.inventoryItemId && item.quantity);

        if (validItems.length === 0) {
            toast({ title: "품목 누락", description: "최소 하나의 유효한 품목(자재 및 수량)을 입력해주세요.", variant: "destructive" });
            return;
        }

        const divisions = new Set(validItems.map(item => item.division));
        if (divisions.size > 1) {
            toast({
                title: "등록 불가",
                description: "한 번의 등록에 SKT와 SKB 자재를 혼합할 수 없습니다. 공사별로 구분하여 등록해주세요.",
                variant: "destructive"
            });
            return;
        }

        setIsSubmitting(true);

        try {
            if (editingRecord) {
                // 수정 모드
                const item = validItems[0];
                const attributesObj: any = {};

                if (attachments && attachments.length > 0) {
                    attributesObj.attachments = attachments;
                    attributesObj.attachment = attachments[0];
                }

                const data = {
                    date: format(selectedDate, "yyyy-MM-dd"),
                    division: item.division || "SKT",
                    category: (item.category || "").trim(),
                    teamCategory: formData.teamCategory.trim(),
                    teamId: formData.teamId,
                    projectName: (formData.projectName || "").trim(),
                    productName: item.productName.trim(),
                    specification: (item.specification || "").trim(),
                    quantity: parseInt(item.quantity) || 0,
                    recipient: formData.recipient.trim(),
                    type: "general",
                    attributes: JSON.stringify(attributesObj),
                    remark: (item.remark || "").trim(),
                    inventoryItemId: item.inventoryItemId
                };

                toast({ title: "수정중입니다", description: "잠시만 기다려주세요." });
                await apiRequest("PATCH", `/api/material-usage/${editingRecord.id}`, data);

                queryClient.invalidateQueries({ queryKey: ["/api/material-usage"] });
                queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
                toast({ title: "사용 내역이 수정되었습니다" });
                onOpenChange(false);
            } else {
                // 등록 모드
                toast({ title: "등록중입니다", description: `${validItems.length}건의 자재 사용 등록을 진행합니다.` });

                let successCount = 0;

                for (let i = 0; i < validItems.length; i++) {
                    const item = validItems[i];
                    const attributesObj: any = {};

                    if (i === 0 && attachments && attachments.length > 0) {
                        attributesObj.attachments = attachments;
                        attributesObj.attachment = attachments[0];
                    }

                    const data = {
                        date: format(selectedDate, "yyyy-MM-dd"),
                        division: item.division || "SKT",
                        category: (item.category || "").trim(),
                        teamCategory: formData.teamCategory.trim(),
                        teamId: formData.teamId,
                        projectName: (formData.projectName || "").trim(),
                        productName: item.productName.trim(),
                        specification: (item.specification || "").trim(),
                        quantity: parseInt(item.quantity) || 0,
                        recipient: formData.recipient.trim(),
                        type: "general",
                        attributes: JSON.stringify(attributesObj),
                        remark: (item.remark || "").trim(),
                        inventoryItemId: item.inventoryItemId
                    };

                    await apiRequest("POST", "/api/material-usage", data);
                    successCount++;
                }

                queryClient.invalidateQueries({ queryKey: ["/api/material-usage"] });
                queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
                queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
                toast({ title: "등록 완료", description: `${successCount}건의 사용 내역이 저장되었습니다.` });
                onOpenChange(false);
            }
        } catch (error: any) {
            toast({
                title: editingRecord ? "수정 실패" : "등록 실패",
                description: error.message || "오류가 발생했습니다",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{editingRecord ? "사용 내역 수정" : "사용 내역 등록"}</DialogTitle>
                    <DialogDescription>
                        {editingRecord ? "자재 사용 내역을 수정합니다." : "새로운 자재 사용 내역을 등록합니다."}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="grid gap-2">
                            <Label>사용일 *</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="justify-start text-left font-normal px-3"
                                        data-testid="button-usage-date"
                                    >
                                        <Calendar className="mr-2 h-4 w-4" />
                                        {selectedDate ? format(selectedDate, "yyyy-MM-dd") : "날짜 선택"}
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

                        <div className={`grid gap-2 ${formData.teamCategory ? 'hidden md:grid' : ''}`}>
                            <Label>사용팀 *</Label>
                            <Select
                                value={formData.teamCategory}
                                onValueChange={(value) => {
                                    const team = teams.find((t: any) => t.name === value);
                                    setFormData({ ...formData, teamCategory: value, teamId: team?.id, recipient: "" });
                                }}
                                disabled={!canManage}
                            >
                                <SelectTrigger data-testid="select-usage-team">
                                    <SelectValue placeholder="팀 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    {teams.map((t) => (
                                        <SelectItem key={t.id} value={t.name}>
                                            {t.name}
                                        </SelectItem>
                                    ))}
                                    {formData.teamCategory && !teams.some(t => t.name === formData.teamCategory) && (
                                        <SelectItem key="custom-team" value={formData.teamCategory}>
                                            {formData.teamCategory}
                                        </SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label>사용자 *</Label>
                            <Select
                                value={formData.recipient}
                                onValueChange={(value) => setFormData({ ...formData, recipient: value })}
                                disabled={!formData.teamCategory || !canManage}
                            >
                                <SelectTrigger data-testid="select-usage-recipient">
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
                                            <SelectItem key={member.id} value={member.name}>
                                                {member.name} ({member.username})
                                            </SelectItem>
                                        ))}
                                    {formData.recipient && !members.some((m: any) => m.name === formData.recipient) && (
                                        <SelectItem key="custom-recipient" value={formData.recipient}>
                                            {formData.recipient}
                                        </SelectItem>
                                    )}
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
                        <Label>공사명</Label>
                        <Input
                            value={formData.projectName}
                            onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                            placeholder="예: 효자동 2가 함체교체"
                            data-testid="input-usage-project"
                        />
                    </div>

                    <div className="space-y-4">
                        <Label>사용 자재 목록</Label>
                        {formData.items.map((item, index) => (
                            <div
                                key={item.id}
                                ref={index === formData.items.length - 1 ? lastItemRef : null}
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
                                    <Label className="text-xs text-muted-foreground">보유 자재 선택 ({index + 1})</Label>
                                    <Select
                                        disabled={!formData.teamCategory}
                                        value={getTeamInventory(formData.teamCategory).find((inv: any) =>
                                            (item.inventoryItemId && inv.inventoryItemId === item.inventoryItemId) ||
                                            (!item.inventoryItemId && inv.productName === item.productName && inv.specification === item.specification)
                                        )?.id?.toString() || ""}
                                        onValueChange={(key) => {
                                            const selectedInventory = getTeamInventory(formData.teamCategory).find((i: any) => i.id.toString() === key);
                                            if (selectedInventory) {
                                                const newItems = [...formData.items];
                                                newItems[index] = {
                                                    ...newItems[index],
                                                    division: selectedInventory.division,
                                                    category: selectedInventory.category,
                                                    productName: selectedInventory.productName,
                                                    specification: selectedInventory.specification,
                                                    inventoryItemId: selectedInventory.inventoryItemId,
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
                                            }
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={formData.teamCategory ? "자재를 선택하세요" : "팀을 먼저 선택하세요"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(() => {
                                                const firstDivision = formData.items.find(i => i.division)?.division;

                                                return getTeamInventory(formData.teamCategory)
                                                    .filter((inv: any) => {
                                                        const isAlreadySelected = formData.items.some((existingItem, i) =>
                                                            i !== index && existingItem.inventoryItemId === inv.inventoryItemId
                                                        );
                                                        if (isAlreadySelected) return false;

                                                        if (firstDivision && inv.division !== firstDivision) return false;

                                                        return true;
                                                    })
                                                    .map((inv: any) => (
                                                        <SelectItem key={inv.id} value={inv.id.toString()}>
                                                            [{inv.division}] {inv.productName} ({inv.specification}) - 잔여: {inv.remaining.toLocaleString()}
                                                        </SelectItem>
                                                    ));
                                            })()}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label className="text-xs text-muted-foreground">수량 *</Label>
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
                            </div>
                        ))}
                    </div>

                    {/* 첨부파일 */}
                    <div className="grid grid-cols-4 items-start gap-4">
                        <Label className="text-right pt-2">첨부파일</Label>
                        <div className="col-span-3">
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
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        취소
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        data-testid="button-submit-usage"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                처리 중...
                            </>
                        ) : (editingRecord ? "수정" : "등록")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
