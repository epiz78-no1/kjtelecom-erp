import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Network,
    Plus,
    Trash2,
    Edit2,
    MoreVertical,
    Users,
    Building2,
    ChevronRight
} from "lucide-react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppContext } from "@/contexts/AppContext";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function AdminOrg() {
    const {
        divisions,
        divisionsLoading,
        teams,
        teamsLoading,
        addDivision,
        updateDivision,
        deleteDivision,
        addTeam,
        updateTeam,
        deleteTeam
    } = useAppContext();
    const { toast } = useToast();

    // Dialog states
    const [isDivDialogOpen, setIsDivDialogOpen] = useState(false);
    const [divDialogMode, setDivDialogMode] = useState<"add" | "edit">("add");
    const [editingDivision, setEditingDivision] = useState<{ id: string; name: string } | null>(null);
    const [divName, setDivName] = useState("");

    const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
    const [teamDialogMode, setTeamDialogMode] = useState<"add" | "edit">("add");
    const [editingTeam, setEditingTeam] = useState<any>(null);
    const [teamData, setTeamData] = useState({
        name: "",
        divisionId: "",
        teamCategory: "외선팀",
        memberCount: 0,
        isActive: true
    });

    // Handle Division
    const handleAddDivision = () => {
        setDivDialogMode("add");
        setDivName("");
        setIsDivDialogOpen(true);
    };

    const handleEditDivision = (division: any) => {
        setDivDialogMode("edit");
        setEditingDivision(division);
        setDivName(division.name);
        setIsDivDialogOpen(true);
    };

    const onSaveDivision = async () => {
        try {
            if (divDialogMode === "add") {
                await addDivision(divName);
                toast({ title: "부서 추가 완료", description: `"${divName}" 부서가 생성되었습니다.` });
            } else if (editingDivision) {
                await updateDivision(editingDivision.id, divName);
                toast({ title: "부서 수정 완료", description: "부서명이 변경되었습니다." });
            }
            setIsDivDialogOpen(false);
        } catch (error: any) {
            toast({ title: "오류 발생", description: error.message, variant: "destructive" });
        }
    };

    // Handle Team
    const handleAddTeam = (divisionId?: string) => {
        setTeamDialogMode("add");
        setTeamData({
            name: "",
            divisionId: divisionId || (divisions[0]?.id || ""),
            teamCategory: "외선팀",
            memberCount: 0,
            isActive: true
        });
        setIsTeamDialogOpen(true);
    };

    const handleEditTeam = (team: any) => {
        setTeamDialogMode("edit");
        setEditingTeam(team);
        setTeamData({
            name: team.name,
            divisionId: team.divisionId,
            teamCategory: team.teamCategory,
            memberCount: team.memberCount,
            isActive: team.isActive
        });
        setIsTeamDialogOpen(true);
    };

    const onSaveTeam = async () => {
        try {
            if (teamDialogMode === "add") {
                await addTeam(teamData);
                toast({ title: "팀 추가 완료", description: `"${teamData.name}" 팀이 생성되었습니다.` });
            } else if (editingTeam) {
                await updateTeam(editingTeam.id, teamData);
                toast({ title: "팀 수정 완료", description: "팀 정보가 변경되었습니다." });
            }
            setIsTeamDialogOpen(false);
        } catch (error: any) {
            toast({ title: "오류 발생", description: error.message, variant: "destructive" });
        }
    };

    // Filter teams by division
    const getTeamsForDivision = (divisionId: string) => {
        return teams.filter(t => t.divisionId === divisionId);
    };

    return (
        <div className="container mx-auto py-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">조직 관리</h1>
                    <p className="text-muted-foreground">부서와 현장팀의 구조를 관리하세요.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleAddDivision}>부서 추가</Button>
                    <Button onClick={() => handleAddTeam()}>팀 추가</Button>
                </div>
            </div>

            <div className="grid gap-6">
                {divisionsLoading || teamsLoading ? (
                    <div className="text-center py-12 text-muted-foreground">불러오는 중...</div>
                ) : divisions.length === 0 ? (
                    <Card className="bg-slate-50 border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
                            <Building2 className="h-12 w-12 text-slate-300" />
                            <div className="text-center text-slate-500">
                                <p className="font-medium text-lg">등록된 부서가 없습니다.</p>
                                <p className="text-sm">먼저 사업부(부서)를 추가하여 조직을 구성하세요.</p>
                            </div>
                            <Button variant="secondary" className="mt-2" onClick={handleAddDivision}>부서 추가하기</Button>
                        </CardContent>
                    </Card>
                ) : (
                    divisions.map((division) => (
                        <Card key={division.id} className="overflow-hidden">
                            <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between space-y-0 py-4">
                                <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                                        <Building2 className="h-4 w-4 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">{division.name}</CardTitle>
                                        <CardDescription>{getTeamsForDivision(division.id).length}개의 팀</CardDescription>
                                    </div>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleEditDivision(division)}>부서명 수정</DropdownMenuItem>
                                        <DropdownMenuItem className="text-destructive" onClick={() => {
                                            if (confirm(`"${division.name}" 부서를 삭제하시겠습니까? 관련 팀 데이터도 삭제될 수 있습니다.`)) {
                                                deleteDivision(division.id);
                                            }
                                        }}>부서 삭제</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="grid md:grid-cols-2 lg:grid-cols-3">
                                    {getTeamsForDivision(division.id).map((team) => (
                                        <div
                                            key={team.id}
                                            className="p-4 flex items-center justify-between border-b last:border-b-0 md:[&:nth-last-child(-n+2)]:border-b-0 lg:[&:nth-last-child(-n+3)]:border-b-0 border-r last:border-r-0 hover:bg-slate-50 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="h-2 w-2 rounded-full bg-green-500" />
                                                <div>
                                                    <div className="font-medium text-sm">{team.name}</div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Badge variant="secondary" className="text-[10px] h-4 px-1">{team.teamCategory}</Badge>
                                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                            <Users className="h-3 w-3" /> {team.memberCount}명
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleEditTeam(team)}>팀 정보 수정</DropdownMenuItem>
                                                    <DropdownMenuItem className="text-destructive" onClick={() => {
                                                        if (confirm(`"${team.name}" 팀을 삭제하시겠습니까?`)) {
                                                            deleteTeam(team.id);
                                                        }
                                                    }}>팀 삭제</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => handleAddTeam(division.id)}
                                        className="p-4 flex items-center justify-center gap-2 text-primary hover:bg-primary/5 transition-colors border-dashed min-h-[73px]"
                                    >
                                        <Plus className="h-4 w-4" />
                                        <span className="text-sm font-medium">팀 추가</span>
                                    </button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Division Add/Edit Dialog */}
            <Dialog open={isDivDialogOpen} onOpenChange={setIsDivDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{divDialogMode === "add" ? "새 부서 추가" : "부서명 수정"}</DialogTitle>
                        <DialogDescription>
                            사업부 내부 관리를 위한 부서 명칭을 입력하세요.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="divName">부서명</Label>
                            <Input
                                id="divName"
                                placeholder="예: SKT사업부, 영업팀"
                                value={divName}
                                onChange={(e) => setDivName(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDivDialogOpen(false)}>취소</Button>
                        <Button onClick={onSaveDivision} disabled={!divName}>저장</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Team Add/Edit Dialog */}
            <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{teamDialogMode === "add" ? "새 현장팀 추가" : "팀 정보 수정"}</DialogTitle>
                        <DialogDescription>
                            현장에서 작업하는 팀 정보를 입력하세요.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="teamDivision">소속 부서</Label>
                            <Select
                                value={teamData.divisionId}
                                onValueChange={(val) => setTeamData({ ...teamData, divisionId: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="부서 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    {divisions.map(d => (
                                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="teamName">팀명</Label>
                            <Input
                                id="teamName"
                                placeholder="예: 광케이블 1팀"
                                value={teamData.name}
                                onChange={(e) => setTeamData({ ...teamData, name: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="teamCategory">팀 구분</Label>
                            <Select
                                value={teamData.teamCategory}
                                onValueChange={(val) => setTeamData({ ...teamData, teamCategory: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="구분 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="외선팀">외선팀</SelectItem>
                                    <SelectItem value="내선팀">내선팀</SelectItem>
                                    <SelectItem value="유지보수팀">유지보수팀</SelectItem>
                                    <SelectItem value="기타">기타</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="memberCount">인원수</Label>
                            <Input
                                id="memberCount"
                                type="number"
                                value={teamData.memberCount}
                                onChange={(e) => setTeamData({ ...teamData, memberCount: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsTeamDialogOpen(false)}>취소</Button>
                        <Button onClick={onSaveTeam} disabled={!teamData.name || !teamData.divisionId}>저장</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
}
