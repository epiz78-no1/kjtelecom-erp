import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Building2, Bell, Shield, Database, Pencil, Check, X } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { divisions, updateDivision } = useAppContext();
  const { toast } = useToast();
  
  const [notifications, setNotifications] = useState(true);
  const [lowStockAlert, setLowStockAlert] = useState(true);
  const [emailReports, setEmailReports] = useState(false);
  
  const [editingDivisionId, setEditingDivisionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const startEditing = (divisionId: string, currentName: string) => {
    setEditingDivisionId(divisionId);
    setEditingName(currentName);
  };

  const cancelEditing = () => {
    setEditingDivisionId(null);
    setEditingName("");
  };

  const saveEditing = () => {
    if (editingDivisionId && editingName.trim()) {
      updateDivision(editingDivisionId, editingName.trim());
      toast({ title: "저장 완료", description: "사업부 이름이 변경되었습니다" });
      setEditingDivisionId(null);
      setEditingName("");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">설정</h1>
        <p className="text-muted-foreground">시스템 설정을 관리합니다</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">사업부 관리</CardTitle>
            </div>
            <CardDescription>사업부 이름을 수정할 수 있습니다. 수정 시 관련된 모든 데이터에 반영됩니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {divisions.map((division) => (
              <div key={division.id} className="flex items-center gap-4">
                <Label className="w-24 shrink-0">{division.id === "div1" ? "사업부 1" : "사업부 2"}</Label>
                {editingDivisionId === division.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="flex-1"
                      autoFocus
                      data-testid={`input-edit-${division.id}`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEditing();
                        if (e.key === "Escape") cancelEditing();
                      }}
                    />
                    <Button size="icon" variant="ghost" onClick={saveEditing} data-testid={`button-save-${division.id}`}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={cancelEditing} data-testid={`button-cancel-${division.id}`}>
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
                  </div>
                )}
              </div>
            ))}
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
    </div>
  );
}
