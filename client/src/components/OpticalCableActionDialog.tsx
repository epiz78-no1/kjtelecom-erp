import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiInsertOpticalCableLogSchema, type OpticalCable } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Trash2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useFileUpload } from "@/hooks/useFileUpload";
import { cn } from "@/lib/utils";
import { compressImage } from "@/lib/imageCompression";

type ActionType = 'assign' | 'return' | 'waste';

interface OpticalCableActionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    cable: OpticalCable;
    actionType: ActionType;
    teams: any[]; // Team type could be imported if strict typing needed
}

// 스키마를 클라이언트에서 일부 수정하거나 그대로 사용
// teamId는 assign일 때 필수, 나머지는 optional
const formSchema = apiInsertOpticalCableLogSchema;
type FormData = z.infer<typeof formSchema>;

export function OpticalCableActionDialog({
    open,
    onOpenChange,
    cable,
    actionType,
    teams
}: OpticalCableActionDialogProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Hook integration for Usage Attachments
    const {
        attachments: usageAttachments,
        setAttachments: setUsageAttachments,
        handleFileChange: handleUsageFileChange,
        removeAttachment: removeUsageAttachment,
        clearAttachments: clearUsageAttachments,
        isUploading: isUsageUploading
    } = useFileUpload({
        maxFiles: 4,
        maxSizeMB: 10
    });

    // Hook integration for Waste Photos
    const {
        attachments: wastePhotos,
        setAttachments: setWastePhotos,
        handleFileChange: handleWasteFileChange,
        removeAttachment: removeWasteAttachment,
        clearAttachments: clearWasteAttachments,
        isUploading: isWasteUploading
    } = useFileUpload({
        maxFiles: 4,
        maxSizeMB: 10
    });

    // Waste-specific state
    const [wasteReason, setWasteReason] = useState("");

    // 액션 타입에 따른 제목 및 설명
    const getTitle = () => {
        switch (actionType) {
            case 'assign': return "광케이블 불출 (Assign)";
            case 'return': return "광케이블 반납 (Return)";
            case 'waste': return "광케이블 폐기 (Waste)";
            default: return "광케이블 작업";
        }
    };

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            logType: actionType,
            cableId: cable.id,
            teamId: cable.currentTeamId || undefined, // 기존 할당된 팀이 있다면 기본값
            installLength: 0,
            wasteLength: 0,
            workerName: "",
            usageDate: new Date().toISOString().split('T')[0]
        }
    });

    // 다이얼로그가 열릴 때마다 form reset
    useEffect(() => {
        if (open) {
            form.reset({
                logType: actionType,
                cableId: cable.id,
                teamId: actionType === 'assign' ? undefined : cable.currentTeamId || undefined,
                installLength: 0,
                wasteLength: 0,
                workerName: "",
                usageDate: new Date().toISOString().split('T')[0]
            });
            // Reset waste-specific fields
            setWasteReason("");
            clearWasteAttachments();
            clearUsageAttachments();
        }
    }, [open, cable, actionType, form, clearWasteAttachments, clearUsageAttachments]);

    const mutation = useMutation({
        mutationFn: async (data: FormData) => {
            // API 요청. cableId는 URL param으로도 감
            const res = await apiRequest("POST", `/api/optical-cables/${cable.id}/log`, data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables"] });
            queryClient.invalidateQueries({ queryKey: [`/api/optical-cables/${cable.id}`] });
            queryClient.invalidateQueries({ queryKey: [`/api/optical-cables/${cable.id}/logs`] });
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables/logs"] });
            toast({
                title: "처리 완료",
                description: "광케이블 작업이 성공적으로 처리되었습니다."
            });
            onOpenChange(false);
        },
        onError: (error: Error) => {
            toast({
                title: "오류 발생",
                description: error.message,
                variant: "destructive"
            });
        }
    });

    const onSubmit = (data: FormData) => {
        // For waste action, validate and encode wasteReason and wastePhotos into attributes
        if (actionType === 'waste') {
            if (!wasteReason.trim()) {
                toast({
                    title: "폐기 사유 필수",
                    description: "폐기 사유를 입력해주세요.",
                    variant: "destructive"
                });
                return;
            }
            const attributes = {
                wasteReason,
                ...(wastePhotos.length > 0 && { wastePhotos })
            };
            data.attributes = JSON.stringify(attributes);
        } else if (usageAttachments.length > 0) {
            // For other actions with attachments
            data.attributes = JSON.stringify({ attachments: usageAttachments });
        }
        mutation.mutate(data);
    };

    // Helper for safe file handling wrapper
    const handleFileChangeWrapper = async (e: React.ChangeEvent<HTMLInputElement>, handler: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>) => {
        // Optional: If we want to restore compression in the future, we could intercept files here
        // For now, we delegate to the hook
        await handler(e);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{getTitle()}</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                        {/* 케이블 정보 헤더 */}
                        <div className="p-3 rounded-md bg-muted/50 border">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <span className="text-muted-foreground">제조번호:</span>
                                    <span className="ml-2 font-medium">{cable.drumNo}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">현재 잔량:</span>
                                    <span className="ml-2 font-bold text-primary">{cable.remainingLength}m</span>
                                </div>
                            </div>
                        </div>

                        {/* ASSIGN: 팀 선택 */}
                        {actionType === 'assign' && (
                            <FormField
                                control={form.control}
                                name="teamId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>불출 대상 팀 *</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value ? String(field.value) : undefined}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="팀을 선택하세요" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {teams.map((team) => (
                                                    <SelectItem key={team.id} value={String(team.id)}>
                                                        {team.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {/* RETURN: 안내 메시지 */}
                        {actionType === 'return' && (
                            <div className="p-3 rounded-md bg-blue-50 border border-blue-200 text-sm text-blue-900">
                                현재 할당된 팀 <strong>{teams.find(t => t.id === cable.currentTeamId)?.name || '알 수 없음'}</strong>에서 자재실로 반납 처리합니다.
                            </div>
                        )}

                        {/* WASTE: 폐기 사유 및 사진 */}
                        {actionType === 'waste' && (
                            <>
                                <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30 text-sm text-destructive">
                                    ⚠️ 이 케이블 드럼을 폐기 처리합니다. 이 작업은 되돌릴 수 없습니다.
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                            폐기 사유 *
                                        </label>
                                        <Textarea
                                            placeholder="폐기 사유를 입력하세요"
                                            className="resize-none mt-2"
                                            rows={3}
                                            value={wasteReason}
                                            onChange={(e) => setWasteReason(e.target.value)}
                                        />
                                    </div>


                                    <div>
                                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                            사진 첨부 ({wastePhotos.length}/4)
                                        </label>
                                        <div className="mt-2 space-y-2">
                                            {/* Upload Button */}
                                            {wastePhotos.length < 4 && (
                                                <div className="relative">
                                                    <Input
                                                        id="waste-file-upload"
                                                        type="file"
                                                        accept="image/*"
                                                        multiple
                                                        className="hidden"
                                                        onChange={handleWasteFileChange}
                                                        disabled={isWasteUploading}
                                                    />
                                                    <label
                                                        htmlFor="waste-file-upload"
                                                        className={cn(
                                                            "flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-primary/30 rounded-lg cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors",
                                                            isWasteUploading && "opacity-50 cursor-wait"
                                                        )}
                                                    >
                                                        <Upload className="h-5 w-5 text-primary" />
                                                        <span className="text-sm font-medium text-primary">
                                                            {isWasteUploading ? "업로드 중..." : `사진 선택 (${wastePhotos.length}/4)`}
                                                        </span>
                                                    </label>
                                                </div>
                                            )}

                                            {/* File List */}
                                            {wastePhotos.map((photo, index) => (
                                                <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                                                    <span className="text-sm text-muted-foreground truncate flex-1">
                                                        {photo.storageUrl ? (
                                                            <a href={photo.storageUrl} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center">
                                                                📷 {photo.name}
                                                            </a>
                                                        ) : (
                                                            <span className="flex items-center">📷 {photo.name}</span>
                                                        )}
                                                    </span>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeWasteAttachment(index)}
                                                        className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* 공사번호 (assign 제외) */}
                        {actionType !== 'assign' && (
                            <FormField
                                control={form.control}
                                name="projectCode"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>공사번호</FormLabel>
                                        <FormControl>
                                            <Input placeholder="공사번호 입력" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {/* 공사명 (assign 제외) */}
                        {actionType !== 'assign' && (
                            <FormField
                                control={form.control}
                                name="projectNameUsage"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>공사명</FormLabel>
                                        <FormControl>
                                            <Input placeholder="공사명 입력" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {/* 첨부파일 (waste 제외) */}
                        {actionType !== 'waste' && actionType !== 'assign' && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    첨부파일 ({usageAttachments.length}/4)
                                </label>
                                <div className="space-y-2">
                                    {usageAttachments.length < 4 && (
                                        <div className="relative">
                                            <Input
                                                id="usage-file-upload"
                                                type="file"
                                                accept="image/*,.pdf"
                                                multiple
                                                className="hidden"
                                                onChange={handleUsageFileChange}
                                                disabled={isUsageUploading}
                                            />
                                            <label
                                                htmlFor="usage-file-upload"
                                                className={cn(
                                                    "flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-primary/30 rounded-lg cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors",
                                                    isUsageUploading && "opacity-50 cursor-wait"
                                                )}
                                            >
                                                <Upload className="h-5 w-5 text-primary" />
                                                <span className="text-sm font-medium text-primary">
                                                    {isUsageUploading ? "업로드 중..." : `파일 선택 (${usageAttachments.length}/4)`}
                                                </span>
                                            </label>
                                        </div>
                                    )}

                                    {usageAttachments.map((file, index) => (
                                        <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                                            <span className="text-sm text-muted-foreground truncate flex-1">
                                                {file.storageUrl ? (
                                                    <a href={file.storageUrl} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center">
                                                        📎 {file.name}
                                                    </a>
                                                ) : (
                                                    <span className="flex items-center">📎 {file.name}</span>
                                                )}
                                            </span>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeUsageAttachment(index)}
                                                className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 공통: 작업일자 */}
                        <FormField
                            control={form.control}
                            name="usageDate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>작업일자 *</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="gap-2">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                취소
                            </Button>
                            <Button type="submit" disabled={mutation.isPending || isWasteUploading || isUsageUploading}>
                                {mutation.isPending || isWasteUploading || isUsageUploading ? "처리 중..." : "등록"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
