import { useState } from "react";
import { Package, ShoppingCart, Users, AlertTriangle } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { QuickActionButtons } from "@/components/QuickActionButtons";
import { UsageChart } from "@/components/UsageChart";
import { FieldTeamCard } from "@/components/FieldTeamCard";
import { MaterialFormDialog } from "@/components/MaterialFormDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/contexts/AppContext";
import { useQuery } from "@tanstack/react-query";
import type { InventoryItem } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const mockUsageData = [
  { month: "7월", usage: 4500 },
  { month: "8월", usage: 5200 },
  { month: "9월", usage: 4800 },
  { month: "10월", usage: 6100 },
  { month: "11월", usage: 5500 },
  { month: "12월", usage: 4200 },
];

const mockPurchaseData = [
  { month: "7월", usage: 12000000 },
  { month: "8월", usage: 15000000 },
  { month: "9월", usage: 11000000 },
  { month: "10월", usage: 18000000 },
  { month: "11월", usage: 14000000 },
  { month: "12월", usage: 9500000 },
];

export default function Dashboard() {
  const { divisions, teams } = useAppContext();
  const [selectedDivision, setSelectedDivision] = useState("all");
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false);

  const { data: inventory = [] } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  const filteredInventory = selectedDivision === "all" 
    ? inventory 
    : inventory.filter((item) => item.division === selectedDivision);

  const filteredTeams = selectedDivision === "all"
    ? teams
    : teams.filter((t) => t.divisionId === selectedDivision);
  
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">대시보드</h1>
          <p className="text-muted-foreground">자재 현황을 한눈에 확인하세요</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1">
            <Button
              variant={selectedDivision === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedDivision("all")}
              data-testid="button-division-all"
            >
              전체
            </Button>
            <Button
              variant={selectedDivision === "SKT" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedDivision("SKT")}
              data-testid="button-division-skt"
            >
              SKT사업부
            </Button>
            <Button
              variant={selectedDivision === "SKB" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedDivision("SKB")}
              data-testid="button-division-skb"
            >
              SKB사업부
            </Button>
          </div>
          <QuickActionButtons
            onAddMaterial={() => setMaterialDialogOpen(true)}
            onAddPurchase={() => console.log("구매 등록")}
            onAddUsage={() => console.log("출고 기록")}
          />
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
                  <TableHead>구분</TableHead>
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <UsageChart title="월별 자재 사용량 (단위)" data={mockUsageData} />
        <UsageChart title="월별 구매 금액 (원)" data={mockPurchaseData} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">현장팀 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {filteredTeams.map((team) => (
              <FieldTeamCard
                key={team.id}
                team={team}
                onClick={(t) => console.log("팀 상세:", t.name)}
              />
            ))}
            {filteredTeams.length === 0 && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                등록된 현장팀이 없습니다
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <MaterialFormDialog
        open={materialDialogOpen}
        onOpenChange={setMaterialDialogOpen}
        onSubmit={(data) => console.log("자재 등록:", data)}
      />
    </div>
  );
}
