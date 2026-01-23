import { Download, Loader2, Package } from "lucide-react";
import { useState } from "react";
import { SearchInput } from "@/components/ui/SearchInput";
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
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

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
        select: (data) => data.filter((log: any) => ['outgoing', 'usage', 'return', 'dispose'].includes(log.logType)),
    });

    const { widths, startResizing } = useColumnResize({
        division: 80,
        teamCategory: 90,
        productName: 300,
        specification: 400,
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

        const qty = log.usedQuantity || 0;
        if (log.logType === 'outgoing') {
            stockMap.get(key).quantity += qty;
        } else if (['usage', 'return', 'dispose'].includes(log.logType)) {
            stockMap.get(key).quantity -= qty;
        }
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
            "보유 수량": item.quantity
        }));

        exportToExcel(dataToExport, "현장팀_철거자재_보유현황");
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-zinc-950/50 p-2 overflow-hidden">
            {/* Desktop View */}
            <div className="hidden md:flex flex-col h-full">
                {/* Ultra Compact Header Section */}
                <div className="flex flex-col gap-2 flex-shrink-0 mb-2 pt-1">
                    <div className="flex items-center justify-between gap-2 px-1">
                        <div className="flex items-center gap-2">
                            <h1 className="text-base font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                현장팀 철거자재 보유
                                <span className="flex h-1.5 w-1.5 rounded-full bg-red-500 shadow-sm shadow-red-500/50 animate-pulse"></span>
                            </h1>
                            <div className="h-3 w-px bg-slate-200 dark:bg-slate-800"></div>
                            <span className="text-xs font-medium text-slate-500">{filteredStock.length} items</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <SearchInput
                                value={searchQuery}
                                onChange={setSearchQuery}
                                placeholder="품명, 팀명 검색..."
                                className="w-40 focus:w-56 h-7 text-xs rounded-md bg-white border-slate-200 focus:ring-1 focus:ring-primary/20 transition-all font-normal"
                            />

                            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>

                            <div className="w-[120px]">
                                <Select value={selectedDivision} onValueChange={setSelectedDivision}>
                                    <SelectTrigger className="h-7 text-xs rounded-md bg-white border-slate-200">
                                        <SelectValue placeholder="사업부" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="전체" className="text-xs">전체 사업부</SelectItem>
                                        {uniqueDivisions.filter(d => d !== "전체").map(d => (
                                            <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {!isFieldTeam && (
                                <div className="w-[140px]">
                                    <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                                        <SelectTrigger className="h-7 text-xs rounded-md bg-white border-slate-200">
                                            <SelectValue placeholder="팀 선택" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="전체" className="text-xs">전체 팀</SelectItem>
                                            {uniqueTeams.filter(t => t !== "전체").map((team) => (
                                                <SelectItem key={String(team)} value={String(team)} className="text-xs">
                                                    {String(team)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <TooltipProvider>
                                {canWrite && !isFieldTeam && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 rounded-md text-emerald-600 hover:bg-emerald-50 ml-1"
                                                onClick={handleExportExcel}
                                            >
                                                <Download className="h-3.5 w-3.5" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" className="text-xs">Excel 다운로드</TooltipContent>
                                    </Tooltip>
                                )}
                            </TooltipProvider>
                        </div>
                    </div>
                </div>

                {/* Main Table Area */}
                <div className="flex-1 rounded-3xl border border-slate-200 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-xl shadow-slate-200/50 dark:shadow-black/50 overflow-hidden flex flex-col relative z-0">
                    <div className="flex-1 overflow-auto custom-scrollbar relative">
                        <table className="w-full text-sm border-collapse table-fixed">
                            <TableHeader className="sticky top-0 bg-slate-50/95 backdrop-blur z-20 shadow-sm">
                                <TableRow className="h-10 border-b border-slate-200">
                                    <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.division }}>
                                        사업
                                        <div onMouseDown={(e) => startResizing('division', e)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" />
                                    </TableHead>
                                    <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.teamCategory }}>
                                        현장팀
                                        <div onMouseDown={(e) => startResizing('teamCategory', e)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" />
                                    </TableHead>
                                    <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.productName }}>
                                        품명
                                        <div onMouseDown={(e) => startResizing('productName', e)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" />
                                    </TableHead>
                                    <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.specification }}>
                                        규격
                                        <div onMouseDown={(e) => startResizing('specification', e)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" />
                                    </TableHead>
                                    <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.quantity }}>
                                        보유 수량
                                        <div onMouseDown={(e) => startResizing('quantity', e)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" />
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredStock.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-64 text-center text-muted-foreground flex flex-col items-center justify-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <Package className="h-6 w-6 text-slate-400 opacity-50" />
                                                <p className="font-medium">보유한 자재가 없습니다</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredStock.map((item) => (
                                        <TableRow key={item.id} className="group h-10 border-b border-slate-100 dark:border-zinc-800 transition-colors hover:bg-slate-50/80 text-xs">
                                            <TableCell className="text-center px-1 font-medium text-slate-700">{item.division}</TableCell>
                                            <TableCell className="text-center px-1 text-slate-600">{item.teamCategory}</TableCell>
                                            <TableCell className="text-center px-4 text-slate-700 font-medium truncate" title={item.productName}>{item.productName}</TableCell>
                                            <TableCell className="text-center px-1 text-slate-500" title={item.specification}>{item.specification}</TableCell>
                                            <TableCell className="text-center px-4 font-bold font-mono text-primary">{item.quantity.toLocaleString()}</TableCell>
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
                <div className="flex-shrink-0 p-4 border-b bg-background space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold">현장팀 재고 현황</h2>
                            <p className="text-xs text-muted-foreground">
                                총 {filteredStock.length}개 / {filteredStock.reduce((acc, curr) => acc + curr.quantity, 0).toLocaleString()}개
                            </p>
                        </div>
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

                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/10">
                    {filteredStock.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                            <Package className="h-8 w-8 mb-2 opacity-50" />
                            <p className="text-sm">보유한 자재가 없습니다</p>
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
                                        <span className="text-xs text-muted-foreground">보유:</span>
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
