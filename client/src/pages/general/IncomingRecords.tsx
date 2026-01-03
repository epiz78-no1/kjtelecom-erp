import { exportToExcel } from "@/lib/excel";
import { useState, useMemo } from "react";
import { Plus, Calendar, Search, Trash2, Pencil, Loader2, Upload, Download, MoreHorizontal, Check, ChevronsUpDown } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { IncomingBulkUploadDialog } from "@/components/IncomingBulkUploadDialog";
import { useAppContext } from "@/contexts/AppContext";
import { useColumnResize } from "@/hooks/useColumnResize";

const suppliers = ["텔레시스", "삼성전자", "LG유플러스", "SK텔레콤", "한국통신", "대한광통신"];

export default function IncomingRecords() {
  const { toast } = useToast();
  const { user, positions, divisions, checkPermission, tenants, currentTenant } = useAppContext();
  const isAdmin = tenants.find(t => t.id === currentTenant)?.role === 'admin' || tenants.find(t => t.id === currentTenant)?.role === 'owner';
  const isTenantOwner = tenants.find(t => t.id === currentTenant)?.role === 'owner';
  const [selectedDivision, setSelectedDivision] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [deleteRecord, setDeleteRecord] = useState<IncomingRecord | null>(null);

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

  // Permissions
  const canWrite = checkPermission("incoming", "write");

  // State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    division: "SKT",
    category: "SKT",
    supplier: "",
    projectName: "",
    productName: "",
    specification: "",
    quantity: "",
    remark: "",
    inventoryItemId: undefined as number | undefined,
    attachment: null as { name: string, data: string } | null,
  });

  const { data: records = [], isLoading } = useQuery<IncomingRecord[]>({
    queryKey: ["/api/incoming-records", selectedDivision],
    queryFn: async () => {
      const res = await fetch(selectedDivision === "all" ? "/api/incoming" : `/api/incoming?division=${selectedDivision}`);
      if (!res.ok) throw new Error("Failed to fetch records");
      return res.json();
    }
  });

  const { data: inventoryItems = [] } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  // Unique product list for selector
  const productNames = useMemo(() => {
    const selectedCat = (formData.category || "").trim();
    const filtered = inventoryItems
      .filter(item => {
        if (!selectedCat) return true;
        const itemCat = (item.category || "").trim();
        const itemDiv = (item.division || "").trim();
        return itemCat === selectedCat || (itemCat === "" && itemDiv === selectedCat);
      })
      .map(item => item.productName)
      .filter(n => n && n.trim() !== '');
    const names = new Set(filtered);
    return Array.from(names).sort();
  }, [inventoryItems, formData.category]);

  const [openProductCombobox, setOpenProductCombobox] = useState(false);

  // Specifications list for selected product
  const specifications = useMemo(() => {
    if (!formData.productName) return [];
    const specs = inventoryItems
      .filter(item => item.productName === formData.productName)
      .map(item => item.specification)
      .filter(s => s && s.trim() !== '');
    return Array.from(new Set(specs)).sort();
  }, [inventoryItems, formData.productName]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", "/api/incoming", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incoming-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({ title: "입고가 등록되었습니다" });
    }
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


  const divisionFiltered = selectedDivision === "all"
    ? records
    : records.filter((record) => record.division === selectedDivision);

  const filteredRecords = divisionFiltered.filter(
    (record) =>
      record.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.supplier.toLowerCase().includes(searchQuery.toLowerCase())
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
    setFormData({
      date: new Date().toISOString().split("T")[0],
      division: "SKT",
      category: "SKT",
      supplier: "",
      projectName: "",
      productName: "",
      specification: "",
      quantity: "",
      remark: "",
      inventoryItemId: undefined,
      attachment: null,
    });
    setSelectedDate(new Date());
    setIsDialogOpen(true);
  };

  const openEditDialog = (record: IncomingRecord) => {
    setEditingRecord(record);
    let drumNo = "";
    try {
      const attrs = JSON.parse(record.attributes || "{}");
      drumNo = attrs.drumNumber || "";
    } catch (e) { }

    let attachment = null;
    try {
      const attrs = JSON.parse(record.attributes || "{}");
      if (attrs.attachment) {
        attachment = attrs.attachment;
      }
    } catch (e) { }

    setFormData({
      date: record.date,
      division: record.division,
      category: record.category || record.division,
      supplier: record.supplier,
      projectName: record.projectName,
      productName: record.productName,
      specification: record.specification,
      quantity: record.quantity.toString(),
      remark: record.remark || "",
      inventoryItemId: record.inventoryItemId || undefined,
      attachment: attachment,
    });
    setSelectedDate(new Date(record.date));
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingRecord(null);
    setFormData({
      date: new Date().toISOString().split("T")[0],
      division: "SKT",
      category: "SKT",
      supplier: "",
      projectName: "",
      productName: "",
      specification: "",
      quantity: "",
      remark: "",
      inventoryItemId: undefined,
      attachment: null,
    });
    setSelectedDate(new Date());
  };

  const handleSubmit = async () => {
    if (!selectedDate || !formData.supplier || !formData.projectName || !formData.productName || !formData.quantity) {
      toast({ title: "필수 항목을 입력해주세요", variant: "destructive" });
      return;
    }

    let attributesObj: any = {};
    if (formData.attachment) {
      attributesObj.attachment = formData.attachment;
    }
    const attributes = JSON.stringify(attributesObj);

    const data = {
      date: format(selectedDate, "yyyy-MM-dd"),
      division: formData.division,
      category: formData.category,
      supplier: formData.supplier,
      projectName: formData.projectName,
      productName: formData.productName,
      specification: formData.specification,
      quantity: parseInt(formData.quantity) || 0,
      attributes: attributes,
      remark: formData.remark,
      inventoryItemId: formData.inventoryItemId,
    };

    closeDialog();
    toast({ title: "등록중입니다", description: "잠시만 기다려주세요." });

    try {
      if (editingRecord) {
        await updateMutation.mutateAsync({ ...data, id: editingRecord.id } as Omit<IncomingRecord, "tenantId">);
      } else {
        await createMutation.mutateAsync(data as Omit<IncomingRecord, "id" | "tenantId">);
      }
    } catch (error) {
      // Error toast is handled by global error handler or default
    }
  };

  const confirmBulkDelete = () => {
    bulkDeleteMutation.mutate(Array.from(selectedIds));
  };

  const handleBulkUpload = async (items: any[]) => {
    try {
      for (const item of items) {
        await createMutation.mutateAsync(item);
      }
      toast({ title: `${items.length}건의 입고내역이 등록되었습니다` });
      setBulkUploadOpen(false);
    } catch (error) {
      toast({ title: "일괄등록 실패", variant: "destructive" });
    }
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
                    {isAdmin && (
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
                <TableRow key={record.id} className="h-8 [&_td]:py-1" data-testid={`row-incoming-${record.id}`}>
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
                  <TableCell className="text-center align-middle whitespace-nowrap">
                    {record.category}
                  </TableCell>
                  <TableCell className="text-center align-middle whitespace-nowrap">{record.supplier}</TableCell>
                  <TableCell className="text-center align-middle max-w-[200px] truncate">{record.projectName}</TableCell>
                  <TableCell className="text-center align-middle whitespace-nowrap">{record.productName}</TableCell>
                  <TableCell className="text-center align-middle max-w-[120px] truncate">{record.specification}</TableCell>
                  <TableCell className="text-center align-middle font-medium whitespace-nowrap">{record.quantity.toLocaleString()}</TableCell>
                  <TableCell className="text-left align-middle max-w-[150px] truncate">{record.remark || "-"}</TableCell>
                  <TableCell className="text-center align-middle whitespace-nowrap">{(record as any).createdByName || "-"}</TableCell>
                  <TableCell className="text-center align-middle">
                    {(() => {
                      try {
                        const attrs = JSON.parse(record.attributes || "{}");
                        if (attrs.attachment) {
                          return (
                            <a
                              href={attrs.attachment.data}
                              download={attrs.attachment.name}
                              className="text-blue-600 hover:underline text-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              다운로드
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
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    검색 결과가 없습니다
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </table>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[800px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>입고 내역 등록</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            {editingRecord ? "입고 내역을 수정합니다." : "새로운 자재 입고 내역을 등록합니다."}
          </DialogDescription>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>입고일 *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={`w-full justify-start text-left font-normal ${!selectedDate && "text-muted-foreground"}`}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP", { locale: ko }) : <span>날짜 선택</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <Label>사업 *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({
                    ...formData,
                    category: value,
                    productName: "",
                    specification: "",
                    inventoryItemId: undefined
                  })}
                >
                  <SelectTrigger data-testid="select-incoming-category">
                    <SelectValue placeholder="사업 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(new Set(inventoryItems.map(item => item.category).filter(c => c && c.trim() !== ''))).sort().map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>구매처 *</Label>
                <Input
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  placeholder="구매처 입력"
                  data-testid="input-incoming-supplier"
                />
              </div>
              <div className="grid gap-2">
                <Label>공사명 *</Label>
                <Input
                  value={formData.projectName}
                  onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                  placeholder="공사명 입력"
                  data-testid="input-incoming-project"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>품명 *</Label>
                <Popover open={openProductCombobox} onOpenChange={setOpenProductCombobox} modal={true}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openProductCombobox}
                      className="w-full justify-between"
                      data-testid="select-incoming-product"
                    >
                      {formData.productName
                        ? formData.productName
                        : "품명 선택"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[300px] p-0"
                    align="start"
                    side="bottom"
                    sideOffset={4}
                    avoidCollisions={false}
                    collisionPadding={0}
                  >
                    <Command>
                      <CommandInput placeholder="품명 검색..." />
                      <CommandList style={{ maxHeight: '250px', overflowY: 'auto' }}>
                        <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>
                        <CommandGroup>
                          {productNames.map((name) => (
                            <CommandItem
                              key={name}
                              value={name}
                              onSelect={(currentValue) => {
                                const value = currentValue; // cmdk lowecases value, but we might want original case if needed. However, here we iterate names.
                                // Actually cmdk value is lowercase. We should find the matching original name.
                                const originalName = productNames.find(n => n.toLowerCase() === value.toLowerCase()) || value;

                                const selectedCat = (formData.category || "").trim();
                                const items = inventoryItems.filter(i => {
                                  if (i.productName !== originalName) return false;
                                  const itemCat = (i.category || "").trim();
                                  const itemDiv = (i.division || "").trim();
                                  return itemCat === selectedCat || (itemCat === "" && itemDiv === selectedCat);
                                });

                                const firstItem = items[0];
                                const singleSpec = items.length === 1 ? firstItem.specification : "";

                                setFormData({
                                  ...formData,
                                  productName: originalName,
                                  category: firstItem?.category || formData.category,
                                  division: firstItem?.division || formData.division,
                                  specification: singleSpec,
                                  inventoryItemId: items.length === 1 ? firstItem?.id : undefined
                                });
                                setOpenProductCombobox(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.productName === name ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <Label>규격</Label>
                <Select
                  value={formData.specification}
                  disabled={!formData.productName}
                  onValueChange={(value) => {
                    const selectedCat = (formData.category || "").trim();
                    const item = inventoryItems.find(i => {
                      if (i.productName !== formData.productName || i.specification !== value) return false;
                      const itemCat = (i.category || "").trim();
                      const itemDiv = (i.division || "").trim();
                      return itemCat === selectedCat || (itemCat === "" && itemDiv === selectedCat);
                    });

                    setFormData({
                      ...formData,
                      specification: value,
                      inventoryItemId: item?.id
                    });
                  }}
                >
                  <SelectTrigger data-testid="select-incoming-spec">
                    <SelectValue placeholder={formData.productName ? "규격 선택" : "품명 먼저 선택"} />
                  </SelectTrigger>
                  <SelectContent>
                    {specifications.map((spec) => (
                      <SelectItem key={spec} value={spec}>
                        {spec}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>수량 *</Label>
              <Input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="수량 입력"
                data-testid="input-incoming-quantity"
              />
            </div>



            <div className="grid gap-2">
              <Label>첨부파일</Label>
              <div className="relative">
                <input
                  type="file"
                  id="file-upload"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        if (event.target?.result) {
                          setFormData({
                            ...formData,
                            attachment: {
                              name: file.name,
                              data: event.target.result as string
                            }
                          });
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                <label
                  htmlFor="file-upload"
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-primary/30 rounded-lg cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                >
                  <Upload className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-primary">
                    {formData.attachment ? formData.attachment.name : "파일 선택 또는 드래그"}
                  </span>
                </label>
              </div>
              {formData.attachment && (
                <div className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                  <span className="text-sm text-muted-foreground truncate">
                    📎 {formData.attachment.name}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setFormData({ ...formData, attachment: null })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label>비고</Label>
              <Input
                value={formData.remark}
                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                placeholder="참고 사항 입력"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-submit-incoming"
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingRecord ? "수정" : "등록"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteRecord} onOpenChange={(open) => !open && setDeleteRecord(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>입고 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteRecord?.productName}을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
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
              선택한 {selectedIds.size}개의 입고 내역을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkDelete}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <IncomingBulkUploadDialog
        open={bulkUploadOpen}
        onOpenChange={setBulkUploadOpen}
        onUpload={handleBulkUpload}
      />
    </div>
  );
}
