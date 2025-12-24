import { useState } from "react";
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
    Clock
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
    name: string;
    email: string;
    role: string;
    status: string;
    joinDate: string;
    positionName: string | null;
    divisionName: string | null;
    teamName: string | null;
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
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("member");
    const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

    // Edit states
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<Member | null>(null);
    const [editData, setEditData] = useState({
        name: "",
        positionId: "",
        divisionId: "",
        teamId: ""
    });

    const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
    const [newRole, setNewRole] = useState("member");

    const { data: members, isLoading: membersLoading } = useQuery<Member[]>({
        queryKey: ["/api/admin/members"],
    });

    const { data: invitations, isLoading: invLoading } = useQuery<Invitation[]>({
        queryKey: ["/api/admin/invitations"],
    });

    const inviteMutation = useMutation({
        mutationFn: async () => {
            await apiRequest("POST", "/api/admin/invitations", {
                email: inviteEmail,
                role: inviteRole,
            });
        },
        onSuccess: () => {
            toast({
                title: "초대 발송 완료",
                description: `${inviteEmail}님에게 초대 링크가 생성되었습니다.`,
            });
            setInviteEmail("");
            setIsInviteDialogOpen(false);
            queryClient.invalidateQueries({ queryKey: ["/api/admin/invitations"] });
        },
        onError: (error: any) => {
            toast({
                title: "초대 발송 실패",
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
            queryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
        },
    });

    const cancelInvitationMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("DELETE", `/api/admin/invitations/${id}`);
        },
        onSuccess: () => {
            toast({ title: "초대 취소 완료" });
            queryClient.invalidateQueries({ queryKey: ["/api/admin/invitations"] });
        },
    });

    const updateMemberMutation = useMutation({
        mutationFn: async ({ userId, data }: { userId: string; data: any }) => {
            await apiRequest("PATCH", `/api/admin/members/${userId}`, data);
        },
        onSuccess: () => {
            toast({ title: "멤버 정보 수정 완료" });
            setIsEditDialogOpen(false);
            setIsRoleDialogOpen(false);
            queryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
        },
        onError: (error: any) => {
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
            positionId: "", // Position matching logic if needed
            divisionId: "",
            teamId: ""
        });
        setIsEditDialogOpen(true);
    };

    const handleRoleChange = (member: Member) => {
        setEditingMember(member);
        setNewRole(member.role);
        setIsRoleDialogOpen(true);
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
            case "pending":
                return (
                    <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 gap-1">
                        <Clock className="h-3 w-3" /> 대기 중
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
    };

    return (
        <div className="container mx-auto py-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">멤버 관리</h1>
                    <p className="text-muted-foreground">회사를 함께 운영할 멤버들을 관리하고 초대하세요.</p>
                </div>

                <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <UserPlus className="h-4 w-4" /> 멤버 초대하기
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>새 멤버 초대</DialogTitle>
                            <DialogDescription>
                                이메일 주소를 입력하여 초대 링크를 생성합니다.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="email">이메일 주소</Label>
                                <Input
                                    id="email"
                                    placeholder="name@company.com"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="role">권한</Label>
                                <Select value={inviteRole} onValueChange={setInviteRole}>
                                    <SelectTrigger id="role">
                                        <SelectValue placeholder="권한 선택" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="member">멤버 (조회 및 데이터 입력)</SelectItem>
                                        <SelectItem value="admin">관리자 (모든 관리 권한)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                onClick={() => inviteMutation.mutate()}
                                disabled={inviteMutation.isPending || !inviteEmail}
                            >
                                초대 발송
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
                                    <TableHead>직급/부서</TableHead>
                                    <TableHead>권한</TableHead>
                                    <TableHead>상태</TableHead>
                                    <TableHead>가입일</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {membersLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            불러오는 중...
                                        </TableCell>
                                    </TableRow>
                                ) : members?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
                                            <TableCell>
                                                <div className="flex flex-col text-sm">
                                                    <span>{member.positionName || "-"}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {member.divisionName ? `${member.divisionName} / ${member.teamName || '팀 미지정'}` : "-"}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{getRoleBadge(member.role)}</TableCell>
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
                                                        <DropdownMenuItem onClick={() => handleRoleChange(member)}>권한 변경</DropdownMenuItem>
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

                {invitations && invitations.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-amber-600">
                                <Clock className="h-5 w-5" />
                                대기 중인 초대 ({invitations.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>이메일</TableHead>
                                        <TableHead>권한</TableHead>
                                        <TableHead>만료일</TableHead>
                                        <TableHead>상태</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {invitations.map((inv) => (
                                        <TableRow key={inv.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                                    <span>{inv.email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{getRoleBadge(inv.role)}</TableCell>
                                            <TableCell className="text-sm">
                                                {format(new Date(inv.expiresAt), "yyyy-MM-dd HH:mm", { locale: ko })}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">초대됨</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-destructive"
                                                    onClick={() => cancelInvitationMutation.mutate(inv.id)}
                                                >
                                                    취소
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
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
                        <DialogTitle>권한 변경</DialogTitle>
                        <DialogDescription>
                            멤버의 시스템 접근 권한을 변경합니다.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>새 권한</Label>
                            <Select value={newRole} onValueChange={setNewRole}>
                                <SelectTrigger>
                                    <SelectValue placeholder="권한 선택" />
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
        </div>
    );
}
