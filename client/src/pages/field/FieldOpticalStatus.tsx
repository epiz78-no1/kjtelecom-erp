import React, { useState } from 'react';
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAppContext } from "@/contexts/AppContext";
import { Loader2, Cable, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { OpticalCable, OpticalCableLog } from "@shared/schema";

export default function FieldOpticalStatus() {
    const { toast } = useToast();
    const { tenants, currentTenant } = useAppContext();
    const activeTenant = tenants.find(t => t.id === currentTenant);
    const myTeamId = activeTenant?.teamId;

    // Fetch all cables (filtered by tenant)
    const { data: cables = [], isLoading } = useQuery<(OpticalCable & { logs: OpticalCableLog[] })[]>({
        queryKey: ["/api/optical-cables"],
    });

    const returnMutation = useMutation({
        mutationFn: async (cableId: string) => {
            if (!myTeamId) throw new Error("Team ID not found");
            const res = await apiRequest("POST", `/api/optical-cables/${cableId}/return`, { teamId: myTeamId });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables"] });
            toast({ title: "본사로 반납 처리되었습니다" });
        },
        onError: (error: Error) => {
            toast({ title: "반납 실패", description: error.message, variant: "destructive" });
        }
    });

    if (!myTeamId) {
        return (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
                소속된 현장팀 정보가 없습니다.
            </div>
        );
    }

    // Filter for my team
    const myCables = cables.filter(c => c.currentTeamId === myTeamId && c.status === 'assigned');

    const handleReturn = (cable: OpticalCable) => {
        if (confirm(`${cable.drumNo} 드럼을 본사(자재팀)로 반납하시겠습니까?`)) {
            returnMutation.mutate(cable.id);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Cable className="h-6 w-6" />
                    현장 불출 현황 (광케이블)
                </h1>
                <p className="text-muted-foreground">현재 우리 팀이 보유한 광케이블 드럼 목록입니다.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>보유 드럼 목록 ({myCables.length}개)</CardTitle>
                    <CardDescription>사용 중인 드럼만 표시됩니다. 사용 완료된 드럼은 목록에서 사라집니다.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>드럼번호</TableHead>
                                <TableHead>규격</TableHead>
                                <TableHead className="text-right">총 길이</TableHead>
                                <TableHead className="text-right">현재 잔량</TableHead>
                                <TableHead className="text-right">액션</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {myCables.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        보유 중인 광케이블 드럼이 없습니다.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                myCables.map((cable) => (
                                    <TableRow key={cable.id}>
                                        <TableCell className="font-medium">{cable.drumNo}</TableCell>
                                        <TableCell>{cable.spec}</TableCell>
                                        <TableCell className="text-right">{cable.totalLength.toLocaleString()}m</TableCell>
                                        <TableCell className="text-right font-bold text-blue-600">{cable.remainingLength.toLocaleString()}m</TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleReturn(cable)}
                                                disabled={returnMutation.isPending}
                                            >
                                                <ArrowRightLeft className="mr-2 h-3 w-3" />
                                                반납
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
