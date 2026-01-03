import React, { useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import { Loader2, ArrowDownToLine, Search, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
    TableHeader,
    TableRow,
    TableHead,
    TableBody,
    TableCell,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useAppContext } from "@/contexts/AppContext";
import { useColumnResize } from "@/hooks/useColumnResize";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { OpticalCableFormDialog } from "@/components/OpticalCableFormDialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { OpticalCable, OpticalCableLog } from "@shared/schema";

export default function OpticalIncoming() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { tenants, currentTenant } = useAppContext();
    const isTenantOwner = tenants.find(t => t.id === currentTenant)?.role === 'owner';

    const { widths, startResizing } = useColumnResize({
        checkbox: 40,
        date: 100,
        drumNo: 150,
        spec: 150,
        amount: 80,
        manufacturer: 120,
        mgmtNo: 120
    });

    const { data: logs = [], isLoading } = useQuery<(OpticalCableLog & { cable: OpticalCable | null })[]>({
        queryKey: ["/api/optical-cables/logs"],
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiRequest("POST", "/api/optical-cables", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables/logs"] });
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables"] });
            toast({
                title: "입고 완료",
                description: "새로운 광케이블 드럼이 등록되었습니다.",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "입고 실패",
                description: error.message,
                variant: "destructive",
            });
        }
    });

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

    const incomingLogs = logs.filter(l => l.logType === 'receive' || l.logType === 'create');

    const filteredLogs = incomingLogs.filter(log => {
        const searchLower = searchQuery.toLowerCase();
        const drumNo = log.cable?.drumNo?.toLowerCase() || '';
        const spec = log.cable?.spec?.toLowerCase() || '';
        return drumNo.includes(searchLower) || spec.includes(searchLower);
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
                        입고 내역
                    </h1>
                    <p className="text-muted-foreground">광케이블 드럼의 입고 이력을 조회합니다.</p>
                </div>
                <OpticalCableFormDialog
                    trigger={
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            신규 입고 등록
                        </Button>
                    }
                    onSubmit={(data) => createMutation.mutate(data)}
                />
            </div>

            <div className="flex items-center gap-4">
                <div className="relative max-w-sm flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="드럼번호, 규격 검색..."
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
                                    입고일자
                                    <div
                                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                                        onMouseDown={(e) => startResizing("date", e)}
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
                                    입고량(m)
                                    <div
                                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                                        onMouseDown={(e) => startResizing("amount", e)}
                                    />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.manufacturer }}>
                                    제조사
                                    <div
                                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                                        onMouseDown={(e) => startResizing("manufacturer", e)}
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
                                        입고 내역이 없습니다.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredLogs.map((log) => (
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
                                        <TableCell className="text-center align-middle whitespace-nowrap font-medium">{log.cable?.drumNo || '-'}</TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap">{log.cable?.spec || '-'}</TableCell>
                                        <TableCell className="text-right font-bold whitespace-nowrap">
                                            {(log.afterRemaining || 0).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap">{log.cable?.manufacturer || '-'}</TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap text-muted-foreground text-xs">{log.cable?.managementNo || '-'}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </table>
                </div>
            </div>
        </div>
    );
}
