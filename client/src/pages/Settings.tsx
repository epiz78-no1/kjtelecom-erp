import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Building2, Bell, Shield, Database } from "lucide-react";

export default function Settings() {
  const [notifications, setNotifications] = useState(true);
  const [lowStockAlert, setLowStockAlert] = useState(true);
  const [emailReports, setEmailReports] = useState(false);

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
            <CardDescription>사업부 정보를 설정합니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="div1Name">사업부 1 이름</Label>
                <Input id="div1Name" defaultValue="사업부 1" data-testid="input-div1-name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="div2Name">사업부 2 이름</Label>
                <Input id="div2Name" defaultValue="사업부 2" data-testid="input-div2-name" />
              </div>
            </div>
            <Button data-testid="button-save-divisions">저장</Button>
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
