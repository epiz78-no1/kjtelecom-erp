
import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Loader2, Check, ChevronsUpDown, CalendarIcon, Upload, Trash2 } from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/contexts/AppContext";
import type { OpticalCable, OpticalCableLog } from "@shared/schema";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { useFileUpload } from "@/hooks/useFileUpload";

interface Props {
    trigger?: React.ReactNode;
    initialCableId?: string | null;
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export default function OpticalAssignmentDialog({ trigger, initialCableId, isOpen: controlledOpen, onOpenChange: controlledOnOpenChange }: Props) {
    const [internalOpen, setInternalOpen] = useState(false);
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { teams } = useAppContext();

    // Use controlled state if provided, otherwise use internal state
    const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
    const setOpen = controlledOnOpenChange || setInternalOpen;

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

    const [formData, setFormData] = useState({
        cableId: initialCableId || "",
        teamId: "",
        recipient: "",
        projectCode: "",
        projectNameUsage: "",
        usageDate: new Date().toISOString().split("T")[0],
        remark: "",
    });

    const [openCombobox, setOpenCombobox] = useState(false);

    const { data: cables = [] } = useQuery<(OpticalCable & { logs: OpticalCableLog[] })[]>({
        queryKey: ["/api/optical-cables"],
    });

    const { data: members = [], refetch: refetchMembers } = useQuery<any[]>({
        queryKey: ["/api/members/basic"],
        enabled: open,
        retry: false,
    });

    const availableCables = cables.filter(c => c.status === 'in_stock' && c.remainingLength > 0);
    const selectedCable = availableCables.find(c => c.id.toString() === formData.cableId);
    const teamMembers = members.filter((m: any) => m.teamId === formData.teamId);

    useEffect(() => {
        if (open) {
            // useQuery with enabled:open already fetches members when dialog opens
            // No need to manually refetch
            if (initialCableId) {
                setFormData(prev => ({ ...prev, cableId: initialCableId }));
            }
            // Don't clear attachments here - it will clear files when user changes other fields!
            // Attachments are cleared in onSuccess callback after successful submission
        }
    }, [open, initialCableId]); // Removed clearAttachments from dependencies

    const mutation = useMutation({
        mutationFn: async () => {
            return apiRequest(
                "POST",
                `/api/optical-cables/${formData.cableId}/log`,
                {
                    cableId: formData.cableId,
                    logType: "assign",
                    teamId: formData.teamId,
                    usageDate: formData.usageDate,
                    projectCode: formData.projectCode,
                    projectNameUsage: formData.projectNameUsage,
                    workerName: formData.recipient,
                    attributes: JSON.stringify({
                        recipient: formData.recipient,
                        remark: formData.remark || undefined,
                        // New attachment structure
                        attachments: attachments,
                        // For legacy compatibility, maybe include single 'attachment' if needed, but 'attachments' array is preferred now
                        attachment: attachments.length > 0 ? attachments[0] : undefined
                    }),
                }
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables"] });
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables/logs"] });
            if (formData.cableId) {
                queryClient.invalidateQueries({ queryKey: [`/api/optical-cables/${formData.cableId}`] });
                queryClient.invalidateQueries({ queryKey: [`/api/optical-cables/${formData.cableId}/logs`] });
            }
            toast({
                title: "출고 등록 완료",
                description: "광케이블이 성공적으로 출고되었습니다.",
            });
            setOpen(false);
            setFormData({
                cableId: "",
                teamId: "",
                recipient: "",
                projectCode: "",
                projectNameUsage: "",
                usageDate: new Date().toISOString().split("T")[0],
                remark: "",
            });
            clearAttachments();
        },
        onError: (error: Error) => {
            toast({
                variant: "destructive",
                title: "출고 등록 실패",
                description: error.message || "출고 등록 중 오류가 발생했습니다.",
            });
        },
    });

    const handleSubmit = () => {
        // ... validation checks ...
        if (!formData.cableId) {
            toast({ title: "제조번호를 선택해주세요", variant: "destructive" });
            return;
        }
        if (!formData.teamId) {
            toast({ title: "수령 팀을 선택해주세요", variant: "destructive" });
            return;
        }
        if (!formData.recipient) {
            toast({ title: "수령자를 선택해주세요", variant: "destructive" });
            return;
        }
        if (!formData.projectCode) {
            toast({ title: "공사번호를 입력해주세요", variant: "destructive" });
            return;
        }
        if (!formData.projectNameUsage) {
            toast({ title: "공사명을 입력해주세요", variant: "destructive" });
            return;
        }

        mutation.mutate();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {trigger && (
                <DialogTrigger asChild>
                    {trigger}
                </DialogTrigger>
            )}
            <DialogContent className="max-w-[750px] p-0 overflow-hidden border-white/20 bg-background/80 backdrop-blur-xl shadow-2xl">
                {/* Top Gradient Indicator */}
                <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />

                <div className="px-6 pt-6 pb-2">
                    <DialogHeader className="mb-4">
                        <DialogTitle className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                            신규 출고 등록 (팀 할당)
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            광케이블 드럼을 특정 팀에게 할당하여 불출 처리합니다.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="px-6 pb-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    <div className="grid gap-6">

                        {/* 기본 정보 */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="h-4 w-1 bg-blue-500 rounded-full" />
                                <h4 className="font-bold text-[13px] text-slate-700">출고 기본 정보</h4>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[12px] font-semibold text-slate-500 ml-1">출고 일자</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full justify-start text-left font-normal h-9 bg-slate-50/50 border-slate-200/60 hover:bg-white hover:border-blue-500/50 transition-all",
                                                    !formData.usageDate && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4 text-blue-600" />
                                                {formData.usageDate ? (
                                                    format(new Date(formData.usageDate), "yyyy-MM-dd")
                                                ) : (
                                                    <span>날짜 선택</span>
                                                )}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 border-blue-100 shadow-xl" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={formData.usageDate ? new Date(formData.usageDate) : undefined}
                                                onSelect={(date) => setFormData({ ...formData, usageDate: date ? format(date, "yyyy-MM-dd") : "" })}
                                                initialFocus
                                                className="p-3"
                                                classNames={{
                                                    day_selected: "bg-blue-500 text-white hover:bg-blue-600 focus:bg-blue-600",
                                                    day_today: "bg-blue-50 text-blue-600",
                                                }}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-[12px] font-semibold text-slate-500 ml-1">수령 팀</Label>
                                    <Select
                                        value={formData.teamId}
                                        onValueChange={(value) => setFormData({ ...formData, teamId: value, recipient: "" })}
                                    >
                                        <SelectTrigger className="h-9 bg-slate-50/50 border-slate-200/60 focus:ring-blue-500/20 text-xs">
                                            <SelectValue placeholder="팀 선택" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {teams.map((team) => (
                                                <SelectItem key={team.id} value={team.id} className="text-xs">
                                                    {team.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-[12px] font-semibold text-slate-500 ml-1">수령자</Label>
                                    <Select
                                        value={formData.recipient}
                                        onValueChange={(value) => setFormData({ ...formData, recipient: value })}
                                        disabled={!formData.teamId}
                                    >
                                        <SelectTrigger className="h-9 bg-slate-50/50 border-slate-200/60 focus:ring-blue-500/20 text-xs">
                                            <SelectValue placeholder="수령자 선택" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {teamMembers.map((member: any) => (
                                                <SelectItem key={member.id} value={member.name} className="text-xs">
                                                    {member.name} ({member.username})
                                                </SelectItem>
                                            ))}
                                            {teamMembers.length === 0 && (
                                                <SelectItem value="none" disabled className="text-xs">팀원 없음</SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-slate-100" />

                        {/* 케이블 정보 */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="h-4 w-1 bg-indigo-500 rounded-full" />
                                <h4 className="font-bold text-[13px] text-slate-700">불출 대상 및 공사</h4>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[12px] font-semibold text-slate-500 ml-1">제조번호 (Drum No)</Label>
                                    <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={openCombobox}
                                                disabled={!!initialCableId}
                                                className={cn(
                                                    "w-full justify-between h-9 bg-slate-50/50 border-slate-200/60 hover:bg-white hover:border-indigo-500/50 transition-all text-xs",
                                                    !formData.cableId && "text-muted-foreground",
                                                    "disabled:opacity-80 disabled:cursor-not-allowed"
                                                )}
                                            >
                                                {selectedCable
                                                    ? `${selectedCable.division ? `[${selectedCable.division}] ` : ""}${selectedCable.drumNo}`
                                                    : "제조번호 선택"}
                                                {!initialCableId && <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />}
                                            </Button>
                                        </PopoverTrigger>
                                        {!initialCableId && (
                                            <PopoverContent className="w-[400px] p-0 border-indigo-100 shadow-xl">
                                                <Command>
                                                    <CommandInput placeholder="제조번호 검색..." className="h-9" />
                                                    <CommandList>
                                                        <CommandEmpty>가용 드럼이 없습니다.</CommandEmpty>
                                                        <CommandGroup heading="보유 재고">
                                                            {availableCables.map((cable) => (
                                                                <CommandItem
                                                                    value={cable.drumNo}
                                                                    key={cable.id}
                                                                    onSelect={() => {
                                                                        setFormData({ ...formData, cableId: cable.id.toString() });
                                                                        setOpenCombobox(false);
                                                                    }}
                                                                    className="text-xs"
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            "mr-2 h-3 w-3 text-indigo-500",
                                                                            cable.id.toString() === formData.cableId
                                                                                ? "opacity-100"
                                                                                : "opacity-0"
                                                                        )}
                                                                    />
                                                                    {cable.division ? `[${cable.division}] ` : ""}{cable.drumNo} | {cable.productName} | {cable.remainingLength}m
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        )}
                                    </Popover>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-[12px] font-semibold text-slate-500 ml-1">공사번호</Label>
                                    <Input
                                        value={formData.projectCode}
                                        onChange={(e) => setFormData({ ...formData, projectCode: e.target.value })}
                                        className="h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white transition-all focus:border-indigo-500/50"
                                        placeholder="공사번호 입력"
                                    />
                                </div>
                            </div>

                            {/* 선택된 드럼 정보 카드 */}
                            {selectedCable && (
                                <div className="text-xs text-indigo-700 font-medium p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                                    선택됨: {selectedCable.drumNo} ({selectedCable.productName} / 잔량 {selectedCable.remainingLength.toLocaleString()}m)
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[12px] font-semibold text-slate-500 ml-1">공사명</Label>
                                    <Input
                                        value={formData.projectNameUsage}
                                        onChange={(e) => setFormData({ ...formData, projectNameUsage: e.target.value })}
                                        className="h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white transition-all focus:border-indigo-500/50"
                                        placeholder="공사명 입력"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[12px] font-semibold text-slate-500 ml-1">비고 (선택)</Label>
                                    <Input
                                        value={formData.remark}
                                        onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                                        className="h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white transition-all focus:border-indigo-500/50"
                                        placeholder="비고 입력"
                                    />
                                </div>
                            </div>
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
                                <input
                                    type="file"
                                    id="optical-file-upload"
                                    className="hidden"
                                    multiple
                                    onChange={handleFileChange}
                                    disabled={isUploading || attachments.length >= 4}
                                />
                                {attachments.length < 4 && (
                                    <label
                                        htmlFor="optical-file-upload"
                                        className={cn(
                                            "group flex flex-col items-center justify-center gap-2 w-full h-24 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all duration-200",
                                            isUploading && "opacity-50 cursor-wait"
                                        )}
                                    >
                                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                                            <Upload className="h-4 w-4 text-slate-400 group-hover:text-blue-600" />
                                        </div>
                                        <span className="text-xs font-medium text-slate-500 group-hover:text-blue-600">
                                            {isUploading ? "업로드 중..." : "클릭하여 파일 업로드 또는 드래그 앤 드롭"}
                                        </span>
                                    </label>
                                )}

                                {attachments.length > 0 && (
                                    <div className="grid grid-cols-2 gap-2">
                                        {attachments.map((file, index) => (
                                            <div key={index} className="flex items-center justify-between p-2.5 bg-white border border-slate-100 rounded-lg shadow-sm hover:shadow-md transition-all">
                                                <div className="flex items-center gap-2.5 overflow-hidden">
                                                    <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 text-lg">
                                                        {file.name.endsWith('.pdf') ? '📄' :
                                                            file.name.endsWith('.xls') || file.name.endsWith('.xlsx') ? '📊' : '🖼️'}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        {file.storageUrl ? (
                                                            <a href={file.storageUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-slate-700 truncate block max-w-[120px] hover:text-blue-600 hover:underline">
                                                                {file.name}
                                                            </a>
                                                        ) : (
                                                            <span className="text-xs font-medium text-slate-700 truncate block max-w-[120px]">
                                                                {file.name}
                                                            </span>
                                                        )}
                                                        <span className="text-[10px] text-blue-600">업로드 완료</span>
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
                    <Button variant="ghost" className="h-9 text-slate-500 hover:text-slate-900" onClick={() => setOpen(false)}>
                        취소
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={mutation.isPending || isUploading}
                        className="h-9 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-200"
                    >
                        {mutation.isPending && (
                            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        )}
                        <Check className="h-3.5 w-3.5 mr-2" />
                        출고 등록 완료
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
