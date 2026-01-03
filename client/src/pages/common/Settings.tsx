import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Database, Lock, Key, Check, Loader2, Settings as SettingsRoute } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import { apiRequest } from "@/lib/queryClient";

export default function Settings() {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast({
        title: "입력 오류",
        description: "현재 비밀번호와 새 비밀번호를 모두 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "비밀번호 보안",
        description: "새 비밀번호는 최소 6자 이상이어야 합니다.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/auth/change-password", {
        currentPassword,
        newPassword,
      });

      toast({
        title: "성공",
        description: "비밀번호가 성공적으로 변경되었습니다.",
      });

      setCurrentPassword("");
      setNewPassword("");
    } catch (error: any) {
      toast({
        title: "오류",
        description: error.message || "비밀번호 변경 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full overflow-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">설정</h1>
        <p className="text-muted-foreground">시스템 설정을 관리합니다</p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-muted rounded-full">
                <Shield className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">보안 설정</CardTitle>
                <CardDescription>계정 안전을 위한 비밀번호 관리</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">현재 비밀번호</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="currentPassword"
                    type="password"
                    placeholder="현재 비밀번호를 입력하세요"
                    className="pl-9"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    data-testid="input-current-password"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">새 비밀번호</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="새로운 비밀번호를 입력하세요 (6자 이상)"
                    className="pl-9"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    data-testid="input-new-password"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleChangePassword}
                disabled={isLoading}
                data-testid="button-change-password"
                className="w-full sm:w-auto"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    변경 중...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    비밀번호 변경
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-muted rounded-full">
                <Database className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">데이터 관리</CardTitle>
                <CardDescription>데이터 백업 및 복구 (준비 중)</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <Button variant="outline" data-testid="button-export-data" disabled>
                데이터 내보내기
              </Button>
              <Button variant="outline" data-testid="button-import-data" disabled>
                데이터 가져오기
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              마지막 백업: 2024년 12월 15일 14:30
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-muted rounded-full">
                <SettingsRoute className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">시스템 설정</CardTitle>
                <CardDescription>테마 및 화면 표시 설정</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>테마 설정</Label>
                <p className="text-sm text-muted-foreground">
                  다크 모드와 라이트 모드를 전환합니다
                </p>
              </div>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
