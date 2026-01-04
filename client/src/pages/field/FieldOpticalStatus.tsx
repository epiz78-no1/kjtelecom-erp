import { Download, Search, Loader2, Cable } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { FieldTeamCard } from "@/components/FieldTeamCard";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/contexts/AppContext";
import { useQuery } from "@tanstack/react-query";
import type { OpticalCable, OpticalCableLog } from "@shared/schema";
import { exportToExcel } from "@/lib/excel";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export default function FieldOpticalStatus() {
    const { divisions, teams: allTeams, checkPermission } = useAppContext();
    const canWrite = checkPermission("usage", "write");
    const [selectedDivision, setSelectedDivision] = useState("all");
    const [selectedTeam, setSelectedTeam] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");

    const { data: cables = [], isLoading } = useQuery<(OpticalCable & { logs: OpticalCableLog[] })[]>({
        queryKey: ["/api/optical-cables"],
    });

    // Filter assigned cables only
    const assignedCables = cables.filter(c => c.status === 'assigned' && c.currentTeamId);

    // Aggregate by team
    const stockMap = new Map<string, any>();

    assignedCables.forEach(cable => {
        const team = allTeams.find(t => t.id === cable.currentTeamId);
        if (!team) return;

        const division = divisions?.find(d => d.id === team.divisionId);
        const divisionName = division?.name || 'SKT';

        const key = `${divisionName}|${team.name}|${cable.drumNo}|${cable.spec}`;
        if (!stockMap.has(key)) {
            stockMap.set(key, {
                id: key,
                division: divisionName,
                teamCategory: team.name,
                drumNo: cable.drumNo,
                spec: cable.spec,
                coreCount: cable.coreCount,
                remainingLength: cable.remainingLength
            });
        }
    });

    const allStockItems = Array.from(stockMap.values());

    const divisionFiltered = selectedDivision === "all"
        ? allStockItems
        : allStockItems.filter((item) => item.division === selectedDivision);

    const teams = Array.from(new Set(divisionFiltered.map((r) => r.teamCategory))).filter(Boolean).sort();

    const filteredStock = divisionFiltered.filter((item) => {
        const matchesTeam = selectedTeam === "all" || item.teamCategory === selectedTeam;
        const matchesSearch =
            item.drumNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.spec?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.teamCategory?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesTeam && matchesSearch;
    });

    const handleExportExcel = () => {
        const dataToExport = filteredStock.map(item => ({
            "사업": item.division,
            "현장팀": item.teamCategory,
            "제조번호": item.drumNo,
            "규격": item.spec,
            "코어": item.coreCount,
            "잔량(m)": item.remainingLength
        }));

        exportToExcel(dataToExport, "현장팀_광케이블_보유현황");
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex-shrink-0 space-y-4 pb-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">현장팀 보유 재고 현황 (광케이블)</h1>
                        <p className="text-muted-foreground">각 현장팀이 현재 보유하고 있는 광케이블 드럼을 조회합니다</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {canWrite && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 border-green-600 text-green-600 hover:bg-green-50"
                                onClick={handleExportExcel}
                            >
                                <Download className="h-3 w-3 mr-1" />
                                Excel
                            </Button>
                        )}
                        <div className="w-[180px]">
                            <Select value={selectedDivision} onValueChange={setSelectedDivision}>
                                <SelectTrigger>
                                    <SelectValue placeholder="사업부 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">전체</SelectItem>
                                    <SelectItem value="SKT">SKT</SelectItem>
                                    <SelectItem value="SKB">SKB</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {allTeams
                        .filter((t: any) => {
                            if (selectedDivision === "all") return true;
                            const division = divisions?.find(d => d.id === t.divisionId);
                            return division?.name === selectedDivision;
                        })
                        .sort((a: any, b: any) => (b.lastActivity || "").localeCompare(a.lastActivity || ""))
                        .map((team: any) => {
                            // Calculate current cable count for this team
                            const teamCableCount = allStockItems.filter(item => item.teamCategory === team.name).length;

                            return (
                                <FieldTeamCard
                                    key={team.id}
                                    team={{ ...team, materialCount: teamCableCount }}
                                    onClick={(t) => setSelectedTeam(t.name === selectedTeam ? "all" : t.name)}
                                />
                            );
                        })}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="제조번호, 규격, 팀명 검색..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                        <SelectTrigger className="w-48">
                            <SelectValue placeholder="팀 선택" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">전체</SelectItem>
                            {teams.map((team) => (
                                <SelectItem key={team} value={team}>
                                    {team}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="flex-1 rounded-md border overflow-hidden">
                <div className="h-full overflow-auto relative">
                    <table className="w-full caption-bottom text-sm table-fixed">
                        <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                            <TableRow className="h-10 bg-muted/50">
                                <TableHead className="font-semibold w-[80px] text-center align-middle">사업</TableHead>
                                <TableHead className="font-semibold w-[120px] text-center align-middle">현장팀</TableHead>
                                <TableHead className="font-semibold w-[120px] text-center align-middle">제조번호</TableHead>
                                <TableHead className="font-semibold w-[150px] text-center align-middle">규격</TableHead>
                                <TableHead className="font-semibold w-[80px] text-center align-middle">코어</TableHead>
                                <TableHead className="font-semibold w-[100px] text-center align-middle">잔량(m)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredStock.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        보유 중인 광케이블이 없습니다
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredStock.map((item) => (
                                    <TableRow key={item.id} className="h-10 hover:bg-muted/50">
                                        <TableCell className="text-center align-middle whitespace-nowrap font-medium">{item.division}</TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap">{item.teamCategory}</TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap font-medium">{item.drumNo}</TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap">{item.spec}</TableCell>
                                        <TableCell className="text-center align-middle whitespace-nowrap">{item.coreCount}</TableCell>
                                        <TableCell className="text-center align-middle font-bold">
                                            {item.remainingLength.toLocaleString()}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </table>
                </div>
            </div>
        </div>
    );
}
