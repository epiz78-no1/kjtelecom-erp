import { useState, useMemo } from "react";
import { Plus, Calendar, Search, Trash2, Pencil, Loader2, Upload, Download } from "lucide-react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { IncomingBulkUploadDialog } from "@/components/IncomingBulkUploadDialog";

const suppliers = ["텔레시스", "삼성전자", "LG유플러스", "SK텔레콤", "한국통신", "대한광통신"];

export default function IncomingRecords() {
  const { toast } = useToast();
  const [selectedDivision, setSelectedDivision] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<IncomingRecord | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<IncomingRecord | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [formData, setFormData] = useState({
    division: "SKT",
    supplier: "",
    projectName: "",
    productName: "",
    specification: "",
    quantity: "",
    unitPrice: "",
    type: "general",
    drumNumber: "",
  });

  const { data: records = [], isLoading } = useQuery<IncomingRecord[]>({
    queryKey: ["/api/incoming"],
  });

  const { data: inventoryItems = [] } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  // Get unique product names from inventory
  const productNames = useMemo(() => {
    const names = new Set(inventoryItems.map(item => item.productName).filter(name => name && name.trim() !== ''));
    return Array.from(names).sort();
  }, [inventoryItems]);

  // Get specifications for the selected product name
  const specifications = useMemo(() => {
    if (!formData.productName) return [];
    const specs = inventoryItems
      .filter(item => item.productName === formData.productName)
      .map(item => item.specification)
      .filter(spec => spec && spec.trim() !== '');
    return Array.from(new Set(specs)).sort();
  }, [inventoryItems, formData.productName]);

  const createMutation = useMutation({
    mutationFn: async (data: Omit<IncomingRecord, "id" | "tenantId">) => {
      return apiRequest("POST", "/api/incoming", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incoming"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({ title: "입고가 등록되었습니다" });
      closeDialog();
    },
    onError: () => {
      toast({ title: "등록 실패", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Omit<IncomingRecord, "tenantId">) => {
      return apiRequest("PATCH", `/api/incoming/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incoming"] });
      toast({ title: "입고가 수정되었습니다" });
      closeDialog();
    },
    onError: () => {
      toast({ title: "수정 실패", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/incoming/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incoming"] });
      toast({ title: "입고가 삭제되었습니다" });
      setDeleteRecord(null);
    },
    onError: () => {
      toast({ title: "삭제 실패", variant: "destructive" });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      return apiRequest("POST", "/api/incoming/bulk-delete", { ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incoming"] });
      toast({ title: `${selectedIds.size}건이 삭제되었습니다` });
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
    },
    onError: () => {
      toast({ title: "삭제 실패", variant: "destructive" });
    },
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
      division: "SKT",
      supplier: "",
      projectName: "",
      productName: "",
      specification: "",
      quantity: "",
      unitPrice: "",
      type: "general",
      drumNumber: ""
    });
    setSelectedDate(new Date());
    setDialogOpen(true);
  };

  const openEditDialog = (record: IncomingRecord) => {
    setEditingRecord(record);
    let drumNo = "";
    try {
      const attrs = JSON.parse(record.attributes || "{}");
      drumNo = attrs.drumNumber || "";
    } catch (e) { }

    setFormData({
      division: record.division,
      supplier: record.supplier,
      projectName: record.projectName,
      productName: record.productName,
      specification: record.specification,
      quantity: record.quantity.toString(),
      unitPrice: record.unitPrice?.toString() ?? "",
      type: record.type || "general",
      drumNumber: drumNo,
    });
    setSelectedDate(new Date(record.date));
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingRecord(null);
    setFormData({
      division: "SKT",
      supplier: "",
      projectName: "",
      productName: "",
      specification: "",
      quantity: "",
      unitPrice: "",
      type: "general",
      drumNumber: ""
    });
    setSelectedDate(new Date());
  };

  const handleSubmit = () => {
    if (!selectedDate || !formData.supplier || !formData.projectName || !formData.productName || !formData.quantity) {
      toast({ title: "필수 항목을 입력해주세요", variant: "destructive" });
      return;
    }

    // Check if this is a new product (not in inventory)
    const existingItem = inventoryItems.find(
      item => item.productName === formData.productName &&
        item.specification === formData.specification &&
        item.division === formData.division
    );

    // For new products, unit price is required
    if (!existingItem && !editingRecord && !formData.unitPrice) {
      toast({
        title: "단가를 입력해주세요",
        description: "새 품목 등록 시 단가 입력이 필수입니다.",
        variant: "destructive"
      });
      return;
    }

    let attributesObj: any = {};
    if (formData.type === "cable") {
      attributesObj.drumNumber = formData.drumNumber;
    }
    const attributes = JSON.stringify(attributesObj);

    const data = {
      date: format(selectedDate, "yyyy-MM-dd"),
      division: formData.division,
      supplier: formData.supplier,
      projectName: formData.projectName,
      productName: formData.productName,
      specification: formData.specification,
      quantity: parseInt(formData.quantity) || 0,
      unitPrice: formData.unitPrice ? parseInt(formData.unitPrice) : 0,
      type: formData.type,
      attributes: attributes,
    };

    if (editingRecord) {
      updateMutation.mutate({ ...data, id: editingRecord.id } as Omit<IncomingRecord, "tenantId">);
    } else {
      createMutation.mutate(data as Omit<IncomingRecord, "id" | "tenantId">);
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

  const handleDownloadTemplate = () => {
    const template = `입고일,사업부,구매처,공사명,품명,규격,수량,단가
2024-12-24,SKT,텔레시스,[광텔] 2025년 SKT 운용사업,광접속함체 돔형,가공 96C,10,39398
2024-12-24,SKT,삼성전자,[광텔] 2025년 SKT 운용사업,광점퍼코드,SM 1C SC/APC-SC/APC 3M,50,2806`;

    const blob = new Blob(["\uFEFF" + template], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "incoming_template.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: "템플릿이 다운로드되었습니다" });
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
            <div className="w-[180px]">
              <Select value={selectedDivision} onValueChange={setSelectedDivision}>
                <SelectTrigger data-testid="select-division">
                  <SelectValue placeholder="사업부 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="SKT">SKT사업부</SelectItem>
                  <SelectItem value="SKB">SKB사업부</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleDownloadTemplate} variant="outline" data-testid="button-download-template">
              <Download className="h-4 w-4 mr-2" />
              템플릿 다운로드
            </Button>
            <Button onClick={() => setBulkUploadOpen(true)} variant="outline" data-testid="button-bulk-upload">
              <Upload className="h-4 w-4 mr-2" />
              일괄등록
            </Button>
            <Button onClick={openAddDialog} data-testid="button-add-incoming">
              <Plus className="h-4 w-4 mr-2" />
              입고 등록
            </Button>
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
          <div className="text-sm text-muted-foreground">
            총 <span className="font-semibold text-foreground">{filteredRecords.length}</span>건 /
            수량 <span className="font-semibold text-foreground">{totalQuantity.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 rounded-md border overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow className="h-11">
              <TableHead className="w-[40px] text-center align-middle bg-background">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleSelectAll}
                  data-testid="checkbox-select-all"
                />
              </TableHead>
              <TableHead className="font-semibold w-[100px] text-center align-middle bg-background">입고일</TableHead>
              <TableHead className="font-semibold w-[50px] text-center align-middle bg-background">사업</TableHead>
              <TableHead className="font-semibold w-[80px] text-center align-middle bg-background">구매처</TableHead>
              <TableHead className="font-semibold w-[200px] text-center align-middle bg-background">공사명</TableHead>
              <TableHead className="font-semibold w-[120px] text-center align-middle bg-background">품명</TableHead>
              <TableHead className="font-semibold w-[120px] text-center align-middle bg-background">규격</TableHead>
              <TableHead className="font-semibold w-[70px] text-center align-middle bg-background">수량</TableHead>
              <TableHead className="font-semibold w-[70px] text-center align-middle bg-background">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRecords.map((record) => (
              <TableRow key={record.id} className="h-11" data-testid={`row-incoming-${record.id}`}>
                <TableCell className="text-center align-middle">
                  <Checkbox
                    checked={selectedIds.has(record.id)}
                    onCheckedChange={() => toggleSelect(record.id)}
                    data-testid={`checkbox-${record.id}`}
                  />
                </TableCell>
                <TableCell className="text-center align-middle whitespace-nowrap">{record.date}</TableCell>
                <TableCell className="text-center align-middle whitespace-nowrap">{record.division}</TableCell>
                <TableCell className="text-center align-middle whitespace-nowrap">{record.supplier}</TableCell>
                <TableCell className="text-center align-middle max-w-[200px] truncate">{record.projectName}</TableCell>
                <TableCell className="text-center align-middle whitespace-nowrap">{record.productName}</TableCell>
                <TableCell className="text-center align-middle max-w-[120px] truncate">{record.specification}</TableCell>
                <TableCell className="text-center align-middle font-medium whitespace-nowrap">{record.quantity.toLocaleString()}</TableCell>
                <TableCell className="text-center align-middle">
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEditDialog(record)}
                      data-testid={`button-edit-${record.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeleteRecord(record)}
                      data-testid={`button-delete-${record.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredRecords.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  검색 결과가 없습니다
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingRecord ? "입고 수정" : "입고 등록"}</DialogTitle>
            <DialogDescription>
              {editingRecord ? "입고 내역을 수정합니다." : "새로운 자재 입고 내역을 등록합니다."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>입고일 *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="justify-start text-left font-normal"
                      data-testid="button-incoming-date"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP", { locale: ko }) : "날짜 선택"}
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
                <Label>사업부 *</Label>
                <Select
                  value={formData.division}
                  onValueChange={(value) => setFormData({ ...formData, division: value })}
                >
                  <SelectTrigger data-testid="select-incoming-division">
                    <SelectValue placeholder="사업부 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SKT">SKT사업부</SelectItem>
                    <SelectItem value="SKB">SKB사업부</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>구매처 *</Label>
              <Select
                value={formData.supplier}
                onValueChange={(value) => setFormData({ ...formData, supplier: value })}
              >
                <SelectTrigger data-testid="select-incoming-supplier">
                  <SelectValue placeholder="구매처 선택" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>공사명 *</Label>
              <Input
                value={formData.projectName}
                onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                placeholder="예: [광텔] 2025년 SKT 운용사업 선로공사"
                data-testid="input-incoming-project"
              />
            </div>

            <div className="flex flex-col gap-3">
              <Label>자재 유형</Label>
              <RadioGroup
                defaultValue="general"
                value={formData.type}
                onValueChange={(val) => setFormData({ ...formData, type: val })}
                className="flex flex-row gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="general" id="r1" />
                  <Label htmlFor="r1">일반 자재</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cable" id="r2" />
                  <Label htmlFor="r2">케이블 (Drum/M)</Label>
                </div>
              </RadioGroup>
            </div>

            {formData.type === "cable" && (
              <div className="grid gap-2 bg-muted/30 p-2 rounded-md">
                <Label className="text-blue-600">드럼 번호 (Drum No.)</Label>
                <Input
                  value={formData.drumNumber}
                  onChange={(e) => setFormData({ ...formData, drumNumber: e.target.value })}
                  placeholder="D-12345"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>품명 *</Label>
                <Select
                  value={formData.productName}
                  onValueChange={(value) => {
                    const item = inventoryItems.find(i => i.productName === value);
                    setFormData({
                      ...formData,
                      productName: value,
                      specification: "",
                      type: item?.type || "general"
                    });
                  }}
                >
                  <SelectTrigger data-testid="select-incoming-product">
                    <SelectValue placeholder="품명 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {productNames.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>규격</Label>
                <Select
                  value={formData.specification}
                  onValueChange={(value) => setFormData({ ...formData, specification: value })}
                  disabled={!formData.productName}
                >
                  <SelectTrigger data-testid="select-incoming-spec">
                    <SelectValue placeholder={formData.productName ? "규격 선택" : "품명을 먼저 선택하세요"} />
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
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>수량 *</Label>
                <Input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="10"
                  data-testid="input-incoming-quantity"
                />
              </div>
              <div className="grid gap-2">
                <Label>단가 (원)</Label>
                <Input
                  type="number"
                  value={formData.unitPrice}
                  onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                  placeholder="새 품목 등록 시 필요"
                  data-testid="input-incoming-unitprice"
                />
              </div>
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
