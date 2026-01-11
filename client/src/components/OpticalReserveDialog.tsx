import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
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

interface OpticalReserveDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    cable: {
        id: string;
        drumNo: string;
        spec: string;
        reservationStatus?: string;
        reservedForProject?: string | null;
    } | null;
}

export function OpticalReserveDialog({ open, onOpenChange, cable }: OpticalReserveDialogProps) {
    const { toast } = useToast();
    const [projectName, setProjectName] = useState("");

    const isReserved = cable?.reservationStatus === 'reserved';

    const reserveMutation = useMutation({
        mutationFn: async () => {
            if (!cable) return;
            const action = isReserved ? 'release' : 'reserve';
            return apiRequest("POST", `/api/optical-cables/${cable.id}/reserve`, {
                action,
                project: action === 'reserve' ? projectName : undefined
            });
        },
        onSuccess: () => {
            // Invalidate and refetch only active queries (data-efficient)
            queryClient.invalidateQueries({
                queryKey: ["/api/optical-cables"],
                refetchType: 'active' // Only refetch currently mounted queries
            });
            // Also invalidate the specific cable data to update buttons
            if (cable) {
                queryClient.invalidateQueries({
                    queryKey: [`/api/optical-cables/${cable.id}`],
                    refetchType: 'active'
                });
                queryClient.invalidateQueries({
                    queryKey: [`/api/optical-cables/${cable.id}/logs`], // Changed from /log to /logs
                    refetchType: 'active'
                });
            }
            toast({
                title: isReserved ? "예약이 해제되었습니다" : "자재가 예약되었습니다"
            });
            onOpenChange(false);
            setProjectName("");
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
        reserveMutation.mutate();
    };

    if (!cable) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{isReserved ? "예약 해제" : "자재 예약"}</DialogTitle>
                    <DialogDescription>
                        {isReserved
                            ? "이 자재의 예약을 해제하여 다른 팀이 불출할 수 있도록 합니다."
                            : "이 자재를 특정 공사를 위해 예약합니다. 예약된 자재는 불출이 제한됩니다."}
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
                    {isReserved && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">예약된 공사:</span>
                            <span className="font-bold text-orange-600">{cable.reservedForProject}</span>
                        </div>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isReserved && (
                        <div className="space-y-2">
                            <Label>공사명 (예약 사유)</Label>
                            <Input
                                placeholder="예: OO아파트 인입 공사"
                                value={projectName}
                                onChange={(e) => setProjectName(e.target.value)}
                                required
                            />
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            취소
                        </Button>
                        <Button
                            type="submit"
                            disabled={reserveMutation.isPending}
                        >
                            {reserveMutation.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    처리중...
                                </>
                            ) : (
                                isReserved ? "예약 해제 확인" : "예약 확인"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
