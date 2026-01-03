import React, { useState } from 'react';
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAppContext } from "@/contexts/AppContext";
import { Loader2, Scissors, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { OpticalCable, OpticalCableLog } from "@shared/schema";

export default function FieldOpticalUsage() {
    const { toast } = useToast();
    const { tenants, currentTenant, user } = useAppContext();
    const activeTenant = tenants.find(t => t.id === currentTenant);
    const myTeamId = activeTenant?.teamId;

    const [formData, setFormData] = useState({
        cableId: "",
        usageDate: new Date().toISOString().split('T')[0],
        installLength: 0,
        wasteLength: 0,
        sectionName: "",
        projectNameUsage: "",
        workerName: user?.username || "",
    });

    const { data: cables = [], isLoading } = useQuery<(OpticalCable & { logs: OpticalCableLog[] })[]>({
        queryKey: ["/api/optical-cables"],
    });

    const usageMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiRequest("POST", `/api/optical-cables/${data.cableId}/usage`, {
                ...data,
                logType: "usage"
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables"] });
            toast({ title: "사용 실적이 등록되었습니다" });
            // Reset form (except date/worker)
            setFormData(prev => ({
                ...prev,
                cableId: "",
                installLength: 0,
                wasteLength: 0,
                sectionName: "",
                projectNameUsage: ""
            }));
        },
        onError: (error: Error) => {
            toast({ title: "등록 실패", description: error.message, variant: "destructive" });
        }
    });

    if (!myTeamId) {
        return (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
                소속된 현장팀 정보가 없습니다.
            </div>
        );
    }

    const myCables = cables.filter(c => c.currentTeamId === myTeamId && c.status === 'assigned');

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.cableId) {
            toast({ title: "드럼을 선택해주세요", variant: "destructive" });
            return;
        }
        const totalUsed = Number(formData.installLength) + Number(formData.wasteLength);
        if (totalUsed <= 0) {
            toast({ title: "사용 길이를 입력해주세요", variant: "destructive" });
            return;
        }

        // Check remaining check? Backend handles it but better UX here
        const selectedCable = myCables.find(c => c.id.toString() === formData.cableId);
        if (selectedCable && totalUsed > selectedCable.remainingLength) {
            toast({ title: "잔량보다 많이 사용할 수 없습니다", variant: "destructive" });
            return;
        }

        usageMutation.mutate({
            ...formData,
            installLength: Number(formData.installLength),
            wasteLength: Number(formData.wasteLength),
            workerName: formData.workerName // Ensure this is sent
        });
    };

    const selectedCable = myCables.find(c => c.id.toString() === formData.cableId);

    return (
        <div className="flex flex-col h-full space-y-6 max-w-2xl mx-auto w-full">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Scissors className="h-6 w-6" />
                    현장 사용 등록 (광케이블)
                </h1>
                <p className="text-muted-foreground">광케이블 포설 및 접속 작업 실적을 등록합니다.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>사용 내역 입력</CardTitle>
                    <CardDescription>
                        보유 중인 드럼에서 사용한 길이를 입력하세요. 잔량이 0이 되면 자동으로 '사용 완료' 처리됩니다.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label>사용 드럼 선택 <span className="text-red-500">*</span></Label>
                            <Select
                                value={formData.cableId}
                                onValueChange={(val) => setFormData({ ...formData, cableId: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="드럼번호를 선택하세요" />
                                </SelectTrigger>
                                <SelectContent>
                                    {myCables.map((cable) => (
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

                        <div className="space-y-2">
                            <Label>공사명/구간명</Label>
                            <Input
                                placeholder="예: A전주 ~ B전주 구간"
                                value={formData.sectionName}
                                onChange={(e) => setFormData({ ...formData, sectionName: e.target.value })}
                            />
                        </div>

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

                        <Button type="submit" className="w-full" disabled={usageMutation.isPending}>
                            <Save className="h-4 w-4 mr-2" />
                            사용 실적 등록
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
