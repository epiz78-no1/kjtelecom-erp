
import { useState } from "react";
import { useLocation } from "wouter";
import { useAppContext } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, User as UserIcon, Loader2 } from "lucide-react";
import { useEffect } from "react";

export default function Login() {
    const { refetchAuth } = useAppContext();
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        username: "",
        password: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
                credentials: "include",
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "로그인에 실패했습니다");
            }

            toast({
                title: "로그인 성공",
                description: `${data.user.name || data.user.username}님, 환영합니다!`,
            });

            // Refresh auth state before redirecting
            await refetchAuth();

            // Redirect based on role
            if (data.user.username === "admin") {
                setLocation("/super-admin");
            } else if (data.tenants && data.tenants.length > 1) {
                setLocation("/tenant-select");
            } else {
                // Otherwise, redirect to dashboard
                setLocation("/optical-dashboard");
            }
        } catch (error: any) {
            toast({
                title: "로그인 실패",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        document.title = "로그인 | (주)광주텔레콤 ERP";
    }, []);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white">
            <div className="w-full max-w-md px-8 py-12">
                {/* 로고 영역 */}
                <div className="flex flex-col items-center mb-10">
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">(주)광주텔레콤</h1>
                    </div>
                    <p className="text-slate-500 text-sm mt-2">통합관리시스템</p>
                </div>

                {/* 로그인 폼 */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="username" className="text-slate-700 font-medium">아이디</Label>
                        <div className="relative">
                            <UserIcon className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                            <Input
                                id="username"
                                type="text"
                                placeholder="아이디를 입력하세요"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                required
                                disabled={isLoading}
                                className="pl-10 h-12 bg-slate-50 border-slate-200 focus:bg-white focus:ring-[#1a73e8] focus:border-[#1a73e8] transition-all"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-slate-700 font-medium">비밀번호</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                            <Input
                                id="password"
                                type="password"
                                placeholder="비밀번호를 입력하세요"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                                disabled={isLoading}
                                className="pl-10 h-12 bg-slate-50 border-slate-200 focus:bg-white focus:ring-[#1a73e8] focus:border-[#1a73e8] transition-all"
                            />
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className="w-full h-12 text-lg font-medium mt-4 bg-[#1a73e8] hover:bg-[#1557b0] transition-colors shadow-sm"
                        disabled={isLoading}
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        로그인
                    </Button>

                </form>

                {/* 바닥글 */}
                <div className="mt-12 text-center text-sm text-slate-400">
                    {/* <p>© 2024 (주)광주텔레콤. All rights reserved.</p> */}
                    <div className="mt-2 text-xs text-slate-300">
                        System v{import.meta.env.APP_VERSION}
                    </div>
                </div>
            </div>
        </div>
    );
}
