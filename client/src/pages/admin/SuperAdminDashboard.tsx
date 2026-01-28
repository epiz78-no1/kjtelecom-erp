import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import AdminUsage from "./AdminUsage";
import { useAppContext } from "@/contexts/AppContext";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Building2,
    UserPlus,
    LogOut,
    Loader2,
    ShieldCheck,
    Edit,
    Trash2,
    User,
    X,
    Key,
    Lock,
    LayoutDashboard,
    PieChart,
    Settings
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Tenant {
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
    storageLimit: string;
    usedStorage: string;
    admins: {
        id: string;
        username: string;
        name: string;
        role: string;
    }[];
}

export default function SuperAdminDashboard() {
    const { toast } = useToast();
    const { logout } = useAppContext();
    const [currentView, setCurrentView] = useState<'tenants' | 'usage'>('tenants');

    // Password Change State
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" });

    // Tenant Management State
    const [isCreateTenantOpen, setIsCreateTenantOpen] = useState(false);
    const [newTenantName, setNewTenantName] = useState("");
    const [newTenantLimit, setNewTenantLimit] = useState("10"); // Default 10GB
    const [isEditTenantOpen, setIsEditTenantOpen] = useState(false);
    const [editForm, setEditForm] = useState({ id: "", name: "", slug: "", storageLimit: "10" });

    // Admin Creation State
    const [isCreateAdminOpen, setIsCreateAdminOpen] = useState(false);
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
    const [adminForm, setAdminForm] = useState({ username: "", password: "", name: "", phoneNumber: "" });

    // Fetch Tenants
    const { data: tenants, isLoading } = useQuery<Tenant[]>({
        queryKey: ["/api/admin/tenants"],
    });

    // Mutations
    const changePasswordMutation = useMutation({
        mutationFn: async (data: typeof passwordForm) => {
            await apiRequest("POST", "/api/auth/change-password", data);
        },
        onSuccess: () => {
            toast({ title: "성공", description: "비밀번호가 변경되었습니다." });
            setIsChangePasswordOpen(false);
            setPasswordForm({ currentPassword: "", newPassword: "" });
        },
        onError: (error: any) => {
            toast({
                title: "오류",
                description: error.message || "비밀번호 변경에 실패했습니다.",
                variant: "destructive",
            });
        },
    });

    const createTenantMutation = useMutation({
        mutationFn: async (data: { name: string; storageLimit: string }) => {
            await apiRequest("POST", "/api/admin/tenants", data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
            toast({ title: "성공", description: "새 회사가 생성되었습니다." });
            setIsCreateTenantOpen(false);
            setNewTenantName("");
            setNewTenantLimit("10");
        },
        onError: (error: any) => {
            toast({
                title: "오류",
                description: error.message || "회사 생성에 실패했습니다.",
                variant: "destructive",
            });
        },
    });

    const updateTenantMutation = useMutation({
        mutationFn: async (data: typeof editForm) => {
            await apiRequest("PATCH", `/api/admin/tenants/${data.id}`, {
                name: data.name,
                slug: data.slug,
                storageLimit: data.storageLimit
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
            toast({ title: "성공", description: "회사 정보가 수정되었습니다." });
            setIsEditTenantOpen(false);
        },
        onError: (error: any) => {
            toast({
                title: "오류",
                description: error.message || "회사 수정에 실패했습니다.",
                variant: "destructive",
            });
        },
    });

    const deleteTenantMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("DELETE", `/api/admin/tenants/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
            toast({ title: "성공", description: "회사가 삭제되었습니다." });
        },
        onError: (error: any) => {
            toast({
                title: "오류",
                description: error.message || "회사 삭제에 실패했습니다.",
                variant: "destructive",
            });
        },
    });

    const createAdminMutation = useMutation({
        mutationFn: async (data: typeof adminForm & { tenantId: string }) => {
            await apiRequest("POST", `/api/admin/tenants/${data.tenantId}/members`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
            toast({ title: "성공", description: "관리자가 생성되었습니다." });
            setIsCreateAdminOpen(false);
            setAdminForm({ username: "", password: "", name: "", phoneNumber: "" });
        },
        onError: (error: any) => {
            toast({
                title: "오류",
                description: error.message || "관리자 생성에 실패했습니다.",
                variant: "destructive",
            });
        },
    });

    const deleteAdminMutation = useMutation({
        mutationFn: async ({ tenantId, userId }: { tenantId: string; userId: string }) => {
            await apiRequest("DELETE", `/api/admin/tenants/${tenantId}/members/${userId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
            toast({ title: "성공", description: "관리자가 삭제되었습니다." });
        },
        onError: (error: any) => {
            toast({
                title: "오류",
                description: error.message || "관리자 삭제에 실패했습니다.",
                variant: "destructive",
            });
        },
    });

    // Handlers
    const handleChangePassword = (e: React.FormEvent) => {
        e.preventDefault();
        changePasswordMutation.mutate(passwordForm);
    };

    const handleCreateTenant = (e: React.FormEvent) => {
        e.preventDefault();
        createTenantMutation.mutate({ name: newTenantName, storageLimit: newTenantLimit });
    };

    const openEditDialog = (tenant: Tenant) => {
        // storageLimit bytes to GB string
        const limitGB = (BigInt(tenant.storageLimit) / BigInt(1024 * 1024 * 1024)).toString();
        setEditForm({
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            storageLimit: limitGB
        });
        setIsEditTenantOpen(true);
    };

    const handleUpdateTenant = (e: React.FormEvent) => {
        e.preventDefault();
        updateTenantMutation.mutate(editForm);
    };

    const handleDeleteTenant = (id: string) => {
        deleteTenantMutation.mutate(id);
    };

    const openAdminDialog = (tenant: Tenant) => {
        setSelectedTenant(tenant);
        setAdminForm({ username: "", password: "", name: "", phoneNumber: "" });
        setIsCreateAdminOpen(true);
    };

    const handleCreateAdmin = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedTenant) {
            createAdminMutation.mutate({ ...adminForm, tenantId: selectedTenant.id });
        }
    };

    const handleDeleteAdmin = (tenantId: string, userId: string) => {
        deleteAdminMutation.mutate({ tenantId, userId });
    };

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            {/* Super Admin Sidebar */}
            <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800">
                <div className="h-16 flex items-center px-6 border-b border-slate-800">
                    <div className="flex items-center gap-2 font-bold text-white text-lg">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                        <span>Super Admin</span>
                    </div>
                </div>

                <div className="p-4 space-y-1 flex-1">
                    <div className="mb-4">
                        <div className="text-xs font-semibold text-slate-500 mb-2 px-2 uppercase tracking-wide">
                            System
                        </div>
                        <Button
                            variant="ghost"
                            className={`w-full justify-start gap-2 ${currentView === 'tenants' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800/50 hover:text-white'}`}
                            onClick={() => setCurrentView('tenants')}
                        >
                            <LayoutDashboard className="h-4 w-4" />
                            테넌트 관리
                        </Button>
                        <Button
                            variant="ghost"
                            className={`w-full justify-start gap-2 ${currentView === 'usage' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800/50 hover:text-white'}`}
                            onClick={() => setCurrentView('usage')}
                        >
                            <PieChart className="h-4 w-4" />
                            공용 용량
                        </Button>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-800">
                    <Button variant="ghost" className="w-full justify-start gap-2 hover:bg-slate-800 text-red-400 hover:text-red-300" onClick={() => logout()}>
                        <LogOut className="h-4 w-4" />
                        로그아웃
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="bg-white border-b h-16 flex items-center justify-between px-8 shadow-sm z-10">
                    <div className="font-medium text-slate-500">
                        {currentView === 'tenants' ? '전체 회사 목록' : '시스템 사용량'}
                    </div>
                    <div className="flex items-center gap-2">
                        <Dialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-2">
                                    <Key className="h-4 w-4" />
                                    비밀번호 변경
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>비밀번호 변경</DialogTitle>
                                    <DialogDescription>
                                        계정의 보안을 위해 주기적으로 비밀번호를 변경해주세요.
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleChangePassword} className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="current-pw">현재 비밀번호</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="current-pw"
                                                type="password"
                                                value={passwordForm.currentPassword}
                                                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                                placeholder="현재 사용 중인 비밀번호"
                                                className="pl-9"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="new-pw">새 비밀번호</Label>
                                        <div className="relative">
                                            <Key className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="new-pw"
                                                type="password"
                                                value={passwordForm.newPassword}
                                                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                                placeholder="새로운 비밀번호 (6자 이상)"
                                                className="pl-9"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button type="button" variant="outline" onClick={() => setIsChangePasswordOpen(false)}>취소</Button>
                                        <Button type="submit" disabled={changePasswordMutation.isPending}>
                                            {changePasswordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            변경하기
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </header>

                <main className="flex-1 overflow-auto bg-slate-50 p-8">
                    {currentView === 'tenants' ? (
                        <>
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h1 className="text-2xl font-bold text-slate-900">전체 회사 목록</h1>
                                    <p className="text-slate-500">등록된 모든 회사를 관리합니다.</p>
                                </div>

                                <Dialog open={isCreateTenantOpen} onOpenChange={setIsCreateTenantOpen}>
                                    <DialogTrigger asChild>
                                        <Button className="gap-2">
                                            <Building2 className="h-4 w-4" />
                                            회사 생성
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>새 회사 생성</DialogTitle>
                                            <DialogDescription>새로운 회사를 시스템에 등록합니다.</DialogDescription>
                                        </DialogHeader>
                                        <form onSubmit={handleCreateTenant} className="space-y-4 py-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="name">회사명</Label>
                                                <Input
                                                    id="name"
                                                    value={newTenantName}
                                                    onChange={(e) => setNewTenantName(e.target.value)}
                                                    placeholder="(주)새로운회사"
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="limit">스토리지 용량 (GB)</Label>
                                                <Input
                                                    id="limit"
                                                    type="number"
                                                    min="1"
                                                    value={newTenantLimit}
                                                    onChange={(e) => setNewTenantLimit(e.target.value)}
                                                    placeholder="10"
                                                    required
                                                />
                                                <p className="text-xs text-muted-foreground">기본 10GB 제공</p>
                                            </div>
                                            <DialogFooter>
                                                <Button type="button" variant="outline" onClick={() => setIsCreateTenantOpen(false)}>취소</Button>
                                                <Button type="submit" disabled={createTenantMutation.isPending}>
                                                    {createTenantMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                    생성
                                                </Button>
                                            </DialogFooter>
                                        </form>
                                    </DialogContent>
                                </Dialog>
                            </div>

                            {isLoading ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {tenants?.map((tenant) => {
                                        const adminCount = tenant.admins?.length || 0;
                                        const isMaxAdmins = adminCount >= 5;

                                        return (
                                            <Card key={tenant.id} className="hover:shadow-md transition-shadow">
                                                <CardHeader className="pb-3">
                                                    <CardTitle className="flex items-center justify-between text-lg">
                                                        <span className="truncate">{tenant.name}</span>
                                                        <div className="flex gap-1">
                                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(tenant)}>
                                                                <Edit className="h-4 w-4 text-slate-500" />
                                                            </Button>
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50">
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            <span className="font-bold text-red-500">{tenant.name}</span> 회사와 관련된 모든 데이터가 삭제되며 복구할 수 없습니다.
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>취소</AlertDialogCancel>
                                                                        <AlertDialogAction onClick={() => handleDeleteTenant(tenant.id)} className="bg-red-600 hover:bg-red-700">삭제</AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </div>
                                                    </CardTitle>
                                                    <CardDescription className="font-mono text-xs flex flex-col gap-1">
                                                        <div className="flex items-center justify-between">
                                                            <span>{tenant.slug}</span>
                                                            {tenant.isActive ? (
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700">Active</span>
                                                            ) : (
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">Inactive</span>
                                                            )}
                                                        </div>
                                                        {(() => {
                                                            const limit = BigInt(tenant.storageLimit || "10737418240");
                                                            const used = BigInt(tenant.usedStorage || "0");
                                                            const percent = Number((used * BigInt(100)) / limit);
                                                            const usedGB = (Number(used) / (1024 * 1024 * 1024)).toFixed(2);
                                                            const limitGB = (Number(limit) / (1024 * 1024 * 1024)).toFixed(0);
                                                            const isWarning = percent >= 80;
                                                            const isCritical = percent >= 90;

                                                            // Supabase Storage URL - Extract project reference from URL
                                                            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                                                            let storageUrl = '#';

                                                            if (supabaseUrl) {
                                                                // Extract project ref from URL like: https://xxxxx.supabase.co
                                                                const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
                                                                if (match) {
                                                                    const projectRef = match[1];
                                                                    storageUrl = `https://supabase.com/dashboard/project/${projectRef}/storage/buckets/attachments`;
                                                                }
                                                            }

                                                            return (
                                                                <a
                                                                    href={storageUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="mt-2 space-y-1 block hover:opacity-80 transition-opacity cursor-pointer group/storage"
                                                                    title="Supabase Storage에서 확인"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation(); // Prevent card click event
                                                                        if (storageUrl === '#') {
                                                                            e.preventDefault();
                                                                            alert('Supabase URL이 설정되지 않았습니다.');
                                                                        }
                                                                    }}
                                                                >
                                                                    <div className="flex justify-between text-[10px] text-muted-foreground">
                                                                        <span className="group-hover/storage:underline">스토리지 ({percent}%) 🔗</span>
                                                                        <span>{usedGB}GB / {limitGB}GB</span>
                                                                    </div>
                                                                    <Progress
                                                                        value={percent}
                                                                        className={`h-1.5 ${isCritical ? "bg-red-100" : "bg-slate-100"}`}
                                                                        indicatorClassName={isCritical ? "bg-red-500" : isWarning ? "bg-yellow-500" : "bg-green-500"}
                                                                    />
                                                                </a>
                                                            );
                                                        })()}
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent className="pb-3 min-h-[100px] flex flex-col gap-2">
                                                    {tenant.admins && tenant.admins.length > 0 ? (
                                                        tenant.admins.map((admin) => (
                                                            <div key={admin.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100 group">
                                                                <div className="flex items-center gap-2 overflow-hidden">
                                                                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                                        <User className="h-3 w-3 text-primary" />
                                                                    </div>
                                                                    <div className="overflow-hidden">
                                                                        <p className="text-xs font-bold text-slate-900 truncate">
                                                                            {admin.name}
                                                                        </p>
                                                                        <p className="text-[10px] text-slate-500 truncate">
                                                                            @{admin.username}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <AlertDialog>
                                                                    <AlertDialogTrigger asChild>
                                                                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            <X className="h-3 w-3 text-red-400" />
                                                                        </Button>
                                                                    </AlertDialogTrigger>
                                                                    <AlertDialogContent>
                                                                        <AlertDialogHeader>
                                                                            <AlertDialogTitle>관리자 삭제</AlertDialogTitle>
                                                                            <AlertDialogDescription>
                                                                                관리자 <span className="font-bold">{admin.name}</span>(@{admin.username}) 계정을 삭제하시겠습니까?
                                                                            </AlertDialogDescription>
                                                                        </AlertDialogHeader>
                                                                        <AlertDialogFooter>
                                                                            <AlertDialogCancel>취소</AlertDialogCancel>
                                                                            <AlertDialogAction onClick={() => handleDeleteAdmin(tenant.id, admin.id)} className="bg-red-600 hover:bg-red-700">삭제</AlertDialogAction>
                                                                        </AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 text-center h-full flex items-center justify-center">
                                                            <p className="text-xs text-amber-700">등록된 관리자가 없습니다.</p>
                                                        </div>
                                                    )}
                                                </CardContent>
                                                <CardFooter>
                                                    <Button
                                                        variant="outline"
                                                        className="w-full gap-2 border-dashed"
                                                        onClick={() => openAdminDialog(tenant)}
                                                        disabled={isMaxAdmins}
                                                    >
                                                        <UserPlus className="h-4 w-4 text-slate-500" />
                                                        {isMaxAdmins ? "관리자 생성 한도 초과 (5/5)" : "관리자 추가 생성"}
                                                    </Button>
                                                </CardFooter>
                                            </Card>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Edit Tenant Dialog */}
                            <Dialog open={isEditTenantOpen} onOpenChange={setIsEditTenantOpen}>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>회사 정보 수정</DialogTitle>
                                        <DialogDescription>회사명과 영문 주소(Slug)를 수정합니다.</DialogDescription>
                                    </DialogHeader>
                                    <form onSubmit={handleUpdateTenant} className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="edit-name">회사명</Label>
                                            <Input
                                                id="edit-name"
                                                value={editForm.name}
                                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                                placeholder="(주)회사명"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="edit-slug">영문 이름 (Slug)</Label>
                                            <Input
                                                id="edit-slug"
                                                value={editForm.slug}
                                                onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                                                placeholder="company-slug"
                                                required
                                            />
                                            <p className="text-xs text-muted-foreground">URL 주소 등으로 사용되는 영문 식별자입니다.</p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="edit-limit">스토리지 용량 (GB)</Label>
                                            <Input
                                                id="edit-limit"
                                                type="number"
                                                min="1"
                                                value={editForm.storageLimit}
                                                onChange={(e) => setEditForm({ ...editForm, storageLimit: e.target.value })}
                                                placeholder="10"
                                                required
                                            />
                                        </div>
                                        <DialogFooter>
                                            <Button type="button" variant="outline" onClick={() => setIsEditTenantOpen(false)}>취소</Button>
                                            <Button type="submit" disabled={updateTenantMutation.isPending}>
                                                {updateTenantMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                저장
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>

                            {/* Create Admin Dialog */}
                            <Dialog open={isCreateAdminOpen} onOpenChange={setIsCreateAdminOpen}>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>관리자 계정 생성</DialogTitle>
                                        <DialogDescription>
                                            <span className="font-bold text-primary">{selectedTenant?.name}</span>의 관리자를 추가합니다.
                                            <br />
                                            <span className="text-xs text-muted-foreground">(최대 5명까지 생성 가능)</span>
                                        </DialogDescription>
                                    </DialogHeader>
                                    <form onSubmit={handleCreateAdmin} className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="admin-id">아이디</Label>
                                            <Input
                                                id="admin-id"
                                                value={adminForm.username}
                                                onChange={(e) => setAdminForm({ ...adminForm, username: e.target.value })}
                                                placeholder="admin_id"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="admin-pw">비밀번호</Label>
                                            <Input
                                                id="admin-pw"
                                                type="password"
                                                value={adminForm.password}
                                                onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                                                placeholder="••••••••"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="admin-name">이름</Label>
                                            <Input
                                                id="admin-name"
                                                value={adminForm.name}
                                                onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                                                placeholder="관리자 이름"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="admin-phone">연락처</Label>
                                            <Input
                                                id="admin-phone"
                                                value={adminForm.phoneNumber}
                                                onChange={(e) => setAdminForm({ ...adminForm, phoneNumber: e.target.value })}
                                                placeholder="010-1234-5678"
                                            />
                                        </div>
                                        <DialogFooter>
                                            <Button type="button" variant="outline" onClick={() => setIsCreateAdminOpen(false)}>취소</Button>
                                            <Button type="submit" disabled={createAdminMutation.isPending}>
                                                {createAdminMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                생성
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </>
                    ) : (
                        <div className="h-full">
                            <AdminUsage />
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
