import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, MoreHorizontal, CheckCircle, XCircle } from "lucide-react";
import { SearchInput } from "@/components/ui/SearchInput";
import {
    TableHeader,
    TableRow,
    TableHead,
    TableBody,
    TableCell,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/contexts/AppContext";

interface DemolitionMaterial {
    id: string;
    managementNo: string;
    division: string;
    category: string;
    projectCode: string;
    projectName: string;
    demolitionDate: string;
    productName: string;
    specification: string;
    originalQuantity: number;
    remainingQuantity: number;
    status: string;
    remark?: string;
}

export default function DemolitionMaterials() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { tenants, currentTenant } = useAppContext();
    const isTenantOwner = tenants.find(t => t.id === currentTenant)?.role === 'owner';

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("전체");

    const { data: materials = [], isLoading } = useQuery<DemolitionMaterial[]>({
        queryKey: ["/api/demolition-materials"],
    });

    const reviewMutation = useMutation({
        mutationFn: async ({ id, decision }: { id: string; decision: 'approved_reusable' | 'rejected' }) => {
            const res = await fetch(`/api/demolition-materials/${id}/review`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ decision }),
                credentials: "include",
            });
            if (!res.ok) throw new Error(await res.text());
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/demolition-materials"] });
            toast({ title: "검토가 완료되었습니다" });
        },
        onError: (error: any) => {
            toast({ title: "검토 실패", description: error.message, variant: "destructive" });
        },
    });

    const disposeMutation = useMutation({
        mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
            const res = await fetch(`/api/demolition-materials/${id}/dispose`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ disposedQuantity: quantity }),
                credentials: "include",
            });
            if (!res.ok) throw new Error(await res.text());
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/demolition-materials"] });
            toast({ title: "폐기 처리되었습니다" });
        },
        onError: (error: any) => {
            toast({ title: "폐기 실패", description: error.message, variant: "destructive" });
        },
    });

    const filteredMaterials = materials.filter(m => {
        const matchesSearch =
            m.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.projectName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.managementNo?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus =
            selectedStatus === "전체" ||
            (selectedStatus === "검토대기" && m.status === "pending_review") ||
            (selectedStatus === "재사용가능" && m.status === "approved_reusable") ||
            (selectedStatus === "재사용불가" && m.status === "rejected");

        return matchesSearch && matchesStatus;
    });

    const handleReview = (id: string, decision: 'approved_reusable' | 'rejected') => {
        const decisionText = decision === 'approved_reusable' ? '재사용 가능' : '재사용 불가';
        if (confirm(`이 자재를 "${decisionText}"로 판정하시겠습니까?`)) {
            reviewMutation.mutate({ id, decision });
        }
    };

    const handleDispose = (material: DemolitionMaterial) => {
        const quantity = prompt(`폐기할 수량을 입력하세요 (최대: ${material.remainingQuantity})`);
        if (quantity) {
            const qty = parseInt(quantity);
            if (qty > 0 && qty <= material.remainingQuantity) {
                disposeMutation.mutate({ id: material.id, quantity: qty });
            } else {
                toast({ title: "잘못된 수량", description: "유효한 수량을 입력하세요", variant: "destructive" });
            }
        }
    };

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
                    <h1 className="text-2xl font-bold">철거자재 현황</h1>
                    <p className="text-muted-foreground">철거자재의 검토 및 재사용 판정을 관리합니다</p>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="상태 선택" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="전체">전체</SelectItem>
                        <SelectItem value="검토대기">검토대기</SelectItem>
                        <SelectItem value="재사용가능">재사용가능</SelectItem>
                        <SelectItem value="재사용불가">재사용불가</SelectItem>
                    </SelectContent>
                </Select>

                <SearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="품명, 공사명, 관리번호 검색..."
                    className="max-w-sm"
                />

                <div className="ml-auto text-sm text-muted-foreground">
                    총 <span className="font-semibold text-foreground">{filteredMaterials.length}</span>건
                </div>
            </div>

            <div className="flex-1 rounded-md border overflow-hidden">
                <div className="h-full overflow-auto">
                    <table className="w-full caption-bottom text-sm table-fixed">
                        <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                            <TableRow className="h-8">
                                <TableHead className="text-center align-middle bg-background">관리번호</TableHead>
                                <TableHead className="text-center align-middle bg-background">사업</TableHead>
                                <TableHead className="text-center align-middle bg-background">구분</TableHead>
                                <TableHead className="text-center align-middle bg-background">철거일자</TableHead>
                                <TableHead className="text-center align-middle bg-background">공사번호</TableHead>
                                <TableHead className="text-center align-middle bg-background">공사명</TableHead>
                                <TableHead className="text-center align-middle bg-background">품명</TableHead>
                                <TableHead className="text-center align-middle bg-background">규격</TableHead>
                                <TableHead className="text-center align-middle bg-background">원수량</TableHead>
                                <TableHead className="text-center align-middle bg-background">잔량</TableHead>
                                <TableHead className="text-center align-middle bg-background">상태</TableHead>
                                <TableHead className="text-center align-middle bg-background">비고</TableHead>
                                <TableHead className="w-16 bg-background"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredMaterials.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                                        등록된 철거자재가 없습니다
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredMaterials.map((material) => (
                                    <TableRow key={material.id} className="h-6 [\u0026_td]:py-0">
                                        <TableCell className="text-center align-middle font-medium">{material.managementNo}</TableCell>
                                        <TableCell className="text-center align-middle">{material.division}</TableCell>
                                        <TableCell className="text-center align-middle">{material.category}</TableCell>
                                        <TableCell className="text-center align-middle">{material.demolitionDate}</TableCell>
                                        <TableCell className="text-center align-middle">{material.projectCode}</TableCell>
                                        <TableCell className="text-left align-middle">{material.projectName}</TableCell>
                                        <TableCell className="text-left align-middle">{material.productName}</TableCell>
                                        <TableCell className="text-center align-middle">{material.specification}</TableCell>
                                        <TableCell className="text-right align-middle">{material.originalQuantity.toLocaleString()}</TableCell>
                                        <TableCell className="text-right align-middle font-medium">{material.remainingQuantity.toLocaleString()}</TableCell>
                                        <TableCell className="text-center align-middle">
                                            <span className={`px-2 py-1 rounded text-xs ${material.status === 'pending_review' ? 'bg-yellow-100 text-yellow-800' :
                                                    material.status === 'approved_reusable' ? 'bg-green-100 text-green-800' :
                                                        material.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                            'bg-gray-100 text-gray-800'
                                                }`}>
                                                {material.status === 'pending_review' ? '검토대기' :
                                                    material.status === 'approved_reusable' ? '재사용가능' :
                                                        material.status === 'rejected' ? '재사용불가' : material.status}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center align-middle">{material.remark || ''}</TableCell>
                                        <TableCell className="text-center align-middle">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-6 w-6 p-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {material.status === 'pending_review' && isTenantOwner && (
                                                        <>
                                                            <DropdownMenuItem
                                                                onClick={() => handleReview(material.id, 'approved_reusable')}
                                                                className="text-green-600"
                                                            >
                                                                <CheckCircle className="mr-2 h-4 w-4" />
                                                                재사용 가능
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => handleReview(material.id, 'rejected')}
                                                                className="text-red-600"
                                                            >
                                                                <XCircle className="mr-2 h-4 w-4" />
                                                                재사용 불가
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                    {material.remainingQuantity > 0 && isTenantOwner && (
                                                        <DropdownMenuItem
                                                            onClick={() => handleDispose(material)}
                                                            className="text-orange-600"
                                                        >
                                                            폐기 처리
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
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
