import React, { useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import { Loader2, ArrowDownToLine, Search, Plus, MoreHorizontal, Pencil, Download } from "lucide-react";
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { OpticalCableFormDialog } from "@/components/OpticalCableFormDialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { OpticalCable, OpticalCableLog } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";

const handleDownload = async (logId: string, fileName: string) => {
    try {
        const fullLog = await queryClient.fetchQuery<OpticalCableLog>({
            queryKey: [`/api/optical-cables/logs/${logId}`],
            staleTime: 0
        });

        if (fullLog && fullLog.attributes) {
            const attrs = JSON.parse(fullLog.attributes);
            if (attrs.attachment && attrs.attachment.data) {
                const link = document.createElement('a');
                link.href = attrs.attachment.data;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        }
    } catch (error) {
        console.error("Failed to download file", error);
        alert("파일 다운로드에 실패했습니다.");
    }
};

export default function OpticalIncoming() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { tenants, currentTenant } = useAppContext();
    const isTenantOwner = tenants.find(t => t.id === currentTenant)?.role === 'owner';
    const [editingCable, setEditingCable] = useState<OpticalCable | null>(null);

    const { widths, startResizing } = useColumnResize({
        checkbox: 40,
        division: 60,           // 사업
        category: 50,           // 구분
        receivedDate: 95,       // 입고일자
        projectCode: 120,       // 공사코드 (T210177093003 형식)
        projectName: 250,       // 공사명 (긴 텍스트)
        manufacturer: 90,       // 제조사
        manufactureYear: 70,    // 제조연도
        spec: 50,               // 규격
        coreCount: 50,          // 코어
        drumNo: 70,             // 제조번호
        location: 70,           // 위치
        totalLength: 90,        // 총길이
        remark: 80,             // 비고
        createdBy: 80,          // 입력자
        attachment: 60,         // 첨부
        actions: 50             // 작업
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

    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            if (!editingCable) return;
            const res = await apiRequest("PATCH", `/api/optical-cables/${editingCable.id}`, data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables/logs"] });
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables"] });
            toast({
                title: "수정 완료",
                description: "광케이블 정보가 수정되었습니다.",
            });
            setEditingCable(null);
        },
        onError: (error: Error) => {
            toast({
                title: "수정 실패",
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

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return apiRequest("DELETE", `/api/optical-cables/logs/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables/logs"] });
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables"] });
            toast({ title: "입고 내역이 삭제되었습니다" });
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
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.division }}>
                                    사업
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("division", e)} />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.category }}>
                                    구분
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("category", e)} />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.receivedDate }}>
                                    입고일자
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("receivedDate", e)} />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.projectCode }}>
                                    공사코드
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("projectCode", e)} />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.projectName }}>
                                    공사명
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("projectName", e)} />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.manufacturer }}>
                                    제조사
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("manufacturer", e)} />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.manufactureYear }}>
                                    제조연도
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("manufactureYear", e)} />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.spec }}>
                                    규격
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("spec", e)} />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.coreCount }}>
                                    코어
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("coreCount", e)} />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.drumNo }}>
                                    제조번호
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("drumNo", e)} />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.location }}>
                                    위치
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("location", e)} />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.totalLength }}>
                                    케이블용량
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("totalLength", e)} />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.remark }}>
                                    비고
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("remark", e)} />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.createdBy }}>
                                    입력자
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("createdBy", e)} />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.attachment }}>
                                    첨부
                                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("attachment", e)} />
                                </TableHead>
                                <TableHead className="font-semibold text-center align-middle bg-background" style={{ width: widths.actions }}></TableHead>

                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredLogs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={18} className="text-center py-8 text-muted-foreground">
                                        입고 내역이 없습니다.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredLogs.map((log) => (
                                    <TableRow key={log.id} className="h-6 [&_td]:py-0">
                                        <TableCell className="text-center align-middle">
                                            {isTenantOwner ? (
                                                <Checkbox
                                                    checked={selectedIds.has(log.id)}
                                                    onCheckedChange={() => toggleSelect(log.id)}
                                                />
                                            ) : null}
                                        </TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap">{log.cable?.division || 'SKT'}</TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap">{log.cable?.category || ''}</TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap">
                                            {log.usageDate
                                                ? format(new Date(log.usageDate), 'yyyy-MM-dd')
                                                : format(new Date(log.createdAt), 'yyyy-MM-dd')}
                                        </TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap">{(log as any).projectCode || ''}</TableCell>
                                        <TableCell className="text-left align-middle whitespace-nowrap">{(log as any).projectNameUsage || log.cable?.projectName || ''}</TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap">{log.cable?.manufacturer || ''}</TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap">{log.cable?.manufactureYear || ''}</TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap">{log.cable?.spec || ''}</TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap">{log.cable?.coreCount || ''}</TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap font-medium">{log.cable?.drumNo || ''}</TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap">{log.cable?.location || ''}</TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap">{String(log.cable?.totalLength || '')}</TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap" style={{ maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.cable?.remark || ''}</TableCell>
                                        <TableCell className="text-center align-middle">
                                            {(log as any).createdByName || "-"}
                                        </TableCell>
                                        <TableCell className="text-center align-middle">
                                            {(() => {
                                                try {
                                                    const attrs = JSON.parse((log as any).attributes || "{}");
                                                    if (attrs.attachment) {
                                                        return (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 w-8 p-0"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDownload(log.id, attrs.attachment.name);
                                                                }}
                                                                title={attrs.attachment.name}
                                                            >
                                                                <Download className="h-4 w-4" />
                                                            </Button>
                                                        );
                                                    }
                                                    return "-";
                                                } catch {
                                                    return "-";
                                                }
                                            })()}
                                        </TableCell>
                                        <TableCell className="text-center align-middle">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-6 w-6 p-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>입고 관리</DropdownMenuLabel>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            if (log.cable) {
                                                                setEditingCable(log.cable);
                                                            }
                                                        }}
                                                    >
                                                        <Pencil className="mr-2 h-4 w-4" />
                                                        수정
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-destructive"
                                                        onClick={() => {
                                                            if (confirm('이 입고 내역을 삭제하시겠습니까?')) {
                                                                deleteMutation.mutate(log.id);
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        삭제
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>

                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </table>
                </div>
            </div>

            <OpticalCableFormDialog
                open={!!editingCable}
                onOpenChange={(open) => {
                    if (!open) setEditingCable(null);
                }}
                editingItem={editingCable}
                onSubmit={(data) => updateMutation.mutate(data)}
            />
        </div>
    );
}
