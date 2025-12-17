import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BusinessDivisionSwitcher } from "@/components/BusinessDivisionSwitcher";
import { FieldTeamCard, type FieldTeam } from "@/components/FieldTeamCard";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// todo: remove mock functionality
const mockDivisions = [
  { id: "div1", name: "사업부 1" },
  { id: "div2", name: "사업부 2" },
];

// todo: remove mock functionality
const mockTeams: FieldTeam[] = [
  { id: "1", name: "강남 1팀", divisionId: "div1", divisionName: "사업부 1", memberCount: 5, materialCount: 12, lastActivity: "2024-12-15", isActive: true },
  { id: "2", name: "서초 2팀", divisionId: "div1", divisionName: "사업부 1", memberCount: 4, materialCount: 8, lastActivity: "2024-12-14", isActive: true },
  { id: "3", name: "강서 1팀", divisionId: "div1", divisionName: "사업부 1", memberCount: 6, materialCount: 10, lastActivity: "2024-12-12", isActive: true },
  { id: "4", name: "송파 1팀", divisionId: "div2", divisionName: "사업부 2", memberCount: 6, materialCount: 15, lastActivity: "2024-12-13", isActive: true },
  { id: "5", name: "강동 1팀", divisionId: "div2", divisionName: "사업부 2", memberCount: 3, materialCount: 6, lastActivity: "2024-12-10", isActive: false },
  { id: "6", name: "광진 1팀", divisionId: "div2", divisionName: "사업부 2", memberCount: 5, materialCount: 9, lastActivity: "2024-12-11", isActive: true },
];

export default function Teams() {
  const [selectedDivision, setSelectedDivision] = useState("div1");
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDivision, setNewTeamDivision] = useState("");

  const filteredTeams = mockTeams.filter(
    (team) =>
      team.divisionId === selectedDivision &&
      team.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddTeam = () => {
    console.log("새 팀 등록:", { name: newTeamName, division: newTeamDivision });
    setDialogOpen(false);
    setNewTeamName("");
    setNewTeamDivision("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">현장팀 관리</h1>
          <p className="text-muted-foreground">현장팀별 자재 현황을 관리합니다</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <BusinessDivisionSwitcher
            divisions={mockDivisions}
            selectedId={selectedDivision}
            onSelect={setSelectedDivision}
          />
          <Button onClick={() => setDialogOpen(true)} data-testid="button-add-team">
            <Plus className="h-4 w-4 mr-2" />
            팀 추가
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="팀명 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="input-search-teams"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredTeams.map((team) => (
          <FieldTeamCard
            key={team.id}
            team={team}
            onClick={(t) => console.log("팀 상세:", t)}
          />
        ))}
        {filteredTeams.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            검색 결과가 없습니다
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>현장팀 추가</DialogTitle>
            <DialogDescription>
              새로운 현장팀을 등록합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="teamName">팀명 *</Label>
              <Input
                id="teamName"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="예: 강남 3팀"
                data-testid="input-team-name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="teamDivision">소속 사업부 *</Label>
              <Select value={newTeamDivision} onValueChange={setNewTeamDivision}>
                <SelectTrigger data-testid="select-team-division">
                  <SelectValue placeholder="사업부 선택" />
                </SelectTrigger>
                <SelectContent>
                  {mockDivisions.map((div) => (
                    <SelectItem key={div.id} value={div.id}>
                      {div.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleAddTeam} data-testid="button-submit-team">
              등록
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
