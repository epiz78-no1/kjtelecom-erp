import { Download, Loader2, Package } from "lucide-react";
import { useState } from "react";
import { SearchInput } from "@/components/ui/SearchInput";
import { FieldTeamCard } from "@/components/FieldTeamCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/contexts/AppContext";
import { useQuery } from "@tanstack/react-query";
import { exportToExcel } from "@/lib/excel";
import { useToast } from "@/hooks/use-toast";
import { useTableFilters } from "@/hooks/useTableFilters";
import { useColumnResize } from "@/hooks/useColumnResize";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export default function TeamOutgoingDemolition() {
    const { toast } = useToast();
    const { user, divisions, teams: allTeams, checkPermission, tenants, currentTenant } = useAppContext();
    const canWrite = checkPermission("outgoing", "write");

    const currentTenantData = tenants.find(t => t.id === currentTenant);
    const isFieldTeam = currentTenantData?.permissions &&
        currentTenantData.permissions.usage === 'write' &&
        currentTenantData.permissions.incoming === 'none' &&
        currentTenantData.permissions.outgoing === 'none' &&
        currentTenantData.permissions.inventory === 'none';

    const myTeamId = currentTenantData?.teamId;
    const myTeam = allTeams.find(t => t.id === myTeamId);

    const { data: logs = [], isLoading } = useQuery<any[]>({
        queryKey: ["/api/demolition-logs"],
        select: (data) => data.filter((log: any) => ['outgoing', 'usage'].includes(log.logType)),
    });

    const { widths, startResizing } = useColumnResize({
        division: 80,
        teamCategory: 120,
        productName: 200,
        specification: 150,
        quantity: 100
    });

    // Aggregate stock
    const stockMap = new Map<string, any>();

    logs.forEach((log: any) => {
        const d = (log.material?.division || "SKT").trim();
        const t = (log.team?.name || "미지정").trim();
        const p = (log.material?.productName || "").trim();
        const s = (log.material?.specification || "").trim();

        if (!p) return;

        const key = `${d}|${t}|${p}|${s}`;
        if (!stockMap.has(key)) {
            stockMap.set(key, {
                id: key,
                division: d,
                teamCategory: t,
                productName: p,
                specification: s,
                quantity: 0
            });
        }
        stockMap.get(key).quantity += (log.usedQuantity || 0);
    });

    // Convert to array and filter out zero stock (if any)
    const allStockItems = Array.from(stockMap.values())
        .filter(item => item.quantity > 0)
        .filter(item => !isFieldTeam || (myTeam && item.teamCategory === myTeam.name));

    const {
        searchQuery,
        setSearchQuery,
        selectedDivision,
        setSelectedDivision,
        selectedCategory: selectedTeam,
        setSelectedCategory: setSelectedTeam,
        filteredItems: filteredStock,
        categories: uniqueTeams
    } = useTableFilters(allStockItems, {
        searchFields: ["productName", "teamCategory"],
        divisionField: "division",
        categoryField: "teamCategory"
    });

    const uniqueDivisions = ["전체", ...Array.from(new Set(allStockItems.map(item => item.division))).filter(Boolean)];

    const handleExportExcel = () => {
        const dataToExport = filteredStock.map(item => ({
            "사업": item.division,
            "현장팀": item.teamCategory,
            "품명": item.productName,
            "규격": item.specification,
            "출고 수량": item.quantity
        }));

        exportToExcel(dataToExport, "현장팀_철거자재_출고현황");
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
            {/* Desktop View */}
            <div className="hidden md:flex flex-col h-full">
                <div className="flex-shrink-0 space-y-4 pb-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold">현장팀별 철거자재 출고 현황</h1>
                            <p className="text-muted-foreground">각 현장팀에 출고된 철거자재 수량을 조회합니다</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {canWrite && !isFieldTeam && (
                                <>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 border-green-600 text-green-600 hover:bg-green-50"
                                        onClick={handleExportExcel}
                                    >
                                        <Download className="h-3 w-3 mr-1" />
                                        Excel
                                    </Button>
                                </>
                            )}
                            <div className="w-[180px]">
                                <Select value={selectedDivision} onValueChange={setSelectedDivision}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="사업부 선택" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="전체">전체</SelectItem>
                                        {uniqueDivisions.filter(d => d !== "전체").map(d => (
                                            <SelectItem key={d} value={d}>{d}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {!isFieldTeam && (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            {allTeams
                                .filter((t: any) => {
                                    if (selectedDivision === "전체") return true;
                                    const division = divisions?.find(d => d.id === t.divisionId);
                                    return division?.name === selectedDivision;
                                })
                                .sort((a: any, b: any) => (b.lastActivity || "").localeCompare(a.lastActivity || ""))
                                .slice(0, 4)
                                .map((team: any) => {
                                    const teamStockCount = allStockItems.filter(item => item.teamCategory === team.name).length;

                                    return (
                                        <FieldTeamCard
                                            key={team.id}
                                            team={{ ...team, materialCount: teamStockCount }}
                                            onClick={(t) => setSelectedTeam(t.name === selectedTeam ? "전체" : t.name)}
                                        />
                                    );
                                })}
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                        <SearchInput
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="품명, 팀명 검색..."
                            className="flex-1 max-w-sm"
                        />
                        {!isFieldTeam && (
                            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                                <SelectTrigger className="w-48">
                                    <SelectValue placeholder="팀 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="전체">전체</SelectItem>
                                    {uniqueTeams.filter(t => t !== "전체").map((team) => (
                                        <SelectItem key={String(team)} value={String(team)}>
                                            {String(team)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </div>

                <div className="flex-1 rounded-md border overflow-hidden">
                    <div className="h-full overflow-auto relative">
                        <table className="w-full caption-bottom text-sm table-fixed">
                            <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                                <TableRow className="h-10">
                                    <TableHead className="font-semibold text-center align-middle bg-background relative select-none" style={{ width: widths.division }}>
                                        사업
                                        <div
                                            onMouseDown={(e) => startResizing('division', e)}
                                            className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                                        />
                                    </TableHead>
                                    <TableHead className="font-semibold text-center align-middle bg-background relative select-none" style={{ width: widths.teamCategory }}>
                                        현장팀
                                        <div
                                            onMouseDown={(e) => startResizing('teamCategory', e)}
                                            className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                                        />
                                    </TableHead>
                                    <TableHead className="font-semibold text-center align-middle bg-background relative select-none" style={{ width: widths.productName }}>
                                        품명
                                        <div
                                            onMouseDown={(e) => startResizing('productName', e)}
                                            className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                                        />
                                    </TableHead>
                                    <TableHead className="font-semibold text-center align-middle bg-background relative select-none" style={{ width: widths.specification }}>
                                        규격
                                        <div
                                            onMouseDown={(e) => startResizing('specification', e)}
                                            className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                                        />
                                    </TableHead>
                                    <TableHead className="font-semibold text-center align-middle bg-background relative select-none" style={{ width: widths.quantity }}>
                                        출고 수량
                                        <div
                                            onMouseDown={(e) => startResizing('quantity', e)}
                                            className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                                        />
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredStock.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            출고된 자재가 없습니다
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredStock.map((item) => (
                                        <TableRow key={item.id} className="h-10 hover:bg-muted/50">
                                            <TableCell className="text-center align-middle p-2">
                                                <div className="w-full truncate font-medium" title={item.division}>{item.division}</div>
                                            </TableCell>
                                            <TableCell className="text-center align-middle p-2">
                                                <div className="w-full truncate" title={item.teamCategory}>{item.teamCategory}</div>
                                            </TableCell>
                                            <TableCell className="text-center align-middle p-2">
                                                <div className="w-full truncate" title={item.productName}>{item.productName}</div>
                                            </TableCell>
                                            <TableCell className="text-center align-middle p-2">
                                                <div className="w-full truncate" title={item.specification}>{item.specification}</div>
                                            </TableCell>
                                            <TableCell className="text-center align-middle font-bold p-2">
                                                {item.quantity.toLocaleString()}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Mobile View */}
            <div className="md:hidden flex flex-col h-full overflow-hidden">
                {/* Mobile Header */}
                <div className="flex-shrink-0 p-4 border-b bg-background space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold">현장팀 재고 현황</h2>
                            <p className="text-xs text-muted-foreground">
                                총 {filteredStock.length}개 품목 / {filteredStock.reduce((acc, curr) => acc + curr.quantity, 0).toLocaleString()}개
                            </p>
                        </div>
                        {/* Division Select for Mobile */}
                        <Select value={selectedDivision} onValueChange={setSelectedDivision}>
                            <SelectTrigger className="w-[100px] h-8 text-xs">
                                <SelectValue placeholder="사업부" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="전체">전체</SelectItem>
                                {uniqueDivisions.filter(d => d !== "전체").map(d => (
                                    <SelectItem key={d} value={d}>{d}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex gap-2">
                        <SearchInput
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="품명, 규격 검색..."
                            className="flex-1"
                            size="sm"
                        />
                        {/* Team Filter for Admin on Mobile */}
                        {!isFieldTeam && (
                            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                                <SelectTrigger className="w-[100px] h-9 text-xs">
                                    <SelectValue placeholder="팀" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="전체">전체</SelectItem>
                                    {uniqueTeams.filter(t => t !== "전체").map((team) => (
                                        <SelectItem key={String(team)} value={String(team)}>
                                            {String(team)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </div>

                {/* Mobile Card List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/10">
                    {filteredStock.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                            <Package className="h-8 w-8 mb-2 opacity-50" />
                            <p className="text-sm">출고된 자재가 없습니다</p>
                        </div>
                    ) : (
                        filteredStock.map((item) => (
                            <div key={item.id} className="bg-card border rounded-lg p-3 shadow-sm">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="px-1.5 py-0 text-[10px] h-5">
                                            {item.division}
                                        </Badge>
                                        <span className="font-semibold text-sm truncate max-w-[180px]">
                                            {item.productName}
                                        </span>
                                    </div>
                                    {!isFieldTeam && (
                                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                            {item.teamCategory}
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-end justify-between">
                                    <div className="text-xs text-muted-foreground">
                                        {item.specification || "-"}
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-xs text-muted-foreground">수량:</span>
                                        <span className="text-base font-bold text-primary">
                                            {item.quantity.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
