import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Package, ShoppingCart, Users, AlertTriangle } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { FieldTeamCard } from "@/components/FieldTeamCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/contexts/AppContext";
import { useQuery } from "@tanstack/react-query";
import type { InventoryItem, OutgoingRecord, MaterialUsageRecord } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Dashboard() {
  const { divisions, teams, checkPermission } = useAppContext();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // If user has no permission to view inventory but can view usage -> Redirect to Team Material Usage
    if (!checkPermission("inventory", "read") && checkPermission("usage", "read")) {
      setLocation("/team-material-usage");
    }
  }, [checkPermission, setLocation]);

  const [selectedDivision, setSelectedDivision] = useState("all");

  const { data: inventory = [] } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  const { data: outgoingRecords = [] } = useQuery<OutgoingRecord[]>({
    queryKey: ["/api/outgoing"],
  });

  const { data: usageRecords = [] } = useQuery<MaterialUsageRecord[]>({
    queryKey: ["/api/material-usage"],
  });

  // Aggregate stock - Exact logic from TeamOutgoing.tsx
  const stockMap = new Map<string, any>();

  outgoingRecords.forEach(record => {
    const key = `${record.division}|${record.teamCategory}|${record.productName}|${record.specification}`;
    if (!stockMap.has(key)) {
      stockMap.set(key, {
        id: key,
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

  const filteredInventory = selectedDivision === "all"
    ? inventory
    : inventory.filter((item) => item.division === selectedDivision);

  const filteredTeams = selectedDivision === "all"
    ? teams
    : teams.filter((t) => {
      const division = divisions?.find(d => d.id === t.divisionId);
      return division?.name === selectedDivision;
    });

  // Sort by lastActivity desc
  filteredTeams.sort((a, b) => (b.lastActivity || "").localeCompare(a.lastActivity || ""));

  // Debug logging for team activity
  useEffect(() => {
    if (teams.length > 0) {
      console.log('[DASHBOARD DEBUG] Teams data:', teams.map(t => ({
        name: t.name,
        lastActivity: t.lastActivity,
        memberCount: t.memberCount,
        isActive: t.isActive
      })));
    }
  }, [teams]);

  const activeTeamCount = filteredTeams.filter((t) => t.isActive).length;

  const totalRemaining = filteredInventory.reduce((sum, item) => sum + (item.remaining || 0), 0);
  const totalAmount = filteredInventory.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
  const lowStockCount = filteredInventory.filter((item) => (item.remaining || 0) < 10).length;

  const categoryStats = filteredInventory.reduce((acc, item) => {
    const category = item.category || "기타";
    if (!acc[category]) {
      acc[category] = { quantity: 0, amount: 0, count: 0 };
    }
    acc[category].quantity += item.remaining || 0;
    acc[category].amount += item.totalAmount || 0;
    acc[category].count += 1;
    return acc;
  }, {} as Record<string, { quantity: number; amount: number; count: number }>);

  const categoryList = Object.entries(categoryStats)
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.amount - a.amount);

  return (
    <div className="h-full overflow-auto space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">대시보드</h1>
          <p className="text-muted-foreground">자재 현황을 한눈에 확인하세요</p>
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="총 재고량"
          value={totalRemaining.toLocaleString()}
          icon={Package}
          description={`${filteredInventory.length}개 품목`}
        />
        <StatCard
          title="총 재고 금액"
          value={`₩${totalAmount.toLocaleString()}`}
          icon={ShoppingCart}
          description="현재 재고 기준"
        />
        <StatCard
          title="활성 현장팀"
          value={String(activeTeamCount)}
          icon={Users}
          description={`전체 ${filteredTeams.length}개 중`}
        />
        <StatCard
          title="재고 부족 품목"
          value={String(lowStockCount)}
          icon={AlertTriangle}
          description="10개 미만 재고"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">
            항목별 재고 현황 {selectedDivision !== "all" && `(${selectedDivision})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>사업</TableHead>
                  <TableHead className="text-right">품목 수</TableHead>
                  <TableHead className="text-right">총 수량</TableHead>
                  <TableHead className="text-right">총 금액</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      재고 데이터가 없습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  categoryList.map((cat) => (
                    <TableRow key={cat.name} data-testid={`row-category-${cat.name}`}>
                      <TableCell className="font-medium">{cat.name}</TableCell>
                      <TableCell className="text-right">{cat.count}개</TableCell>
                      <TableCell className="text-right">{cat.quantity.toLocaleString()}</TableCell>
                      <TableCell className="text-right">₩{cat.amount.toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                )}
                {categoryList.length > 0 && (
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell>합계</TableCell>
                    <TableCell className="text-right">{filteredInventory.length}개</TableCell>
                    <TableCell className="text-right">{totalRemaining.toLocaleString()}</TableCell>
                    <TableCell className="text-right">₩{totalAmount.toLocaleString()}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">현장팀 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {filteredTeams.map((team) => {
              // Calculate current material count for this team using aggregated list
              const teamStockCount = allStockItems.filter(item => item.teamCategory === team.name).length;

              return (
                <FieldTeamCard
                  key={team.id}
                  team={{ ...team, materialCount: teamStockCount }}
                  onClick={(t) => { }}
                />
              );
            })}
            {filteredTeams.length === 0 && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                등록된 현장팀이 없습니다
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
