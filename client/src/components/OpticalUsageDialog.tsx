import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAppContext } from "@/contexts/AppContext";
import { Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
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
        sectionName: "",
        projectNameUsage: "",
        workerName: user?.username || "",
    });

    const { data: cables = [] } = useQuery<(OpticalCable & { logs: OpticalCableLog[] })[]>({
        queryKey: ["/api/optical-cables"],
    });

    useEffect(() => {
        if (editingLog) {
            setFormData({
                cableId: editingLog.cableId,
                teamId: editingLog.teamId || myTeamId || "",
                usageDate: editingLog.usageDate || new Date(editingLog.createdAt).toISOString().split('T')[0],
                installLength: editingLog.installLength || 0,
                wasteLength: editingLog.wasteLength || 0,
                sectionName: (editingLog as any).sectionName || "",
                projectNameUsage: (editingLog as any).projectNameUsage || "",
                workerName: (editingLog as any).workerName || user?.username || "",
            });
        } else {
            setFormData({
                cableId: "",
                teamId: myTeamId || "",
                usageDate: new Date().toISOString().split('T')[0],
                installLength: 0,
                wasteLength: 0,
                sectionName: "",
                projectNameUsage: "",
                workerName: user?.username || "",
            });
        }
    }, [editingLog, myTeamId, user, open]);

    const availableCables = cables.filter(c => {
        if (c.status !== 'assigned') return false;
        if (isFieldTeam && myTeamId) {
            return c.currentTeamId === myTeamId;
        }
        if (formData.teamId) {
            return c.currentTeamId === formData.teamId;
        }
        return true;
    });

    const usageMutation = useMutation({
        mutationFn: async (data: any) => {
            if (editingLog) {
                return apiRequest("PATCH", `/api/optical-cable-logs/${editingLog.id}`, data);
            } else {
                return apiRequest("POST", `/api/optical-cables/${data.cableId}/usage`, {
                    ...data,
                    logType: "usage"
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables"] });
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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{editingLog ? "사용 내역 수정" : "사용 내역 입력"}</DialogTitle>
                    <DialogDescription>
                        광케이블 포설 및 접속 작업 실적을 {editingLog ? "수정" : "등록"}합니다.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* 팀 선택 (관리자만) */}
                    {!isFieldTeam && (
                        <div className="space-y-2">
                            <Label>현장팀 선택 <span className="text-red-500">*</span></Label>
                            <Select
                                value={formData.teamId}
                                onValueChange={(val) => setFormData({ ...formData, teamId: val, cableId: "" })}
                                disabled={!!editingLog}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="팀을 선택하세요" />
                                </SelectTrigger>
                                <SelectContent>
                                    {teams.map((team) => (
                                        <SelectItem key={team.id} value={team.id}>
                                            {team.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* 드럼 선택 */}
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
                                            : "드럼번호를 선택하세요"
                                } />
                            </SelectTrigger>
                            <SelectContent>
                                {availableCables.map((cable) => (
                                    <SelectItem key={cable.id} value={cable.id.toString()}>
                                        {cable.drumNo} ({cable.spec} / 잔량: {cable.remainingLength.toLocaleString()}m)
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {selectedCable && (
                            <div className="text-sm text-blue-600 font-medium">
                                선택된 드럼: {selectedCable.spec}, 잔량 {selectedCable.remainingLength}m
                            </div>
                        )}
                    </div>

                    {/* 사용 길이 */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>설치 길이 (m) <span className="text-red-500">*</span></Label>
                            <Input
                                type="number"
                                value={formData.installLength}
                                onChange={(e) => setFormData({ ...formData, installLength: Number(e.target.value) })}
                                min={0}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>폐기/자투리 길이 (m)</Label>
                            <Input
                                type="number"
                                value={formData.wasteLength}
                                onChange={(e) => setFormData({ ...formData, wasteLength: Number(e.target.value) })}
                                min={0}
                            />
                        </div>
                    </div>

                    {/* 공사명 */}
                    <div className="space-y-2">
                        <Label>공사명</Label>
                        <Input
                            placeholder="예: OO아파트 광케이블 포설공사"
                            value={formData.projectNameUsage}
                            onChange={(e) => setFormData({ ...formData, projectNameUsage: e.target.value })}
                        />
                    </div>

                    {/* 구간명 */}
                    <div className="space-y-2">
                        <Label>구간명</Label>
                        <Input
                            placeholder="예: A전주 ~ B전주 구간"
                            value={formData.sectionName}
                            onChange={(e) => setFormData({ ...formData, sectionName: e.target.value })}
                        />
                    </div>

                    {/* 작업일자 및 작업자 */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>작업일자</Label>
                            <Input
                                type="date"
                                value={formData.usageDate}
                                onChange={(e) => setFormData({ ...formData, usageDate: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>작업자</Label>
                            <Input
                                value={formData.workerName}
                                onChange={(e) => setFormData({ ...formData, workerName: e.target.value })}
                            />
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
