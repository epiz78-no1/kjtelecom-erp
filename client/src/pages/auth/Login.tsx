import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAppContext } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Package, ArrowRight, Sparkles } from "lucide-react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from "@/components/ui/card";

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
                title: "환영합니다!",
                description: `${data.user.name || data.user.username}님, 성공적으로 로그인되었습니다.`,
            });

            // Refresh auth state before redirecting
            await refetchAuth();

            // Redirect based on role
            if (data.user.username === "admin") {
                setLocation("/super-admin");
            } else if (data.tenants && data.tenants.length > 1) {
                setLocation("/tenant-select");
            } else {
                // Check if Field Team - usage write & inventory none (relaxed check)
                const tenant = data.tenants && data.tenants[0];
                const perms = tenant?.permissions || {};
                const isFieldTeam = perms.usage === 'write' && perms.inventory === 'none';

                if (isFieldTeam) {
                    setLocation("/team-material-usage-optical");
                } else {
                    setLocation("/optical-dashboard");
                }
            }
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "로그인 실패",
                description: error.message || "아이디 또는 비밀번호를 확인해주세요.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        document.title = "로그인 | (주)광주텔레콤 ERP";
    }, []);

    return (
        <div className="flex h-screen w-full overflow-hidden bg-background font-sans selection:bg-indigo-500/20">
            {/* Left Side - Hero Section */}
            <div className="relative hidden w-[45%] flex-col justify-between bg-zinc-950 p-12 text-white lg:flex border-r border-white/5">
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-[url('/login-bg.png')] bg-cover bg-center opacity-80 mix-blend-normal hover:scale-105 transition-transform duration-[40s] ease-in-out" />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-zinc-950/20 to-zinc-950/10" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]" />

                {/* Logo Area */}
                <div className="relative z-10 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 backdrop-blur-md ring-1 ring-white/10 shadow-2xl">
                        <Package className="h-6 w-6 text-emerald-400" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-white/90">KJ ERP</span>
                </div>

                {/* Hero Content */}
                <div className="relative z-10 max-w-lg space-y-8">
                    <div className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 backdrop-blur-md shadow-sm">
                        <span className="flex h-2 w-2 rounded-full bg-emerald-500 mr-2 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                        <span className="text-xs font-semibold text-emerald-300 tracking-wide">Smart ERP System v1.2.42</span>
                    </div>
                </div>

                {/* Footer Quote */}
                <div className="relative z-10">
                    <div className="flex items-center gap-4 text-sm text-zinc-500 font-medium">
                        <span className="h-px w-8 bg-zinc-800"></span>
                        <span>System Administrator</span>
                    </div>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="flex flex-1 flex-col items-center justify-center bg-slate-50/50 relative px-4 lg:px-0">
                {/* Background Decor */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100/40 via-transparent to-transparent pointer-events-none" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-emerald-100/40 via-transparent to-transparent pointer-events-none" />

                <Card className="w-full max-w-[400px] border-none shadow-2xl shadow-indigo-100/50 bg-white/80 backdrop-blur-xl sm:rounded-2xl ring-1 ring-slate-200/60 overflow-hidden">
                    <CardHeader className="space-y-1 text-center pb-6 pt-10">
                        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-indigo-500/20 transform hover:scale-105 transition-all duration-300">
                            <Sparkles className="h-7 w-7 text-white" />
                        </div>
                        <CardTitle className="text-xl font-bold tracking-tight text-slate-800">환영합니다</CardTitle>
                        <CardDescription className="text-slate-500 text-sm">
                            계정에 로그인하여 업무를 시작하세요
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 px-8 pb-10">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-1.5">
                                <Label htmlFor="username" className="text-[11px] font-bold uppercase text-slate-400 tracking-wider ml-1">ID</Label>
                                <div className="relative group">
                                    <Input
                                        id="username"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        required
                                        className="h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 rounded-lg transition-all duration-200 font-medium pl-3 text-sm"
                                        placeholder="아이디를 입력하세요"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="password" className="text-[11px] font-bold uppercase text-slate-400 tracking-wider ml-1">Password</Label>
                                <div className="relative group">
                                    <Input
                                        id="password"
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required
                                        className="h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 rounded-lg transition-all duration-200 font-medium pl-3 text-sm"
                                        placeholder="비밀번호를 입력하세요"
                                    />
                                </div>
                            </div>

                            <div className="pt-2">
                                <Button
                                    className="w-full h-11 text-sm font-semibold rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all duration-200"
                                    type="submit"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin text-white/90" />
                                            <span className="text-white/90">로그인 중...</span>
                                        </>
                                    ) : (
                                        <div className="flex items-center justify-center gap-2 text-white">
                                            로그인
                                            <ArrowRight className="h-4 w-4 opacity-80" />
                                        </div>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                    <CardFooter className="py-5 bg-slate-50/50 border-t border-slate-100/50 flex flex-col gap-2">
                        <div className="w-full text-center text-[11px] text-slate-400">
                            로그인에 문제가 있나요? <span className="text-indigo-600 font-medium cursor-pointer hover:underline">시스템 관리자 문의</span>
                        </div>
                    </CardFooter>
                </Card>

                <div className="mt-8 text-center">
                    <p className="text-[10px] text-slate-400 font-medium tracking-wide">
                        © 2026 KJ Telecom. All rights reserved.
                    </p>
                </div>
            </div>
        </div >
    );
}
