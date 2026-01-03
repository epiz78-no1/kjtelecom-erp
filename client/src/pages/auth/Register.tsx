import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function Register() {
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const { refetchAuth } = useAppContext();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        username: "",
        password: "",
        confirmPassword: "",
        name: "",
        companyName: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate passwords match
        if (formData.password !== formData.confirmPassword) {
            toast({
                title: "비밀번호 불일치",
                description: "비밀번호가 일치하지 않습니다",
                variant: "destructive"
            });
            return;
        }

        // Validate password length
        if (formData.password.length < 6) {
            toast({
                title: "비밀번호 오류",
                description: "비밀번호는 최소 6자 이상이어야 합니다",
                variant: "destructive"
            });
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: formData.username,
                    password: formData.password,
                    name: formData.name,
                    companyName: formData.companyName
                }),
                credentials: "include"
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "회원가입에 실패했습니다");
            }

            toast({
                title: "회원가입 성공",
                description: `${data.tenant.name}에 오신 것을 환영합니다!`
            });

            // Refresh auth state before redirecting
            refetchAuth();

            // Redirect to dashboard
            setLocation("/");
        } catch (error: any) {
            toast({
                title: "회원가입 실패",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">회원가입</CardTitle>
                    <CardDescription className="text-center">
                        새로운 조직을 만들고 시작하세요
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="companyName">회사명 *</Label>
                            <Input
                                id="companyName"
                                type="text"
                                placeholder="회사 이름"
                                value={formData.companyName}
                                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                required
                                disabled={isLoading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name">이름</Label>
                            <Input
                                id="name"
                                type="text"
                                placeholder="홍길동"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                disabled={isLoading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="username">아이디 *</Label>
                            <Input
                                id="username"
                                type="text"
                                placeholder="영문/숫자 아이디"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                required
                                disabled={isLoading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">비밀번호 *</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                                disabled={isLoading}
                            />
                            <p className="text-xs text-muted-foreground">최소 6자 이상</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">비밀번호 확인 *</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="••••••••"
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                required
                                disabled={isLoading}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-4">
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={isLoading}
                        >
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            회원가입
                        </Button>
                        <div className="text-sm text-center text-muted-foreground">
                            이미 계정이 있으신가요?{" "}
                            <Link href="/login" className="text-primary hover:underline">
                                로그인
                            </Link>
                        </div>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
