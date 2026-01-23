
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Megaphone, Calendar, User, Hammer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Home() {
    return (
        <div className="flex flex-col gap-6 h-full p-6 bg-slate-50/50 dark:bg-zinc-950/50">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                        <Megaphone className="h-6 w-6 text-blue-600" />
                        홈
                    </h1>
                    <p className="text-sm text-slate-500 font-medium mt-1">
                        사내 소식과 자유로운 소통 공간입니다.
                    </p>
                </div>
            </div>

            <Tabs defaultValue="notice" className="w-full">
                <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                    <TabsTrigger value="notice">공지사항</TabsTrigger>
                    <TabsTrigger value="board">사업부 게시판</TabsTrigger>
                </TabsList>

                <TabsContent value="notice" className="mt-4">
                    <Card className="border-slate-200 shadow-sm min-h-[400px] flex flex-col items-center justify-center bg-white">
                        <div className="flex flex-col items-center gap-4 text-center p-8">
                            <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center">
                                <Hammer className="h-8 w-8 text-slate-400" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-lg font-semibold text-slate-900">공지사항 서비스 준비중</h3>
                                <p className="text-slate-500 max-w-sm mx-auto">
                                    현재 공지사항 게시판 기능을 개발하고 있습니다.<br />
                                    빠른 시일 내에 오픈하도록 하겠습니다.
                                </p>
                            </div>
                        </div>
                    </Card>
                </TabsContent>

                <TabsContent value="board" className="mt-4">
                    <Card className="border-slate-200 shadow-sm min-h-[400px] flex flex-col items-center justify-center bg-white">
                        <div className="flex flex-col items-center gap-4 text-center p-8">
                            <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center">
                                <Hammer className="h-8 w-8 text-slate-400" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-lg font-semibold text-slate-900">사업부 게시판 서비스 준비중</h3>
                                <p className="text-slate-500 max-w-sm mx-auto">
                                    사업부 간의 자유로운 소통을 위한 게시판을 준비 중입니다.<br />
                                    조금만 기다려주세요.
                                </p>
                            </div>
                        </div>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
