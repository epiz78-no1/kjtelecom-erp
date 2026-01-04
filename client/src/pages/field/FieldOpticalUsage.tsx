import { useState, useMemo } from "react";
import { Search, Loader2, Trash2, Plus, Pencil, MoreHorizontal, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { exportToExcel } from "@/lib/excel";
import { useToast } from "@/hooks/use-toast";
import type { OpticalCable, OpticalCableLog } from "@shared/schema";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useAppContext } from "@/contexts/AppContext";
import { OpticalUsageDialog } from "@/components/OpticalUsageDialog";

export default function FieldOpticalUsage() {
    const { toast } = useToast();
    const { tenants, currentTenant, teams, checkPermission } = useAppContext();
    const isTenantOwner = tenants.find(t => t.id === currentTenant)?.role === 'owner';

    const [selectedCategory, setSelectedCategory] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingLog, setEditingLog] = useState<OpticalCableLog | null>(null);
    const [deleteLog, setDeleteLog] = useState<OpticalCableLog | null>(null);

    const canWrite = checkPermission("usage", "write");
    const currentTenantData = tenants.find(t => t.id === currentTenant);
    const isFieldTeam = currentTenantData?.permissions &&
        currentTenantData.permissions.usage === 'write' &&
        currentTenantData.permissions.incoming === 'none' &&
        currentTenantData.permissions.outgoing === 'none' &&
        currentTenantData.permissions.inventory === 'none';

    const canManage = canWrite && !isFieldTeam;
    const canRegister = true;

    const { data: cables = [], isLoading } = useQuery<(OpticalCable & { logs: OpticalCableLog[] })[]>({
        queryKey: ["/api/optical-cables"],
    });

    // Extract all usage logs
    const allLogs = useMemo(() => {
        const logs: (OpticalCableLog & { cable: OpticalCable })[] = [];
        cables.forEach(cable => {
            if (cable.logs) {
                cable.logs
                    .filter(log => log.logType === 'usage')
                    .forEach(log => {
                        logs.push({ ...log, cable });
                    });
            }
        });
        return logs.sort((a, b) => new Date(b.usageDate || b.createdAt).getTime() - new Date(a.usageDate || a.createdAt).getTime());
    }, [cables]);

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return apiRequest("DELETE", `/api/optical-cable-logs/${id}`, {});
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables"] });
            toast({ title: "사용 내역이 삭제되었습니다" });
            setDeleteLog(null);
        },
        onError: (error: any) => {
            toast({
                title: "삭제 실패",
                description: error?.message || "삭제 실패",
                variant: "destructive"
            });
        },
    });

    const bulkDeleteMutation = useMutation({
        mutationFn: async (ids: string[]) => {
            return Promise.all(ids.map(id => apiRequest("DELETE", `/api/optical-cable-logs/${id}`, {})));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables"] });
            toast({ title: `${selectedIds.size}건의 사용 내역이 삭제되었습니다` });
            setSelectedIds(new Set());
            setBulkDeleteOpen(false);
        },
        onError: (error: any) => {
            toast({
                title: "삭제 실패",
                description: error?.message || "삭제 실패",
                variant: "destructive"
            });
        },
    });

    const filteredLogs = useMemo(() => {
        return allLogs.filter(log => {
            const matchesCategory = selectedCategory === "all" || log.cable.division === selectedCategory;
            const matchesSearch = searchQuery === "" ||
                log.cable.drumNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.cable.spec?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (log as any).projectNameUsage?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (log as any).sectionName?.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCategory && matchesSearch;
        });
    }, [allLogs, selectedCategory, searchQuery]);

    const totalRecords = filteredLogs.length;
    const totalLength = filteredLogs.reduce((sum, log) => sum + (log.installLength || 0) + (log.wasteLength || 0), 0);

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredLogs.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredLogs.map(log => log.id)));
        }
    };

    const allSelected = filteredLogs.length > 0 && selectedIds.size === filteredLogs.length;

    const openAddDialog = () => {
        setEditingLog(null);
        setDialogOpen(true);
    };

    const openEditDialog = (log: OpticalCableLog) => {
        setEditingLog(log);
        setDialogOpen(true);
    };

    const handleExportExcel = () => {
        const dataToExport = filteredLogs.map(log => {
            const teamName = teams.find(t => t.id === log.teamId)?.name || '-';
            return {
                "사용일": log.usageDate || new Date(log.createdAt).toISOString().split('T')[0],
                "사업": log.cable.division,
                "팀": teamName,
                "공사명": (log as any).projectNameUsage || log.cable.projectName || '-',
                "구간명": (log as any).sectionName || '-',
                "제조번호": log.cable.drumNo,
                "규격": log.cable.spec,
                "설치(m)": log.installLength || 0,
                "폐기(m)": log.wasteLength || 0,
                "합계(m)": (log.installLength || 0) + (log.wasteLength || 0),
                "작업자": (log as any).workerName || '-',
                "입력자": (log as any).createdByName || '-'
            };
        });

        exportToExcel(dataToExport, "광케이블_사용등록내역");
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex-shrink-0 space-y-4 pb-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">자재 사용등록내역 (광케이블)</h1>
                        <p className="text-muted-foreground">현장팀 자재 사용 이력을 조회합니다</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="전체" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">전체</SelectItem>
                                <SelectItem value="SKT">SKT</SelectItem>
                                <SelectItem value="SKB">SKB</SelectItem>
                            </SelectContent>
                        </Select>
                        {canManage && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 border-green-600 text-green-600 hover:bg-green-50"
                                onClick={handleExportExcel}
                            >
                                <Download className="h-3 w-3 mr-1" />
                                Excel
                            </Button>
                        )}
                        {canRegister && (
                            <Button className="flex items-center gap-2" onClick={openAddDialog}>
                                <Plus className="h-4 w-4" />
                                등록
                            </Button>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="relative max-w-sm">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="제조번호, 규격, 공사명, 구간명 검색..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        {selectedIds.size > 0 && isTenantOwner && (
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setBulkDeleteOpen(true)}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                선택 삭제 ({selectedIds.size})
                            </Button>
                        )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">{totalRecords}</span>건 /
                        사용량 <span className="font-semibold text-foreground">{totalLength.toLocaleString()}</span>m
                    </div>
                </div>
            </div>

            <div className="flex-1 rounded-md border bg-background overflow-hidden relative">
                <div className="h-full overflow-auto">
                    <table className="w-full caption-bottom text-sm table-fixed">
                        <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                            <TableRow className="h-8">
                                <TableHead className="w-[40px] text-center align-middle bg-background">
                                    {isTenantOwner ? (
                                        <Checkbox
                                            checked={allSelected}
                                            onCheckedChange={toggleSelectAll}
                                        />
                                    ) : null}
                                </TableHead>
                                <TableHead className="font-semibold w-[100px] text-center align-middle bg-background">사용일</TableHead>
                                <TableHead className="font-semibold w-[60px] text-center align-middle bg-background">사업</TableHead>
                                <TableHead className="font-semibold w-[100px] text-center align-middle bg-background">팀</TableHead>
                                <TableHead className="font-semibold w-[150px] text-center align-middle bg-background">공사명</TableHead>
                                <TableHead className="font-semibold w-[120px] text-center align-middle bg-background">구간명</TableHead>
                                <TableHead className="font-semibold w-[100px] text-center align-middle bg-background">제조번호</TableHead>
                                <TableHead className="font-semibold w-[100px] text-center align-middle bg-background">규격</TableHead>
                                <TableHead className="font-semibold w-[70px] text-center align-middle bg-background">설치(m)</TableHead>
                                <TableHead className="font-semibold w-[70px] text-center align-middle bg-background">폐기(m)</TableHead>
                                <TableHead className="font-semibold w-[80px] text-center align-middle bg-background">작업자</TableHead>
                                <TableHead className="font-semibold w-[80px] text-center align-middle bg-background">입력자</TableHead>
                                <TableHead className="font-semibold w-[70px] text-center align-middle bg-background"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredLogs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                                        사용 내역이 없습니다
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredLogs.map((log) => {
                                    const teamName = teams.find(t => t.id === log.teamId)?.name || '-';
                                    return (
                                        <TableRow key={log.id} className="h-6 [&_td]:py-0">
                                            <TableCell className="text-center align-middle">
                                                {isTenantOwner ? (
                                                    <Checkbox
                                                        checked={selectedIds.has(log.id)}
                                                        onCheckedChange={() => toggleSelect(log.id)}
                                                    />
                                                ) : null}
                                            </TableCell>
                                            <TableCell className="text-center align-middle whitespace-nowrap">
                                                {log.usageDate || new Date(log.createdAt).toISOString().split('T')[0]}
                                            </TableCell>
                                            <TableCell className="text-center align-middle whitespace-nowrap">{log.cable.division}</TableCell>
                                            <TableCell className="text-center align-middle whitespace-nowrap">{teamName}</TableCell>
                                            <TableCell className="text-center align-middle max-w-[150px] truncate">
                                                {(log as any).projectNameUsage || log.cable.projectName || '-'}
                                            </TableCell>
                                            <TableCell className="text-center align-middle max-w-[120px] truncate">
                                                {(log as any).sectionName || '-'}
                                            </TableCell>
                                            <TableCell className="text-center align-middle whitespace-nowrap font-medium">
                                                {log.cable.drumNo}
                                            </TableCell>
                                            <TableCell className="text-center align-middle whitespace-nowrap">{log.cable.spec}</TableCell>
                                            <TableCell className="text-right align-middle whitespace-nowrap">
                                                {(log.installLength || 0).toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right align-middle whitespace-nowrap">
                                                {(log.wasteLength || 0).toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-center align-middle whitespace-nowrap">
                                                {(log as any).workerName || '-'}
                                            </TableCell>
                                            <TableCell className="text-center align-middle whitespace-nowrap">
                                                {(log as any).createdByName || '-'}
                                            </TableCell>
                                            <TableCell className="text-center align-middle">
                                                {(canManage || isFieldTeam) && (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => openEditDialog(log)}>
                                                                <Pencil className="mr-2 h-4 w-4" />
                                                                수정
                                                            </DropdownMenuItem>
                                                            {isTenantOwner && (
                                                                <DropdownMenuItem
                                                                    onClick={() => setDeleteLog(log)}
                                                                    className="text-destructive"
                                                                >
                                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                                    삭제
                                                                </DropdownMenuItem>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </table>
                </div>
            </div>

            {/* Dialogs */}
            <OpticalUsageDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                editingLog={editingLog}
            />

            <AlertDialog open={!!deleteLog} onOpenChange={() => setDeleteLog(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>사용 내역 삭제</AlertDialogTitle>
                        <AlertDialogDescription>
                            이 사용 내역을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteLog && deleteMutation.mutate(deleteLog.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            삭제
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>선택 항목 삭제</AlertDialogTitle>
                        <AlertDialogDescription>
                            선택한 {selectedIds.size}건의 사용 내역을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            삭제
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
