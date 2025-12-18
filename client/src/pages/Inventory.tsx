import { useState } from "react";
import { Plus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { InventoryTable } from "@/components/InventoryTable";
import { MaterialFormDialog } from "@/components/MaterialFormDialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
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

export default function Inventory() {
  const { toast } = useToast();
  const [selectedDivision, setSelectedDivision] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<InventoryItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const { data: inventoryItems = [], isLoading } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<InventoryItem, "id">) => {
      return apiRequest("POST", "/api/inventory", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({ title: "자재가 추가되었습니다" });
      setMaterialDialogOpen(false);
    },
    onError: () => {
      toast({ title: "자재 추가 실패", variant: "destructive" });
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
    },
    onError: () => {
      toast({ title: "자재 수정 실패", variant: "destructive" });
    },
  });

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

  const divisionFiltered = selectedDivision === "all"
    ? inventoryItems
    : inventoryItems.filter((item) => item.division === selectedDivision);

  const categorySet = new Set(divisionFiltered.map((item) => item.category));
  const categories = ["전체", ...Array.from(categorySet)];

  const filteredInventory = selectedCategory === "전체"
    ? divisionFiltered
    : divisionFiltered.filter((item) => item.category === selectedCategory);

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

  const handleSubmit = (data: {
    division?: string;
    category: string;
    productName: string;
    specification: string;
    carriedOver: number;
    incoming: number;
    outgoing: number;
    remaining: number;
    unitPrice: number;
    totalAmount: number;
  }) => {
    const submitData = { ...data, division: data.division || "SKT" };
    if (editingItem) {
      updateMutation.mutate({ ...submitData, id: editingItem.id });
    } else {
      createMutation.mutate(submitData);
    }
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

  const confirmBulkDelete = () => {
    bulkDeleteMutation.mutate(Array.from(selectedIds));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">재고 현황</h1>
          <p className="text-muted-foreground">자재별 재고 수량과 상태를 확인합니다</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1">
            <Button
              variant={selectedDivision === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedDivision("all")}
              data-testid="button-division-all"
            >
              전체
            </Button>
            <Button
              variant={selectedDivision === "SKT" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedDivision("SKT")}
              data-testid="button-division-skt"
            >
              SKT사업부
            </Button>
            <Button
              variant={selectedDivision === "SKB" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedDivision("SKB")}
              data-testid="button-division-skb"
            >
              SKB사업부
            </Button>
          </div>
          <Button onClick={() => { setEditingItem(null); setMaterialDialogOpen(true); }} data-testid="button-add-material">
            <Plus className="h-4 w-4 mr-2" />
            자재 추가
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
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
        <div className="text-sm text-muted-foreground">
          총 <span className="font-semibold text-foreground">{filteredInventory.length}</span>개 품목
        </div>
        {selectedIds.size > 0 && (
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

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleSelectAll}
                  data-testid="checkbox-select-all"
                />
              </TableHead>
              <TableHead className="font-semibold w-[80px]">구분</TableHead>
              <TableHead className="font-semibold w-[140px]">품명</TableHead>
              <TableHead className="font-semibold w-[120px]">규격</TableHead>
              <TableHead className="font-semibold text-right w-[80px]">이월재</TableHead>
              <TableHead className="font-semibold text-right w-[80px]">입고량</TableHead>
              <TableHead className="font-semibold text-right w-[80px]">출고량</TableHead>
              <TableHead className="font-semibold text-right w-[80px]">잔량</TableHead>
              <TableHead className="font-semibold text-right w-[100px]">단가</TableHead>
              <TableHead className="font-semibold text-right w-[110px]">금액</TableHead>
              <TableHead className="font-semibold w-[70px]">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInventory.map((item) => (
              <TableRow key={item.id} data-testid={`row-inventory-${item.id}`}>
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(item.id)}
                    onCheckedChange={() => toggleSelect(item.id)}
                    data-testid={`checkbox-${item.id}`}
                  />
                </TableCell>
                <TableCell className="whitespace-nowrap">{item.category}</TableCell>
                <TableCell className="whitespace-nowrap">{item.productName}</TableCell>
                <TableCell className="max-w-[120px] truncate">{item.specification}</TableCell>
                <TableCell className="text-right whitespace-nowrap">{item.carriedOver.toLocaleString()}</TableCell>
                <TableCell className="text-right whitespace-nowrap">{item.incoming.toLocaleString()}</TableCell>
                <TableCell className="text-right whitespace-nowrap">{item.outgoing.toLocaleString()}</TableCell>
                <TableCell className="text-right font-medium whitespace-nowrap">{item.remaining.toLocaleString()}</TableCell>
                <TableCell className="text-right whitespace-nowrap">{item.unitPrice.toLocaleString()}</TableCell>
                <TableCell className="text-right whitespace-nowrap">{item.totalAmount.toLocaleString()}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEdit(item)}
                      data-testid={`button-edit-${item.id}`}
                    >
                      <Plus className="h-4 w-4 rotate-45" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(item)}
                      data-testid={`button-delete-${item.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredInventory.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                  재고 데이터가 없습니다
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
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
    </div>
  );
}
