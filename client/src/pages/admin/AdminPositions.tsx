import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
    Award,
    Plus,
    Trash2,
    GripVertical,
    ChevronUp,
    ChevronDown,
    Info,
    Edit2
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Position {
    id: string;
    name: string;
    rankOrder: number;
}

export default function AdminPositions() {
    const { toast } = useToast();
    const [newPositionName, setNewPositionName] = useState("");

    // Edit states
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingPosition, setEditingPosition] = useState<Position | null>(null);
    const [editName, setEditName] = useState("");

    const { data: positions, isLoading } = useQuery<Position[]>({
        queryKey: ["/api/admin/positions"],
    });

    const createMutation = useMutation({
        mutationFn: async (name: string) => {
            await apiRequest("POST", "/api/admin/positions", {
                name,
                rankOrder: (positions?.length || 0) + 1
            });
        },
        onSuccess: () => {
            toast({ title: "직급이 추가되었습니다." });
            setNewPositionName("");
            queryClient.invalidateQueries({ queryKey: ["/api/admin/positions"] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("DELETE", `/api/admin/positions/${id}`);
        },
        onSuccess: () => {
            toast({ title: "직급이 삭제되었습니다." });
            queryClient.invalidateQueries({ queryKey: ["/api/admin/positions"] });
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            await apiRequest("PATCH", `/api/admin/positions/${id}`, data);
        },
        onSuccess: () => {
            toast({ title: "직급 정보가 수정되었습니다." });
            setIsEditDialogOpen(false);
            queryClient.invalidateQueries({ queryKey: ["/api/admin/positions"] });
        },
    });

    const handleEdit = (pos: Position) => {
        setEditingPosition(pos);
        setEditName(pos.name);
        setIsEditDialogOpen(true);
    };

    const handleMove = (index: number, direction: 'up' | 'down') => {
        if (!positions) return;
        const targetIdx = direction === 'up' ? index - 1 : index + 1;
        if (targetIdx < 0 || targetIdx >= positions.length) return;

        const current = positions[index];
        const target = positions[targetIdx];

        // Swap rank orders
        updateMutation.mutate({ id: current.id, data: { rankOrder: target.rankOrder } });
        updateMutation.mutate({ id: target.id, data: { rankOrder: current.rankOrder } });
    };

    return (
        <div className="container mx-auto py-8 space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">직급/직책 관리</h1>
                <p className="text-muted-foreground">회사에서 사용하는 직급을 정의하고 순서를 설정하세요.</p>
            </div>

            <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>도움말</AlertTitle>
                <AlertDescription>
                    직급 순서는 상위 직급이 위로 오도록 설정해주세요. 순서는 멤버 목록 및 조직도에서 정렬 기준이 됩니다.
                </AlertDescription>
            </Alert>

            <div className="grid md:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>직급 추가</CardTitle>
                        <CardDescription>새로운 직급명을 입력하세요.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder="예: 과장, 팀장, 부장"
                                value={newPositionName}
                                onChange={(e) => setNewPositionName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && newPositionName) {
                                        createMutation.mutate(newPositionName);
                                    }
                                }}
                            />
                            <Button
                                onClick={() => createMutation.mutate(newPositionName)}
                                disabled={createMutation.isPending || !newPositionName}
                            >
                                <Plus className="h-4 w-4 mr-1" /> 추가
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Award className="h-5 w-5 text-primary" />
                            직급 목록
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">순서</TableHead>
                                    <TableHead>직급명</TableHead>
                                    <TableHead className="text-right">작업</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                            불러오는 중...
                                        </TableCell>
                                    </TableRow>
                                ) : !positions || positions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                            등록된 직급이 없습니다.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    positions.map((pos, index) => (
                                        <TableRow key={pos.id}>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6"
                                                        disabled={index === 0}
                                                        onClick={() => handleMove(index, 'up')}
                                                    >
                                                        <ChevronUp className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6"
                                                        disabled={index === positions.length - 1}
                                                        onClick={() => handleMove(index, 'down')}
                                                    >
                                                        <ChevronDown className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium">{pos.name}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => handleEdit(pos)}
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-destructive h-8 w-8"
                                                        onClick={() => {
                                                            if (confirm(`"${pos.name}" 직급을 삭제하시겠습니까?`)) {
                                                                deleteMutation.mutate(pos.id);
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Edit Position Name Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>직급명 수정</DialogTitle>
                        <DialogDescription>
                            직급 또는 직책의 명칭을 수정합니다.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="editPosName">직급명</Label>
                            <Input
                                id="editPosName"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>취소</Button>
                        <Button onClick={() => editingPosition && updateMutation.mutate({ id: editingPosition.id, data: { name: editName } })}>저장</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
