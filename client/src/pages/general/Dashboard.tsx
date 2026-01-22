
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Package, ShoppingCart, Users, AlertTriangle, ChevronDown, ChevronRight, CornerDownRight } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { FieldTeamCard } from "@/components/FieldTeamCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  const [expandedDivisions, setExpandedDivisions] = useState<Record<string, boolean>>({});

  const toggleDivision = (divisionName: string) => {
    setExpandedDivisions(prev => ({
      ...prev,
      [divisionName]: !prev[divisionName]
    }));
  };

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
    const key = `${record.division}| ${record.teamCategory}| ${record.productName}| ${record.specification} `;
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
    const key = `${record.division}| ${record.teamCategory}| ${record.productName}| ${record.specification} `;
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

  const activeTeamCount = filteredTeams.filter((t) => t.isActive).length;

  const totalRemaining = filteredInventory.reduce((sum, item) => sum + (item.remaining || 0), 0);
  const totalAmount = filteredInventory.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
  const lowStockCount = filteredInventory.filter((item) => (item.remaining || 0) < 10).length;

  interface ProductStat {
    productName: string;
    count: number;
    remaining: number;
    amount: number;
  }

  interface DivisionStat {
    name: string;
    count: number;
    remaining: number;
    amount: number;
    products: Record<string, ProductStat>;
  }

  const divisionStats = filteredInventory.reduce((acc, item) => {
    const divisionName = item.division || "기타";
    const productName = item.productName || "미지정";

    if (!acc[divisionName]) {
      acc[divisionName] = {
        name: divisionName,
        count: 0,
        remaining: 0,
        amount: 0,
        products: {}
      };
    }

    // Division Totals
    acc[divisionName].remaining += item.remaining || 0;
    acc[divisionName].amount += item.totalAmount || 0;

    // Product Details
    if (!acc[divisionName].products[productName]) {
      acc[divisionName].products[productName] = {
        productName,
        count: 0,
        remaining: 0,
        amount: 0
      };
    }

    acc[divisionName].products[productName].count += 1; // Or just 1 if unique
    acc[divisionName].products[productName].remaining += item.remaining || 0;
    acc[divisionName].products[productName].amount += item.totalAmount || 0;

    // Increment division count as distinct product types if that's the metric, or just items? 
    // Optical counted distinct rows. Here item is a row.
    acc[divisionName].count += 1;

    return acc;
  }, {} as Record<string, DivisionStat>);

  const divisionList = Object.values(divisionStats)
    .sort((a, b) => b.amount - a.amount);

  return (
    <div className="h-full overflow-auto space-y-6 pb-20">
      <div className="flex flex-col gap-1 mb-1 px-1 pt-1">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Live Dashboard</span>
        </div>
        <div className="flex items-end gap-2">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-none">
            종합 대시보드
          </h1>
          <p className="text-xs text-slate-500 font-medium pb-0.5">
            자재 수급 현황과 재고 가치를 한눈에 모니터링합니다
          </p>
          <div className="ml-auto flex items-center gap-2">
            <Select value={selectedDivision} onValueChange={setSelectedDivision}>
              <SelectTrigger className="h-7 w-[120px] text-xs bg-white/50 border-slate-200">
                <SelectValue placeholder="사업부 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 사업부</SelectItem>
                <SelectItem value="SKT">SKT</SelectItem>
                <SelectItem value="SKB">SKB</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <div className="relative overflow-hidden rounded-2xl bg-white p-4 shadow-sm border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Package className="h-24 w-24 text-blue-600 transform rotate-12" />
          </div>
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">총 재고량</p>
              <h3 className="text-3xl font-bold mt-2 text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                {totalRemaining.toLocaleString()}
              </h3>
            </div>
            <div className="mt-4 flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 w-fit px-2 py-1 rounded-full">
              {filteredInventory.length}개 품목 보유중
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-white p-4 shadow-sm border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <ShoppingCart className="h-24 w-24 text-violet-600 transform -rotate-12" />
          </div>
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">총 자산 가치</p>
              <h3 className="text-3xl font-bold mt-2 text-slate-900 dark:text-white group-hover:text-violet-600 transition-colors">
                {(totalAmount / 1000000).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                <span className="text-lg text-slate-400 font-normal ml-1">백만원</span>
              </h3>
            </div>
            <div className="mt-4 flex items-center text-xs font-medium text-slate-500 bg-slate-100 w-fit px-2 py-1 rounded-full">
              ₩{totalAmount.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-white p-4 shadow-sm border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Users className="h-24 w-24 text-emerald-600 transform rotate-6" />
          </div>
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">활성 현장팀</p>
              <h3 className="text-3xl font-bold mt-2 text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                {activeTeamCount}
                <span className="text-lg text-slate-400 font-normal ml-1">Teams</span>
              </h3>
            </div>
            <div className="mt-4 flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 w-fit px-2 py-1 rounded-full">
              전체 {filteredTeams.length}개 팀 중
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-white p-4 shadow-sm border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <AlertTriangle className="h-24 w-24 text-red-500 transform -rotate-6" />
          </div>
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">임계 재고</p>
              <h3 className="text-3xl font-bold mt-2 text-slate-900 dark:text-white group-hover:text-red-500 transition-colors">
                {lowStockCount}
                <span className="text-lg text-slate-400 font-normal ml-1">Items</span>
              </h3>
            </div>
            <div className="mt-4 flex items-center text-xs font-medium text-red-600 bg-red-50 w-fit px-2 py-1 rounded-full">
              10개 미만 항목
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-8">
        <Card className="lg:col-span-2 border-slate-200 shadow-sm rounded-3xl overflow-hidden bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 border-b border-slate-100 dark:border-zinc-800">
            <div>
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">항목별 재고 현황</CardTitle>
              <CardDescription>사업 구분별 상세 재고 내역입니다</CardDescription>
            </div>
            {selectedDivision !== "all" && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                {selectedDivision}
              </span>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b border-slate-100">
                    <TableHead className="w-[180px] pl-6 py-4 text-xs font-semibold uppercase text-slate-500">사업</TableHead>
                    <TableHead className="py-4 text-center text-xs font-semibold uppercase text-slate-500">품목수</TableHead>
                    <TableHead className="py-4 text-right text-xs font-semibold uppercase text-slate-500">보유 수량</TableHead>
                    <TableHead className="py-4 pr-6 text-right text-xs font-semibold uppercase text-slate-500">가치 규모 (Value)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {divisionList.map((div) => {
                    const isExpanded = expandedDivisions[div.name];
                    const productList = Object.values(div.products).sort((a, b) => b.amount - a.amount);

                    return (
                      <>
                        <TableRow
                          key={div.name}
                          className="cursor-pointer hover:bg-slate-50/80 transition-colors border-b border-slate-50 dark:border-zinc-800/50"
                          onClick={() => toggleDivision(div.name)}
                        >
                          <TableCell className="pl-6 py-4 font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                            {div.name}
                          </TableCell>
                          <TableCell className="text-center py-4 text-slate-600">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                              {productList.length}종
                            </span>
                          </TableCell>
                          <TableCell className="text-right py-4 font-bold text-slate-700">
                            {div.remaining.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right py-4 pr-6 font-bold text-slate-900">
                            ₩{div.amount.toLocaleString()}
                          </TableCell>
                        </TableRow>

                        {isExpanded && productList.map((prod) => (
                          <TableRow key={`${div.name}-${prod.productName}`} className="bg-slate-50/30 dark:bg-zinc-900/30 hover:bg-slate-50/80 border-b border-slate-50 animate-in fade-in slide-in-from-top-1 duration-200">
                            <TableCell className="py-3">
                              {/* Empty first cell for indentation */}
                            </TableCell>
                            <TableCell className="text-left pl-6 py-3">
                              <div className="flex items-center relative">
                                <CornerDownRight className="mr-2 h-3 w-3 text-slate-300" />
                                <span className="font-medium text-sm text-slate-700">{prod.productName}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right py-3 text-slate-600 font-medium text-sm">
                              {prod.remaining.toLocaleString()}
                            </TableCell>
                            <TableCell className="pr-6 text-right py-3 text-slate-500 text-sm font-mono">
                              ₩{prod.amount.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
                    );
                  })}
                  <TableRow className="bg-slate-50/80 font-bold border-t-2 border-slate-100">
                    <TableCell className="pl-6 py-4 text-indigo-600">전체 합계</TableCell>
                    <TableCell className="text-center py-4 text-indigo-600">{divisionList.reduce((acc, cur) => acc + Object.keys(cur.products).length, 0)} 품목</TableCell>
                    <TableCell className="text-right py-4 text-indigo-600">{totalRemaining.toLocaleString()}</TableCell>
                    <TableCell className="text-right py-4 pr-6 text-indigo-600">₩{totalAmount.toLocaleString()}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>


        {/* Field Team Section */}
        <Card className="border-0 shadow-lg shadow-indigo-200/50 dark:shadow-indigo-900/20 rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-600 text-white overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-100" />
              현장팀 현황
            </CardTitle>
            <CardDescription className="text-indigo-100/80">자재를 보유 중인 팀 목록입니다.</CardDescription>
          </CardHeader>
          <CardContent className="h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            <div className="space-y-3">
              {filteredTeams.map((team) => {
                // Calculate simplistic material count for general materials 
                // Using existing stockMap logic if available or just counting items
                const teamStockCount = allStockItems
                  .filter(item => item.teamCategory === team.name)
                  .reduce((sum, item) => sum + item.quantity, 0);

                return (
                  <div
                    key={team.id}
                    className="group relative flex items-center justify-between p-4 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all border border-white/10 hover:border-white/30 cursor-default"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-lg shadow-inner ${team.isActive ? "bg-emerald-400 text-white" : "bg-slate-700/50 text-slate-300"
                        }`}>
                        {team.name.substring(0, 1)}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm tracking-wide text-white">{team.name}</h4>
                        <p className="text-xs text-indigo-100 flex items-center gap-1 mt-0.5">
                          <span className={`h-1.5 w-1.5 rounded-full ${team.isActive ? "bg-emerald-300" : "bg-slate-400"}`}></span>
                          {divisions?.find(d => d.id === team.divisionId)?.name || "-"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold font-mono text-white">{teamStockCount.toLocaleString()}</div>
                      <div className="text-[10px] text-indigo-200 uppercase tracking-widest font-semibold">Items</div>
                    </div>
                  </div>
                );
              })}
              {filteredTeams.length === 0 && (
                <div className="text-center py-12 text-indigo-200/70">
                  등록된 현장팀이 없습니다
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
