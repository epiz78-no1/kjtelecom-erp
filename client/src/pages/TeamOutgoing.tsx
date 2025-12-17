import { useState } from "react";
import { Search, Calendar, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BusinessDivisionSwitcher } from "@/components/BusinessDivisionSwitcher";
import { useAppContext } from "@/contexts/AppContext";
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
import { Skeleton } from "@/components/ui/skeleton";

interface TeamOutgoingRecord {
  id: number;
  date: string;
  teamId: string;
  teamName: string;
  productName: string;
  specification: string;
  quantity: number;
  projectName: string;
  recipient: string;
}

const mockRecords: TeamOutgoingRecord[] = [
  { id: 1, date: "2024-12-15", teamId: "team1", teamName: "강남 1팀", productName: "광접속함체 직선형", specification: "가공 24C", quantity: 5, projectName: "강남역 구간", recipient: "김철수" },
  { id: 2, date: "2024-12-14", teamId: "team1", teamName: "강남 1팀", productName: "광케이블", specification: "24C 1km", quantity: 2, projectName: "강남역 구간", recipient: "김철수" },
  { id: 3, date: "2024-12-14", teamId: "team2", teamName: "강남 2팀", productName: "광접속함체 직선형", specification: "지중 48C", quantity: 3, projectName: "역삼동 구간", recipient: "이영희" },
  { id: 4, date: "2024-12-13", teamId: "team3", teamName: "서초 1팀", productName: "분기함", specification: "8분기", quantity: 10, projectName: "서초동 신규", recipient: "박민수" },
  { id: 5, date: "2024-12-12", teamId: "team1", teamName: "강남 1팀", productName: "드롭크로저", specification: "4C", quantity: 20, projectName: "강남역 구간", recipient: "김철수" },
];

export default function TeamOutgoing() {
  const { divisions, teams, teamsLoading } = useAppContext();
  const [selectedDivision, setSelectedDivision] = useState(divisions[0]?.id || "div1");
  const [selectedTeam, setSelectedTeam] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTeams = teams.filter((team) => team.divisionId === selectedDivision);

  const filteredRecords = mockRecords.filter((record) => {
    const matchesTeam = selectedTeam === "all" || record.teamId === selectedTeam;
    const matchesSearch = 
      record.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.teamName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTeam && matchesSearch;
  });

  const teamStats = filteredTeams.map((team) => {
    const teamRecords = mockRecords.filter((r) => r.teamId === team.id);
    return {
      ...team,
      totalOutgoing: teamRecords.reduce((sum, r) => sum + r.quantity, 0),
      recordCount: teamRecords.length,
    };
  });

  if (teamsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">현장팀별 출고 내역</h1>
          <p className="text-muted-foreground">현장팀별 자재 출고 현황을 조회합니다</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <BusinessDivisionSwitcher
            divisions={divisions}
            selectedId={selectedDivision}
            onSelect={setSelectedDivision}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {teamStats.map((team) => (
          <Card
            key={team.id}
            className={`cursor-pointer transition-colors ${selectedTeam === team.id ? "ring-2 ring-primary" : ""}`}
            onClick={() => setSelectedTeam(team.id === selectedTeam ? "all" : team.id)}
            data-testid={`card-team-${team.id}`}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between gap-2">
                {team.name}
                <Badge variant={team.isActive ? "default" : "secondary"} className="text-xs">
                  {team.isActive ? "활성" : "비활성"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{team.totalOutgoing}</div>
              <p className="text-xs text-muted-foreground">{team.recordCount}건의 출고</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="품명, 프로젝트명, 팀명 검색..."
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
            <SelectItem value="all">전체 팀</SelectItem>
            {filteredTeams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">출고 내역</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">날짜</TableHead>
                  <TableHead>팀명</TableHead>
                  <TableHead>프로젝트명</TableHead>
                  <TableHead>품명</TableHead>
                  <TableHead>규격</TableHead>
                  <TableHead className="text-right">수량</TableHead>
                  <TableHead>수령자</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      출고 내역이 없습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record) => (
                    <TableRow key={record.id} data-testid={`row-record-${record.id}`}>
                      <TableCell className="font-medium">{record.date}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{record.teamName}</Badge>
                      </TableCell>
                      <TableCell>{record.projectName}</TableCell>
                      <TableCell>{record.productName}</TableCell>
                      <TableCell>{record.specification}</TableCell>
                      <TableCell className="text-right">{record.quantity}</TableCell>
                      <TableCell>{record.recipient}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
