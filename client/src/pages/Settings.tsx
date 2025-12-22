import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Bell, Shield, Database, Pencil, Check, X, Loader2, Plus, Trash2, Users } from "lucide-react";
import { useAppContext, type FieldTeam } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const teamCategories = ["외선팀", "접속팀", "유지보수팀", "설치팀"];

export default function Settings() {
  const { divisions, divisionsLoading, addDivision, updateDivision, deleteDivision, teams, teamsLoading, addTeam, updateTeam, deleteTeam } = useAppContext();
  const { toast } = useToast();
  
  const [notifications, setNotifications] = useState(true);
  const [lowStockAlert, setLowStockAlert] = useState(true);
  const [emailReports, setEmailReports] = useState(false);
  
  const [editingDivisionId, setEditingDivisionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  
  const [isAdding, setIsAdding] = useState(false);
  const [newDivisionName, setNewDivisionName] = useState("");
  const [isAddingSaving, setIsAddingSaving] = useState(false);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [divisionToDelete, setDivisionToDelete] = useState<{ id: string; name: string } | null>(null);

  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<FieldTeam | null>(null);
  const [teamFormData, setTeamFormData] = useState({ name: "", divisionId: "", teamCategory: "외선팀", memberCount: 0, isActive: true });
  const [isTeamSubmitting, setIsTeamSubmitting] = useState(false);
  const [teamDeleteDialogOpen, setTeamDeleteDialogOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<FieldTeam | null>(null);

  const startEditing = (divisionId: string, currentName: string) => {
    setEditingDivisionId(divisionId);
    setEditingName(currentName);
  };

  const cancelEditing = () => {
    setEditingDivisionId(null);
    setEditingName("");
  };

  const saveEditing = async () => {
    if (editingDivisionId && editingName.trim()) {
      setIsSaving(true);
      try {
        await updateDivision(editingDivisionId, editingName.trim());
        toast({ title: "저장 완료", description: "사업부 이름이 변경되었습니다" });
        setEditingDivisionId(null);
        setEditingName("");
      } catch (error) {
        toast({ title: "오류", description: "저장 중 오류가 발생했습니다", variant: "destructive" });
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleAddDivision = async () => {
    if (!newDivisionName.trim()) {
      toast({ title: "오류", description: "사업부 이름을 입력해주세요", variant: "destructive" });
      return;
    }
    
    setIsAddingSaving(true);
    try {
      await addDivision(newDivisionName.trim());
      toast({ title: "추가 완료", description: "새 사업부가 추가되었습니다" });
      setNewDivisionName("");
      setIsAdding(false);
    } catch (error) {
      toast({ title: "오류", description: "추가 중 오류가 발생했습니다", variant: "destructive" });
    } finally {
      setIsAddingSaving(false);
    }
  };

  const confirmDelete = (division: { id: string; name: string }) => {
    setDivisionToDelete(division);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (divisionToDelete) {
      try {
        await deleteDivision(divisionToDelete.id);
        toast({ title: "삭제 완료", description: `${divisionToDelete.name} 사업부가 삭제되었습니다` });
      } catch (error) {
        toast({ title: "오류", description: "삭제 중 오류가 발생했습니다", variant: "destructive" });
      }
      setDeleteDialogOpen(false);
      setDivisionToDelete(null);
    }
  };

  const openAddTeamDialog = () => {
    setEditingTeam(null);
    setTeamFormData({ name: "", divisionId: divisions[0]?.id || "", teamCategory: "외선팀", memberCount: 0, isActive: true });
    setTeamDialogOpen(true);
  };

  const openEditTeamDialog = (team: FieldTeam) => {
    setEditingTeam(team);
    setTeamFormData({
      name: team.name,
      divisionId: team.divisionId,
      teamCategory: team.teamCategory || "외선팀",
      memberCount: team.memberCount,
      isActive: team.isActive,
    });
    setTeamDialogOpen(true);
  };

  const handleTeamSubmit = async () => {
    if (!teamFormData.name.trim()) {
      toast({ title: "오류", description: "팀명을 입력해주세요", variant: "destructive" });
      return;
    }
    
    setIsTeamSubmitting(true);
    try {
      if (editingTeam) {
        await updateTeam(editingTeam.id, teamFormData);
        toast({ title: "수정 완료", description: `${teamFormData.name} 팀이 수정되었습니다` });
      } else {
        await addTeam(teamFormData);
        toast({ title: "등록 완료", description: `${teamFormData.name} 팀이 등록되었습니다` });
      }
      setTeamDialogOpen(false);
    } catch (error) {
      toast({ title: "오류", description: "처리 중 오류가 발생했습니다", variant: "destructive" });
    } finally {
      setIsTeamSubmitting(false);
    }
  };

  const confirmTeamDelete = (team: FieldTeam) => {
    setTeamToDelete(team);
    setTeamDeleteDialogOpen(true);
  };

  const handleTeamDelete = async () => {
    if (teamToDelete) {
      try {
        await deleteTeam(teamToDelete.id);
        toast({ title: "삭제 완료", description: `${teamToDelete.name} 팀이 삭제되었습니다` });
      } catch (error) {
        toast({ title: "오류", description: "삭제 중 오류가 발생했습니다", variant: "destructive" });
      }
      setTeamDeleteDialogOpen(false);
      setTeamToDelete(null);
    }
  };

  const getDivisionName = (divisionId: string) => {
    return divisions.find((d) => d.id === divisionId)?.name || divisionId;
  };

  return (
    <div className="h-full overflow-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">설정</h1>
        <p className="text-muted-foreground">시스템 설정을 관리합니다</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">사업부 관리</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsAdding(true)}
                disabled={isAdding}
                data-testid="button-add-division"
              >
                <Plus className="h-4 w-4 mr-1" />
                사업부 추가
              </Button>
            </div>
            <CardDescription>사업부 이름을 수정하거나 새 사업부를 추가할 수 있습니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {divisionsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <>
                {divisions.map((division, index) => (
                  <div key={division.id} className="flex items-center gap-4">
                    <Label className="w-24 shrink-0">사업부 {index + 1}</Label>
                    {editingDivisionId === division.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="flex-1"
                          autoFocus
                          disabled={isSaving}
                          data-testid={`input-edit-${division.id}`}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEditing();
                            if (e.key === "Escape") cancelEditing();
                          }}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={saveEditing}
                          disabled={isSaving}
                          data-testid={`button-save-${division.id}`}
                        >
                          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={cancelEditing}
                          disabled={isSaving}
                          data-testid={`button-cancel-${division.id}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-1">
                        <span className="flex-1 text-sm" data-testid={`text-${division.id}-name`}>{division.name}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => startEditing(division.id, division.name)}
                          data-testid={`button-edit-${division.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => confirmDelete(division)}
                          data-testid={`button-delete-${division.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                
                {isAdding && (
                  <div className="flex items-center gap-4">
                    <Label className="w-24 shrink-0">새 사업부</Label>
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={newDivisionName}
                        onChange={(e) => setNewDivisionName(e.target.value)}
                        placeholder="사업부 이름 입력"
                        className="flex-1"
                        autoFocus
                        disabled={isAddingSaving}
                        data-testid="input-new-division"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddDivision();
                          if (e.key === "Escape") {
                            setIsAdding(false);
                            setNewDivisionName("");
                          }
                        }}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleAddDivision}
                        disabled={isAddingSaving}
                        data-testid="button-save-new-division"
                      >
                        {isAddingSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setIsAdding(false);
                          setNewDivisionName("");
                        }}
                        disabled={isAddingSaving}
                        data-testid="button-cancel-new-division"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">현장팀 관리</CardTitle>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={openAddTeamDialog}
                data-testid="button-add-team"
              >
                <Plus className="h-4 w-4 mr-1" />
                팀 추가
              </Button>
            </div>
            <CardDescription>현장팀을 추가하거나 수정할 수 있습니다.</CardDescription>
          </CardHeader>
          <CardContent>
            {teamsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : teams.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">등록된 팀이 없습니다</p>
            ) : (
              <div className="space-y-2">
                {teams.map((team) => (
                  <div
                    key={team.id}
                    className="flex items-center justify-between gap-4 p-3 rounded-md border"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{team.name}</span>
                          <Badge variant="outline" className="text-xs">{getDivisionName(team.divisionId)}</Badge>
                                          <Badge variant="secondary" className="text-xs">{team.teamCategory}</Badge>
                          {!team.isActive && <Badge variant="secondary" className="text-xs">비활성</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{team.memberCount}명</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEditTeamDialog(team)}
                        data-testid={`button-edit-team-${team.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => confirmTeamDelete(team)}
                        data-testid={`button-delete-team-${team.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">알림 설정</CardTitle>
            </div>
            <CardDescription>알림 및 리포트 설정을 관리합니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>푸시 알림</Label>
                <p className="text-sm text-muted-foreground">중요 알림을 받습니다</p>
              </div>
              <Switch
                checked={notifications}
                onCheckedChange={setNotifications}
                data-testid="switch-notifications"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>재고 부족 알림</Label>
                <p className="text-sm text-muted-foreground">안전 재고 이하 시 알림을 받습니다</p>
              </div>
              <Switch
                checked={lowStockAlert}
                onCheckedChange={setLowStockAlert}
                data-testid="switch-low-stock"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>이메일 리포트</Label>
                <p className="text-sm text-muted-foreground">주간 리포트를 이메일로 받습니다</p>
              </div>
              <Switch
                checked={emailReports}
                onCheckedChange={setEmailReports}
                data-testid="switch-email-reports"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">보안 설정</CardTitle>
            </div>
            <CardDescription>계정 보안을 관리합니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">현재 비밀번호</Label>
              <Input
                id="currentPassword"
                type="password"
                placeholder="현재 비밀번호 입력"
                data-testid="input-current-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">새 비밀번호</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="새 비밀번호 입력"
                data-testid="input-new-password"
              />
            </div>
            <Button data-testid="button-change-password">비밀번호 변경</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">데이터 관리</CardTitle>
            </div>
            <CardDescription>데이터 백업 및 복구를 관리합니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <Button variant="outline" data-testid="button-export-data">
                데이터 내보내기
              </Button>
              <Button variant="outline" data-testid="button-import-data">
                데이터 가져오기
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              마지막 백업: 2024년 12월 15일 14:30
            </p>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>사업부 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              {divisionToDelete?.name} 사업부를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} data-testid="button-confirm-delete-division">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
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
                value={teamFormData.name}
                onChange={(e) => setTeamFormData({ ...teamFormData, name: e.target.value })}
                placeholder="예: 강남 3팀"
                data-testid="input-team-name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="teamDivision">소속 사업부 *</Label>
              <Select
                value={teamFormData.divisionId}
                onValueChange={(value) => setTeamFormData({ ...teamFormData, divisionId: value })}
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
              <Label htmlFor="teamCategory">팀 구분 *</Label>
              <Select
                value={teamFormData.teamCategory}
                onValueChange={(value) => setTeamFormData({ ...teamFormData, teamCategory: value })}
              >
                <SelectTrigger data-testid="select-team-category">
                  <SelectValue placeholder="팀 구분 선택" />
                </SelectTrigger>
                <SelectContent>
                  {teamCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
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
                value={teamFormData.memberCount || ""}
                onChange={(e) => setTeamFormData({ ...teamFormData, memberCount: Number(e.target.value) })}
                placeholder="0"
                data-testid="input-member-count"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="isActive">활성 상태</Label>
              <Switch
                id="isActive"
                checked={teamFormData.isActive}
                onCheckedChange={(checked) => setTeamFormData({ ...teamFormData, isActive: checked })}
                data-testid="switch-team-active"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTeamDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleTeamSubmit} disabled={isTeamSubmitting} data-testid="button-submit-team">
              {isTeamSubmitting ? "처리 중..." : editingTeam ? "수정" : "등록"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={teamDeleteDialogOpen} onOpenChange={setTeamDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>현장팀 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              {teamToDelete?.name} 팀을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleTeamDelete} data-testid="button-confirm-delete-team">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
