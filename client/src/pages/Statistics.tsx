import { useState } from "react";
import { BusinessDivisionSwitcher } from "@/components/BusinessDivisionSwitcher";
import { UsageChart } from "@/components/UsageChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";

// todo: remove mock functionality
const mockDivisions = [
  { id: "div1", name: "사업부 1" },
  { id: "div2", name: "사업부 2" },
];

// todo: remove mock functionality
const mockMonthlyData = [
  { month: "7월", usage: 4500 },
  { month: "8월", usage: 5200 },
  { month: "9월", usage: 4800 },
  { month: "10월", usage: 6100 },
  { month: "11월", usage: 5500 },
  { month: "12월", usage: 4200 },
];

// todo: remove mock functionality
const mockTeamUsage = [
  { team: "강남 1팀", cableUsage: 1250, junctionBox: 12, terminalBox: 8, ranking: 1 },
  { team: "서초 2팀", cableUsage: 980, junctionBox: 8, terminalBox: 6, ranking: 2 },
  { team: "강서 1팀", cableUsage: 850, junctionBox: 6, terminalBox: 5, ranking: 3 },
  { team: "송파 1팀", cableUsage: 720, junctionBox: 5, terminalBox: 4, ranking: 4 },
];

// todo: remove mock functionality
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
            divisions={mockDivisions}
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">현장팀별 사용량 순위</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold w-16">순위</TableHead>
                  <TableHead className="font-semibold">현장팀</TableHead>
                  <TableHead className="font-semibold text-right">광케이블 (m)</TableHead>
                  <TableHead className="font-semibold text-right">접속함 (개)</TableHead>
                  <TableHead className="font-semibold text-right">단자함 (개)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockTeamUsage.map((team) => (
                  <TableRow key={team.team} data-testid={`row-stat-${team.ranking}`}>
                    <TableCell>
                      <Badge
                        variant={team.ranking === 1 ? "default" : "secondary"}
                        className={team.ranking === 1 ? "bg-yellow-500 dark:bg-yellow-600" : ""}
                      >
                        {team.ranking}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{team.team}</TableCell>
                    <TableCell className="text-right">{team.cableUsage.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{team.junctionBox}</TableCell>
                    <TableCell className="text-right">{team.terminalBox}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
