import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download, Folder, Package, Hammer, HardHat, FileBox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

export default function Archives() {
    const [activeTab, setActiveTab] = useState("all");

    // Mock data for archives
    const archives: { id: number; title: string; date: string; size: string; category: string }[] = [];

    const categories = [
        { id: "all", label: "전체", icon: FileBox },
        { id: "optical", label: "광케이블 자재", icon: Network }, // Lucide icon import needed
        { id: "general", label: "일반 자재", icon: Package },
        { id: "demolition", label: "철거 자재", icon: Hammer },
        { id: "field", label: "현장팀", icon: HardHat },
    ];

    const filteredArchives = activeTab === "all"
        ? archives
        : archives.filter(item => item.category === activeTab);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">자료실</h2>
                    <p className="text-muted-foreground">업무별 문서를 관리하고 다운로드할 수 있습니다.</p>
                </div>
            </div>

            <Tabs defaultValue="all" onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-5 lg:w-[600px]">
                    <TabsTrigger value="all">전체</TabsTrigger>
                    <TabsTrigger value="optical">광케이블</TabsTrigger>
                    <TabsTrigger value="general">일반자재</TabsTrigger>
                    <TabsTrigger value="demolition">철거자재</TabsTrigger>
                    <TabsTrigger value="field">현장팀</TabsTrigger>
                </TabsList>

                <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredArchives.map((item) => (
                        <Card key={item.id} className="hover:shadow-md transition-shadow cursor-pointer border-slate-200">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="p-2 bg-slate-100 rounded-lg">
                                        <FileText className="h-6 w-6 text-slate-600" />
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                                        <Download className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <CardTitle className="text-base mb-1">{item.title}</CardTitle>
                                <CardDescription className="flex items-center gap-2 text-xs">
                                    <span className="capitalize px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium text-[10px]">
                                        {categories.find(c => c.id === item.category)?.label || item.category}
                                    </span>
                                    <span>•</span>
                                    <span>{item.date}</span>
                                    <span>•</span>
                                    <span>{item.size}</span>
                                </CardDescription>
                            </CardContent>
                        </Card>
                    ))}
                    {filteredArchives.length === 0 && (
                        <div className="col-span-full min-h-[300px] flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                            <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                <Hammer className="h-6 w-6 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-1">자료실 서비스 준비중</h3>
                            <p className="text-slate-500 text-sm">
                                현재 자료실 기능을 개발하고 있습니다.<br />
                                빠른 시일 내에 이용하실 수 있도록 준비하겠습니다.
                            </p>
                        </div>
                    )}
                </div>
            </Tabs>
        </div>
    );
}

import { Network } from "lucide-react"; // Import Network separately to avoid conflict/errors

