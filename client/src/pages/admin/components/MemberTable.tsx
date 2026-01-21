
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, MoreHorizontal, User as UserIcon, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

// Helper functions
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
};

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

interface MemberTableProps {
    members: any[];
    isLoading: boolean;
    onEdit: (member: any) => void;
    onRoleChange: (member: any) => void;
    onPermissionEdit: (member: any) => void;
    onDelete: (member: any) => void;
}

export function MemberTable({
    members,
    isLoading,
    onEdit,
    onRoleChange,
    onPermissionEdit,
    onDelete
}: MemberTableProps) {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow className="h-8">
                        <TableHead className="w-[200px]">이름</TableHead>
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
                    {isLoading ? (
                        <TableRow>
                            <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                불러오는 중...
                            </TableCell>
                        </TableRow>
                    ) : members?.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                등록된 멤버가 없습니다.
                            </TableCell>
                        </TableRow>
                    ) : (
                        members?.map((member) => (
                            <TableRow key={member.id} className="h-10 [&_td]:py-2">
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                                            <UserIcon className="h-4 w-4 text-slate-500" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{member.name}</span>
                                            {member.email && <span className="text-xs text-muted-foreground">{member.email}</span>}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="font-medium">
                                    {member.username}
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col text-sm">
                                        <span className="font-medium text-gray-900">{member.positionName || "-"}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {member.divisionName ? `${member.divisionName} / ${member.teamName || '팀 미지정'}` : "-"}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <span className="text-sm">{member.phoneNumber || "-"}</span>
                                </TableCell>
                                <TableCell>{getRoleBadge(member.role)}</TableCell>
                                <TableCell>{getPermissionLabel(member.permissions)}</TableCell>
                                <TableCell>{getStatusBadge(member.status)}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {member.joinDate ? format(new Date(member.joinDate), "yyyy-MM-dd", { locale: ko }) : "-"}
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
                                            <DropdownMenuItem onClick={() => onEdit(member)}>정보 수정</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onRoleChange(member)}>역할 변경</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onPermissionEdit(member)}>상세 권한 설정</DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                className="text-destructive"
                                                onClick={() => onDelete(member)}
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
        </div>
    );
}
