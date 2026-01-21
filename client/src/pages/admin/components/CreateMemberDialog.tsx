
import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { getPermissionMode, permissionPresets } from "../utils";

interface CreateMemberDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    divisions: any[];
    teams: any[];
    positions: any[];
    onSubmit: (data: any) => void;
}

export function CreateMemberDialog({
    open,
    onOpenChange,
    divisions,
    teams,
    positions,
    onSubmit
}: CreateMemberDialogProps) {
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

    const [showCustomPerms, setShowCustomPerms] = useState(false);

    const applyPermissionPreset = (preset: 'admin' | 'field' | 'readonly' | 'office') => {
        setCreateData(prev => ({
            ...prev,
            permissions: permissionPresets[preset]
        }));
    };

    const handleSubmit = () => {
        onSubmit(createData);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
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
                                            <SelectItem value="own_only">본인만 (미지원)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
                    <Button onClick={handleSubmit}>멤버 생성</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
