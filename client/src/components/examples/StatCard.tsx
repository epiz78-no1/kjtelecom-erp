import { StatCard } from "../StatCard";
import { Package, ShoppingCart, Users, AlertTriangle } from "lucide-react";

export default function StatCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
      <StatCard
        title="총 재고량"
        value="12,450"
        icon={Package}
        trend={{ value: 12, isPositive: true }}
        description="전월 대비"
      />
      <StatCard
        title="이번 달 구매액"
        value="₩45,230,000"
        icon={ShoppingCart}
        trend={{ value: 8, isPositive: false }}
        description="전월 대비"
      />
      <StatCard
        title="활성 현장팀"
        value="8"
        icon={Users}
        description="총 12개 중"
      />
      <StatCard
        title="재고 부족 품목"
        value="3"
        icon={AlertTriangle}
        description="긴급 발주 필요"
      />
    </div>
  );
}
