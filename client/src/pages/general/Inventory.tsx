
import { MoreHorizontal, Pencil, Loader2, Trash2, Plus, Upload, Download, Filter, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/SearchInput";
import { Checkbox } from "@/components/ui/checkbox";
import { InventoryTable } from "@/components/InventoryTable";
import { MaterialFormDialog, type MaterialSubmitData } from "@/components/MaterialFormDialog";
import { GenericBulkUploadDialog } from "@/components/GenericBulkUploadDialog";
import { validateInventoryRow, transformInventoryRow, inventoryColumns } from "@/lib/bulk-configs/inventory";
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
import { Badge } from "@/components/ui/badge";
import { useAppContext } from "@/contexts/AppContext";
import { useState, useMemo } from "react";
import { useColumnResize } from "@/hooks/useColumnResize";
import { useDialogState } from "@/hooks/useDialogState";
import { useTableFilters } from "@/hooks/useTableFilters";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { InfiniteScrollLoader } from "@/components/InfiniteScrollLoader";
import { INVENTORY_COLUMNS } from "@/lib/material-table-columns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export default function Inventory() {
  const { toast } = useToast();
  const { user, checkPermission, tenants, currentTenant } = useAppContext();
  const isAdmin = tenants.find(t => t.id === currentTenant)?.role === 'admin' || tenants.find(t => t.id === currentTenant)?.role === 'owner';
  const isTenantOwner = tenants.find(t => t.id === currentTenant)?.role === 'owner';
  const canWrite = checkPermission("inventory", "write");

  const [deleteItem, setDeleteItem] = useState<InventoryItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);

  // Filter State
  const [filterOpen, setFilterOpen] = useState(false);

  const { open: materialDialogOpen, editingItem, handleOpen: openMaterialDialog, handleClose: closeMaterialDialog } = useDialogState<InventoryItem>();

  const { widths, startResizing } = useColumnResize(INVENTORY_COLUMNS);

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
      closeMaterialDialog();
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
      closeMaterialDialog();
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
    mutationFn: async ({ items, mode }: { items: any[], mode: 'overwrite' | 'add' }) => {
      const response = await apiRequest("POST", "/api/inventory/bulk", { items, mode });
      return await response.json(); // Response 객체를 JSON으로 파싱
    },
    onSuccess: (data: any, variables: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      refetch(); // 즉시 데이터 새로고침

      const uploadedCount = Array.isArray(data) ? data.length : 0;
      const requestedCount = variables.items?.length || 0;

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

  const {
    searchQuery,
    setSearchQuery,
    selectedDivision,
    setSelectedDivision,
    selectedCategory,
    setSelectedCategory,
    filteredItems: filteredInventory,
    categories,
    resetFilters,
    removeFilter,
    getActiveFilters
  } = useTableFilters(inventoryItems, {
    searchFields: ["productName"],
    divisionField: "division",
    categoryField: "category"
  });

  // Helper to handle filter reset
  const handleResetFilters = () => {
    setSelectedCategory('전체');
    resetFilters();
  };

  const handleRemoveFilter = (key: string) => {
    if (key === 'category') {
      setSelectedCategory('전체');
    } else {
      removeFilter(key);
    }
  };


  const {
    items: displayInventory,
    hasMore,
    isLoading: scrollLoading,
    observerRef
  } = useInfiniteScroll(filteredInventory, {
    initialPageSize: 100,
    pageSize: 100
  });

  const allSelected = displayInventory.length > 0 && displayInventory.every(item => selectedIds.has(item.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayInventory.map(item => item.id)));
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

  const handleEdit = (item: InventoryItem) => openMaterialDialog(item);

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

  const handleBulkUpload = (items: any[], mode?: 'overwrite' | 'add') => {
    bulkUploadMutation.mutate({ items, mode: mode || 'overwrite' });
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
        "자재현황": totalStock,
        "현장팀 보유재고": teamStock,
        "사무실 보유재고": officeStock,
        "단가": item.unitPrice,
        "금액": totalStock * item.unitPrice
      };
    });

    exportToExcel(dataToExport, "자재현황");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-10 w-10 animate-spin text-primary/80" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-zinc-950/50 p-2 overflow-hidden">
      {/* Ultra Compact Header Section */}
      <div className="flex flex-col gap-2 flex-shrink-0 mb-2 pt-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 px-1">
            <h1 className="text-base font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
              자재현황
              <span className="flex h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50 animate-pulse"></span>
            </h1>
            <div className="h-3 w-px bg-slate-200 dark:bg-slate-800"></div>
            <span className="text-xs font-medium text-slate-500">{filteredInventory.length} items</span>
          </div>

          <div className="flex items-center gap-1.5">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="품명, 규격 검색..."
              className="w-32 focus:w-48 h-7 text-xs rounded-md bg-white border-slate-200 focus:ring-1 focus:ring-primary/20 transition-all font-normal"
            />

            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={filterOpen ? "secondary" : "ghost"}
                      size="icon"
                      onClick={() => setFilterOpen(!filterOpen)}
                      className={cn("h-7 w-7 rounded-md", filterOpen && "bg-slate-200 text-slate-900")}
                    >
                      <Filter className="h-3.5 w-3.5 text-slate-500" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">필터</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-md text-emerald-600 hover:bg-emerald-50"
                      onClick={handleExportExcel}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">Excel 다운로드</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <DropdownMenu>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button disabled={!canWrite} size="icon" className="h-7 w-7 rounded-md bg-primary hover:bg-primary/90 shadow-sm">
                          <Plus className="h-3.5 w-3.5 text-white" />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">신규 등록</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <DropdownMenuContent align="end" className="w-32 p-1">
                  <DropdownMenuItem onClick={() => openMaterialDialog()} className="text-xs py-1.5 cursor-pointer rounded-md">
                    <Plus className="h-3 w-3 mr-2 text-primary" /> 직접 등록
                  </DropdownMenuItem>
                  {isTenantOwner && (
                    <DropdownMenuItem onClick={() => setBulkUploadOpen(true)} className="text-xs py-1.5 cursor-pointer rounded-md">
                      <Upload className="h-3 w-3 mr-2 text-blue-600" /> 일괄 등록
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Compact Expandable Filter Panel */}
        {filterOpen && (
          <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 animate-in fade-in slide-in-from-top-1 duration-200 mt-1">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              <div className="space-y-0.5">
                <Select value={selectedCategory || "전체"} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="h-7 text-xs rounded-md border-slate-200 bg-slate-50/50"><SelectValue placeholder="카테고리" /></SelectTrigger>
                  <SelectContent className="backdrop-blur-xl bg-background/95">
                    <SelectItem value="전체" className="text-xs">전체(카테고리)</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={String(cat)} value={String(cat)} className="text-xs">
                        {String(cat)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100 dark:border-zinc-800">
              <div className="flex items-center space-x-2">
                {/* Additional Checkboxes can go here if needed */}
              </div>

              {getActiveFilters().length > 0 && (
                <div className="flex items-center gap-1 flex-wrap justify-end">
                  {getActiveFilters().map(filter => (
                    <Badge
                      key={filter.key}
                      variant="secondary"
                      className="h-5 px-1.5 rounded-md bg-slate-100 text-slate-700 border-0 text-[10px]"
                    >
                      {filter.label}
                      <button
                        onClick={() => handleRemoveFilter(filter.key)}
                        className="ml-1 hover:bg-slate-300 rounded-full p-0.5"
                      >
                        <X className="h-2 w-2" />
                      </button>
                    </Badge>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetFilters}
                    className="h-5 text-[10px] text-muted-foreground hover:text-foreground px-1.5"
                  >
                    초기화
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && isTenantOwner && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-4">
          <span className="font-semibold text-sm">{selectedIds.size}개 항목 선택됨</span>
          <div className="h-4 w-px bg-white/20" />
          <button
            onClick={() => setBulkDeleteOpen(true)}
            disabled={bulkDeleteMutation.isPending || !canWrite}
            className="text-red-400 hover:text-red-300 text-sm font-medium flex items-center gap-2 disabled:opacity-50"
          >
            {bulkDeleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            선택 삭제
          </button>
        </div>
      )}

      {/* Main Table Area */}
      <div className="flex-1 rounded-3xl border border-slate-200 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-xl shadow-slate-200/50 dark:shadow-black/50 overflow-hidden flex flex-col relative z-0">
        <div className="flex-1 overflow-auto custom-scrollbar relative">
          <table className="w-full text-sm border-collapse table-fixed">
            <TableHeader className="sticky top-0 bg-slate-50/95 backdrop-blur z-20 shadow-sm">
              <TableRow className="h-10 border-b border-slate-200">
                <TableHead className="w-[40px] text-center p-0">
                  {isTenantOwner && <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} className="translate-y-[2px]" />}
                </TableHead>
                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.category }}>
                  사업<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 z-50" onMouseDown={(e) => startResizing("category", e)} />
                </TableHead>
                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.productName }}>
                  품명<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 z-50" onMouseDown={(e) => startResizing("productName", e)} />
                </TableHead>
                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.specification }}>
                  규격<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 z-50" onMouseDown={(e) => startResizing("specification", e)} />
                </TableHead>
                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.totalStock }}>
                  자재현황<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 z-50" onMouseDown={(e) => startResizing("totalStock", e)} />
                </TableHead>
                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.teamStock }}>
                  현장팀 보유<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 z-50" onMouseDown={(e) => startResizing("teamStock", e)} />
                </TableHead>
                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.officeStock }}>
                  사무실 보유<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 z-50" onMouseDown={(e) => startResizing("officeStock", e)} />
                </TableHead>
                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.unitPrice }}>
                  단가<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("unitPrice", e)} />
                </TableHead>
                <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.amount }}>
                  금액<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("amount", e)} />
                </TableHead>
                <TableHead className="w-[40px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayInventory.length === 0 && filteredInventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-64 text-center text-muted-foreground flex flex-col items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                        <Search className="h-6 w-6 text-slate-400 opacity-50" />
                      </div>
                      <p className="font-medium">검색 결과가 없습니다.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                displayInventory.map((item) => {
                  const teamStock = item.outgoing - (item.usage || 0);
                  const officeStock = item.remaining;
                  const totalStock = officeStock + teamStock;

                  return (
                    <TableRow
                      key={item.id}
                      className="group h-10 border-b border-slate-100 dark:border-zinc-800 transition-colors cursor-pointer text-xs hover:bg-slate-50/80"
                      data-testid={`row-inventory-${item.id}`}
                    >
                      <TableCell className="text-center p-0">
                        {isTenantOwner ? (
                          <Checkbox
                            checked={selectedIds.has(item.id)}
                            onCheckedChange={() => toggleSelect(item.id)}
                            className="translate-y-[2px] opacity-0 group-hover:opacity-100 data-[state=checked]:opacity-100 transition-opacity"
                          />
                        ) : null}
                      </TableCell>
                      <TableCell className="text-center px-1 text-xs font-medium text-slate-700">{item.category}</TableCell>
                      <TableCell className="text-center px-2 text-xs font-medium text-slate-700">{item.productName}</TableCell>
                      <TableCell className="text-center px-1 text-xs text-slate-500 truncate">{item.specification}</TableCell>
                      <TableCell className="text-center px-2 font-mono font-medium text-slate-900">
                        {totalStock.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center px-2 font-mono text-slate-500">
                        {teamStock.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center px-2 font-mono font-bold text-primary">
                        {officeStock.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right px-2 font-mono text-slate-400">{item.unitPrice.toLocaleString()}</TableCell>
                      <TableCell className="text-right px-2 font-mono text-slate-500">{(totalStock * item.unitPrice).toLocaleString()}</TableCell>
                      <TableCell className="text-center p-0">
                        {canWrite && isTenantOwner && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="h-4 w-4 text-slate-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-32 shadow-xl rounded-xl">
                              <DropdownMenuLabel className="text-xs">자재 관리</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => openMaterialDialog(item)} className="text-xs gap-2">
                                <Pencil className="h-3 w-3" />
                                수정
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-xs text-red-600 gap-2 focus:text-red-700 focus:bg-red-50"
                                onClick={() => setDeleteItem(item)}
                              >
                                <Trash2 className="h-3 w-3" />
                                삭제
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </table>

          <InfiniteScrollLoader
            hasMore={hasMore}
            isLoading={scrollLoading}
            observerRef={observerRef}
            itemCount={displayInventory.length}
            totalCount={filteredInventory.length}
          />
        </div>
      </div>

      <MaterialFormDialog
        open={materialDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeMaterialDialog();
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
            <AlertDialogCancel disabled={bulkDeleteMutation.isPending}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => {
              e.preventDefault();
              confirmBulkDelete();
            }} disabled={bulkDeleteMutation.isPending}>
              {bulkDeleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  삭제 중...
                </>
              ) : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <GenericBulkUploadDialog
        open={bulkUploadOpen}
        onOpenChange={setBulkUploadOpen}
        title="재고 일괄 등록"
        description="CSV 파일을 업로드하여 재고 현황을 일괄 등록(덮어쓰기/추가)할 수 있습니다."
        templateUrl="/api/templates/inventory"
        templateFileName="inventory_template.csv"
        validateRow={validateInventoryRow}
        transformRow={transformInventoryRow}
        columns={inventoryColumns}
        onUpload={handleBulkUpload}
        enableModeSelection={true}
        isLoading={bulkUploadMutation.isPending}
      />
    </div >
  );
}
