
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { UserPlus2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAppContext } from "@/contexts/AppContext";
import { MemberTable } from "./components/MemberTable";
import { CreateMemberDialog } from "./components/CreateMemberDialog";
import { EditMemberDialog } from "./components/EditMemberDialog";
import { RoleChangeDialog } from "./components/RoleChangeDialog";
import { PermissionSettingsDialog } from "./components/PermissionSettingsDialog";

// Types
export interface Member {
    id: string;
    username: string;
    name: string;
    email: string;
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
    permissions?: any;
}

export default function AdminMembers() {
    const { toast } = useToast();
    const { divisions, positions, teams } = useAppContext();

    // Dialog States
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
    const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);

    // Selected Member & Edit State
    const [editingMember, setEditingMember] = useState<Member | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const { data: members, isLoading: membersLoading } = useQuery<Member[]>({
        queryKey: ["/api/admin/members?v=1"],
    });

    const filteredMembers = members?.filter(member => {
        if (member.username === 'admin') return false;
        if (!searchTerm) return true;

        const searchLower = searchTerm.toLowerCase();
        return (
            member.name.toLowerCase().includes(searchLower) ||
            member.username.toLowerCase().includes(searchLower) ||
            (member.email && member.email.toLowerCase().includes(searchLower)) ||
            (member.teamName && member.teamName.toLowerCase().includes(searchLower)) ||
            (member.divisionName && member.divisionName.toLowerCase().includes(searchLower)) ||
            (member.positionName && member.positionName.toLowerCase().includes(searchLower)) ||
            (member.phoneNumber && member.phoneNumber.includes(searchLower))
        );
    });

    // Mutations
    const createMemberMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiRequest("POST", "/api/admin/members", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/members?v=1"] });
            setIsCreateDialogOpen(false);
            toast({ title: "멤버가 생성되었습니다." });
        },
        onError: (error: Error) => {
            toast({ title: "멤버 생성 실패", description: error.message, variant: "destructive" });
        }
    });

    const updateMemberMutation = useMutation({
        mutationFn: async ({ userId, data }: { userId: string; data: any }) => {
            await apiRequest("PATCH", `/api/admin/members/${userId}`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/members?v=1"] });
            setIsEditDialogOpen(false);
            setIsRoleDialogOpen(false);
            toast({ title: "멤버 정보가 수정되었습니다." });
        },
        onError: (error: Error) => {
            toast({ title: "수정 실패", description: error.message, variant: "destructive" });
        }
    });

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

    const deleteMemberMutation = useMutation({
        mutationFn: async (userId: string) => {
            await apiRequest("DELETE", `/api/admin/members/${userId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/members?v=1"] });
            toast({ title: "멤버가 삭제되었습니다." });
        },
        onError: (error: Error) => {
            toast({ title: "삭제 실패", description: error.message, variant: "destructive" });
        }
    });

    // Handlers
    const handleEditMember = (member: Member) => {
        setEditingMember(member);
        setIsEditDialogOpen(true);
    };

    const handleRoleChange = (member: Member) => {
        setEditingMember(member);
        setIsRoleDialogOpen(true);
    };

    const handlePermissionEdit = (member: Member) => {
        setEditingMember(member);
        setIsPermissionDialogOpen(true);
    };

    const handleDeleteMember = (member: Member) => {
        if (confirm(`"${member.name}" 멤버를 삭제하시겠습니까?`)) {
            deleteMemberMutation.mutate(member.id);
        }
    };

    return (
        <div className="container mx-auto py-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">멤버 관리</h1>
                    <p className="text-muted-foreground">회사를 함께 운영할 멤버들을 관리하고 초대하세요.</p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative w-full md:w-[300px]">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="이름, ID, 부서, 팀, 연락처 검색..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 pr-8"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm("")}
                                className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                    <Button className="gap-2" onClick={() => setIsCreateDialogOpen(true)}>
                        <UserPlus2 className="h-4 w-4" /> 멤버 생성하기
                    </Button>
                </div>
            </div>

            <MemberTable
                members={filteredMembers || []}
                isLoading={membersLoading}
                onEdit={handleEditMember}
                onRoleChange={handleRoleChange}
                onPermissionEdit={handlePermissionEdit}
                onDelete={handleDeleteMember}
            />

            <CreateMemberDialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                divisions={divisions || []}
                teams={teams || []}
                positions={positions || []}
                onSubmit={(data) => createMemberMutation.mutate(data)}
            />

            <EditMemberDialog
                open={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                member={editingMember}
                divisions={divisions || []}
                teams={teams || []}
                positions={positions || []}
                onSubmit={(data) => editingMember && updateMemberMutation.mutate({ userId: editingMember.id, data })}
            />

            <RoleChangeDialog
                open={isRoleDialogOpen}
                onOpenChange={setIsRoleDialogOpen}
                currentRole={editingMember?.role || 'member'}
                onSubmit={(newRole) => editingMember && updateMemberMutation.mutate({ userId: editingMember.id, data: { role: newRole } })}
            />

            <PermissionSettingsDialog
                open={isPermissionDialogOpen}
                onOpenChange={setIsPermissionDialogOpen}
                member={editingMember}
                onSubmit={(permissions) => editingMember && updatePermissionMutation.mutate({ userId: editingMember.id, permissions })}
            />
        </div>
    );
}
