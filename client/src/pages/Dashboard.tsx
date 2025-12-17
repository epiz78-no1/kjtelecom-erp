import { useState } from "react";
import { Package, ShoppingCart, Users, AlertTriangle } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { BusinessDivisionSwitcher } from "@/components/BusinessDivisionSwitcher";
import { QuickActionButtons } from "@/components/QuickActionButtons";
import { UsageChart } from "@/components/UsageChart";
import { FieldTeamCard } from "@/components/FieldTeamCard";
import { MaterialFormDialog } from "@/components/MaterialFormDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppContext } from "@/contexts/AppContext";

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

const defaultStats = {
  totalStock: "0",
  monthlyPurchase: "₩0",
  activeTeams: "0",
  lowStockItems: "0",
};

export default function Dashboard() {
  const { divisions, teams } = useAppContext();
  const [selectedDivision, setSelectedDivision] = useState(divisions[0]?.id || "div1");
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false);
  
  const filteredTeams = teams.filter((t) => t.divisionId === selectedDivision);
  const activeTeamCount = filteredTeams.filter((t) => t.isActive).length;
  
  const stats = {
    totalStock: "0",
    monthlyPurchase: "₩0",
    activeTeams: String(activeTeamCount),
    lowStockItems: "0",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">대시보드</h1>
          <p className="text-muted-foreground">자재 현황을 한눈에 확인하세요</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <BusinessDivisionSwitcher
            divisions={divisions}
            selectedId={selectedDivision}
            onSelect={setSelectedDivision}
          />
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
          value={stats.totalStock}
          icon={Package}
          description="전체 자재"
        />
        <StatCard
          title="이번 달 구매액"
          value={stats.monthlyPurchase}
          icon={ShoppingCart}
          description="당월 누계"
        />
        <StatCard
          title="활성 현장팀"
          value={stats.activeTeams}
          icon={Users}
          description={`전체 ${filteredTeams.length}개 중`}
        />
        <StatCard
          title="재고 부족 품목"
          value={stats.lowStockItems}
          icon={AlertTriangle}
          description="긴급 발주 필요"
        />
      </div>

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
