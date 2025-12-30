import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Building2, UserPlus, LogOut, Loader2, ShieldCheck, Edit, Trash2, User, X } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface AdminUser {
    id: string;
    username: string;
    name: string;
    role: string;
}

interface Tenant {
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
    createdAt: string;
    admins?: AdminUser[];
}

export default function SuperAdminDashboard() {
    const { toast } = useToast();
    const { logout } = useAppContext();
    const [isCreateTenantOpen, setIsCreateTenantOpen] = useState(false);
    const [newTenantName, setNewTenantName] = useState("");

    const [isEditTenantOpen, setIsEditTenantOpen] = useState(false);
    const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
    const [editForm, setEditForm] = useState({ name: "", slug: "" });

    const [isCreateAdminOpen, setIsCreateAdminOpen] = useState(false);
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
    const [adminForm, setAdminForm] = useState({
        username: "",
        password: "",
        name: "",
        phoneNumber: ""
    });

    // Fetch all tenants
    const { data: tenants, isLoading } = useQuery<Tenant[]>({
        queryKey: ["/api/admin/tenants"],
    });

    // Create Tenant Mutation
    const createTenantMutation = useMutation({
        mutationFn: async (name: string) => {
            await apiRequest("POST", "/api/admin/tenants", { name });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
            toast({ title: "성공", description: "회사가 생성되었습니다." });
            setIsCreateTenantOpen(false);
            setNewTenantName("");
        },
        onError: (error: any) => {
            toast({ title: "실패", description: error.message, variant: "destructive" });
        }
    });

    // Update Tenant Mutation
    const updateTenantMutation = useMutation({
        mutationFn: async (data: { id: string, name: string, slug: string }) => {
            await apiRequest("PATCH", `/api/admin/tenants/${data.id}`, { name: data.name, slug: data.slug });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
            toast({ title: "성공", description: "회사 정보가 수정되었습니다." });
            setIsEditTenantOpen(false);
            setEditingTenant(null);
        },
        onError: (error: any) => {
            toast({ title: "실패", description: error.message, variant: "destructive" });
        }
    });

    // Delete Tenant Mutation
    const deleteTenantMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("DELETE", `/api/admin/tenants/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
            toast({ title: "성공", description: "회사가 삭제되었습니다." });
        },
        onError: (error: any) => {
            toast({ title: "실패", description: error.message, variant: "destructive" });
        }
    });

    // Create Admin Mutation
    const createAdminMutation = useMutation({
        mutationFn: async (data: typeof adminForm & { tenantId: string }) => {
            await apiRequest("POST", `/api/admin/tenants/${data.tenantId}/members`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
            toast({ title: "성공", description: "관리자가 생성되었습니다." });
            setIsCreateAdminOpen(false);
            setAdminForm({ username: "", password: "", name: "", phoneNumber: "" });
            setSelectedTenant(null);
        },
        onError: (error: any) => {
            toast({ title: "실패", description: error.message, variant: "destructive" });
        }
    });

    // Delete Admin Mutation
    const deleteAdminMutation = useMutation({
        mutationFn: async (data: { tenantId: string, userId: string }) => {
            await apiRequest("DELETE", `/api/admin/tenants/${data.tenantId}/members/${data.userId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
            toast({ title: "성공", description: "관리자가 삭제되었습니다." });
        },
        onError: (error: any) => {
            toast({ title: "실패", description: error.message, variant: "destructive" });
        }
    });

    const handleCreateTenant = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTenantName.trim()) {
            createTenantMutation.mutate(newTenantName);
        }
    };

    const handleUpdateTenant = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingTenant) {
            updateTenantMutation.mutate({
                id: editingTenant.id,
                name: editForm.name,
                slug: editForm.slug
            });
        }
    };

    const handleCreateAdmin = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedTenant) {
            createAdminMutation.mutate({ ...adminForm, tenantId: selectedTenant.id });
        }
    };

    const handleDeleteTenant = (id: string) => {
        deleteTenantMutation.mutate(id);
    };

    const handleDeleteAdmin = (tenantId: string, userId: string) => {
        deleteAdminMutation.mutate({ tenantId, userId });
    };

    const openAdminDialog = (tenant: Tenant) => {
        setSelectedTenant(tenant);
        setIsCreateAdminOpen(true);
    };

    const openEditDialog = (tenant: Tenant) => {
        setEditingTenant(tenant);
        setEditForm({ name: tenant.name, slug: tenant.slug });
        setIsEditTenantOpen(true);
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-10">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-xl text-slate-800">
                        <ShieldCheck className="h-6 w-6 text-primary" />
                        슈퍼 어드민 콘솔
                    </div>
                    <Button variant="ghost" onClick={() => logout()} className="gap-2">
                        <LogOut className="h-4 w-4" />
                        로그아웃
                    </Button>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
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

            </main>
        </div>
    );
}
