import { Download, Search, Loader2, Package } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { FieldTeamCard } from "@/components/FieldTeamCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/contexts/AppContext";
import { useQuery } from "@tanstack/react-query";
import type { OutgoingRecord, MaterialUsageRecord } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
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

export default function TeamOutgoing() {
  const { toast } = useToast();
  const { user, divisions, teams: allTeams, checkPermission } = useAppContext();
  const canWrite = checkPermission("outgoing", "write");
  const { data: outgoingRecords = [], isLoading: outgoingLoading } = useQuery<OutgoingRecord[]>({
    queryKey: ["/api/outgoing"],
  });

  const { data: usageRecords = [], isLoading: usageLoading } = useQuery<MaterialUsageRecord[]>({
    queryKey: ["/api/material-usage"],
  });

  const isLoading = outgoingLoading || usageLoading;

  const { widths, startResizing } = useColumnResize({
    division: 80,
    teamCategory: 120,
    productName: 200,
    specification: 150,
    quantity: 100
  });

  // Aggregate stock
  const stockMap = new Map<string, any>();

  outgoingRecords.forEach(record => {
    // Trim keys to prevent whitespace mismatches
    const d = record.division.trim();
    const t = record.teamCategory.trim();
    const p = record.productName.trim();
    const s = (record.specification || "").trim();

    const key = `${d}|${t}|${p}|${s}`;
    if (!stockMap.has(key)) {
      stockMap.set(key, {
        id: key, // Pseudo ID for key
        division: d,
        teamCategory: t,
        productName: p,
        specification: s,
        quantity: 0
      });
    }
    stockMap.get(key).quantity += record.quantity;
  });

  usageRecords.forEach(record => {
    // Resolve team name: use record.teamCategory or fallback to looking up via teamId
    let teamName = record.teamCategory || allTeams.find(t => t.id === record.teamId)?.name || "";
    teamName = teamName.trim();

    if (!teamName) return; // Skip if no team can be identified

    const d = record.division.trim();
    const p = record.productName.trim();
    const s = (record.specification || "").trim();

    const key = `${d}|${teamName}|${p}|${s}`;

    // Initialize if not exists (usage without receiving)
    if (!stockMap.has(key)) {
      stockMap.set(key, {
        id: key,
        division: d,
        teamCategory: teamName,
        productName: p,
        specification: s,
        quantity: 0
      });
    }

    if (stockMap.has(key)) {
      stockMap.get(key).quantity -= record.quantity;
    }
  });

  // Convert to array and filter out zero stock (allow negative for data consistency check)
  const allStockItems = Array.from(stockMap.values()).filter(item => item.quantity !== 0);

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

    exportToExcel(dataToExport, "현장팀_보유재고_현황");
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
            <h1 className="text-2xl font-bold" data-testid="text-page-title">현장팀 보유 재고 현황</h1>
            <p className="text-muted-foreground">각 현장팀이 현재 보유하고 있는 자재 수량을 조회합니다</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canWrite && (
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
                <SelectTrigger data-testid="select-division">
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

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {allTeams
            .filter((t: any) => {
              if (selectedDivision === "전체") return true;
              const division = divisions?.find(d => d.id === t.divisionId);
              return division?.name === selectedDivision;
            })
            .sort((a: any, b: any) => (b.lastActivity || "").localeCompare(a.lastActivity || ""))
            .slice(0, 4) // 최근 활동 순 상위 4개만 표시
            .map((team: any) => {
              // Calculate current material count for this team
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

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="품명, 팀명 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
          <Select value={selectedTeam} onValueChange={setSelectedTeam}>
            <SelectTrigger className="w-48" data-testid="select-team-filter">
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
                  보유 수량
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
                    보유 중인 자재가 없습니다
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
  );
}
