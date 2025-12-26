import { useState, useMemo } from "react";
import { Search, Loader2, Trash2, Plus, Calendar, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { MaterialUsageRecord, InventoryItem } from "@shared/schema";
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

const teamCategories = ["접속팀", "외선팀", "유지보수팀", "설치팀"];

export default function TeamMaterialUsage() {
  const { toast } = useToast();
  const [selectedDivision, setSelectedDivision] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaterialUsageRecord | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<MaterialUsageRecord | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [formData, setFormData] = useState({
    division: "SKT",
    teamCategory: "",
    projectName: "",
    productName: "",
    specification: "",
    quantity: "",
    recipient: "",
    type: "general",
    drumNumber: "",
  });

  const { data: records = [], isLoading } = useQuery<MaterialUsageRecord[]>({
    queryKey: ["/api/material-usage"],
  });

  const { data: inventoryItems = [] } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  // Get unique product names from inventory
  const productNames = useMemo(() => {
    const names = new Set(
      inventoryItems
        .map(item => item.productName)
        .filter(name => name && name.trim() !== '')
    );
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
    mutationFn: async (data: Omit<MaterialUsageRecord, "id" | "tenantId">) => {
      return apiRequest("POST", "/api/material-usage", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/material-usage"] });
      toast({ title: "사용 내역이 등록되었습니다" });
      closeDialog();
    },
    onError: () => {
      toast({ title: "등록 실패", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Omit<MaterialUsageRecord, "tenantId">) => {
      return apiRequest("PATCH", `/api/material-usage/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/material-usage"] });
      toast({ title: "사용 내역이 수정되었습니다" });
      closeDialog();
    },
    onError: () => {
      toast({ title: "수정 실패", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/material-usage/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/material-usage"] });
      toast({ title: "사용 내역이 삭제되었습니다" });
      setDeleteRecord(null);
    },
    onError: () => {
      toast({ title: "삭제 실패", variant: "destructive" });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      return apiRequest("POST", "/api/material-usage/bulk-delete", { ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/material-usage"] });
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
      record.recipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.teamCategory.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.specification.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalQuantity = filteredRecords.reduce((sum, r) => sum + r.quantity, 0);
  const totalRecords = filteredRecords.length;

  const currentYear = new Date().getFullYear();
  const divisionLabel = selectedDivision === "all" ? "" : selectedDivision;

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
      teamCategory: "",
      projectName: "",
      productName: "",
      specification: "",
      quantity: "",
      recipient: "",
      type: "general",
      drumNumber: ""
    });
    setSelectedDate(new Date());
    setDialogOpen(true);
  };

  const openEditDialog = (record: MaterialUsageRecord) => {
    setEditingRecord(record);
    let drumNo = "";
    try {
      const attrs = JSON.parse(record.attributes || "{}");
      drumNo = attrs.drumNumber || "";
    } catch (e) { }

    setFormData({
      division: record.division,
      teamCategory: record.teamCategory,
      projectName: record.projectName,
      productName: record.productName,
      specification: record.specification,
      quantity: String(record.quantity),
      recipient: record.recipient,
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
      teamCategory: "",
      projectName: "",
      productName: "",
      specification: "",
      quantity: "",
      recipient: "",
      type: "general",
      drumNumber: ""
    });
    setSelectedDate(new Date());
  };

  const handleSubmit = () => {
    if (!selectedDate || !formData.teamCategory || !formData.productName || !formData.quantity || !formData.recipient) {
      toast({ title: "필수 항목을 입력해주세요", variant: "destructive" });
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
      teamCategory: formData.teamCategory,
      projectName: formData.projectName,
      productName: formData.productName,
      specification: formData.specification,
      quantity: parseInt(formData.quantity) || 0,
      recipient: formData.recipient,
      type: formData.type,
      attributes: attributes,
    };

    if (editingRecord) {
      updateMutation.mutate({ ...data, id: editingRecord.id } as Omit<MaterialUsageRecord, "tenantId">);
    } else {
      createMutation.mutate(data as Omit<MaterialUsageRecord, "id" | "tenantId">);
    }
  };

  const confirmDelete = () => {
    if (deleteRecord) {
      deleteMutation.mutate(deleteRecord.id);
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
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 space-y-4 pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">
              {currentYear}년 {divisionLabel} 자재 사용내역
            </h1>
            <p className="text-muted-foreground">현장팀 자재 사용 이력을 조회합니다</p>
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
            <Button onClick={openAddDialog} data-testid="button-add-usage">
              <Plus className="h-4 w-4 mr-2" />
              사용 등록
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="품명, 공사명, 규격, 수령인 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
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
            <span className="font-semibold text-foreground">{totalRecords}</span>건 /
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
              <TableHead className="font-semibold w-[100px] text-center align-middle bg-background">사용일</TableHead>
              <TableHead className="font-semibold w-[50px] text-center align-middle bg-background">사업</TableHead>
              <TableHead className="font-semibold w-[80px] text-center align-middle bg-background">구분</TableHead>
              <TableHead className="font-semibold w-[200px] text-center align-middle bg-background">공사명</TableHead>
              <TableHead className="font-semibold w-[120px] text-center align-middle bg-background">품명</TableHead>
              <TableHead className="font-semibold w-[120px] text-center align-middle bg-background">규격</TableHead>
              <TableHead className="font-semibold w-[70px] text-center align-middle bg-background">수량</TableHead>
              <TableHead className="font-semibold w-[80px] text-center align-middle bg-background">수령인</TableHead>
              <TableHead className="font-semibold w-[70px] text-center align-middle bg-background">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRecords.map((record) => (
              <TableRow key={record.id} className="h-11" data-testid={`row-usage-${record.id}`}>
                <TableCell className="text-center align-middle">
                  <Checkbox
                    checked={selectedIds.has(record.id)}
                    onCheckedChange={() => toggleSelect(record.id)}
                    data-testid={`checkbox-${record.id}`}
                  />
                </TableCell>
                <TableCell className="text-center align-middle whitespace-nowrap">{record.date}</TableCell>
                <TableCell className="text-center align-middle whitespace-nowrap">{record.division}</TableCell>
                <TableCell className="text-center align-middle whitespace-nowrap">{record.teamCategory}</TableCell>
                <TableCell className="text-center align-middle max-w-[200px] truncate">{record.projectName}</TableCell>
                <TableCell className="text-center align-middle whitespace-nowrap">{record.productName}</TableCell>
                <TableCell className="text-center align-middle max-w-[120px] truncate">{record.specification}</TableCell>
                <TableCell className="text-center align-middle font-medium whitespace-nowrap">{record.quantity.toLocaleString()}</TableCell>
                <TableCell className="text-center align-middle whitespace-nowrap">{record.recipient}</TableCell>
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
                <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                  사용 내역이 없습니다
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingRecord ? "사용 내역 수정" : "사용 내역 등록"}</DialogTitle>
            <DialogDescription>
              {editingRecord ? "자재 사용 내역을 수정합니다." : "새로운 자재 사용 내역을 등록합니다."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>사용일 *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="justify-start text-left font-normal"
                      data-testid="button-usage-date"
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
                  <SelectTrigger data-testid="select-usage-division">
                    <SelectValue placeholder="사업부 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SKT">SKT</SelectItem>
                    <SelectItem value="SKB">SKB</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>구분 (팀) *</Label>
                <Select
                  value={formData.teamCategory}
                  onValueChange={(value) => setFormData({ ...formData, teamCategory: value })}
                >
                  <SelectTrigger data-testid="select-usage-team">
                    <SelectValue placeholder="구분 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamCategories.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>수령인 *</Label>
                <Input
                  value={formData.recipient}
                  onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                  placeholder="예: 홍길동"
                  data-testid="input-usage-recipient"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>공사명</Label>
              <Input
                value={formData.projectName}
                onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                placeholder="예: 효자동 2가 함체교체"
                data-testid="input-usage-project"
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
                      division: item?.division || "SKT",
                      type: item?.type || "general"
                    });
                  }}
                >
                  <SelectTrigger data-testid="select-usage-product">
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
                <Label>규격 *</Label>
                <Select
                  value={formData.specification}
                  onValueChange={(value) => {
                    const item = inventoryItems.find(
                      i => i.productName === formData.productName &&
                        i.specification === value
                    );
                    setFormData({
                      ...formData,
                      specification: value,
                      division: item?.division || formData.division
                    });
                  }}
                  disabled={!formData.productName}
                >
                  <SelectTrigger data-testid="select-usage-spec">
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
            <div className="grid gap-2">
              <Label>수량 *</Label>
              <Input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="10"
                data-testid="input-usage-quantity"
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
              data-testid="button-submit-usage"
            >
              {(createMutation.isPending || updateMutation.isPending) ? "처리 중..." : editingRecord ? "수정" : "등록"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteRecord} onOpenChange={(open) => !open && setDeleteRecord(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>사용 내역 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 사용 내역을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
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
              선택한 {selectedIds.size}개의 사용 내역을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkDelete}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div >
  );
}
