import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAppContext } from "@/contexts/AppContext";
import { Save, Loader2, CalendarIcon, Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { OpticalCable, OpticalCableLog } from "@shared/schema";
import { useFileUpload } from "@/hooks/useFileUpload";

interface OpticalUsageDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingLog: OpticalCableLog | null;
}

export function OpticalUsageDialog({ open, onOpenChange, editingLog }: OpticalUsageDialogProps) {
    const { toast } = useToast();
    const { tenants, currentTenant, user, teams } = useAppContext();
    const activeTenant = tenants.find(t => t.id === currentTenant);
    const myTeamId = activeTenant?.teamId;

    const currentTenantData = tenants.find(t => t.id === currentTenant);
    const isFieldTeam = currentTenantData?.permissions &&
        currentTenantData.permissions.usage === 'write' &&
        currentTenantData.permissions.incoming === 'none' &&
        currentTenantData.permissions.outgoing === 'none' &&
        currentTenantData.permissions.inventory === 'none';

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
        cableId: "",
        teamId: myTeamId || "",
        usageDate: new Date().toISOString().split('T')[0],
        installLength: 0,
        wasteLength: 0,
        projectCode: "",
        projectNameUsage: "",
        workerName: user?.username || "",
    });

    // 수정 모드에서 사용할 케이블 정보 (전체 목록에 없을 수 있음)
    const [editingCable, setEditingCable] = useState<OpticalCable | null>(null);

    // formData 변경 추적 (디버깅용)
    useEffect(() => {
        console.log('[DEBUG] formData changed:', formData);
    }, [formData]);

    const { data: cables = [] } = useQuery<(OpticalCable & { logs: OpticalCableLog[] })[]>({
        queryKey: ["/api/optical-cables"],
        enabled: open && !!formData.teamId,
    });

    const { data: cableLogs = [] } = useQuery<OpticalCableLog[]>({
        queryKey: [`/api/optical-cables/${formData.cableId}/logs`],
        enabled: !!formData.cableId && !editingLog && open,
    });

    useEffect(() => {
        // 다이얼로그가 열려있을 때만 자동 채우기 실행
        if (open && !editingLog && formData.cableId && cableLogs.length > 0) {
            // Find the latest 'assign' log
            const lastAssignLog = cableLogs.find(log => log.logType === 'assign');
            if (lastAssignLog) {
                setFormData(prev => {
                    // Avoid unnecessary updates if values are already set to what we want
                    if (prev.projectCode === (lastAssignLog.projectCode || "") &&
                        prev.projectNameUsage === (lastAssignLog.projectNameUsage || "")) {
                        return prev;
                    }
                    return {
                        ...prev,
                        projectCode: lastAssignLog.projectCode || "",
                        projectNameUsage: lastAssignLog.projectNameUsage || ""
                    };
                });
            }
        }
    }, [open, cableLogs, formData.cableId, editingLog]);

    const { data: members = [] } = useQuery<any[]>({
        queryKey: ["/api/admin/members"],
        enabled: open && !isFieldTeam,
        retry: false,
    });

    // 첨부파일 및 상세 데이터 로드 (수정 모드일 때만)
    const [isLoading, setIsLoading] = useState(false);



    // 첨부파일 및 상세 데이터 로드 (수정 모드일 때만)
    useEffect(() => {


        if (open && editingLog) {
            // 수정 모드: API로 전체 데이터 가져오기
            (async () => {
                try {
                    setIsLoading(true);


                    const fullLog = await queryClient.fetchQuery<OpticalCableLog & { cable?: OpticalCable }>({
                        queryKey: [`/api/optical-cables/logs/${editingLog.id}`],
                        staleTime: 0
                    });



                    if (fullLog) {
                        const newFormData = {
                            cableId: fullLog.cableId.toString(),
                            teamId: fullLog.teamId || myTeamId || "",
                            usageDate: fullLog.usageDate || new Date(fullLog.createdAt).toISOString().split('T')[0],
                            installLength: fullLog.installLength || 0,
                            wasteLength: fullLog.wasteLength || 0,
                            projectCode: (fullLog as any).projectCode || "",
                            projectNameUsage: (fullLog as any).projectNameUsage || "",
                            workerName: (fullLog as any).workerName || user?.username || "",
                        };

                        setFormData(newFormData);

                        // 케이블 정보 저장 (전체 목록에 없을 수 있음)
                        if (fullLog.cable) {

                            setEditingCable(fullLog.cable);
                        } else {
                            // console.warn('[DEBUG] Cable info missing in fullLog!');
                            // toast({ title: "주의", description: "케이블 상세 정보가 없습니다.", variant: "destructive" });
                        }
                        // 첨부파일 로드
                        if (fullLog.attributes) {
                            let attrs: any = {};
                            if (typeof fullLog.attributes === 'string') {
                                try {
                                    attrs = JSON.parse(fullLog.attributes);
                                } catch (e) {

                                    attrs = fullLog.attributes;
                                }
                            } else {
                                attrs = fullLog.attributes;
                            }

                            if (attrs.attachments && Array.isArray(attrs.attachments)) {
                                setAttachments(attrs.attachments);
                            } else if (attrs.attachment) {
                                setAttachments([attrs.attachment]);
                            } else {
                                setAttachments([]);
                            }
                        } else {
                            setAttachments([]);
                        }
                    }
                } catch (e) {
                    console.error("Failed to fetch full log details", e);
                    toast({ title: "오류 발생", description: "데이터 로딩 실패", variant: "destructive" });
                } finally {
                    setIsLoading(false);
                }
            })();
        } else if (open && !editingLog) {
            // 신규 등록 모드: 폼 초기화

            setFormData({
                cableId: "",
                teamId: myTeamId || "",
                usageDate: new Date().toISOString().split('T')[0],
                installLength: 0,
                wasteLength: 0,
                projectCode: "",
                projectNameUsage: "",
                workerName: user?.username || "",
            });
            clearAttachments();
            setEditingCable(null);
        }
    }, [open, editingLog?.id]); // eslint-disable-line react-hooks/exhaustive-deps



    let availableCables = cables.filter(c => {
        // If editing, always include the currently selected cable
        // Check both editingLog.cableId and formData.cableId (with type conversion)
        if (editingLog && c.id === editingLog.cableId) {
            return true;
        }
        if (formData.cableId && c.id === formData.cableId) {
            return true;
        }

        if (c.status !== 'assigned') {
            return false;
        }
        if (isFieldTeam && myTeamId) {
            return c.currentTeamId === myTeamId;
        }
        if (formData.teamId) {
            return c.currentTeamId === formData.teamId;
        }
        return false; // 팀이 선택되지 않았으면 아무것도 보여주지 않음
    });

    // 수정 모드에서 케이블이 목록에 없으면 추가
    if (editingCable && !availableCables.find(c => c.id === editingCable.id)) {
        // Cast or add missing properties to match the query type
        const cableWithLogs = { ...editingCable, logs: [] };
        availableCables = [cableWithLogs, ...availableCables];
    }


    const usageMutation = useMutation({
        mutationFn: async (data: any) => {
            const attributes = JSON.stringify({
                attachments: attachments // Use hook state
            });

            const payload = {
                ...data,
                // Ensure quantity fields are numbers
                installLength: Number(data.installLength),
                wasteLength: Number(data.wasteLength),
                attributes
            };

            if (editingLog) {
                return apiRequest("PATCH", `/api/optical-cables/logs/${editingLog.id}`, payload);
            } else {
                return apiRequest("POST", `/api/optical-cables/${data.cableId}/usage`, {
                    ...payload,
                    logType: "usage"
                });
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables"] });
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables/logs"] });
            // 특정 케이블의 이력도 무효화 (이력 다이얼로그 업데이트용)
            // variables.cableId might be missing in PATCH if not passed, but formData.cableId exists
            queryClient.invalidateQueries({ queryKey: [`/api/optical-cables/${formData.cableId}/logs`] });
            toast({ title: editingLog ? "사용 내역이 수정되었습니다" : "사용 실적이 등록되었습니다" });
            onOpenChange(false);
        },
        onError: (error: Error) => {
            toast({ title: editingLog ? "수정 실패" : "등록 실패", description: error.message, variant: "destructive" });
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.cableId) {
            toast({ title: "드럼을 선택해주세요", variant: "destructive" });
            return;
        }

        if (!isFieldTeam && !formData.teamId) {
            toast({ title: "팀을 선택해주세요", variant: "destructive" });
            return;
        }

        const totalUsed = Number(formData.installLength) + Number(formData.wasteLength);
        if (totalUsed <= 0) {
            toast({ title: "사용 길이를 입력해주세요", variant: "destructive" });
            return;
        }

        const selectedCable = availableCables.find(c => c.id.toString() === formData.cableId);
        if (selectedCable && !editingLog && totalUsed > selectedCable.remainingLength) {
            toast({ title: "잔량보다 많이 사용할 수 없습니다", variant: "destructive" });
            return;
        }

        usageMutation.mutate(formData);
    };

    const selectedCable = availableCables.find(c => c.id.toString() === formData.cableId);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[750px] p-0 overflow-hidden border-white/20 bg-background/80 backdrop-blur-xl shadow-2xl">
                {/* Top Gradient Indicator */}
                <div className="h-1.5 w-full bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />

                <div className="px-6 pt-6 pb-2">
                    <DialogHeader className="mb-4">
                        <DialogTitle className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                            {editingLog ? "사용 내역 수정" : "사용 내역 등록"}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            광케이블 포설 및 접속 작업 실적을 {editingLog ? "수정하여 데이터를 갱신합니다." : "새로 등록합니다."}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="px-6 pb-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {isLoading ? (
                        <div className="flex flex-col justify-center items-center py-20 space-y-4">
                            <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
                            <p className="text-sm font-medium text-slate-500">데이터를 불러오는 중입니다...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="grid gap-6">

                            {/* 기본 정보 */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="h-4 w-1 bg-violet-500 rounded-full" />
                                    <h4 className="font-bold text-[13px] text-slate-700">작업 기본 정보</h4>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-[12px] font-semibold text-slate-500 ml-1">사용일 <span className="text-red-500">*</span></Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal h-9 bg-slate-50/50 border-slate-200/60 hover:bg-white hover:border-violet-500/50 transition-all text-xs",
                                                        !formData.usageDate && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4 text-violet-600" />
                                                    {formData.usageDate ? format(new Date(formData.usageDate), "yyyy-MM-dd") : <span>날짜 선택</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0 border-violet-100 shadow-xl" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={formData.usageDate ? new Date(formData.usageDate) : undefined}
                                                    onSelect={(date) => setFormData({ ...formData, usageDate: date ? format(date, "yyyy-MM-dd") : "" })}
                                                    initialFocus
                                                    className="p-3"
                                                    classNames={{
                                                        day_selected: "bg-violet-500 text-white hover:bg-violet-600 focus:bg-violet-600",
                                                        day_today: "bg-violet-50 text-violet-600",
                                                    }}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[12px] font-semibold text-slate-500 ml-1">사용팀 <span className="text-red-500">*</span></Label>
                                        {isFieldTeam ? (
                                            <Input
                                                value={teams.find(t => t.id === myTeamId)?.name || ''}
                                                disabled
                                                className="h-9 bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed"
                                            />
                                        ) : (
                                            <Select
                                                value={formData.teamId}
                                                onValueChange={(val) => setFormData({ ...formData, teamId: val, cableId: "" })}
                                                disabled={!!editingLog}
                                            >
                                                <SelectTrigger className="h-9 bg-slate-50/50 border-slate-200/60 focus:ring-violet-500/20 text-xs">
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
                                        )}
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[12px] font-semibold text-slate-500 ml-1">사용자</Label>
                                        {isFieldTeam ? (
                                            <Input
                                                value={formData.workerName}
                                                disabled
                                                className="h-9 bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed"
                                            />
                                        ) : (
                                            <Select
                                                value={formData.workerName}
                                                onValueChange={(val) => setFormData({ ...formData, workerName: val })}
                                                disabled={!formData.teamId}
                                            >
                                                <SelectTrigger className="h-9 bg-slate-50/50 border-slate-200/60 focus:ring-violet-500/20 text-xs">
                                                    <SelectValue placeholder="사용자 선택" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {members.filter((m: any) => m.teamId === formData.teamId).map((member: any) => (
                                                        <SelectItem key={member.id} value={member.name} className="text-xs">
                                                            {member.name} ({member.username})
                                                        </SelectItem>
                                                    ))}
                                                    {members.filter((m: any) => m.teamId === formData.teamId).length === 0 && (
                                                        <SelectItem value="none" disabled className="text-xs">팀원 없음</SelectItem>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-slate-100" />

                            {/* 사용 정보 */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="h-4 w-1 bg-purple-500 rounded-full" />
                                    <h4 className="font-bold text-[13px] text-slate-700">케이블 사용 정보</h4>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-[12px] font-semibold text-slate-500 ml-1">사용 드럼 선택 <span className="text-red-500">*</span></Label>
                                        <Select
                                            key={formData.cableId}
                                            value={formData.cableId || undefined}
                                            onValueChange={(val) => setFormData({ ...formData, cableId: val })}
                                            disabled={(!isFieldTeam && !formData.teamId) || !!editingLog}
                                        >
                                            <SelectTrigger className="h-9 bg-slate-50/50 border-slate-200/60 focus:ring-violet-500/20 text-xs">
                                                <SelectValue placeholder={
                                                    !isFieldTeam && !formData.teamId
                                                        ? "먼저 팀을 선택하세요"
                                                        : availableCables.length === 0
                                                            ? "사용 가능한 드럼이 없습니다"
                                                            : "드럼번호 선택"
                                                } />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableCables.map((cable) => (
                                                    <SelectItem key={cable.id} value={cable.id.toString()} className="text-xs">
                                                        {cable.division ? `[${cable.division}] ` : ""}{cable.drumNo} ({cable.productName} / 잔량: {cable.remainingLength.toLocaleString()}m)
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* 선택된 드럼 정보 카드 */}
                                    {selectedCable && (
                                        <div className="text-xs text-purple-700 font-medium p-3 bg-purple-50/50 rounded-lg border border-purple-100 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
                                            선택됨: {selectedCable.drumNo} ({selectedCable.productName} / 잔량 {selectedCable.remainingLength.toLocaleString()}m)
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-[12px] font-semibold text-slate-500 ml-1">설치 길이 (m) <span className="text-red-500">*</span></Label>
                                            <Input
                                                type="number"
                                                value={formData.installLength || ''}
                                                onChange={(e) => setFormData({ ...formData, installLength: Number(e.target.value) })}
                                                min={0}
                                                placeholder="0"
                                                className="h-9 font-mono bg-slate-50/50 border-slate-200/60 focus:bg-white focus:border-purple-500/50 transition-all text-right"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[12px] font-semibold text-slate-500 ml-1">자투리 (m)</Label>
                                            <Input
                                                type="number"
                                                value={formData.wasteLength || ''}
                                                onChange={(e) => setFormData({ ...formData, wasteLength: Number(e.target.value) })}
                                                min={0}
                                                placeholder="0"
                                                className="h-9 font-mono bg-slate-50/50 border-slate-200/60 focus:bg-white focus:border-purple-500/50 transition-all text-right"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-slate-100" />

                            {/* 공사 정보 */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="h-4 w-1 bg-fuchsia-500 rounded-full" />
                                    <h4 className="font-bold text-[13px] text-slate-700">공사 정보</h4>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-[12px] font-semibold text-slate-500 ml-1">공사번호</Label>
                                        <Input
                                            value={formData.projectCode || ''}
                                            onChange={(e) => setFormData({ ...formData, projectCode: e.target.value })}
                                            className="h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white focus:border-fuchsia-500/50 transition-all"
                                            placeholder="공사번호 입력"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[12px] font-semibold text-slate-500 ml-1">공사명</Label>
                                        <Input
                                            value={formData.projectNameUsage}
                                            onChange={(e) => setFormData({ ...formData, projectNameUsage: e.target.value })}
                                            className="h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white focus:border-fuchsia-500/50 transition-all"
                                            placeholder="공사명 입력"
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
                                    <div className="relative">
                                        <Input
                                            id="optical-usage-file-upload"
                                            type="file"
                                            accept="image/*,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                                            multiple
                                            className="hidden"
                                            onChange={handleFileChange}
                                            disabled={isUploading || attachments.length >= 4}
                                        />
                                        {attachments.length < 4 && (
                                            <label
                                                htmlFor="optical-usage-file-upload"
                                                className={cn(
                                                    "group flex flex-col items-center justify-center gap-2 w-full h-24 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-violet-400 hover:bg-violet-50/30 transition-all duration-200",
                                                    isUploading && "opacity-50 cursor-wait"
                                                )}
                                            >
                                                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-violet-100 transition-colors">
                                                    <Upload className="h-4 w-4 text-slate-400 group-hover:text-violet-600" />
                                                </div>
                                                <span className="text-xs font-medium text-slate-500 group-hover:text-violet-600">
                                                    {isUploading ? "업로드 중..." : "클릭하여 파일 업로드 또는 드래그 앤 드롭"}
                                                </span>
                                            </label>
                                        )}
                                    </div>

                                    {attachments.length > 0 && (
                                        <div className="grid grid-cols-2 gap-2">
                                            {attachments.map((file, index) => (
                                                <div key={index} className="flex items-center justify-between p-2.5 bg-white border border-slate-100 rounded-lg shadow-sm hover:shadow-md transition-all">
                                                    <div className="flex items-center gap-2.5 overflow-hidden">
                                                        <div className="h-8 w-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0 text-lg">
                                                            {file.name.endsWith('.pdf') ? '📄' :
                                                                file.name.endsWith('.xls') || file.name.endsWith('.xlsx') ? '📊' : '🖼️'}
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            {file.storageUrl ? (
                                                                <a href={file.storageUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-slate-700 truncate block max-w-[120px] hover:text-violet-600 hover:underline">
                                                                    {file.name}
                                                                </a>
                                                            ) : (
                                                                <span className="text-xs font-medium text-slate-700 truncate block max-w-[120px]">
                                                                    {file.name}
                                                                </span>
                                                            )}
                                                            <span className="text-[10px] text-violet-600">업로드 완료</span>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        type="button"
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
                        </form>
                    )}
                </div>

                <DialogFooter className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between gap-2">
                    <Button type="button" variant="ghost" className="h-9 text-slate-500 hover:text-slate-900" onClick={() => onOpenChange(false)}>
                        취소
                    </Button>
                    <Button
                        type="submit"
                        disabled={usageMutation.isPending || isUploading}
                        onClick={handleSubmit} // Using onClick instead of type=submit here because form is wrapped differently or just to be safe with placement
                        className="h-9 px-6 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white shadow-md shadow-violet-200"
                    >
                        {usageMutation.isPending || isUploading ? (
                            <>
                                <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                                {isUploading ? "업로드 중..." : "처리중..."}
                            </>
                        ) : (
                            <>
                                <Save className="h-3.5 w-3.5 mr-2" />
                                {editingLog ? "수정 완료" : "등록 완료"}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
