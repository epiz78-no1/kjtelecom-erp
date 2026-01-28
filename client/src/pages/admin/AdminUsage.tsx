import {
    BarChart3,
    Database,
    FileText,
    HardDrive,
    MessageSquare,
    RefreshCw,
    Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";

interface StorageUsageData {
    tenantId: string;
    tenantName: string;
    totalBytes: number;
    limitBytes: number;
    fileCount: number;
    lastUpdated: string;
    breakdown: {
        home: { bytes: number; fileCount: number; percentage: number };
        materials: { bytes: number; fileCount: number; percentage: number };
        archive: { bytes: number; fileCount: number; percentage: number };
        other: { bytes: number; fileCount: number; percentage: number };
    };
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0bytes';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(2)}GB`;
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(2)}MB`;
    const kb = bytes / 1024;
    if (kb >= 1) return `${kb.toFixed(2)}KB`;
    return `${bytes}bytes`;
}

export default function AdminUsage() {
    const { data: storageData, isLoading, error, refetch } = useQuery<StorageUsageData>({
        queryKey: ['/api/admin/tenant-storage-usage'],
    });

    if (isLoading) {
        return (
            <div className="container mx-auto py-8 flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">로딩 중...</p>
                </div>
            </div>
        );
    }

    if (error || !storageData) {
        return (
            <div className="container mx-auto py-8">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-600">스토리지 사용량을 불러오는 중 오류가 발생했습니다.</p>
                </div>
            </div>
        );
    }

    const usedGB = (storageData.totalBytes / (1024 * 1024 * 1024)).toFixed(2);
    const limitGB = (Number(storageData.limitBytes) / (1024 * 1024 * 1024)).toFixed(1);
    const remainingGB = (Number(limitGB) - Number(usedGB)).toFixed(2);
    const usagePercent = storageData.limitBytes > 0
        ? ((storageData.totalBytes / Number(storageData.limitBytes)) * 100).toFixed(1)
        : 0;

    const lastUpdated = new Date(storageData.lastUpdated).toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });

    return (
        <div className="container mx-auto py-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{storageData.tenantName} 공용 용량</h1>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{lastUpdated} 기준</span>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => refetch()}
                    >
                        <RefreshCw className="h-3 w-3" />
                    </Button>
                </div>
            </div>

            {/* Total Usage Section */}
            <div className="space-y-4">
                <h2 className="text-sm font-semibold text-slate-900 border-l-4 border-slate-900 pl-2">전체 사용량</h2>
                <div className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-sm font-medium">
                            공용 용량 {limitGB}GB 중 <span className="text-blue-600">{usedGB}GB 사용 중</span> (잔여 {remainingGB}GB)
                        </span>
                    </div>
                    <Progress value={Number(usagePercent)} className="h-3" />
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                            <span>사용량 {usedGB}GB ({usagePercent}%)</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                            <span>잔여 용량 {remainingGB}GB</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Service Usage Section */}
            <div className="space-y-4">
                <h2 className="text-sm font-semibold text-slate-900 border-l-4 border-slate-900 pl-2">서비스별 사용량</h2>

                <div className="bg-white rounded-lg border shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead className="w-[150px]">구분</TableHead>
                                <TableHead>총 사용량</TableHead>
                                <TableHead className="w-[200px]">비율</TableHead>
                                <TableHead className="w-[400px]">세부 사용량</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-1">
                                        홈 <Info className="h-3 w-3 text-slate-400" />
                                    </div>
                                </TableCell>
                                <TableCell>{formatBytes(storageData.breakdown.home.bytes)}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs w-8 text-right">{storageData.breakdown.home.percentage.toFixed(1)}%</span>
                                        <Progress value={storageData.breakdown.home.percentage} className="h-1.5 w-[100px]" />
                                    </div>
                                </TableCell>
                                <TableCell className="text-sm text-slate-600">
                                    대시보드, 공지사항 등
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-1">
                                        자재관리 <Info className="h-3 w-3 text-slate-400" />
                                    </div>
                                </TableCell>
                                <TableCell>{formatBytes(storageData.breakdown.materials.bytes)}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs w-8 text-right">{storageData.breakdown.materials.percentage.toFixed(1)}%</span>
                                        <Progress value={storageData.breakdown.materials.percentage} className="h-1.5 w-[100px]" />
                                    </div>
                                </TableCell>
                                <TableCell className="text-sm text-slate-600">
                                    광케이블, 일반자재, 철거자재, 입고 등
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-1">
                                        자료실 <Info className="h-3 w-3 text-slate-400" />
                                    </div>
                                </TableCell>
                                <TableCell>{formatBytes(storageData.breakdown.archive.bytes)}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs w-8 text-right">{storageData.breakdown.archive.percentage.toFixed(1)}%</span>
                                        <Progress value={storageData.breakdown.archive.percentage} className="h-1.5 w-[100px]" />
                                    </div>
                                </TableCell>
                                <TableCell className="text-sm text-slate-600">
                                    문서, 파일 등
                                </TableCell>
                            </TableRow>
                            <TableRow className="bg-slate-50 font-bold">
                                <TableCell>합계</TableCell>
                                <TableCell>{formatBytes(storageData.totalBytes)}</TableCell>
                                <TableCell colSpan={2}></TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Footer Links */}
            <div className="text-sm text-blue-600 space-y-1 pt-4">
                <div className="flex items-center gap-2 cursor-pointer hover:underline">
                    <div className="w-1 h-1 rounded-full bg-blue-600"></div>
                    데이터 백업 및 관리 방법
                </div>
                <div className="flex items-center gap-2 cursor-pointer hover:underline text-muted-foreground">
                    <div className="w-1 h-1 rounded-full bg-muted-foreground"></div>
                    용량 추가가 필요하시면 관리자에게 문의하세요.
                </div>
            </div>
        </div>
    );
}
