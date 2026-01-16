import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";

export default function DemolitionDashboard() {
    const { data: dashboardData } = useQuery({
        queryKey: ["/api/demolition-dashboard"],
    });

    const stats = dashboardData?.stats || {};

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold">철거자재 대시보드</h1>
                <p className="text-muted-foreground">철거자재 현황을 한눈에 확인하세요</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">총 입고량</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            전체 철거자재 수
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">검토 대기</CardTitle>
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.pendingReview || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            관리자 검토 필요
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">재사용 가능</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.approvedReusable || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            재사용 승인된 자재
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">재사용됨</CardTitle>
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.inUse || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            사용 중인 자재
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>최근 이력</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {dashboardData?.recentLogs?.slice(0, 5).map((log: any) => (
                            <div key={log.id} className="flex items-center justify-between border-b pb-2">
                                <div>
                                    <p className="font-medium">{log.logType === 'receive' ? '입고' : log.logType === 'review' ? '검토' : log.logType === 'usage' ? '사용' : '폐기'}</p>
                                    <p className="text-sm text-muted-foreground">{log.logDate}</p>
                                </div>
                            </div>
                        )) || <p className="text-muted-foreground">이력이 없습니다</p>}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
