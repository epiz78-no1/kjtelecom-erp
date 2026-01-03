import React, { useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import { Loader2, ArrowUpFromLine, Search, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
    TableHeader,
    TableRow,
    TableHead,
    TableBody,
    TableCell,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useColumnResize } from "@/hooks/useColumnResize";
import { Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useAppContext } from "@/contexts/AppContext";
import OpticalAssignmentDialog from "@/components/OpticalAssignmentDialog";
import type { OpticalCable, OpticalCableLog } from "@shared/schema";

export default function OpticalOutgoing() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { teams, tenants, currentTenant } = useAppContext();
    const isTenantOwner = tenants.find(t => t.id === currentTenant)?.role === 'owner';

    const { widths, startResizing } = useColumnResize({
        checkbox: 40,
        date: 100,
        team: 120,
        drumNo: 150,
        spec: 150,
        amount: 80,
        mgmtNo: 120
    });

    const { data: logs = [], isLoading } = useQuery<(OpticalCableLog & { cable: OpticalCable | null })[]>({
        queryKey: ["/api/optical-cables/logs"],
    });

    const outgoingLogs = logs.filter(l => l.logType === 'assign');

    const bulkDeleteMutation = useMutation({
        mutationFn: async (ids: string[]) => {
            return apiRequest("POST", "/api/optical-cables/logs/bulk-delete", { ids });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables/logs"] });
            toast({ title: `${selectedIds.size}개 항목이 삭제되었습니다` });
            setSelectedIds(new Set());
        },
        onError: () => {
            toast({ title: "삭제 실패", variant: "destructive" });
        },
    });

    const filteredLogs = outgoingLogs.filter(log => {
        const searchLower = searchQuery.toLowerCase();
        const drumNo = log.cable?.drumNo?.toLowerCase() || '';
        const spec = log.cable?.spec?.toLowerCase() || '';
        const teamName = teams.find(t => t.id === log.teamId)?.name?.toLowerCase() || '';
        return drumNo.includes(searchLower) || spec.includes(searchLower) || teamName.includes(searchLower);
    });

    const allSelected = filteredLogs.length > 0 && filteredLogs.every(log => selectedIds.has(log.id));

    const toggleSelectAll = () => {
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredLogs.map(log => log.id)));
        }
    };

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleBulkDelete = () => {
        if (confirm(`선택한 ${selectedIds.size}개 항목을 삭제하시겠습니까?`)) {
            bulkDeleteMutation.mutate(Array.from(selectedIds));
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
        <div className="flex flex-col h-full space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        출고 내역
                    </h1>
                    <p className="text-muted-foreground">현장팀으로 불출된 광케이블 이력을 조회합니다.</p>
                </div>
                <OpticalAssignmentDialog
                    trigger={
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            신규 출고 등록
                        </Button>
                    }
                />
            </div>

            <div className="flex items-center gap-4">
                <div className="relative max-w-sm flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="드럼번호, 팀명 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                {selectedIds.size > 0 && isTenantOwner && (
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleBulkDelete}
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        선택 삭제 ({selectedIds.size})
                    </Button>
                )}
            </div>

            <div className="flex-1 rounded-md border overflow-hidden">
                <div className="h-full overflow-auto relative pb-20">
                    <table className="w-full caption-bottom text-sm table-fixed">
                        <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                            <TableRow className="h-8">
                                <TableHead className="text-center align-middle bg-background" style={{ width: widths.checkbox }}>
                                    {isTenantOwner ? (
                                        <Checkbox
                                            checked={allSelected}
                                            onCheckedChange={toggleSelectAll}
                                        />
                                    ) : null}
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.date }}>
                                    출고일자
                                    <div
                                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                                        onMouseDown={(e) => startResizing("date", e)}
                                    />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.team }}>
                                    수령 현장팀
                                    <div
                                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                                        onMouseDown={(e) => startResizing("team", e)}
                                    />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.drumNo }}>
                                    드럼번호
                                    <div
                                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                                        onMouseDown={(e) => startResizing("drumNo", e)}
                                    />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.spec }}>
                                    규격
                                    <div
                                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                                        onMouseDown={(e) => startResizing("spec", e)}
                                    />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.amount }}>
                                    출고량(m)
                                    <div
                                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                                        onMouseDown={(e) => startResizing("amount", e)}
                                    />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.mgmtNo }}>
                                    관리번호
                                    <div
                                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                                        onMouseDown={(e) => startResizing("mgmtNo", e)}
                                    />
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredLogs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        출고 내역이 없습니다.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredLogs.map((log) => {
                                    const teamName = teams.find(t => t.id === log.teamId)?.name || `Team ${log.teamId}`;
                                    return (
                                        <TableRow key={log.id} className="h-8 [&_td]:py-1">
                                            <TableCell className="text-center align-middle">
                                                {isTenantOwner ? (
                                                    <Checkbox
                                                        checked={selectedIds.has(log.id)}
                                                        onCheckedChange={() => toggleSelect(log.id)}
                                                    />
                                                ) : null}
                                            </TableCell>
                                            <TableCell className="text-center align-middle whitespace-nowrap">
                                                {log.usageDate
                                                    ? format(new Date(log.usageDate), 'yyyy-MM-dd')
                                                    : format(new Date(log.createdAt), 'yyyy-MM-dd')}
                                            </TableCell>
                                            <TableCell className="text-center align-middle whitespace-nowrap font-bold text-blue-600">{teamName}</TableCell>
                                            <TableCell className="text-center align-middle whitespace-nowrap font-medium">{log.cable?.drumNo || '-'}</TableCell>
                                            <TableCell className="text-center align-middle whitespace-nowrap">{log.cable?.spec || '-'}</TableCell>
                                            <TableCell className="text-right font-bold whitespace-nowrap">
                                                {(log.afterRemaining || 0).toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-center align-middle whitespace-nowrap text-muted-foreground text-xs">{log.cable?.managementNo || '-'}</TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </table>
                </div>
            </div>
        </div>
    );
}
