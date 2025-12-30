import { useState } from "react";
import { Search, Loader2, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FieldTeamCard } from "@/components/FieldTeamCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/contexts/AppContext";
import { useQuery } from "@tanstack/react-query";
import type { OutgoingRecord, MaterialUsageRecord } from "@shared/schema";
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
  const { divisions, teams: allTeams } = useAppContext();
  const [selectedDivision, setSelectedDivision] = useState("all");
  const [selectedTeam, setSelectedTeam] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: outgoingRecords = [], isLoading: outgoingLoading } = useQuery<OutgoingRecord[]>({
    queryKey: ["/api/outgoing"],
  });

  const { data: usageRecords = [], isLoading: usageLoading } = useQuery<MaterialUsageRecord[]>({
    queryKey: ["/api/material-usage"],
  });

  const isLoading = outgoingLoading || usageLoading;

  // Aggregate stock
  const stockMap = new Map<string, any>();

  outgoingRecords.forEach(record => {
    const key = `${record.division}|${record.teamCategory}|${record.productName}|${record.specification}`;
    if (!stockMap.has(key)) {
      stockMap.set(key, {
        id: key, // Pseudo ID for key
        division: record.division,
        teamCategory: record.teamCategory,
        productName: record.productName,
        specification: record.specification,
        quantity: 0
      });
    }
    stockMap.get(key).quantity += record.quantity;
  });

  usageRecords.forEach(record => {
    const key = `${record.division}|${record.teamCategory}|${record.productName}|${record.specification}`;
    if (stockMap.has(key)) {
      stockMap.get(key).quantity -= record.quantity;
    }
  });

  // Convert to array and filter out zero/negative stock
  const allStockItems = Array.from(stockMap.values()).filter(item => item.quantity > 0);

  const divisionFiltered = selectedDivision === "all"
    ? allStockItems
    : allStockItems.filter((item) => item.division === selectedDivision);

  const teams = Array.from(new Set(divisionFiltered.map((r) => r.teamCategory))).filter(Boolean).sort();

  const filteredStock = divisionFiltered.filter((item) => {
    const matchesTeam = selectedTeam === "all" || item.teamCategory === selectedTeam;
    const matchesSearch =
      item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.teamCategory.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTeam && matchesSearch;
  });

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
            <div className="w-[180px]">
              <Select value={selectedDivision} onValueChange={setSelectedDivision}>
                <SelectTrigger data-testid="select-division">
                  <SelectValue placeholder="사업부 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="SKT">SKT</SelectItem>
                  <SelectItem value="SKB">SKB</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {allTeams
            .filter((t: any) => {
              if (selectedDivision === "all") return true;
              const division = divisions?.find(d => d.id === t.divisionId);
              return division?.name === selectedDivision;
            })
            .map((team: any) => {
              // Calculate current material count for this team
              const teamStockCount = allStockItems.filter(item => item.teamCategory === team.name).length;

              return (
                <FieldTeamCard
                  key={team.id}
                  team={{ ...team, materialCount: teamStockCount }}
                  onClick={(t) => setSelectedTeam(t.name === selectedTeam ? "all" : t.name)}
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
              <SelectItem value="all">전체</SelectItem>
              {teams.map((team) => (
                <SelectItem key={team} value={team}>
                  {team}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 min-h-0 rounded-md border overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow className="h-11">
              <TableHead className="font-semibold w-[80px] text-center align-middle bg-background">구분</TableHead>
              <TableHead className="font-semibold w-[120px] text-center align-middle bg-background">현장팀</TableHead>
              <TableHead className="font-semibold w-[200px] text-center align-middle bg-background">품명</TableHead>
              <TableHead className="font-semibold w-[150px] text-center align-middle bg-background">규격</TableHead>
              <TableHead className="font-semibold w-[100px] text-center align-middle bg-background">보유 수량</TableHead>
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
                <TableRow key={item.id} className="h-11">
                  <TableCell className="text-center align-middle whitespace-nowrap font-medium">{item.division}</TableCell>
                  <TableCell className="text-center align-middle whitespace-nowrap">{item.teamCategory}</TableCell>
                  <TableCell className="text-center align-middle whitespace-nowrap">{item.productName}</TableCell>
                  <TableCell className="text-center align-middle whitespace-nowrap">{item.specification}</TableCell>
                  <TableCell className="text-center align-middle font-bold text-primary">
                    {item.quantity.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
