
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, Loader2, Upload, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { OpticalCableLog } from "@shared/schema";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useAppContext } from "@/contexts/AppContext";
import { useQuery } from "@tanstack/react-query";

const formSchema = z.object({
    projectCode: z.string().optional(),
    projectNameUsage: z.string().optional(),
    usageDate: z.string(),
    remark: z.string().optional(),
    teamId: z.string().optional(),
    workerName: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    log: (OpticalCableLog & { cable?: any }) | null;
    onSubmit: (id: string, data: any) => Promise<void>;
}

export function OpticalLogEditDialog({ open, onOpenChange, log, onSubmit }: Props) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { teams } = useAppContext();

    // Hook integration for attachments (matching Registration "Pro Max" style - max 4 files)
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

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            projectCode: "",
            projectNameUsage: "",
            usageDate: format(new Date(), "yyyy-MM-dd"),
            remark: "",
            teamId: "",
            workerName: "",
        },
    });

    // Watch teamId to filter members
    const selectedTeamId = form.watch("teamId");

    const { data: members = [] } = useQuery<any[]>({
        queryKey: ["/api/members/basic"],
        enabled: open,
        retry: false,
    });

    // Filter members based on selected team
    const teamMembers = members.filter((m: any) => m.teamId === selectedTeamId);

    useEffect(() => {
        if (log && open) {
            let remark = "";
            let recipient = log.workerName || "";

            try {
                const attrs = JSON.parse(log.attributes || "{}");
                remark = attrs.remark || "";
                if (!recipient && attrs.recipient) recipient = attrs.recipient; // Fallback to attribute if column empty

                // Handle attachment loading
                if (attrs.attachments && Array.isArray(attrs.attachments) && attrs.attachments.length > 0) {
                    setAttachments(attrs.attachments);
                } else if (attrs.attachment) {
                    setAttachments([attrs.attachment]);
                } else {
                    setAttachments([]);
                }
            } catch {
                setAttachments([]);
            }

            form.reset({
                projectCode: log.projectCode || "",
                projectNameUsage: log.projectNameUsage || "",
                usageDate: log.usageDate,
                remark,
                teamId: log.teamId || "",
                workerName: recipient,
            });
        }
    }, [log, open, setAttachments, form]);

    const handleSubmit = async (values: FormValues) => {
        if (!log) return;
        setIsSubmitting(true);
        try {
            // Prepare attributes with remark
            let attributes: any = {};
            try {
                attributes = JSON.parse(log.attributes || "{}");
            } catch { }

            // Construct new attributes
            const newAttributes = {
                ...attributes,
                remark: values.remark,
                recipient: values.workerName, // Ensure recipient is synced in attributes too
                attachments: attachments, // Save all attachments
                attachment: attachments.length > 0 ? attachments[0] : null, // Legacy support
            };

            const payload = {
                ...values,
                attributes: JSON.stringify(newAttributes),
                // Explicitly update these columns
                workerName: values.workerName,
                teamId: values.teamId,
            };

            await onSubmit(log.id, payload);
            clearAttachments();
            onOpenChange(false);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[750px] p-0 overflow-hidden border-white/20 bg-background/80 backdrop-blur-xl shadow-2xl flex flex-col max-h-[90vh]">
                {/* Top Gradient Indicator */}
                <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-500 shrink-0" />

                <div className="px-6 pt-6 pb-2 shrink-0">
                    <DialogHeader className="mb-4">
                        <DialogTitle className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent flex items-center gap-2">
                            <span className="flex h-2 w-2 rounded-full bg-indigo-500" />
                            내역 수정
                        </DialogTitle>
                    </DialogHeader>
                </div>

                <div className="px-6 pb-6 overflow-y-auto custom-scrollbar flex-1">
                    <Form {...form}>
                        <form id="optical-edit-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">

                            {/* Basic Info Section */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="h-4 w-1 bg-indigo-500 rounded-full" />
                                    <h4 className="font-bold text-[13px] text-slate-700">기본 정보</h4>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="usageDate"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col space-y-1.5">
                                                <FormLabel className="text-[12px] font-semibold text-slate-500 ml-1">일자</FormLabel>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <FormControl>
                                                            <Button
                                                                variant={"outline"}
                                                                className={cn(
                                                                    "w-full pl-3 text-left font-normal h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white transition-all",
                                                                    !field.value && "text-muted-foreground"
                                                                )}
                                                            >
                                                                {field.value ? (
                                                                    format(new Date(field.value), "yyyy-MM-dd")
                                                                ) : (
                                                                    <span>날짜 선택</span>
                                                                )}
                                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                            </Button>
                                                        </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0" align="start">
                                                        <Calendar
                                                            mode="single"
                                                            selected={field.value ? new Date(field.value) : undefined}
                                                            onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                                                            initialFocus
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="teamId"
                                        render={({ field }) => (
                                            <FormItem className="space-y-1.5">
                                                <FormLabel className="text-[12px] font-semibold text-slate-500 ml-1">수령 팀</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white transition-all text-xs">
                                                            <SelectValue placeholder="팀 선택" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {teams.map((team) => (
                                                            <SelectItem key={team.id} value={team.id} className="text-xs">
                                                                {team.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="workerName"
                                        render={({ field }) => (
                                            <FormItem className="space-y-1.5">
                                                <FormLabel className="text-[12px] font-semibold text-slate-500 ml-1">수령자</FormLabel>
                                                <Select
                                                    onValueChange={field.onChange}
                                                    value={field.value || ""}
                                                    disabled={!selectedTeamId}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger className="h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white transition-all text-xs">
                                                            <SelectValue placeholder="수령자 선택" />
                                                        </SelectTrigger>
                                                    </FormControl>
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
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="h-px bg-slate-100" />

                            {/* Cable & Project Info Section */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="h-4 w-1 bg-purple-500 rounded-full" />
                                    <h4 className="font-bold text-[13px] text-slate-700">불출 대상 및 공사</h4>
                                </div>

                                {/* Drum No - Read Only */}
                                <div className="space-y-1.5">
                                    <FormLabel className="text-[12px] font-semibold text-slate-500 ml-1">제조번호 (Drum No)</FormLabel>
                                    <div className="h-9 px-3 py-2 bg-slate-100 border border-slate-200/60 rounded-md text-sm text-slate-600 flex items-center">
                                        {log?.cable?.drumNo || "-"}
                                    </div>
                                </div>

                                {/* Selected Cable Info Card */}
                                {log?.cable && (
                                    <div className="text-xs text-indigo-700 font-medium p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                                        선택됨: {log.cable.drumNo} ({log.cable.productName} / 잔량 {log.cable.remainingLength?.toLocaleString() || 0}m)
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="projectCode"
                                        render={({ field }) => (
                                            <FormItem className="space-y-1.5">
                                                <FormLabel className="text-[12px] font-semibold text-slate-500 ml-1">공사번호</FormLabel>
                                                <FormControl>
                                                    <Input {...field} className="h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white transition-all" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="projectNameUsage"
                                        render={({ field }) => (
                                            <FormItem className="space-y-1.5">
                                                <FormLabel className="text-[12px] font-semibold text-slate-500 ml-1">공사명</FormLabel>
                                                <FormControl>
                                                    <Input {...field} className="h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white transition-all" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="remark"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1.5">
                                            <FormLabel className="text-[12px] font-semibold text-slate-500 ml-1">비고 (선택)</FormLabel>
                                            <FormControl>
                                                <Input {...field} className="h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white transition-all" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="h-px bg-slate-100" />

                            {/* Attachments Section */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="h-4 w-1 bg-slate-400 rounded-full" />
                                    <h4 className="font-bold text-[13px] text-slate-700">첨부파일</h4>
                                    <span className="text-[11px] text-slate-400 font-normal ml-auto">최대 4개 / 이미지, PDF, 엑셀 지원</span>
                                </div>

                                <div className="space-y-2">
                                    <div className="relative">
                                        <Input
                                            type="file"
                                            className="hidden"
                                            id="edit-file-upload"
                                            multiple
                                            onChange={handleFileChange}
                                            disabled={isUploading || attachments.length >= 4}
                                        />
                                        {attachments.length < 4 && (
                                            <label
                                                htmlFor="edit-file-upload"
                                                className={cn(
                                                    "flex items-center justify-center gap-2 w-full px-4 py-6 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group",
                                                    isUploading && "opacity-50 cursor-wait"
                                                )}
                                            >
                                                <div className="h-10 w-10 rounded-full bg-slate-100 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
                                                    <Upload className="h-5 w-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                                                </div>
                                                <div className="flex flex-col items-start gap-0.5">
                                                    <span className="text-sm font-bold text-slate-600 group-hover:text-indigo-700 transition-colors">
                                                        {isUploading ? "업로드 중..." : "클릭하여 파일 업로드"}
                                                    </span>
                                                    <span className="text-xs text-slate-400">드래그 앤 드롭 또는 클릭</span>
                                                </div>
                                            </label>
                                        )}
                                    </div>

                                    {attachments.length > 0 && (
                                        <div className="grid grid-cols-1 gap-2">
                                            {attachments.map((file, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-200 shadow-sm rounded-xl">
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                                                            <span className="text-xs">
                                                                {file.name.endsWith('.pdf') ? '📄' :
                                                                    file.name.endsWith('.xls') || file.name.endsWith('.xlsx') ? '📊' : '🖼️'}
                                                            </span>
                                                        </div>
                                                        <a
                                                            href={file.storageUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-sm font-medium text-slate-700 hover:text-indigo-600 hover:underline truncate"
                                                        >
                                                            {file.name}
                                                        </a>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 ml-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full"
                                                        onClick={() => removeAttachment(idx)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </form>
                    </Form>
                </div>

                <DialogFooter className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between sm:justify-between gap-2 shrink-0">
                    <Button type="button" variant="ghost" className="h-9 text-slate-500 hover:text-slate-900" onClick={() => onOpenChange(false)}>
                        취소
                    </Button>
                    <Button
                        type="submit"
                        form="optical-edit-form"
                        disabled={isSubmitting || isUploading}
                        className="h-9 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md shadow-indigo-200"
                    >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        수정 사항 저장
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
