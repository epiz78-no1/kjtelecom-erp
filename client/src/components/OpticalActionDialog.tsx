import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, AlertTriangle } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";

interface OpticalActionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    cable: {
        id: string;
        drumNo: string;
        spec: string;
        remainingLength: number;
        currentTeamId?: string | null;
    } | null;
    actionType: 'return' | 'waste'; // 반납 | 폐기
}

export function OpticalActionDialog({ open, onOpenChange, cable, actionType }: OpticalActionDialogProps) {
    const { toast } = useToast();
    const [usageDate, setUsageDate] = useState(new Date().toISOString().split('T')[0]);
    const [remark, setRemark] = useState("");

    const actionMutation = useMutation({
        mutationFn: async () => {
            if (!cable) return;

            if (actionType === 'return') {
                // 반납 요청 (승인 대기)
                return apiRequest("POST", `/api/optical-cables/${cable.id}/request-return`, {});
            } else {
                // 폐기는 기존 로직 유지
                return apiRequest("POST", `/api/optical-cables/${cable.id}/log`, {
                    cableId: cable.id,
                    teamId: cable.currentTeamId,
                    logType: 'waste',
                    usageDate,
                    attributes: JSON.stringify({ remark }),
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables"] });
            toast({
                title: actionType === 'return'
                    ? "반납 신청이 완료되었습니다. 관리자 승인을 기다려주세요."
                    : "자재가 폐기 처리되었습니다"
            });
            onOpenChange(false);
            setRemark("");
        },
        onError: (error: Error) => {
            toast({
                title: "처리 실패",
                description: error.message,
                variant: "destructive"
            });
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        actionMutation.mutate();
    };

    if (!cable) return null;

    const isReturn = actionType === 'return';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {isReturn ? "광케이블 반납" : "광케이블 폐기"}
                        {!isReturn && <AlertTriangle className="h-5 w-5 text-red-500" />}
                    </DialogTitle>
                    <DialogDescription>
                        {isReturn
                            ? "이 광케이블의 반납을 신청합니다. 관리자 승인 후 반납 처리됩니다."
                            : "이 광케이블을 폐기 상태로 변경합니다. 잔량이 남아있어도 더 이상 사용할 수 없습니다."}
                    </DialogDescription>
                </DialogHeader>

                <div className="bg-muted p-4 rounded-md text-sm space-y-2 mb-4">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">제조번호:</span>
                        <span className="font-medium">{cable.drumNo}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">규격:</span>
                        <span className="font-medium">{cable.spec}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">현재 잔량:</span>
                        <span className="font-bold text-blue-600">{cable.remainingLength.toLocaleString()}m</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>{isReturn ? "반납 일자" : "폐기 일자"}</Label>
                        <Input
                            type="date"
                            value={usageDate}
                            onChange={(e) => setUsageDate(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>비고 / 사유</Label>
                        <Input
                            placeholder={isReturn ? "예: 공사 완료 후 잔량 반납" : "예: 파손으로 인한 폐기"}
                            value={remark}
                            onChange={(e) => setRemark(e.target.value)}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            취소
                        </Button>
                        <Button
                            type="submit"
                            variant={isReturn ? "default" : "destructive"}
                            disabled={actionMutation.isPending}
                        >
                            {actionMutation.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    처리중...
                                </>
                            ) : (
                                isReturn ? "반납 신청" : "폐기 처리"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
