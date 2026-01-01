import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
    Users,
    UserPlus,
    MoreHorizontal,
    Shield,
    User as UserIcon,
    Mail,
    Calendar,
    CheckCircle2,
    XCircle,
    Clock,
    UserPlus2,
    Lock,
    Phone
} from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useAppContext } from "@/contexts/AppContext";

interface Member {
    id: string;
    username: string;
    name: string;
    email: string; // This might be redundant if username is the ID, but keep for compatibility
    role: string;
    status: string;
    joinDate: string;
    positionName: string | null;
    positionId: string;
    divisionName: string | null;
    divisionId: string;
    teamName: string | null;
    teamId?: string;
    phoneNumber?: string;
    permissions?: any; // Using any for brevity, or define Permissions interface
}

interface Invitation {
    id: string;
    email: string;
    role: string;
    status: string;
    expiresAt: string;
    createdAt: string;
}

export default function AdminMembers() {
    const { toast } = useToast();
    const { divisions, positions, teams } = useAppContext();
    const [createData, setCreateData] = useState({
        username: "",
        password: "",
        name: "",
        phoneNumber: "",
        positionId: "",
        divisionId: "",
        teamId: "",
        permissions: {
            incoming: 'none',
            outgoing: 'none',
            usage: 'none',
            inventory: 'none',
        }
    });
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

    // Edit states
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<Member | null>(null);
    const [editData, setEditData] = useState({
        name: "",
        positionId: "",
        divisionId: "",
        teamId: "",
        phoneNumber: "", // Added phone number to edit data
        status: "active"
    });

    const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
    const [newRole, setNewRole] = useState("member");

    // UI State for permission details
    const [showCustomPerms, setShowCustomPerms] = useState(false);

    const { data: members, isLoading: membersLoading } = useQuery<Member[]>({
        queryKey: ["/api/admin/members?v=1"], // Cache busting with query param
    });

    // Force refresh on mount to ensure fresh data
    useEffect(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/members?v=1"] });
    }, []);

    const createMemberMutation = useMutation({
        mutationFn: async (data: typeof createData) => {
            await apiRequest("POST", "/api/admin/members", data);
        },
        onSuccess: () => {
            toast({
                title: "멤버 생성 완료",
                description: `${createData.name}님을 멤버로 등록했습니다.`,
            });
            setCreateData({
                username: "",
                password: "",
                name: "",
                phoneNumber: "",
                positionId: "",
                divisionId: "",
                teamId: "",
                permissions: {
                    incoming: 'none',
                    outgoing: 'none',
                    usage: 'none',
                    inventory: 'none',
                }
            });
            setIsCreateDialogOpen(false);
            queryClient.invalidateQueries({ queryKey: ["/api/admin/members?v=1"] });
            queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
        },
        onError: (error: any) => {
            toast({
                title: "멤버 생성 실패",
                description: error.message || "오류가 발생했습니다.",
                variant: "destructive",
            });
        },
    });

    const deleteMemberMutation = useMutation({
        mutationFn: async (userId: string) => {
            await apiRequest("DELETE", `/api/admin/members/${userId}`);
        },
        onSuccess: () => {
            toast({ title: "멤버 삭제 완료" });
            queryClient.invalidateQueries({ queryKey: ["/api/admin/members?v=1"] });
            queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
        },
    });

    const updateMemberMutation = useMutation({
        mutationFn: async ({ userId, data }: { userId: string; data: any }) => {
            console.log("[CLIENT] Updating member:", userId, "with data:", data);
            const result = await apiRequest("PATCH", `/api/admin/members/${userId}`, data);
            console.log("[CLIENT] Update result:", result);
            return result;
        },
        onSuccess: async (data, variables) => {
            console.log("[CLIENT] Update success");
            console.log("[CLIENT] Updated data:", variables.data);
            toast({
                title: "멤버 정보 수정 완료",
                description: `상태: ${variables.data.status || '변경없음'}`
            });
            setIsEditDialogOpen(false);
            setIsRoleDialogOpen(false);
            // Force refetch to ensure UI updates
            await queryClient.refetchQueries({ queryKey: ["/api/admin/members?v=1"] });
            queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
        },
        onError: (error: any) => {
            console.error("[CLIENT] Update error:", error);
            toast({
                title: "수정 실패",
                description: error.message,
                variant: "destructive"
            });
        }
    });

    const handleEditMember = (member: Member) => {
        setEditingMember(member);
        // Find positionId, divisionId, teamId from current data if possible
        // Note: The Member interface needs to support these IDs or we find them by name
        // For now, assume the backend returns them or we just use names for lookup
        setEditData({
            name: member.name,
            positionId: member.positionId || "",
            divisionId: member.divisionId || "",
            teamId: member.teamId || "",
            phoneNumber: member.phoneNumber || "",
            status: member.status
        });
        setIsEditDialogOpen(true);
    };

    const handleRoleChange = (member: Member) => {
        setEditingMember(member);
        setNewRole(member.role);
        setIsRoleDialogOpen(true);
    };

    // Permission Logic
    const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);
    const [editingPermissions, setEditingPermissions] = useState<any>({
        incoming: 'none',
        outgoing: 'none',
        usage: 'none',
        inventory: 'none',
    });

    const handlePermissionEdit = (member: Member) => {
        setEditingMember(member);
        if (member.permissions) {
            setEditingPermissions(member.permissions);
        } else {
            // Default
            setEditingPermissions({
                incoming: 'none',
                outgoing: 'none',
                usage: 'none',
                inventory: 'none',
            });
        }
        setIsPermissionDialogOpen(true);
    };

    const updatePermissionMutation = useMutation({
        mutationFn: async ({ userId, permissions }: { userId: string; permissions: any }) => {
            await apiRequest("PATCH", `/api/admin/members/${userId}/permissions`, { permissions });
        },
        onSuccess: () => {
            toast({ title: "권한이 업데이트되었습니다" });
            setIsPermissionDialogOpen(false);
            queryClient.invalidateQueries({ queryKey: ["/api/admin/members?v=1"] });
        },
        onError: (error: any) => {
            toast({ title: "권한 업데이트 실패", description: error.message, variant: "destructive" });
        }
    });

    const applyPermissionPreset = (preset: 'admin' | 'field' | 'readonly' | 'office') => {
        let perms = {
            incoming: 'none',
            outgoing: 'none',
            usage: 'none',
            inventory: 'none',
        };

        if (preset === 'admin' || preset === 'office') {
            perms = {
                incoming: 'write',
                outgoing: 'write',
                usage: 'write',
                inventory: 'write'
            };
        } else if (preset === 'field') {
            perms = {
                incoming: 'none',
                outgoing: 'none',
                usage: 'write', // 현장팀은 사용등록 권한 필요
                inventory: 'none'
            };
        } else if (preset === 'readonly') {
            perms = {
                incoming: 'read',
                outgoing: 'read',
                usage: 'read',
                inventory: 'read'
            };
        }

        // Apply to Create State or Edit State depending on which dialog is open
        if (isCreateDialogOpen) {
            setCreateData({
                ...createData,
                permissions: perms
            });
        }

        if (isPermissionDialogOpen) {
            setEditingPermissions(perms);
        }
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case "owner":
                return <Badge className="bg-red-100 text-red-800 border-red-200">소유자</Badge>;
            case "admin":
                return <Badge className="bg-blue-100 text-blue-800 border-blue-200">관리자</Badge>;
            default:
                return <Badge variant="secondary">멤버</Badge>;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "active":
                return (
                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 gap-1">
                        <CheckCircle2 className="h-3 w-3" /> 활성
                    </Badge>
                );
            case "inactive":
                return (
                    <Badge variant="outline" className="text-gray-600 border-gray-200 bg-gray-50 gap-1">
                        <XCircle className="h-3 w-3" /> 비활성
                    </Badge>
                );
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    }


    const getPermissionMode = (perms: any) => {
        if (!perms) return 'custom';
        if (perms.incoming === 'write' && perms.outgoing === 'write' && perms.usage === 'write' && perms.inventory === 'write') return 'office';
        if (perms.incoming === 'none' && perms.outgoing === 'none' && perms.usage === 'write' && perms.inventory === 'none') return 'field';
        if (perms.incoming === 'read' && perms.outgoing === 'read' && perms.usage === 'read' && perms.inventory === 'read') return 'readonly';
        return 'custom';
    };

    const getPermissionLabel = (perms: any) => {
        const mode = getPermissionMode(perms);
        if (mode === 'office') return <Badge className="bg-blue-100 text-blue-800 border-blue-200">사무실 (전체)</Badge>;
        if (mode === 'field') return <Badge className="bg-green-100 text-green-800 border-green-200">현장팀</Badge>;
        if (mode === 'readonly') return <Badge variant="secondary">조회 전용</Badge>;
        return <Badge variant="outline">사용자 지정</Badge>;
    };

    return (
        <div className="container mx-auto py-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">멤버 관리</h1>
                    <p className="text-muted-foreground">회사를 함께 운영할 멤버들을 관리하고 초대하세요.</p>
                </div>

                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <UserPlus2 className="h-4 w-4" /> 멤버 생성하기
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>새 멤버 생성</DialogTitle>
                            <DialogDescription>
                                관리자가 직접 멤버 정보를 입력하여 계정을 생성합니다.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-6 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="username">아이디 (ID)</Label>
                                    <Input
                                        id="username"
                                        placeholder="사용자 아이디"
                                        value={createData.username}
                                        onChange={(e) => setCreateData({ ...createData, username: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="password">비밀번호</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="비밀번호"
                                        value={createData.password}
                                        onChange={(e) => setCreateData({ ...createData, password: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="name">이름</Label>
                                    <Input
                                        id="name"
                                        placeholder="사용자 이름"
                                        value={createData.name}
                                        onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="phone">전화번호</Label>
                                    <Input
                                        id="phone"
                                        placeholder="010-0000-0000"
                                        value={createData.phoneNumber}
                                        onChange={(e) => setCreateData({ ...createData, phoneNumber: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="grid gap-2">
                                    <Label>직급</Label>
                                    <Select
                                        value={createData.positionId}
                                        onValueChange={(val) => setCreateData({ ...createData, positionId: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="직급 선택" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {positions?.map((p: any) => (
                                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>소속 부서</Label>
                                    <Select
                                        value={createData.divisionId}
                                        onValueChange={(val) => setCreateData({ ...createData, divisionId: val, teamId: "" })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="부서 선택" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {divisions?.map((d: any) => (
                                                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>소속 팀</Label>
                                    <Select
                                        value={createData.teamId}
                                        onValueChange={(val) => setCreateData({ ...createData, teamId: val })}
                                        disabled={!createData.divisionId}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="팀 선택" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {teams?.filter((t: any) => t.divisionId === createData.divisionId).map((t: any) => (
                                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-medium">초기 권한 설정</h4>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant={getPermissionMode(createData.permissions) === 'office' ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => applyPermissionPreset('office')}
                                        >
                                            사무실
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={getPermissionMode(createData.permissions) === 'field' ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => applyPermissionPreset('field')}
                                        >
                                            현장팀
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={getPermissionMode(createData.permissions) === 'readonly' ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => applyPermissionPreset('readonly')}
                                        >
                                            조회전용
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={showCustomPerms || getPermissionMode(createData.permissions) === 'custom' ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setShowCustomPerms(!showCustomPerms)}
                                        >
                                            직접 설정
                                        </Button>
                                    </div>
                                </div>
                                {(showCustomPerms || getPermissionMode(createData.permissions) === 'custom') && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label>입고 관리</Label>
                                            <Select
                                                value={createData.permissions.incoming}
                                                onValueChange={(val: any) => setCreateData({
                                                    ...createData,
                                                    permissions: { ...createData.permissions, incoming: val }
                                                })}
                                            >
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">접근 불가</SelectItem>
                                                    <SelectItem value="read">조회만</SelectItem>
                                                    <SelectItem value="write">수정/삭제</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>출고 관리</Label>
                                            <Select
                                                value={createData.permissions.outgoing}
                                                onValueChange={(val: any) => setCreateData({
                                                    ...createData,
                                                    permissions: { ...createData.permissions, outgoing: val }
                                                })}
                                            >
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">접근 불가</SelectItem>
                                                    <SelectItem value="read">조회만</SelectItem>
                                                    <SelectItem value="write">수정/삭제</SelectItem>
                                                    <SelectItem value="own_only">본인 수령분만</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>사용 내역</Label>
                                            <Select
                                                value={createData.permissions.usage}
                                                onValueChange={(val: any) => setCreateData({
                                                    ...createData,
                                                    permissions: { ...createData.permissions, usage: val }
                                                })}
                                            >
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">접근 불가</SelectItem>
                                                    <SelectItem value="read">조회만</SelectItem>
                                                    <SelectItem value="write">수정/삭제</SelectItem>
                                                    <SelectItem value="own_only">본인 사용분만</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>재고 현황</Label>
                                            <Select
                                                value={createData.permissions.inventory}
                                                onValueChange={(val: any) => setCreateData({
                                                    ...createData,
                                                    permissions: { ...createData.permissions, inventory: val }
                                                })}
                                            >
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">접근 불가</SelectItem>
                                                    <SelectItem value="read">조회만</SelectItem>
                                                    <SelectItem value="write">수정/삭제</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                onClick={() => createMemberMutation.mutate(createData)}
                                disabled={createMemberMutation.isPending || !createData.username || !createData.password || !createData.name}
                            >
                                멤버 생성
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-primary" />
                            활성 멤버 ({members?.length || 0})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>멤버</TableHead>
                                    <TableHead>ID</TableHead>
                                    <TableHead>직급/부서</TableHead>
                                    <TableHead>연락처</TableHead>
                                    <TableHead>권한</TableHead>
                                    <TableHead>세부 권한</TableHead>
                                    <TableHead>상태</TableHead>
                                    <TableHead>가입일</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {membersLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                            불러오는 중...
                                        </TableCell>
                                    </TableRow>
                                ) : members?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                            등록된 멤버가 없습니다.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    members?.map((member) => (
                                        <TableRow key={member.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                                                        <UserIcon className="h-4 w-4 text-slate-500" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{member.name}</span>
                                                        <span className="text-xs text-muted-foreground">{member.email}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {member.username}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col text-sm">
                                                    <span>{member.positionName || "-"}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {member.divisionName ? `${member.divisionName} / ${member.teamName || '팀 미지정'}` : "-"}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col text-sm">
                                                    <span>{member.phoneNumber || "-"}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{getRoleBadge(member.role)}</TableCell>
                                            <TableCell>{getPermissionLabel(member.permissions)}</TableCell>
                                            <TableCell>{getStatusBadge(member.status)}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {format(new Date(member.joinDate), "yyyy-MM-dd", { locale: ko })}
                                            </TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>멤버 관리</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => handleEditMember(member)}>정보 수정</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleRoleChange(member)}>역할 변경</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handlePermissionEdit(member)}>상세 권한 설정</DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-destructive"
                                                            onClick={() => {
                                                                if (confirm(`"${member.name}" 멤버를 삭제하시겠습니까?`)) {
                                                                    deleteMemberMutation.mutate(member.id);
                                                                }
                                                            }}
                                                        >
                                                            멤버 삭제
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

            </div>

            {/* Member Info Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>멤버 정보 수정</DialogTitle>
                        <DialogDescription>
                            멤버의 이름, 직급, 소속 부서 및 팀을 변경합니다.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="editName">이름</Label>
                            <Input
                                id="editName"
                                value={editData.name}
                                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="editPhone">연락처</Label>
                            <Input
                                id="editPhone"
                                value={editData.phoneNumber}
                                onChange={(e) => setEditData({ ...editData, phoneNumber: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="editStatus">상태</Label>
                            <Select
                                value={editData.status}
                                onValueChange={(val) => setEditData({ ...editData, status: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="상태 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">활성</SelectItem>
                                    <SelectItem value="inactive">비활성</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>직급</Label>
                            <Select
                                value={editData.positionId}
                                onValueChange={(val) => setEditData({ ...editData, positionId: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="직급 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    {positions?.map((p: any) => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>소속 부서</Label>
                            <Select
                                value={editData.divisionId}
                                onValueChange={(val) => setEditData({ ...editData, divisionId: val, teamId: "" })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="부서 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    {divisions?.map((d: any) => (
                                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>소속 팀</Label>
                            <Select
                                value={editData.teamId}
                                onValueChange={(val) => setEditData({ ...editData, teamId: val })}
                                disabled={!editData.divisionId}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="팀 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    {teams?.filter((t: any) => t.divisionId === editData.divisionId).map((t: any) => (
                                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>취소</Button>
                        <Button onClick={() => editingMember && updateMemberMutation.mutate({ userId: editingMember.id, data: editData })}>저장</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Role Change Dialog */}
            <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>역할 변경</DialogTitle>
                        <DialogDescription>
                            멤버의 시스템 접근 역할(관리자/멤버)을 변경합니다.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>새 역할</Label>
                            <Select value={newRole} onValueChange={setNewRole}>
                                <SelectTrigger>
                                    <SelectValue placeholder="역할 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="member">멤버 (조회 및 데이터 입력)</SelectItem>
                                    <SelectItem value="admin">관리자 (모든 관리 권한)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>취소</Button>
                        <Button onClick={() => editingMember && updateMemberMutation.mutate({ userId: editingMember.id, data: { role: newRole } })}>변경 적용</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Permission Settings Dialog */}
            <Dialog open={isPermissionDialogOpen} onOpenChange={setIsPermissionDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>상세 권한 설정</DialogTitle>
                        <DialogDescription>
                            "{editingMember?.name}" 멤버의 메뉴별 접근 권한을 설정합니다.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex gap-2 mb-4">
                        <Button variant={getPermissionMode(editingPermissions) === 'office' ? "default" : "outline"} size="sm" onClick={() => applyPermissionPreset('office')}>사무실</Button>
                        <Button variant={getPermissionMode(editingPermissions) === 'field' ? "default" : "outline"} size="sm" onClick={() => applyPermissionPreset('field')}>현장팀</Button>
                        <Button variant={getPermissionMode(editingPermissions) === 'readonly' ? "default" : "outline"} size="sm" onClick={() => applyPermissionPreset('readonly')}>조회 전용</Button>
                        <Button variant={showCustomPerms || getPermissionMode(editingPermissions) === 'custom' ? "default" : "outline"} size="sm" onClick={() => setShowCustomPerms(!showCustomPerms)}>직접 설정</Button>
                    </div>

                    {(showCustomPerms || getPermissionMode(editingPermissions) === 'custom') && (
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>입고 관리</Label>
                                    <Select
                                        value={editingPermissions.incoming}
                                        onValueChange={(val) => setEditingPermissions({ ...editingPermissions, incoming: val })}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">접근 불가</SelectItem>
                                            <SelectItem value="read">조회만</SelectItem>
                                            <SelectItem value="write">수정/삭제</SelectItem>
                                            <SelectItem value="own_only">본인만 (미지원)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>출고 관리</Label>
                                    <Select
                                        value={editingPermissions.outgoing}
                                        onValueChange={(val) => setEditingPermissions({ ...editingPermissions, outgoing: val })}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">접근 불가</SelectItem>
                                            <SelectItem value="read">조회만</SelectItem>
                                            <SelectItem value="write">수정/삭제</SelectItem>
                                            <SelectItem value="own_only">본인 수령분만</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>사용 내역</Label>
                                    <Select
                                        value={editingPermissions.usage}
                                        onValueChange={(val) => setEditingPermissions({ ...editingPermissions, usage: val })}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">접근 불가</SelectItem>
                                            <SelectItem value="read">조회만</SelectItem>
                                            <SelectItem value="write">수정/삭제</SelectItem>
                                            <SelectItem value="own_only">본인 사용분만</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>재고 현황</Label>
                                    <Select
                                        value={editingPermissions.inventory}
                                        onValueChange={(val) => setEditingPermissions({ ...editingPermissions, inventory: val })}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">접근 불가</SelectItem>
                                            <SelectItem value="read">조회만</SelectItem>
                                            <SelectItem value="write">수정/삭제</SelectItem>
                                            <SelectItem value="own_only">본인만 (미지원)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPermissionDialogOpen(false)}>취소</Button>
                        <Button onClick={() => editingMember && updatePermissionMutation.mutate({ userId: editingMember.id, permissions: editingPermissions })}>
                            권한 저장
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
