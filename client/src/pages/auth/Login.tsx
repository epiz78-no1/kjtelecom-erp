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
                // Otherwise, redirect to dashboard
                setLocation("/optical-dashboard");
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
        <div className="flex h-screen w-full overflow-hidden bg-background font-sans selection:bg-primary/20">
            {/* Left Side - Hero Section */}
            <div className="relative hidden w-1/2 flex-col justify-between bg-zinc-900 p-8 text-white lg:flex">
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1620641788421-7f1c9dd7509f?q=80&w=2600&auto=format&fit=crop')] bg-cover bg-center opacity-40 mix-blend-overlay hover:scale-105 transition-transform duration-[20s] ease-in-out" />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

                {/* Logo Area */}
                <div className="relative z-10 flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md shadow-2xl ring-1 ring-white/20">
                        <Package className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-xl font-bold tracking-tight">KJ ERP</span>
                </div>

                {/* Hero Content */}
                <div className="relative z-10 max-w-md space-y-6">
                    <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur-md">
                        <span className="flex h-2 w-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
                        <span className="text-xs font-medium text-white/80">Online System v1.2.42</span>
                    </div>
                    <h1 className="text-5xl font-extrabold tracking-tight leading-tight">
                        스마트하게 관리하는 <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">자재의 모든 흐름</span>
                    </h1>
                    <p className="text-lg text-zinc-400 leading-relaxed font-light">
                        입고부터 출고, 재고 관리까지 한눈에. <br />
                        현장과 사무실을 잇는 가장 강력하고 직관적인 솔루션입니다.
                    </p>
                </div>

                {/* Footer Quote */}
                <div className="relative z-10 space-y-2">
                    <figure className="border-l-2 border-primary/50 pl-4">
                        <blockquote className="text-sm italic text-zinc-400">
                            "효율적인 자재 관리는 성공적인 프로젝트의 시작입니다."
                        </blockquote>
                        <figcaption className="mt-1 text-xs text-zinc-500">
                            System Administrator
                        </figcaption>
                    </figure>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="flex w-full flex-col items-center justify-center lg:w-1/2 bg-gradient-to-br from-background to-muted/20 relative">
                {/* Decorative Blobs */}
                <div className="absolute top-20 right-20 w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-20 left-20 w-72 h-72 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

                <Card className="w-full max-w-md border-0 bg-white/60 dark:bg-zinc-900/60 shadow-2xl backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 sm:rounded-3xl">
                    <CardHeader className="space-y-1 text-center pb-8 pt-10">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20 transform hover:scale-105 transition-all duration-300">
                            <Sparkles className="h-7 w-7 text-white" />
                        </div>
                        <CardTitle className="text-2xl font-bold tracking-tight">환영합니다</CardTitle>
                        <CardDescription className="text-muted-foreground">
                            계정에 로그인하여 업무를 시작하세요
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 px-10">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="username" className="text-xs font-semibold uppercase text-muted-foreground ml-1">아이디</Label>
                                <div className="relative group">
                                    <Input
                                        id="username"
                                        placeholder="admin"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        required
                                        className="bg-muted/30 border-muted-foreground/20 focus:bg-background h-12 rounded-xl transition-all duration-300 focus:ring-2 focus:ring-primary/20 pl-4"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-xs font-semibold uppercase text-muted-foreground ml-1">비밀번호</Label>
                                <div className="relative group">
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required
                                        className="bg-muted/30 border-muted-foreground/20 focus:bg-background h-12 rounded-xl transition-all duration-300 focus:ring-2 focus:ring-primary/20 pl-4"
                                    />
                                </div>
                                <div className="flex justify-end">
                                    <Button variant="ghost" className="px-0 font-normal text-xs text-muted-foreground hover:text-primary hover:bg-transparent h-auto" type="button" onClick={() => toast({ description: "관리자에게 문의하세요." })}>
                                        비밀번호를 잊으셨나요?
                                    </Button>
                                </div>
                            </div>

                            <Button className="w-full h-12 text-base font-medium rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300" type="submit" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        로그인 중...
                                    </>
                                ) : (
                                    <div className="flex items-center justify-center gap-2">
                                        로그인
                                        <ArrowRight className="h-4 w-4" />
                                    </div>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="pb-8 pt-0 text-center">
                        <div className="w-full text-center text-xs text-muted-foreground">
                            로그인에 문제가 있나요? <br />
                            <span className="font-medium text-foreground">시스템 관리자</span>에게 문의하세요.
                        </div>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
