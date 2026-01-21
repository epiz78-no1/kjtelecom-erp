
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";

interface EditMemberDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    member: any;
    divisions: any[];
    teams: any[];
    positions: any[];
    onSubmit: (data: any) => void;
}

export function EditMemberDialog({
    open,
    onOpenChange,
    member,
    divisions,
    teams,
    positions,
    onSubmit
}: EditMemberDialogProps) {
    const [editData, setEditData] = useState({
        name: "",
        positionId: "",
        divisionId: "",
        teamId: "",
        phoneNumber: "",
        status: "active"
    });

    useEffect(() => {
        if (open && member) {
            setEditData({
                name: member.name,
                positionId: member.positionId || "",
                divisionId: member.divisionId || "",
                teamId: member.teamId || "",
                phoneNumber: member.phoneNumber || "",
                status: member.status
            });
        }
    }, [open, member]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
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
                    <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
                    <Button onClick={() => onSubmit(editData)}>저장</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
