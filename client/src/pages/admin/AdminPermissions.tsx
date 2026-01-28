
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Search, X, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PermissionSettingsDialog } from "./components/PermissionSettingsDialog";

// Types
interface Member {
    id: string;
    username: string;
    name: string;
    role: string;
    positionName: string | null;
    divisionName: string | null;
    teamName: string | null;
    permissions?: any;
}

// Helper function
const getPermissionLabel = (perms: any) => {
    if (!perms) return <Badge variant="outline" className="text-gray-500">권한 없음</Badge>;

    if (perms.incoming === 'write' && perms.outgoing === 'write' && perms.usage === 'write' && perms.inventory === 'write') {
        return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">사무실 (전체)</Badge>;
    }

    if (perms.incoming === 'none' && perms.outgoing === 'none' && perms.usage === 'write' && perms.inventory === 'none') {
        return <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">현장팀</Badge>;
    }

    if (perms.incoming === 'read' && perms.outgoing === 'read' && perms.usage === 'read' && perms.inventory === 'read') {
        return <Badge variant="outline" className="text-gray-600 border-gray-200 bg-gray-50">조회 전용</Badge>;
    }

    return <Badge variant="outline" className="text-gray-600">사용자 지정</Badge>;
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

export default function AdminPermissions() {
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState("");
    const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<Member | null>(null);

    const { data: members, isLoading } = useQuery<Member[]>({
        queryKey: ["/api/admin/members?v=1"],
    });

    const filteredMembers = members?.filter(member => {
        if (member.username === 'admin') return false;
        if (!searchTerm) return true;

        const searchLower = searchTerm.toLowerCase();
        return (
            member.name.toLowerCase().includes(searchLower) ||
            member.username.toLowerCase().includes(searchLower) ||
            (member.teamName && member.teamName.toLowerCase().includes(searchLower)) ||
            (member.divisionName && member.divisionName.toLowerCase().includes(searchLower)) ||
            (member.positionName && member.positionName.toLowerCase().includes(searchLower))
        );
    });

    const updatePermissionMutation = useMutation({
        mutationFn: async ({ userId, permissions }: { userId: string; permissions: any }) => {
            await apiRequest("PATCH", `/api/admin/members/${userId}/permissions`, permissions);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/members?v=1"] });
            setIsPermissionDialogOpen(false);
            toast({ title: "권한이 업데이트되었습니다." });
        },
        onError: (error: Error) => {
            toast({ title: "권한 업데이트 실패", description: error.message, variant: "destructive" });
        }
    });

    const handlePermissionEdit = (member: Member) => {
        setEditingMember(member);
        setIsPermissionDialogOpen(true);
    };

    return (
        <div className="container mx-auto py-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Shield className="h-8 w-8" />
                        권한 관리
                    </h1>
                    <p className="text-muted-foreground">멤버별 메뉴 접근 권한을 설정합니다.</p>
                </div>

                <div className="relative w-full md:w-[300px]">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="이름, ID, 부서, 팀 검색..."
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
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow className="h-8">
                            <TableHead className="w-[200px]">이름</TableHead>
                            <TableHead>ID</TableHead>
                            <TableHead>직급/부서</TableHead>
                            <TableHead>역할</TableHead>
                            <TableHead>현재 권한</TableHead>
                            <TableHead className="text-right">작업</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    로딩 중...
                                </TableCell>
                            </TableRow>
                        ) : filteredMembers && filteredMembers.length > 0 ? (
                            filteredMembers.map((member) => (
                                <TableRow key={member.id} className="h-12">
                                    <TableCell className="font-medium">{member.name}</TableCell>
                                    <TableCell className="text-muted-foreground">{member.username}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-0.5">
                                            {member.positionName && (
                                                <span className="text-sm">{member.positionName}</span>
                                            )}
                                            {member.divisionName && (
                                                <span className="text-xs text-muted-foreground">
                                                    {member.divisionName}
                                                    {member.teamName && ` · ${member.teamName}`}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>{getRoleBadge(member.role)}</TableCell>
                                    <TableCell>{getPermissionLabel(member.permissions)}</TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handlePermissionEdit(member)}
                                            disabled={member.role === 'owner' || member.role === 'admin'}
                                        >
                                            권한 설정
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    {searchTerm ? "검색 결과가 없습니다." : "등록된 멤버가 없습니다."}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <PermissionSettingsDialog
                open={isPermissionDialogOpen}
                onOpenChange={setIsPermissionDialogOpen}
                member={editingMember}
                onSubmit={(permissions) => editingMember && updatePermissionMutation.mutate({ userId: editingMember.id, permissions })}
            />
        </div>
    );
}
