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
import { compressImage, formatFileSize } from "@/lib/imageCompression";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { OpticalCable, OpticalCableLog } from "@shared/schema";

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

    const [formData, setFormData] = useState({
        cableId: "",
        teamId: myTeamId || "",
        usageDate: new Date().toISOString().split('T')[0],
        installLength: 0,
        wasteLength: 0,
        projectCode: "",
        projectNameUsage: "",
        workerName: user?.username || "",
        attachments: [] as { name: string; data: string }[],
    });

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
        retry: false,
    });
    // 다이얼로그가 열릴 때 초기화 로직
    useEffect(() => {
        if (open) {
            if (editingLog) {
                let parsedAttachments: { name: string; data: string }[] = [];

                if (editingLog.attributes) {
                    try {
                        const attr = JSON.parse(editingLog.attributes);
                        if (attr.attachments && Array.isArray(attr.attachments)) {
                            parsedAttachments = attr.attachments;
                        }
                    } catch (e) {
                        // Ignore parse error
                    }
                }

                setFormData({
                    cableId: editingLog.cableId,
                    teamId: editingLog.teamId || myTeamId || "",
                    usageDate: editingLog.usageDate || new Date(editingLog.createdAt).toISOString().split('T')[0],
                    installLength: editingLog.installLength || 0,
                    wasteLength: editingLog.wasteLength || 0,
                    projectCode: (editingLog as any).projectCode || "",
                    projectNameUsage: (editingLog as any).projectNameUsage || "",
                    workerName: (editingLog as any).workerName || user?.username || "",
                    attachments: parsedAttachments,
                });
            } else {
                // 신규 등록인 경우 항상 초기화 (이전 입력값 제거)
                setFormData({
                    cableId: "",
                    teamId: myTeamId || "",
                    usageDate: new Date().toISOString().split('T')[0],
                    installLength: 0,
                    wasteLength: 0,
                    projectCode: "",
                    projectNameUsage: "",
                    workerName: user?.username || "",
                    attachments: [],
                });
            }
        }
    }, [open, editingLog, myTeamId, user]);


    const availableCables = cables.filter(c => {
        // If editing, always include the currently selected cable
        if (editingLog && c.id === editingLog.cableId) return true;

        if (c.status !== 'assigned') return false;
        if (isFieldTeam && myTeamId) {
            return c.currentTeamId === myTeamId;
        }
        if (formData.teamId) {
            return c.currentTeamId === formData.teamId;
        }
        return false; // 팀이 선택되지 않았으면 아무것도 보여주지 않음
    });


    const usageMutation = useMutation({
        mutationFn: async (data: any) => {
            const attributes = JSON.stringify({
                attachments: data.attachments
            });

            const payload = {
                ...data,
                attributes
            };

            if (editingLog) {
                return apiRequest("PATCH", `/api/optical-cable-logs/${editingLog.id}`, payload);
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
            queryClient.invalidateQueries({ queryKey: [`/api/optical-cables/${variables.cableId}/logs`] });
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

        usageMutation.mutate({
            ...formData,
            teamId: isFieldTeam ? myTeamId : formData.teamId,
            installLength: Number(formData.installLength),
            wasteLength: Number(formData.wasteLength),
        });
    };

    const selectedCable = availableCables.find(c => c.id.toString() === formData.cableId);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{editingLog ? "사용 내역 수정" : "사용 내역 입력"}</DialogTitle>
                    <DialogDescription>
                        광케이블 포설 및 접속 작업 실적을 {editingLog ? "수정" : "등록"}합니다.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* 첫 번째 행: 날짜, 사용팀, 사용자 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>사용일 <span className="text-red-500">*</span></Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !formData.usageDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {formData.usageDate ? format(new Date(formData.usageDate), "yyyy-MM-dd") : <span>날짜 선택</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={formData.usageDate ? new Date(formData.usageDate) : undefined}
                                        onSelect={(date) => setFormData({ ...formData, usageDate: date ? format(date, "yyyy-MM-dd") : "" })}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                            <Label>사용팀 <span className="text-red-500">*</span></Label>
                            {isFieldTeam ? (
                                <Input
                                    value={teams.find(t => t.id === myTeamId)?.name || ''}
                                    disabled
                                    className="bg-muted"
                                />
                            ) : (
                                <Select
                                    value={formData.teamId}
                                    onValueChange={(val) => setFormData({ ...formData, teamId: val, cableId: "" })}
                                    disabled={!!editingLog}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="팀 선택" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {teams.map((team) => (
                                            <SelectItem key={team.id} value={team.id}>
                                                {team.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>사용자</Label>
                            {isFieldTeam ? (
                                <Input
                                    value={formData.workerName}
                                    disabled
                                    className="bg-muted"
                                />
                            ) : (
                                <Select
                                    value={formData.workerName}
                                    onValueChange={(val) => setFormData({ ...formData, workerName: val })}
                                    disabled={!formData.teamId}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="사용자 선택" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {members.filter((m: any) => m.teamId === formData.teamId).map((member: any) => (
                                            <SelectItem key={member.id} value={member.name}>
                                                {member.name} ({member.username})
                                            </SelectItem>
                                        ))}
                                        {members.filter((m: any) => m.teamId === formData.teamId).length === 0 && (
                                            <SelectItem value="none" disabled>팀원 없음</SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    </div>

                    {/* 두 번째 행: 사용 드럼 선택, 설치 길이, 자투리 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>사용 드럼 선택 <span className="text-red-500">*</span></Label>
                            <Select
                                value={formData.cableId}
                                onValueChange={(val) => setFormData({ ...formData, cableId: val })}
                                disabled={(!isFieldTeam && !formData.teamId) || !!editingLog}
                            >
                                <SelectTrigger>
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
                                        <SelectItem key={cable.id} value={cable.id.toString()}>
                                            {cable.division ? `[${cable.division}] ` : ""}{cable.drumNo} ({cable.productName} / 잔량: {cable.remainingLength.toLocaleString()}m)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>설치 길이 (m) <span className="text-red-500">*</span></Label>
                            <Input
                                type="number"
                                value={formData.installLength || ''}
                                onChange={(e) => setFormData({ ...formData, installLength: Number(e.target.value) })}
                                min={0}
                                placeholder="0"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>자투리 (m)</Label>
                            <Input
                                type="number"
                                value={formData.wasteLength || ''}
                                onChange={(e) => setFormData({ ...formData, wasteLength: Number(e.target.value) })}
                                min={0}
                                placeholder="0"
                            />
                        </div>
                    </div>

                    {/* 선택된 드럼 정보 */}
                    {selectedCable && (
                        <div className="text-sm text-blue-600 font-medium p-2 bg-blue-50 rounded">
                            선택된 드럼: {selectedCable.drumNo} ({selectedCable.productName} / 잔량 {selectedCable.remainingLength.toLocaleString()}m)
                        </div>
                    )}

                    {/* 세 번째 행: 공사번호, 공사명 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>공사번호</Label>
                            <Input
                                value={formData.projectCode || ''}
                                onChange={(e) => setFormData({ ...formData, projectCode: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>공사명</Label>
                            <Input
                                value={formData.projectNameUsage}
                                onChange={(e) => setFormData({ ...formData, projectNameUsage: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* 첨부파일 */}
                    <div className="grid grid-cols-1 md:grid-cols-4 items-start gap-4">
                        <Label className="md:text-right pt-2">첨부파일</Label>
                        <div className="col-span-1 md:col-span-3">
                            <div className="relative">
                                <Input
                                    id="optical-usage-file-upload"
                                    type="file"
                                    accept="image/*,application/pdf"
                                    multiple
                                    className="hidden"
                                    onChange={async (e) => {
                                        const files = Array.from(e.target.files || []);
                                        if (files.length === 0) return;

                                        const currentCount = formData.attachments.length;
                                        if (currentCount + files.length > 4) {
                                            toast({
                                                title: "파일 개수 초과",
                                                description: `최대 4개까지 첨부할 수 있습니다. (현재 ${currentCount}개)`,
                                                variant: "destructive"
                                            });
                                            e.target.value = '';
                                            return;
                                        }

                                        const newAttachments = [...formData.attachments];
                                        let compressedCount = 0;

                                        for (const file of files) {
                                            if (file.size > 10 * 1024 * 1024) {
                                                toast({
                                                    title: "용량 초과",
                                                    description: `${file.name} 파일이 10MB를 초과합니다.`,
                                                    variant: "destructive"
                                                });
                                                continue;
                                            }

                                            try {
                                                let processedFile: { name: string; data: string };

                                                if (file.type.startsWith('image/')) {
                                                    const compressed = await compressImage(file, {
                                                        maxWidth: 1920,
                                                        maxHeight: 1920,
                                                        quality: 0.8,
                                                        maxSizeMB: 5
                                                    });
                                                    processedFile = compressed;
                                                    compressedCount++;
                                                } else {
                                                    const base64 = await new Promise<string>((resolve, reject) => {
                                                        const reader = new FileReader();
                                                        reader.onload = () => resolve(reader.result as string);
                                                        reader.onerror = reject;
                                                        reader.readAsDataURL(file);
                                                    });
                                                    processedFile = { name: file.name, data: base64 };
                                                }

                                                newAttachments.push(processedFile);
                                            } catch (error: any) {
                                                toast({
                                                    title: "파일 업로드 실패",
                                                    description: error.message || "파일을 처리할 수 없습니다",
                                                    variant: "destructive"
                                                });
                                            }
                                        }

                                        if (compressedCount > 0) {
                                            toast({
                                                title: "이미지 압축 완료",
                                                description: `${compressedCount}개 이미지가 압축되었습니다`,
                                            });
                                        }

                                        setFormData({ ...formData, attachments: newAttachments });
                                        e.target.value = '';
                                    }}
                                />
                                {formData.attachments.length < 4 && (
                                    <label
                                        htmlFor="optical-usage-file-upload"
                                        className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-primary/30 rounded-lg cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                                    >
                                        <Upload className="h-5 w-5 text-primary" />
                                        <span className="text-sm font-medium text-primary">
                                            파일 선택 ({formData.attachments.length}/4) - 이미지, PDF, 엑셀
                                        </span>
                                    </label>
                                )}
                            </div>

                            <div className="space-y-2 mt-2">
                                {formData.attachments.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                                        <span className="text-sm text-muted-foreground truncate flex-1">
                                            📎 {file.name}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => {
                                                const newAttachments = formData.attachments.filter((_, i) => i !== index);
                                                setFormData({ ...formData, attachments: newAttachments });
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>



                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            취소
                        </Button>
                        <Button type="submit" disabled={usageMutation.isPending}>
                            {usageMutation.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    처리중...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    {editingLog ? "수정" : "등록"}
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
