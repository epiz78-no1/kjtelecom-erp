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
import type { OpticalCableLog } from "@shared/schema";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface OpticalCableHistoryDialogProps {
    cableId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    drumNo?: string;
}

export function OpticalCableHistoryDialog({ cableId, open, onOpenChange, drumNo }: OpticalCableHistoryDialogProps) {
    const { data: logs = [], isLoading } = useQuery<OpticalCableLog[]>({
        queryKey: [`/api/optical-cables/${cableId}/logs`],
        enabled: !!cableId && open,
    });

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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px]">
                <DialogHeader>
                    <DialogTitle>이력 조회 - {drumNo}</DialogTitle>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex items-center justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="max-h-[60vh] overflow-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>일자</TableHead>
                                    <TableHead>사업</TableHead>
                                    <TableHead>관련 팀</TableHead>
                                    <TableHead>내용/구간</TableHead>
                                    <TableHead className="text-right">사용(m)</TableHead>
                                    <TableHead className="text-right">잔량(m)</TableHead>
                                    <TableHead>작업자</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                                            이력이 없습니다.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    logs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell>{log.usageDate ? format(new Date(log.usageDate), 'yyyy-MM-dd') : format(new Date(log.createdAt), 'yyyy-MM-dd')}</TableCell>
                                            <TableCell className="font-medium">{getLogTypeLabel(log.logType)}</TableCell>
                                            <TableCell>{log.teamId ? `Team ${log.teamId}` : '-'}</TableCell>
                                            <TableCell className="max-w-[200px] truncate" title={log.sectionName || ''}>
                                                {log.sectionName || '-'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {log.usedLength > 0 ? log.usedLength.toLocaleString() : '-'}
                                            </TableCell>
                                            <TableCell className="text-right font-bold">
                                                {(log.afterRemaining || 0).toLocaleString()}
                                            </TableCell>
                                            <TableCell>{log.workerName || '-'}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
