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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

export default function AdminUsage() {
    return (
        <div className="container mx-auto py-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">kjtelecom 공용 용량</h1>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>2026-01-27 16:45:48 기준</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                        <RefreshCw className="h-3 w-3" />
                    </Button>
                </div>
            </div>

            {/* Total Usage Section */}
            <div className="space-y-4">
                <h2 className="text-sm font-semibold text-slate-900 border-l-4 border-slate-900 pl-2">전체 사용량</h2>
                <div className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-sm font-medium">공용 용량 75.0GB 중 <span className="text-blue-600">1.7GB 사용 중</span> (잔여 73.3GB)</span>
                    </div>
                    <Progress value={2.3} className="h-3" />
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                            <span>사용량 1.7GB (2.3%)</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                            <span>잔여 용량 73.3GB</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Service Usage Section */}
            <div className="space-y-4">
                <h2 className="text-sm font-semibold text-slate-900 border-l-4 border-slate-900 pl-2">서비스별 사용량</h2>

                <div className="bg-white rounded-lg border shadow-sm">
                    <div className="p-4 border-b">
                        <div className="flex items-center space-x-2">
                            <Checkbox id="details" />
                            <label
                                htmlFor="details"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                상세보기
                            </label>
                        </div>
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead className="w-[150px]">구분</TableHead>
                                <TableHead>총 사용량</TableHead>
                                <TableHead className="w-[200px]">비율</TableHead>
                                <TableHead className="w-[400px]">세부 사용량</TableHead>
                                <TableHead className="text-right">생성 개수</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-1">
                                        홈 <Info className="h-3 w-3 text-slate-400" />
                                    </div>
                                </TableCell>
                                <TableCell>0bytes</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs w-8 text-right">0%</span>
                                        <Progress value={0} className="h-1.5 w-[100px]" />
                                    </div>
                                </TableCell>
                                <TableCell className="text-sm text-slate-600">
                                    첨부 파일: 0bytes, 본문/댓글 이미지: 0bytes
                                </TableCell>
                                <TableCell className="text-right">2개</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-1">
                                        프로젝트 <Info className="h-3 w-3 text-slate-400" />
                                    </div>
                                </TableCell>
                                <TableCell>0bytes</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs w-8 text-right">0%</span>
                                        <Progress value={0} className="h-1.5 w-[100px]" />
                                    </div>
                                </TableCell>
                                <TableCell className="text-sm text-slate-600">
                                    업무: 0bytes, 드라이브: 0bytes, 위키: 0bytes
                                </TableCell>
                                <TableCell className="text-right">10개</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-1">
                                        결재 <Info className="h-3 w-3 text-slate-400" />
                                    </div>
                                </TableCell>
                                <TableCell>1.7GB</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs w-8 text-right">100%</span>
                                        <Progress value={100} className="h-1.5 w-[100px]" />
                                    </div>
                                </TableCell>
                                <TableCell className="text-sm text-slate-600">
                                    첨부 파일: 1.7GB
                                </TableCell>
                                <TableCell className="text-right">-</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-1">
                                        메신저 <Info className="h-3 w-3 text-slate-400" />
                                    </div>
                                </TableCell>
                                <TableCell>0bytes</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs w-8 text-right">0%</span>
                                        <Progress value={0} className="h-1.5 w-[100px]" />
                                    </div>
                                </TableCell>
                                <TableCell className="text-sm text-slate-600">
                                    비공개 대화방: 0bytes, 1:1 대화방: 0bytes
                                </TableCell>
                                <TableCell className="text-right">-</TableCell>
                            </TableRow>
                            <TableRow className="bg-slate-50 font-bold">
                                <TableCell>합계</TableCell>
                                <TableCell>1.7GB</TableCell>
                                <TableCell colSpan={3}></TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Bottom Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold mb-1">0 bytes</div>
                        <div className="text-xs text-muted-foreground">1개 게시판당 평균 사용량</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold mb-1">0 bytes</div>
                        <div className="text-xs text-muted-foreground">1개 프로젝트당 평균 사용량</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold mb-1">0 bytes</div>
                        <div className="text-xs text-muted-foreground">1개 결재당 평균 사용량</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold mb-1">0 bytes</div>
                        <div className="text-xs text-muted-foreground">1개 메신저당 평균 사용량</div>
                    </CardContent>
                </Card>
            </div>

            {/* Footer Links */}
            <div className="text-sm text-blue-600 space-y-1 pt-4">
                <div className="flex items-center gap-2 cursor-pointer hover:underline">
                    <div className="w-1 h-1 rounded-full bg-blue-600"></div>
                    데이터 백업 및 관리 방법
                </div>
                <div className="flex items-center gap-2 cursor-pointer hover:underline text-muted-foreground">
                    <div className="w-1 h-1 rounded-full bg-muted-foreground"></div>
                    용량을 더 추가하려면 Dooray(help@dooray.com)에 문의 하세요. (BUSINESS 플랜 이상, 500GB 추가/년 200만원)
                </div>
            </div>
        </div>
    );
}
