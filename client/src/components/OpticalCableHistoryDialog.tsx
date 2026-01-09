import { useState, useEffect, useRef } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import OpticalAssignmentDialog from "./OpticalAssignmentDialog";
import { OpticalReserveDialog } from "./OpticalReserveDialog";
import type { OpticalCable, OpticalCableLog } from "@shared/schema";
import { format } from "date-fns";
import { useAppContext } from "@/contexts/AppContext";

interface OpticalCableHistoryDialogProps {
    cableId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    drumNo?: string;
}

export function OpticalCableHistoryDialog({ cableId, open, onOpenChange, drumNo }: OpticalCableHistoryDialogProps) {
    const { teams } = useAppContext();
    const [reserveDialogOpen, setReserveDialogOpen] = useState(false);
    const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
    const previousStatusRef = useRef<string | undefined>();

    const { data: cable } = useQuery<OpticalCable>({
        queryKey: [`/api/optical-cables/${cableId}`],
        enabled: !!cableId && open,
    });

    const { data: logs = [], isLoading } = useQuery<OpticalCableLog[]>({
        queryKey: [`/api/optical-cables/${cableId}/logs`],
        enabled: !!cableId && open,
    });

    // Reset previous status when cableId changes or dialog opens
    useEffect(() => {
        previousStatusRef.current = undefined;
    }, [cableId, open]);

    // Detect cable status change (e.g., from in_stock to assigned)
    useEffect(() => {
        if (!open) return; // Only check when dialog is open

        if (cable && previousStatusRef.current !== undefined && previousStatusRef.current !== cable.status) {
            // Status changed, likely due to assignment or other action
            // Close the history dialog
            onOpenChange(false);
        }
        if (cable) {
            previousStatusRef.current = cable.status;
        }
    }, [cable?.status, open, onOpenChange]);

    const getLogTypeLabel = (type: string) => {
        switch (type) {
            case 'receive': return '입고';
            case 'assign': return '현장 불출';
            case 'return': return '반납';
            case 'usage': return '사용(포설)';
            case 'waste': return '폐기';
            default: return type;
        }
    };

    const getTeamName = (teamId?: string | null) => {
        if (!teamId) return '-';
        const team = teams.find(t => t.id === teamId);
        return team ? team.name : 'Unknown Team';
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[1100px] max-h-[85vh]">
                <DialogHeader className="flex flex-row items-center justify-between">
                    <DialogTitle className="text-xl">이력 조회 - 제조번호 {drumNo}</DialogTitle>
                    {cable?.status === 'in_stock' && (
                        <div className="mr-8 flex gap-2">
                            <Button
                                size="sm"
                                variant={cable?.reservationStatus === 'reserved' ? 'outline' : 'default'}
                                onClick={() => setReserveDialogOpen(true)}
                            >
                                {cable?.reservationStatus === 'reserved' ? '예약 해제' : '예약'}
                            </Button>
                            <OpticalAssignmentDialog
                                initialCableId={cableId}
                                trigger={<Button size="sm">출고 등록</Button>}
                            />
                        </div>
                    )}
                </DialogHeader>

                {isLoading ? (
                    <div className="flex items-center justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="flex-1 overflow-visible">
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="w-[110px] text-center">일자</TableHead>
                                        <TableHead className="w-[90px] text-center">구분</TableHead>
                                        <TableHead className="w-[130px] text-center">공사번호</TableHead>
                                        <TableHead className="w-[200px] text-center">공사명</TableHead>
                                        <TableHead className="w-[100px] text-center">사용(m)</TableHead>
                                        <TableHead className="w-[100px] text-center">잔량(m)</TableHead>
                                        <TableHead className="w-[90px] text-center">수령자</TableHead>
                                        <TableHead className="w-[90px] text-center">입력자</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                                이력이 없습니다.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        logs.map((log) => (
                                            <TableRow key={log.id} className="h-10">
                                                <TableCell className="text-center">{log.usageDate ? format(new Date(log.usageDate), 'yyyy-MM-dd') : format(new Date(log.createdAt), 'yyyy-MM-dd')}</TableCell>
                                                <TableCell className="text-center font-medium">{getLogTypeLabel(log.logType)}</TableCell>
                                                <TableCell className="text-center">{log.projectCode || ''}</TableCell>
                                                <TableCell className="text-left truncate" title={log.projectNameUsage || ''}>
                                                    {log.projectNameUsage || ''}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {log.usedLength > 0 ? log.usedLength.toLocaleString() : ''}
                                                </TableCell>
                                                <TableCell className="text-center font-bold">
                                                    {(log.afterRemaining || 0).toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-center">{log.workerName || ''}</TableCell>
                                                <TableCell className="text-center text-muted-foreground">{(log as any).createdByName || ''}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}
            </DialogContent>

            {/* Reserve Dialog */}
            <OpticalReserveDialog
                open={reserveDialogOpen}
                onOpenChange={(open) => {
                    setReserveDialogOpen(open);
                    if (!open) {
                        // Close history dialog when reserve dialog closes
                        onOpenChange(false);
                    }
                }}
                cable={cable ? {
                    id: cable.id,
                    drumNo: cable.drumNo,
                    spec: cable.spec,
                    reservationStatus: cable.reservationStatus,
                    reservedForProject: cable.reservedForProject
                } : null}
            />
        </Dialog>
    );
}
