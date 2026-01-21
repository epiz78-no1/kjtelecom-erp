
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
import { useState, useEffect } from "react";

interface RoleChangeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentRole: string;
    onSubmit: (newRole: string) => void;
}

export function RoleChangeDialog({
    open,
    onOpenChange,
    currentRole,
    onSubmit
}: RoleChangeDialogProps) {
    const [role, setRole] = useState(currentRole);

    useEffect(() => {
        if (open) {
            setRole(currentRole);
        }
    }, [open, currentRole]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
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
                        <Select value={role} onValueChange={setRole}>
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
                    <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
                    <Button onClick={() => onSubmit(role)}>변경 적용</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
