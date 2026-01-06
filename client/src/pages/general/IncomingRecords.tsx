import { exportToExcel } from "@/lib/excel";
import { useState } from "react";
import { Plus, Search, Trash2, Pencil, Loader2, Upload, Download, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { IncomingRecord, InventoryItem } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { IncomingBulkUploadDialog } from "@/components/IncomingBulkUploadDialog";
import { IncomingDialog } from "@/components/IncomingDialog";
import { useAppContext } from "@/contexts/AppContext";
import { useColumnResize } from "@/hooks/useColumnResize";

export default function IncomingRecords() {
  const { toast } = useToast();
  const { checkPermission, tenants, currentTenant } = useAppContext();
  const isTenantOwner = tenants.find(t => t.id === currentTenant)?.role === 'owner';

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [deleteRecord, setDeleteRecord] = useState<IncomingRecord | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<IncomingRecord | null>(null);

  const { widths, startResizing } = useColumnResize({
    checkbox: 40,
    date: 100,
    category: 60,
    supplier: 100,
    projectName: 220,
    productName: 160,
    specification: 200,
    quantity: 80,
    remark: 150,
    createdBy: 80,
    actions: 50
  });

  const canWrite = checkPermission("incoming", "write");

  const { data: records = [], isLoading } = useQuery<IncomingRecord[]>({
    queryKey: ["/api/incoming-records"],
    queryFn: async () => {
      const res = await fetch("/api/incoming");
      if (!res.ok) throw new Error("Failed to fetch records");
      return res.json();
    }
  });

  const { data: inventoryItems = [] } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => apiRequest("PATCH", `/api/incoming/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incoming-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({ title: "입고가 수정되었습니다" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/incoming/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incoming-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({ title: "입고가 삭제되었습니다" });
      setDeleteRecord(null);
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => apiRequest("POST", "/api/incoming/bulk-delete", { ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incoming-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({ title: `${selectedIds.size}건이 삭제되었습니다` });
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
    }
  });

  const bulkUploadMutation = useMutation({
    mutationFn: async ({ items, mode }: { items: any[], mode: 'overwrite' | 'add' }) => {
      const response = await apiRequest("POST", "/api/incoming/bulk", { items, mode });
      return await response.json();
    },
    onSuccess: (data: any[]) => {
      queryClient.invalidateQueries({ queryKey: ["/api/incoming-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({ title: `${data.length}건의 입고내역이 일괄 등록되었습니다` });
      setBulkUploadOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "일괄등록 실패", description: error.message, variant: "destructive" });
    }
  });

  const filteredRecords = records.filter(
    (record) =>
      (record.productName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (record.projectName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (record.supplier || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalQuantity = filteredRecords.reduce((sum, r) => sum + r.quantity, 0);
  const allSelected = filteredRecords.length > 0 && filteredRecords.every(r => selectedIds.has(r.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRecords.map(r => r.id)));
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

  const openAddDialog = () => {
    setEditingRecord(null);
    setDialogOpen(true);
  };

  const openEditDialog = (record: IncomingRecord) => {
    setEditingRecord(record);
    setDialogOpen(true);
  };

  const handleDialogSubmit = async (data: {
    date: Date;
    division: string;
    supplier: string;
    projectName: string;
    attachment: { name: string; data: string } | null;
    items: Array<{
      id: string;
      productName: string;
      specification: string;
      quantity: string;
      inventoryItemId?: number;
      remark: string;
    }>;
  }) => {
    const validItems = data.items.filter(item => item.productName && item.quantity);

    if (validItems.length === 0) {
      toast({ title: "품목 누락", description: "최소 하나의 유효한 품목을 입력해주세요.", variant: "destructive" });
      return;
    }

    // 수정 모드
    if (editingRecord) {
      const item = validItems[0];
      let attributesObj: any = {};
      if (data.attachment) {
        attributesObj.attachment = data.attachment;
      }

      const payload = {
        date: format(data.date, "yyyy-MM-dd"),
        division: data.division,
        supplier: data.supplier,
        projectName: data.projectName,
        productName: item.productName,
        specification: item.specification,
        quantity: parseInt(item.quantity) || 0,
        attributes: JSON.stringify(attributesObj),
        remark: item.remark,
        inventoryItemId: item.inventoryItemId,
      };

      setDialogOpen(false);
      toast({ title: "수정중입니다", description: "잠시만 기다려주세요." });

      try {
        await updateMutation.mutateAsync({ ...payload, id: editingRecord.id } as any);
      } catch (error) {
        // Error handled by mutation
      }
      return;
    }

    // 등록 모드 - 다중 저장
    try {
      setDialogOpen(false);
      toast({ title: "등록중입니다", description: `${validItems.length}건의 입고 등록을 진행합니다.` });

      let successCount = 0;

      for (let i = 0; i < validItems.length; i++) {
        const item = validItems[i];
        const attributesObj: any = {};
        if (i === 0 && data.attachment) {
          attributesObj.attachment = data.attachment;
        }

        const payload = {
          date: format(data.date, "yyyy-MM-dd"),
          division: data.division,
          supplier: data.supplier,
          projectName: data.projectName,
          productName: item.productName,
          specification: item.specification,
          quantity: parseInt(item.quantity) || 0,
          attributes: JSON.stringify(attributesObj),
          remark: item.remark,
          inventoryItemId: item.inventoryItemId,
        };

        await apiRequest("POST", "/api/incoming", payload);
        successCount++;
      }

      queryClient.invalidateQueries({ queryKey: ["/api/incoming-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({ title: "등록 완료", description: `${successCount}건의 입고 내역이 저장되었습니다.` });

    } catch (error: any) {
      toast({
        title: "등록 실패",
        description: error.message || "오류가 발생했습니다",
        variant: "destructive"
      });
    }
  };

  const confirmBulkDelete = () => {
    bulkDeleteMutation.mutate(Array.from(selectedIds));
  };

  const handleBulkUpload = (items: any[]) => {
    bulkUploadMutation.mutate({ items, mode: 'add' });
  };

  const handleExportExcel = () => {
    const dataToExport = filteredRecords.map(record => ({
      "입고일": record.date,
      "사업": record.category,
      "구매처": record.supplier,
      "공사명": record.projectName,
      "품명": record.productName,
      "규격": record.specification,
      "수량": record.quantity,
      "비고": record.remark || "-"
    }));

    exportToExcel(dataToExport, "입고내역");
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
            <h1 className="text-2xl font-bold" data-testid="text-page-title">입고 내역</h1>
            <p className="text-muted-foreground">자재 입고 이력을 조회하고 관리합니다</p>
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button data-testid="button-add-incoming">
                      <Plus className="h-4 w-4 mr-2" />
                      입고 등록
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={openAddDialog}>
                      <Plus className="h-4 w-4 mr-2" />
                      직접 등록
                    </DropdownMenuItem>
                    {isTenantOwner && (
                      <DropdownMenuItem onClick={() => setBulkUploadOpen(true)}>
                        <Upload className="h-4 w-4 mr-2" />
                        일괄 등록
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="품명, 공사명, 구매처 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-incoming"
              />
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
            총 <span className="font-semibold text-foreground">{filteredRecords.length}</span>건 /
            수량 <span className="font-semibold text-foreground">{totalQuantity.toLocaleString()}</span>
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
                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.date }}>
                  입고일
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                    onMouseDown={(e) => startResizing("date", e)}
                  />
                </TableHead>
                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.category }}>
                  사업
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                    onMouseDown={(e) => startResizing("category", e)}
                  />
                </TableHead>
                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.supplier }}>
                  구매처
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                    onMouseDown={(e) => startResizing("supplier", e)}
                  />
                </TableHead>
                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.projectName }}>
                  공사명
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                    onMouseDown={(e) => startResizing("projectName", e)}
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
                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.quantity }}>
                  수량
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                    onMouseDown={(e) => startResizing("quantity", e)}
                  />
                </TableHead>
                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.remark }}>
                  비고
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                    onMouseDown={(e) => startResizing("remark", e)}
                  />
                </TableHead>
                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.createdBy }}>
                  입력자
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                    onMouseDown={(e) => startResizing("createdBy", e)}
                  />
                </TableHead>
                <TableHead className="font-semibold text-center align-middle bg-background w-[80px]">
                  첨부
                </TableHead>
                <TableHead className="font-semibold text-center align-middle bg-background" style={{ width: widths.actions }}></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((record) => (
                <TableRow key={record.id} className="h-6 [&_td]:py-0" data-testid={`row-incoming-${record.id}`}>
                  <TableCell className="text-center align-middle">
                    {isTenantOwner ? (
                      <Checkbox
                        checked={selectedIds.has(record.id)}
                        onCheckedChange={() => toggleSelect(record.id)}
                        data-testid={`checkbox-${record.id}`}
                      />
                    ) : null}
                  </TableCell>
                  <TableCell className="text-center align-middle whitespace-nowrap">{record.date}</TableCell>
                  <TableCell className="text-center align-middle max-w-[80px]">
                    <div className="truncate" title={record.division}>{record.division}</div>
                  </TableCell>
                  <TableCell className="text-center align-middle max-w-[100px]">
                    <div className="truncate" title={record.supplier}>{record.supplier}</div>
                  </TableCell>
                  <TableCell className="text-left align-middle max-w-[200px]">
                    <div className="truncate" title={record.projectName}>{record.projectName}</div>
                  </TableCell>
                  <TableCell className="text-center align-middle max-w-[150px]">
                    <div className="truncate" title={record.productName}>{record.productName}</div>
                  </TableCell>
                  <TableCell className="text-center align-middle max-w-[120px]">
                    <div className="truncate" title={record.specification}>{record.specification}</div>
                  </TableCell>
                  <TableCell className="text-center align-middle font-medium whitespace-nowrap">{record.quantity.toLocaleString()}</TableCell>
                  <TableCell className="text-center align-middle max-w-[150px]">
                    <div className="truncate" title={record.remark || ""}>{record.remark || ""}</div>
                  </TableCell>
                  <TableCell className="text-center align-middle max-w-[100px]">
                    <div className="truncate" title={(record as any).createdByName || ""}>
                      {(record as any).createdByName || "-"}
                    </div>
                  </TableCell>
                  <TableCell className="text-center align-middle">
                    {(() => {
                      try {
                        const attrs = JSON.parse(record.attributes || "{}");
                        if (attrs.attachment) {
                          return (
                            <a
                              href={attrs.attachment.data}
                              download={attrs.attachment.name}
                              className="inline-flex items-center justify-center text-primary hover:text-primary/80"
                              title={attrs.attachment.name}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          );
                        }
                      } catch (e) { }
                      return "-";
                    })()}
                  </TableCell>
                  <TableCell className="text-center align-middle">
                    {canWrite && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-6 w-6 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>입고 관리</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => openEditDialog(record)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            수정
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteRecord(record)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filteredRecords.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} className="text-center text-muted-foreground py-8">
                    검색 결과가 없습니다
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </table>
        </div>
      </div>

      {/* Dialogs */}
      <IncomingDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleDialogSubmit}
        editingRecord={editingRecord}
        inventoryItems={inventoryItems}
      />

      <IncomingBulkUploadDialog
        open={bulkUploadOpen}
        onClose={() => setBulkUploadOpen(false)}
        onUpload={handleBulkUpload}
      />

      <AlertDialog open={!!deleteRecord} onOpenChange={() => setDeleteRecord(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>입고 내역 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 입고 내역을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteRecord && deleteMutation.mutate(deleteRecord.id)}>
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>선택 항목 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              선택한 {selectedIds.size}건의 입고 내역을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkDelete}>
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
