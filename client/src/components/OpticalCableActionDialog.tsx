import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiInsertOpticalCableLogSchema, type OpticalCable } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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

type ActionType = 'assign' | 'usage' | 'return' | 'waste';

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

    // 액션 타입에 따른 제목 및 설명
    const getTitle = () => {
        switch (actionType) {
            case 'assign': return "광케이블 불출 (Assign)";
            case 'usage': return "광케이블 사용 등록 (Usage)";
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
                workerName: "", // 필요시 로그인 유저 이름 등을 넣을 수 있음
                usageDate: new Date().toISOString().split('T')[0]
            });
        }
    }, [open, cable, actionType, form]);

    const mutation = useMutation({
        mutationFn: async (data: FormData) => {
            // API 요청. cableId는 URL param으로도 감
            const res = await apiRequest("POST", `/api/optical-cables/${cable.id}/log`, data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables"] });
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
        // 유효성 검사 추가 로직이 필요하다면 여기서 수행
        if (actionType === 'usage') {
            const usage = (data.installLength || 0) + (data.wasteLength || 0);
            if (usage <= 0) {
                toast({ title: "입력 오류", description: "사용량은 0보다 커야 합니다.", variant: "destructive" });
                return;
            }
            if (usage > cable.remainingLength) {
                toast({ title: "입력 오류", description: "잔여 길이보다 많이 사용할 수 없습니다.", variant: "destructive" });
                return;
            }
        }

        mutation.mutate(data);
    };

    const remainingAfterUsage = cable.remainingLength - ((form.watch('installLength') || 0) + (form.watch('wasteLength') || 0));

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{getTitle()}</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                        {/* 공통 정보: 케이블 관리번호 */}
                        <div className="text-sm text-muted-foreground mb-4">
                            <p>관리번호: <span className="font-medium text-foreground">{cable.managementNo}</span></p>
                            <p>현재 잔량: <span className="font-medium text-foreground">{cable.remainingLength}m</span></p>
                        </div>

                        {/* ASSIGN: 팀 선택 */}
                        {actionType === 'assign' && (
                            <FormField
                                control={form.control}
                                name="teamId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>불출 대상 팀</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="팀을 선택하세요" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {teams.map((team) => (
                                                    <SelectItem key={team.id} value={team.id}>
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

                        {/* USAGE: 길이 입력 */}
                        {actionType === 'usage' && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="installLength"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>설치 길이 (m)</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        {...field}
                                                        onChange={e => field.onChange(Number(e.target.value))}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="wasteLength"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>폐기/자투리 길이 (m)</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        {...field}
                                                        onChange={e => field.onChange(Number(e.target.value))}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                {/* 예상 잔량 표시 */}
                                <div className={`p-4 rounded-md border ${remainingAfterUsage < 0 ? 'bg-destructive/10 border-destructive text-destructive' : 'bg-muted'}`}>
                                    <div className="flex justify-between items-center text-sm font-medium">
                                        <span>사용 후 예상 잔량:</span>
                                        <span>{remainingAfterUsage}m</span>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* RETURN: 안내 메시지 */}
                        {actionType === 'return' && (
                            <div className="text-sm">
                                현재 할당된 팀(<strong>{teams.find(t => t.id === cable.currentTeamId)?.name || 'Unknown'}</strong>)에서 자재실로 반납 처리합니다.
                            </div>
                        )}

                        {/* WASTE: 안내 메시지 */}
                        {actionType === 'waste' && (
                            <div className="text-sm text-destructive">
                                이 케이블 드럼 전체를 폐기 처리합니다. 이 작업은 되돌릴 수 없으며 잔량이 0으로 처리되지는 않지만 '폐기' 상태가 됩니다.
                            </div>
                        )}

                        {/* 공통: 날짜 및 작업자 (Optional but good to have) */}
                        <FormField
                            control={form.control}
                            name="usageDate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>작업 일자</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                취소
                            </Button>
                            <Button type="submit" disabled={mutation.isPending}>
                                {mutation.isPending ? "처리 중..." : "확인"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
