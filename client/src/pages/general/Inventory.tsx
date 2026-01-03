

import { MoreHorizontal, Pencil, Loader2, Trash2, Plus, Search, Upload, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { InventoryTable } from "@/components/InventoryTable";
import { MaterialFormDialog, type MaterialSubmitData } from "@/components/MaterialFormDialog";
import { BulkUploadDialog } from "@/components/BulkUploadDialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { exportToExcel } from "@/lib/excel";
import { useToast } from "@/hooks/use-toast";
import type { InventoryItem } from "@shared/schema";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppContext } from "@/contexts/AppContext";
import { useState } from "react";
import { useColumnResize } from "@/hooks/useColumnResize";

export default function Inventory() {
  const { toast } = useToast();
  const { user, checkPermission, tenants, currentTenant } = useAppContext();
  const isAdmin = tenants.find(t => t.id === currentTenant)?.role === 'admin' || tenants.find(t => t.id === currentTenant)?.role === 'owner';
  const isTenantOwner = tenants.find(t => t.id === currentTenant)?.role === 'owner';
  const canWrite = checkPermission("inventory", "write");

  const [selectedDivision, setSelectedDivision] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<InventoryItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);

  const { widths, startResizing } = useColumnResize({
    checkbox: 40,
    category: 60,
    productName: 200,
    specification: 300,
    totalStock: 90,
    teamStock: 90,
    officeStock: 90,
    unitPrice: 100,
    amount: 120,
    actions: 50
  });

  const { data: inventoryItems = [], isLoading, refetch } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<InventoryItem, "id" | "tenantId">) => {
      return apiRequest("POST", "/api/inventory", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({ title: "자재가 추가되었습니다" });
      setMaterialDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "자재 추가 실패",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: InventoryItem) => {
      return apiRequest("PATCH", `/api/inventory/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({ title: "자재가 수정되었습니다" });
      setEditingItem(null);
      setMaterialDialogOpen(false);
    },
    onError: () => {
      toast({ title: "자재 수정 실패", variant: "destructive" });
    },
  });



  const handleSubmit = (data: MaterialSubmitData) => {
    // Auto-determine division from category
    const division = data.category.includes("SKB") ? "SKB" : "SKT";
    const submitData = { ...data, division };
    if (editingItem) {
      updateMutation.mutate({ ...submitData, id: editingItem.id } as InventoryItem);
    } else {
      createMutation.mutate(submitData as Omit<InventoryItem, "id" | "tenantId">);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/inventory/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({ title: "자재가 삭제되었습니다" });
      setDeleteItem(null);
    },
    onError: () => {
      toast({ title: "자재 삭제 실패", variant: "destructive" });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      return apiRequest("POST", "/api/inventory/bulk-delete", { ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({ title: `${selectedIds.size}개 항목이 삭제되었습니다` });
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
    },
    onError: () => {
      toast({ title: "삭제 실패", variant: "destructive" });
    },
  });

  const bulkUploadMutation = useMutation({
    mutationFn: async (items: any[]) => {
      const response = await apiRequest("POST", "/api/inventory/bulk", { items });
      return await response.json(); // Response 객체를 JSON으로 파싱
    },
    onSuccess: (data: any, variables: any[]) => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      refetch(); // 즉시 데이터 새로고침

      const uploadedCount = Array.isArray(data) ? data.length : 0;
      const requestedCount = variables?.length || 0;

      toast({
        title: "재고가 일괄 등록되었습니다",
        description: `요청: ${requestedCount}개 / 등록 완료: ${uploadedCount}개`
      });
      setBulkUploadOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "일괄 등록 실패",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const divisionFiltered = selectedDivision === "all"
    ? inventoryItems
    : inventoryItems.filter((item) => item.division === selectedDivision);

  const categorySet = new Set(divisionFiltered.map((item) => item.category).filter(cat => cat && cat.trim() !== ''));
  const categories = ["전체", ...Array.from(categorySet)];

  const categoryFiltered = selectedCategory === "전체"
    ? divisionFiltered
    : divisionFiltered.filter((item) => item.category === selectedCategory);

  const filteredInventory = searchQuery
    ? categoryFiltered.filter((item) =>
      item.productName.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : categoryFiltered;

  const allSelected = filteredInventory.length > 0 && filteredInventory.every(item => selectedIds.has(item.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredInventory.map(item => item.id)));
    }
  };

  const toggleSelect = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };



  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setMaterialDialogOpen(true);
  };

  const handleDelete = (item: InventoryItem) => {
    setDeleteItem(item);
  };

  const confirmDelete = () => {
    if (deleteItem) {
      deleteMutation.mutate(deleteItem.id);
    }
  };

  const openMaterialDialog = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item);
    } else {
      setEditingItem(null);
    }
    setMaterialDialogOpen(true);
  };

  const confirmBulkDelete = () => {
    bulkDeleteMutation.mutate(Array.from(selectedIds));
  };

  const handleBulkUpload = (items: any[]) => {
    bulkUploadMutation.mutate(items);
  };



  const handleExportExcel = () => {
    const dataToExport = filteredInventory.map(item => {
      const teamStock = item.outgoing - (item.usage || 0);
      const officeStock = item.remaining;
      const totalStock = officeStock + teamStock;

      return {
        "사업": item.category,
        "품명": item.productName,
        "규격": item.specification,
        "재고현황": totalStock,
        "현장팀 보유재고": teamStock,
        "사무실 보유재고": officeStock,
        "단가": item.unitPrice,
        "금액": totalStock * item.unitPrice
      };
    });

    exportToExcel(dataToExport, "재고현황");
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
            <h1 className="text-2xl font-bold" data-testid="text-page-title">일반자재 재고현황</h1>
            <p className="text-muted-foreground">자재별 재고 수량과 상태를 확인합니다</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canWrite && (
              <>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-green-600 text-green-600 hover:bg-green-50"
                  onClick={handleExportExcel}
                >
                  <Download className="h-3 w-3 mr-1" />
                  Excel
                </Button>
              </>
            )}
            {canWrite ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button data-testid="button-add-item-menu">
                    <Plus className="h-4 w-4 mr-2" />
                    자재 등록
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openMaterialDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    직접 등록
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => setBulkUploadOpen(true)}>
                      <Upload className="h-4 w-4 mr-2" />
                      일괄 등록
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="품명, 사업, 규격 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-inventory"
              />
            </div>
            <div className="w-48">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger data-testid="select-category-filter">
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedIds.size > 0 && isTenantOwner && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setBulkDeleteOpen(true)}
                data-testid="button-bulk-delete"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                선택 삭제 ({selectedIds.size})
              </Button>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            총 <span className="font-semibold text-foreground">{filteredInventory.length}</span>개 품목
          </div>
        </div>
      </div>

      <div className="flex-1 rounded-md border overflow-hidden">
        <div className="h-full overflow-auto relative pb-20">
          <table className="w-full caption-bottom text-sm table-fixed">
            <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
              <TableRow className="h-8">
                <TableHead className="text-center align-middle bg-background" style={{ width: widths.checkbox }}>
                  {isTenantOwner ? (
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleSelectAll}
                      data-testid="checkbox-select-all"
                    />
                  ) : null}
                </TableHead>
                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.category }}>
                  사업
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                    onMouseDown={(e) => startResizing("category", e)}
                  />
                </TableHead>
                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.productName }}>
                  품명
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                    onMouseDown={(e) => startResizing("productName", e)}
                  />
                </TableHead>
                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.specification }}>
                  규격
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                    onMouseDown={(e) => startResizing("specification", e)}
                  />
                </TableHead>
                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.totalStock }}>
                  재고현황
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                    onMouseDown={(e) => startResizing("totalStock", e)}
                  />
                </TableHead>
                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.teamStock }}>
                  현장팀<br />보유재고
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                    onMouseDown={(e) => startResizing("teamStock", e)}
                  />
                </TableHead>
                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.officeStock }}>
                  사무실<br />보유재고
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                    onMouseDown={(e) => startResizing("officeStock", e)}
                  />
                </TableHead>
                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.unitPrice }}>
                  단가
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                    onMouseDown={(e) => startResizing("unitPrice", e)}
                  />
                </TableHead>
                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.amount }}>
                  금액
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                    onMouseDown={(e) => startResizing("amount", e)}
                  />
                </TableHead>
                <TableHead className="font-semibold text-center align-middle bg-background" style={{ width: widths.actions }}></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventory.map((item) => {
                // Calculate values based on new logic
                // remaining = Office Stock (DB value)
                // outgoing = Sent to Team (DB value)
                // usage = Used by Team (DB value)

                const teamStock = item.outgoing - (item.usage || 0);
                const officeStock = item.remaining;
                const totalStock = officeStock + teamStock; // 재고현황

                return (
                  <TableRow key={item.id} className="h-8 [&_td]:py-1" data-testid={`row-inventory-${item.id}`}>
                    <TableCell className="text-center align-middle">
                      {isTenantOwner ? (
                        <Checkbox
                          checked={selectedIds.has(item.id)}
                          onCheckedChange={() => toggleSelect(item.id)}
                          data-testid={`checkbox-${item.id}`}
                        />
                      ) : null}
                    </TableCell>
                    <TableCell className="text-center align-middle whitespace-nowrap">{item.category}</TableCell>
                    <TableCell className="text-center align-middle whitespace-nowrap">{item.productName}</TableCell>
                    <TableCell className="text-center align-middle max-w-[120px] truncate">{item.specification}</TableCell>


                    {/* 재고현황 (Total) - Black text */}
                    <TableCell className="text-center align-middle whitespace-nowrap font-medium">
                      {totalStock.toLocaleString()}
                    </TableCell>

                    {/* 현장팀출고량 (Team Stock) */}
                    <TableCell className="text-center align-middle whitespace-nowrap font-medium">
                      {teamStock.toLocaleString()}
                    </TableCell>

                    {/* 사무실재고량 (Office Stock) */}
                    <TableCell className="text-center align-middle whitespace-nowrap font-medium">
                      {officeStock.toLocaleString()}
                    </TableCell>

                    <TableCell className="text-center align-middle whitespace-nowrap">{item.unitPrice.toLocaleString()}</TableCell>
                    <TableCell className="text-center align-middle whitespace-nowrap">{(totalStock * item.unitPrice).toLocaleString()}</TableCell>
                    <TableCell className="text-center align-middle">
                      {canWrite && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-6 w-6 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>자재 관리</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => openMaterialDialog(item)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              수정
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteItem(item)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredInventory.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    재고 데이터가 없습니다
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </table>
        </div>
      </div>

      <MaterialFormDialog
        open={materialDialogOpen}
        onOpenChange={(open) => {
          setMaterialDialogOpen(open);
          if (!open) setEditingItem(null);
        }}
        onSubmit={handleSubmit}
        editingItem={editingItem}
      />

      <AlertDialog open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>자재 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteItem?.productName}을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>선택 항목 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              선택한 {selectedIds.size}개의 자재를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkDelete}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BulkUploadDialog
        open={bulkUploadOpen}
        onOpenChange={setBulkUploadOpen}
        onUpload={handleBulkUpload}
      />
    </div >
  );
}
