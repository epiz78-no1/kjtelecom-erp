import { useState } from "react";
import { BusinessDivisionSwitcher } from "@/components/BusinessDivisionSwitcher";
import { UsageChart } from "@/components/UsageChart";
import { useAppContext } from "@/contexts/AppContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const mockMonthlyData = [
  { month: "7월", usage: 4500 },
  { month: "8월", usage: 5200 },
  { month: "9월", usage: 4800 },
  { month: "10월", usage: 6100 },
  { month: "11월", usage: 5500 },
  { month: "12월", usage: 4200 },
];

const mockCategoryData = [
  { month: "7월", usage: 45 },
  { month: "8월", usage: 52 },
  { month: "9월", usage: 48 },
  { month: "10월", usage: 61 },
  { month: "11월", usage: 55 },
  { month: "12월", usage: 42 },
];

const years = ["2024", "2023", "2022"];
const categories = ["광케이블", "접속함", "단자함", "부자재"];

export default function Statistics() {
  const { divisions } = useAppContext();
  const [selectedDivision, setSelectedDivision] = useState("div1");
  const [selectedYear, setSelectedYear] = useState("2024");
  const [selectedCategory, setSelectedCategory] = useState("광케이블");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">사용량 통계</h1>
          <p className="text-muted-foreground">자재 사용량을 분석하고 리포트를 확인합니다</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <BusinessDivisionSwitcher
            divisions={divisions}
            selectedId={selectedDivision}
            onSelect={setSelectedDivision}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-32" data-testid="select-year">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={year}>
                {year}년
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-40" data-testid="select-stat-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <UsageChart title={`${selectedCategory} 월별 사용량`} data={mockMonthlyData} />
        <UsageChart title={`${selectedCategory} 카테고리별 구매량`} data={mockCategoryData} />
      </div>
    </div>
  );
}
