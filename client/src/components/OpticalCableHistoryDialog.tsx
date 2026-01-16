import { useState, useEffect, useRef } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Paperclip } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import OpticalAssignmentDialog from "./OpticalAssignmentDialog";
import { OpticalReserveDialog } from "./OpticalReserveDialog";
import { OpticalCableActionDialog } from "./OpticalCableActionDialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { OpticalCable, OpticalCableLog } from "@shared/schema";
import { format } from "date-fns";
import { useAppContext } from "@/contexts/AppContext";
import { useDownload } from "@/hooks/useDownload";

// ... existing code ...

interface OpticalCableHistoryDialogProps {
    cableId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    drumNo?: string;
    initialCable?: OpticalCable | null;
}

export function OpticalCableHistoryDialog({ cableId, open, onOpenChange, drumNo, initialCable }: OpticalCableHistoryDialogProps) {
    const { teams, user, tenants, currentTenant } = useAppContext();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [reserveDialogOpen, setReserveDialogOpen] = useState(false);
    const [wasteDialogOpen, setWasteDialogOpen] = useState(false);
    const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
    const [viewerOpen, setViewerOpen] = useState(false);

    // Check if user is tenant owner
    const isTenantOwner = tenants.find(t => t.id === currentTenant)?.role === 'owner';
    const { downloadFile } = useDownload();

    const deleteLogMutation = useMutation({
        mutationFn: async (logId: string) => {
            await apiRequest("DELETE", `/api/optical-cables/logs/${logId}`);
        },
        onSuccess: () => {
            toast({ title: "이력이 취소되었습니다" });
            queryClient.invalidateQueries({ queryKey: [`/api/optical-cables/${cableId}/logs`] });
            queryClient.invalidateQueries({ queryKey: [`/api/optical-cables/${cableId}`] });
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables"] });
        },
        onError: (error: Error) => {
            toast({ title: "취소 실패", description: error.message, variant: "destructive" });
        }
    });

    const returnApprovalMutation = useMutation({
        mutationFn: async (action: 'approve' | 'reject') => {
            if (!cableId) throw new Error('Cable ID is required');
            return apiRequest("POST", `/api/optical-cables/${cableId}/approve-return`, { action });
        },
        onSuccess: (_, action) => {
            toast({
                title: action === 'approve' ? "반납이 승인되었습니다" : "반납이 반려되었습니다"
            });
            queryClient.invalidateQueries({ queryKey: [`/api/optical-cables/${cableId}`] });
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables"] });
            // 승인 시 다이얼로그 닫기
            if (action === 'approve') {
                onOpenChange(false);
            }
        },
        onError: (error: Error) => {
            toast({ title: "처리 실패", description: error.message, variant: "destructive" });
        }
    });

    const handleReturnApproval = (action: 'approve' | 'reject') => {
        returnApprovalMutation.mutate(action);
    };

    const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
    const previousStatusRef = useRef<string | undefined>();

    const { data: cable } = useQuery<OpticalCable>({
        queryKey: [`/api/optical-cables/${cableId}`],
        enabled: !!cableId && open,
        initialData: initialCable || undefined
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
            case 'create': return '생성';
            case 'receive': return '입고';
            case 'assign': return '불출';
            case 'usage': return '사용';
            case 'return': return '반납';
            case 'waste': return '폐기';
            case 'reserve': return '예약';
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
                    <div className="mr-8 flex gap-2">
                        {cable?.status === 'in_stock' && (
                            <>
                                <Button
                                    size="sm"
                                    variant={cable?.reservationStatus === 'reserved' ? 'outline' : 'default'}
                                    onClick={() => setReserveDialogOpen(true)}
                                >
                                    {cable?.reservationStatus === 'reserved' ? '예약 해제' : '예약'}
                                </Button>
                                {/* Show assignment button only when NOT reserved */}
                                {cable?.reservationStatus !== 'reserved' && (
                                    <OpticalAssignmentDialog
                                        initialCableId={cableId}
                                        trigger={<Button size="sm">출고 등록</Button>}
                                    />
                                )}
                            </>
                        )}
                        {/* 반납 요청 대기 중인 경우 승인/반려 버튼 표시 */}
                        {cable?.returnRequestStatus === 'pending' && (
                            <>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs border-green-300 text-green-700 hover:bg-green-50"
                                    onClick={() => {
                                        if (confirm('반납을 승인하시겠습니까?')) {
                                            handleReturnApproval('approve');
                                        }
                                    }}
                                >
                                    반납 승인
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs border-orange-300 text-orange-700 hover:bg-orange-50"
                                    onClick={() => {
                                        if (confirm('반납을 반려하시겠습니까?')) {
                                            handleReturnApproval('reject');
                                        }
                                    }}
                                >
                                    반납 반려
                                </Button>
                            </>
                        )}
                        {/* Tenant Owner-only Waste Button - hide when reserved or not in stock/returned */}
                        {isTenantOwner && cable && ['in_stock', 'returned'].includes(cable.status) && cable?.reservationStatus !== 'reserved' && (
                            <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setWasteDialogOpen(true)}
                            >
                                폐기
                            </Button>
                        )}
                    </div>
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
                                        <TableHead className="w-[80px] text-center">폐기(m)</TableHead>
                                        <TableHead className="w-[100px] text-center">잔량(m)</TableHead>
                                        <TableHead className="w-[90px] text-center">수령자</TableHead>
                                        <TableHead className="w-[90px] text-center">입력자</TableHead>
                                        <TableHead className="w-[60px] text-center">첨부</TableHead>
                                        <TableHead className="w-[60px] text-center">취소</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                                                이력이 없습니다.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        logs.map((log, index) => (
                                            <TableRow key={log.id} className="h-10">
                                                <TableCell className="text-center">{log.usageDate ? format(new Date(log.usageDate), 'yyyy-MM-dd') : format(new Date(log.createdAt), 'yyyy-MM-dd')}</TableCell>
                                                <TableCell className="text-center font-medium">{getLogTypeLabel(log.logType)}</TableCell>
                                                <TableCell className="text-center">{log.projectCode || ''}</TableCell>
                                                <TableCell className="text-left" title={log.logType === 'waste' && log.attributes ? (() => {
                                                    try {
                                                        const attr = JSON.parse(log.attributes);
                                                        return attr.wasteReason || log.projectNameUsage || '';
                                                    } catch (e) {
                                                        return log.projectNameUsage || '';
                                                    }
                                                })() : log.projectNameUsage || ''}>
                                                    <div className="truncate max-w-[200px]">
                                                        {log.logType === 'waste' && log.attributes ? (() => {
                                                            try {
                                                                const attr = JSON.parse(log.attributes);
                                                                return attr.wasteReason || log.projectNameUsage || '';
                                                            } catch (e) {
                                                                return log.projectNameUsage || '';
                                                            }
                                                        })() : log.projectNameUsage || ''}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {(log.installLength || 0) > 0 ? (log.installLength || 0).toLocaleString() : (log.usedLength && log.usedLength > (log.wasteLength || 0) ? (log.usedLength - (log.wasteLength || 0)).toLocaleString() : '')}
                                                </TableCell>
                                                <TableCell className="text-center text-red-600">
                                                    {(log.wasteLength || 0) > 0 ? (log.wasteLength || 0).toLocaleString() : ''}
                                                </TableCell>
                                                <TableCell className="text-center font-bold">
                                                    {(log.afterRemaining || 0).toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-center">{log.workerName || ''}</TableCell>
                                                <TableCell className="text-center text-muted-foreground">{(log as any).createdByName || ''}</TableCell>
                                                {/* Attachment Icon */}
                                                <TableCell className="text-center">
                                                    {(() => {
                                                        if (!log.attributes) return null;
                                                        try {
                                                            let attr: any = {};
                                                            if (typeof log.attributes === 'string') {
                                                                attr = JSON.parse(log.attributes);
                                                            } else {
                                                                attr = log.attributes;
                                                            }

                                                            // 1. Waste Photos (Legacy Logic)
                                                            if (log.logType === 'waste' && attr.wastePhotos && attr.wastePhotos.length > 0) {
                                                                return (
                                                                    <button
                                                                        className="inline-flex items-center justify-center text-primary hover:text-primary/80"
                                                                        title="첨부파일 보기"
                                                                        onClick={() => {
                                                                            setSelectedLogId(log.id);
                                                                            setViewerOpen(true);
                                                                        }}
                                                                    >
                                                                        <Download className="h-4 w-4" />
                                                                    </button>
                                                                );
                                                            }

                                                            // 2. Attachments (Incoming/Create logs)
                                                            const attachments = attr.attachments || (attr.attachment ? [attr.attachment] : []);

                                                            if (attachments.length === 0) return null;

                                                            if (attachments.length === 1) {
                                                                return (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-8 w-8 p-0"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            downloadFile(`/api/optical-cables/logs/${log.id}`, attachments[0].name);
                                                                        }}
                                                                        title={attachments[0].name}
                                                                    >
                                                                        <Download className="h-4 w-4" />
                                                                    </Button>
                                                                );
                                                            }

                                                            return (
                                                                <Popover>
                                                                    <PopoverTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="h-8 gap-1 px-2"
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        >
                                                                            <Paperclip className="h-4 w-4" />
                                                                            <span className="text-xs font-medium">{attachments.length}</span>
                                                                        </Button>
                                                                    </PopoverTrigger>
                                                                    <PopoverContent className="w-auto p-2" align="end">
                                                                        <div className="flex flex-col gap-1">
                                                                            {attachments.map((file: any, idx: number) => (
                                                                                <Button
                                                                                    key={idx}
                                                                                    variant="ghost"
                                                                                    size="sm"
                                                                                    className="justify-start h-8 text-xs max-w-[200px]"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        downloadFile(`/api/optical-cables/logs/${log.id}`, file.name);
                                                                                    }}
                                                                                    title={file.name}
                                                                                >
                                                                                    <Download className="h-3 w-3 mr-2 shrink-0" />
                                                                                    <span className="truncate">{file.name}</span>
                                                                                </Button>
                                                                            ))}
                                                                        </div>
                                                                    </PopoverContent>
                                                                </Popover>
                                                            );
                                                        } catch (e) {
                                                            return null;
                                                        }
                                                    })()}
                                                </TableCell>
                                                {/* Delete/Cancel Button */}
                                                <TableCell className="text-center">
                                                    {index === 0 && (log.logType !== 'create' && log.logType !== 'receive' && log.logType !== 'reserve') && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                                                            onClick={() => {
                                                                if (confirm("이 작업을 취소하시겠습니까? 관련 케이블 상태가 롤백됩니다.")) {
                                                                    deleteLogMutation.mutate(log.id);
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </TableCell>
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

            {/* Waste Dialog */}
            {cable && (
                <OpticalCableActionDialog
                    open={wasteDialogOpen}
                    onOpenChange={(open) => {
                        setWasteDialogOpen(open);
                        if (!open) {
                            // Close history dialog when waste dialog closes
                            onOpenChange(false);
                        }
                    }}
                    cable={cable}
                    actionType="waste"
                    teams={teams}
                />
            )}

            {/* Waste Attachment Viewer Dialog */}
            <WasteAttachmentViewer
                logId={selectedLogId}
                open={viewerOpen}
                onOpenChange={setViewerOpen}
            />
        </Dialog>
    );
}

// Waste Attachment Viewer Component
interface WasteAttachmentViewerProps {
    logId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

function WasteAttachmentViewer({ logId, open, onOpenChange }: WasteAttachmentViewerProps) {
    const { data: logDetail, isLoading } = useQuery<OpticalCableLog>({
        queryKey: [`/api/optical-cables/logs/${logId}`],
        enabled: !!logId && open,
    });

    const wasteData = logDetail?.attributes ? (() => {
        try {
            return JSON.parse(logDetail.attributes);
        } catch (e) {
            return null;
        }
    })() : null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                        <span>폐기 상세 정보</span>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onOpenChange(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </DialogTitle>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex items-center justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Waste Reason */}
                        {wasteData?.wasteReason && (
                            <div>
                                <h3 className="text-sm font-medium mb-2">폐기 사유</h3>
                                <div className="p-3 bg-muted/50 rounded-md text-sm whitespace-pre-wrap">
                                    {wasteData.wasteReason}
                                </div>
                            </div>
                        )}

                        {/* Waste Photos */}
                        {wasteData?.wastePhotos && wasteData.wastePhotos.length > 0 && (
                            <div>
                                <h3 className="text-sm font-medium mb-2">
                                    첨부 사진 ({wasteData.wastePhotos.length}개)
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {wasteData.wastePhotos.map((photo: any, index: number) => (
                                        <div key={index} className="space-y-2">
                                            <img
                                                src={photo.data}
                                                alt={photo.name}
                                                className="w-full h-auto rounded-md border"
                                            />
                                            <p className="text-xs text-muted-foreground truncate">
                                                {photo.name}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {!wasteData?.wasteReason && (!wasteData?.wastePhotos || wasteData.wastePhotos.length === 0) && (
                            <div className="text-center py-8 text-muted-foreground">
                                첨부된 정보가 없습니다.
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
