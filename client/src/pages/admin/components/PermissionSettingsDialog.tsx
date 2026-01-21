
import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { getPermissionMode, permissionPresets } from "../utils";

interface PermissionSettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    member: any;
    onSubmit: (permissions: any) => void;
}

export function PermissionSettingsDialog({
    open,
    onOpenChange,
    member,
    onSubmit
}: PermissionSettingsDialogProps) {
    const [permissions, setPermissions] = useState<any>({
        incoming: 'none',
        outgoing: 'none',
        usage: 'none',
        inventory: 'none',
    });
    const [showCustomPerms, setShowCustomPerms] = useState(false);

    useEffect(() => {
        if (open && member) {
            setPermissions(member.permissions || {
                incoming: 'none',
                outgoing: 'none',
                usage: 'none',
                inventory: 'none',
            });
            setShowCustomPerms(false); // Reset to hidden unless custom
        }
    }, [open, member]);

    const applyPermissionPreset = (preset: 'admin' | 'field' | 'readonly' | 'office') => {
        setPermissions(permissionPresets[preset]);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>상세 권한 설정</DialogTitle>
                    <DialogDescription>
                        "{member?.name}" 멤버의 메뉴별 접근 권한을 설정합니다.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex gap-2 mb-4">
                    <Button variant={getPermissionMode(permissions) === 'office' ? "default" : "outline"} size="sm" onClick={() => applyPermissionPreset('office')}>사무실</Button>
                    <Button variant={getPermissionMode(permissions) === 'field' ? "default" : "outline"} size="sm" onClick={() => applyPermissionPreset('field')}>현장팀</Button>
                    <Button variant={getPermissionMode(permissions) === 'readonly' ? "default" : "outline"} size="sm" onClick={() => applyPermissionPreset('readonly')}>조회 전용</Button>
                    <Button variant={showCustomPerms || getPermissionMode(permissions) === 'custom' ? "default" : "outline"} size="sm" onClick={() => setShowCustomPerms(!showCustomPerms)}>직접 설정</Button>
                </div>

                {(showCustomPerms || getPermissionMode(permissions) === 'custom') && (
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>입고 관리</Label>
                                <Select
                                    value={permissions.incoming}
                                    onValueChange={(val) => setPermissions({ ...permissions, incoming: val })}
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
                                    value={permissions.outgoing}
                                    onValueChange={(val) => setPermissions({ ...permissions, outgoing: val })}
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
                                    value={permissions.usage}
                                    onValueChange={(val) => setPermissions({ ...permissions, usage: val })}
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
                                    value={permissions.inventory}
                                    onValueChange={(val) => setPermissions({ ...permissions, inventory: val })}
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
                    <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
                    <Button onClick={() => onSubmit(permissions)}>
                        권한 저장
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
