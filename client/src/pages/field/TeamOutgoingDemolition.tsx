import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { SearchInput } from "@/components/ui/SearchInput";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function TeamOutgoingDemolition() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTeam, setSelectedTeam] = useState("전체");

    const { data: teams = [] } = useQuery<any[]>({
        queryKey: ["/api/teams"],
    });

    const { data: logs = [], isLoading } = useQuery<any[]>({
        queryKey: ["/api/demolition-logs"],
        select: (data) => data.filter((log: any) => log.logType === 'usage'),
    });

    const filteredLogs = logs.filter((log: any) => {
        const matchesSearch =
            log.material?.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.projectName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.team?.name?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesTeam = selectedTeam === "전체" || log.teamId === selectedTeam;

        return matchesSearch && matchesTeam;
    });

    // 팀별로 그룹화
    const groupedByTeam = filteredLogs.reduce((acc: any, log: any) => {
        const teamName = log.team?.name || "미지정";
        if (!acc[teamName]) {
            acc[teamName] = [];
        }
        acc[teamName].push(log);
        return acc;
    }, {});

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold">현장팀별 철거자재 출고 현황</h1>
                    <p className="text-muted-foreground">각 현장팀에 출고된 철거자재 현황을 조회합니다</p>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="팀 선택" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="전체">전체</SelectItem>
                        {teams.map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                                {team.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <SearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="품명, 공사명, 팀명 검색..."
                    className="max-w-sm"
                />

                <div className="ml-auto text-sm text-muted-foreground">
                    총 <span className="font-semibold text-foreground">{filteredLogs.length}</span>건
                </div>
            </div>

            <div className="flex-1 rounded-md border overflow-hidden">
                <div className="h-full overflow-auto">
                    {Object.keys(groupedByTeam).length === 0 ? (
                        <div className="flex items-center justify-center h-64 text-muted-foreground">
                            출고 내역이 없습니다
                        </div>
                    ) : (
                        Object.entries(groupedByTeam).map(([teamName, teamLogs]: [string, any]) => (
                            <div key={teamName} className="mb-6">
                                <div className="bg-muted px-4 py-2 font-semibold sticky top-0 z-10">
                                    {teamName} ({teamLogs.length}건)
                                </div>
                                <table className="w-full caption-bottom text-sm table-fixed">
                                    <TableHeader>
                                        <TableRow className="h-8">
                                            <TableHead className="text-center align-middle bg-background">출고일자</TableHead>
                                            <TableHead className="text-center align-middle bg-background">관리번호</TableHead>
                                            <TableHead className="text-center align-middle bg-background">공사번호</TableHead>
                                            <TableHead className="text-center align-middle bg-background">공사명</TableHead>
                                            <TableHead className="text-center align-middle bg-background">품명</TableHead>
                                            <TableHead className="text-center align-middle bg-background">규격</TableHead>
                                            <TableHead className="text-center align-middle bg-background">출고량</TableHead>
                                            <TableHead className="text-center align-middle bg-background">작업자</TableHead>
                                            <TableHead className="text-center align-middle bg-background">비고</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {teamLogs.map((log: any) => (
                                            <TableRow key={log.id} className="h-6 [\u0026_td]:py-0">
                                                <TableCell className="text-center align-middle">{log.logDate}</TableCell>
                                                <TableCell className="text-center align-middle font-medium">{log.material?.managementNo || ''}</TableCell>
                                                <TableCell className="text-center align-middle">{log.projectCode || ''}</TableCell>
                                                <TableCell className="text-left align-middle">{log.projectName || ''}</TableCell>
                                                <TableCell className="text-left align-middle">{log.material?.productName || ''}</TableCell>
                                                <TableCell className="text-center align-middle">{log.material?.specification || ''}</TableCell>
                                                <TableCell className="text-right align-middle font-medium">{log.usedQuantity?.toLocaleString() || ''}</TableCell>
                                                <TableCell className="text-center align-middle">{log.workerName || ''}</TableCell>
                                                <TableCell className="text-center align-middle">{log.remark || ''}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </table>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
