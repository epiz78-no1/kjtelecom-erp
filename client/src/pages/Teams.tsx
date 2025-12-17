import { useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BusinessDivisionSwitcher } from "@/components/BusinessDivisionSwitcher";
import { FieldTeamCard, type FieldTeam } from "@/components/FieldTeamCard";
import { useAppContext } from "@/contexts/AppContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

export default function Teams() {
  const { divisions, teams, addTeam, updateTeam, deleteTeam } = useAppContext();
  const { toast } = useToast();
  
  const [selectedDivision, setSelectedDivision] = useState("div1");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<FieldTeam | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<FieldTeam | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    divisionId: "",
    memberCount: 0,
    isActive: true,
  });

  const filteredTeams = teams.filter(
    (team) =>
      team.divisionId === selectedDivision &&
      team.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openAddDialog = () => {
    setEditingTeam(null);
    setFormData({ name: "", divisionId: selectedDivision, memberCount: 0, isActive: true });
    setDialogOpen(true);
  };

  const openEditDialog = (team: FieldTeam) => {
    setEditingTeam(team);
    setFormData({
      name: team.name,
      divisionId: team.divisionId,
      memberCount: team.memberCount,
      isActive: team.isActive,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({ title: "오류", description: "팀명을 입력해주세요", variant: "destructive" });
      return;
    }
    
    const division = divisions.find((d) => d.id === formData.divisionId);
    
    if (editingTeam) {
      updateTeam(editingTeam.id, {
        name: formData.name,
        divisionId: formData.divisionId,
        divisionName: division?.name || "",
        memberCount: formData.memberCount,
        isActive: formData.isActive,
      });
      toast({ title: "수정 완료", description: `${formData.name} 팀이 수정되었습니다` });
    } else {
      const newTeam: FieldTeam = {
        id: Date.now().toString(),
        name: formData.name,
        divisionId: formData.divisionId,
        divisionName: division?.name || "",
        memberCount: formData.memberCount,
        materialCount: 0,
        lastActivity: new Date().toISOString().split("T")[0],
        isActive: formData.isActive,
      };
      addTeam(newTeam);
      toast({ title: "등록 완료", description: `${formData.name} 팀이 등록되었습니다` });
    }
    
    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (teamToDelete) {
      deleteTeam(teamToDelete.id);
      toast({ title: "삭제 완료", description: `${teamToDelete.name} 팀이 삭제되었습니다` });
      setDeleteDialogOpen(false);
      setTeamToDelete(null);
    }
  };

  const confirmDelete = (team: FieldTeam) => {
    setTeamToDelete(team);
    setDeleteDialogOpen(true);
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
            divisions={divisions}
            selectedId={selectedDivision}
            onSelect={setSelectedDivision}
          />
          <Button onClick={openAddDialog} data-testid="button-add-team">
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
          <div key={team.id} className="relative group">
            <FieldTeamCard
              team={team}
              onClick={() => openEditDialog(team)}
            />
            <div className="absolute top-2 right-2 flex gap-1 invisible group-hover:visible">
              <Button
                size="icon"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  openEditDialog(team);
                }}
                data-testid={`button-edit-team-${team.id}`}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  confirmDelete(team);
                }}
                data-testid={`button-delete-team-${team.id}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
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
            <DialogTitle>{editingTeam ? "현장팀 수정" : "현장팀 추가"}</DialogTitle>
            <DialogDescription>
              {editingTeam ? "현장팀 정보를 수정합니다." : "새로운 현장팀을 등록합니다."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="teamName">팀명 *</Label>
              <Input
                id="teamName"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="예: 강남 3팀"
                data-testid="input-team-name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="teamDivision">소속 사업부 *</Label>
              <Select
                value={formData.divisionId}
                onValueChange={(value) => setFormData({ ...formData, divisionId: value })}
              >
                <SelectTrigger data-testid="select-team-division">
                  <SelectValue placeholder="사업부 선택" />
                </SelectTrigger>
                <SelectContent>
                  {divisions.map((div) => (
                    <SelectItem key={div.id} value={div.id}>
                      {div.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="memberCount">팀원 수</Label>
              <Input
                id="memberCount"
                type="number"
                value={formData.memberCount || ""}
                onChange={(e) => setFormData({ ...formData, memberCount: Number(e.target.value) })}
                placeholder="0"
                data-testid="input-member-count"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="isActive">활성 상태</Label>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                data-testid="switch-team-active"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSubmit} data-testid="button-submit-team">
              {editingTeam ? "수정" : "등록"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>현장팀 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              {teamToDelete?.name} 팀을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} data-testid="button-confirm-delete">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
