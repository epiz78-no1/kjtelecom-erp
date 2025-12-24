import { useState } from "react";
import { useLocation } from "wouter";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Building2, ChevronRight, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function TenantSelect() {
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const { tenants, refetchAuth } = useAppContext();
    const [isLoading, setIsLoading] = useState(false);
    const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

    const handleSelectTenant = async (tenantId: string) => {
        setIsLoading(true);
        setSelectedTenantId(tenantId);

        try {
            await apiRequest("POST", "/api/auth/switch-tenant", { tenantId });

            toast({
                title: "회사 전환 완료",
                description: "선택한 회사로 이동합니다."
            });

            // Refresh auth state
            refetchAuth();

            // Redirect to dashboard
            setTimeout(() => {
                setLocation("/");
            }, 500);
        } catch (error: any) {
            toast({
                title: "회사 전환 실패",
                description: error.message || "회사를 전환하는 중 오류가 발생했습니다.",
                variant: "destructive"
            });
            setIsLoading(false);
            setSelectedTenantId(null);
        }
    };

    if (!tenants || tenants.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-center">소속된 회사가 없습니다</CardTitle>
                        <CardDescription className="text-center">
                            관리자에게 문의하세요.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <Card className="w-full max-w-2xl">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">회사 선택</CardTitle>
                    <CardDescription className="text-center">
                        접속할 회사를 선택해주세요
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {tenants.map((tenant) => (
                        <Button
                            key={tenant.id}
                            variant="outline"
                            className="w-full h-auto p-4 flex items-center justify-between hover:bg-primary/5 hover:border-primary transition-all"
                            onClick={() => handleSelectTenant(tenant.id)}
                            disabled={isLoading}
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <Building2 className="h-6 w-6 text-primary" />
                                </div>
                                <div className="text-left">
                                    <div className="font-semibold text-base">{tenant.name}</div>
                                    <div className="text-sm text-muted-foreground">
                                        {tenant.role === "owner" && "소유자"}
                                        {tenant.role === "admin" && "관리자"}
                                        {tenant.role === "member" && "멤버"}
                                    </div>
                                </div>
                            </div>
                            {isLoading && selectedTenantId === tenant.id ? (
                                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            ) : (
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            )}
                        </Button>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}
