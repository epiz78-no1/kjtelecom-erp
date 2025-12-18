import { useState } from "react";
import { Plus, Calendar, Search, Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { OutgoingRecord } from "@shared/schema";
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
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

const teamCategories = ["접속팀", "외선팀", "유지보수팀", "설치팀"];

export default function OutgoingRecords() {
  const { toast } = useToast();
  const [selectedDivision, setSelectedDivision] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<OutgoingRecord | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<OutgoingRecord | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [formData, setFormData] = useState({
    division: "SKT",
    teamCategory: "",
    projectName: "",
    productName: "",
    specification: "",
    quantity: "",
    recipient: "",
  });

  const { data: records = [], isLoading } = useQuery<OutgoingRecord[]>({
    queryKey: ["/api/outgoing"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<OutgoingRecord, "id">) => {
      return apiRequest("POST", "/api/outgoing", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/outgoing"] });
      toast({ title: "출고가 등록되었습니다" });
      closeDialog();
    },
    onError: () => {
      toast({ title: "등록 실패", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: OutgoingRecord) => {
      return apiRequest("PATCH", `/api/outgoing/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/outgoing"] });
      toast({ title: "출고가 수정되었습니다" });
      closeDialog();
    },
    onError: () => {
      toast({ title: "수정 실패", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/outgoing/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/outgoing"] });
      toast({ title: "출고가 삭제되었습니다" });
      setDeleteRecord(null);
    },
    onError: () => {
      toast({ title: "삭제 실패", variant: "destructive" });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      return apiRequest("POST", "/api/outgoing/bulk-delete", { ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/outgoing"] });
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
      record.teamCategory.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalQuantity = filteredRecords.reduce((sum, r) => sum + r.quantity, 0);

  const allSelected = filteredRecords.length > 0 && filteredRecords.every(r => selectedIds.has(r.id));
  const someSelected = filteredRecords.some(r => selectedIds.has(r.id));

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
    setFormData({ division: "SKT", teamCategory: "", projectName: "", productName: "", specification: "", quantity: "", recipient: "" });
    setSelectedDate(undefined);
    setDialogOpen(true);
  };

  const openEditDialog = (record: OutgoingRecord) => {
    setEditingRecord(record);
    setFormData({
      division: record.division,
      teamCategory: record.teamCategory,
      projectName: record.projectName,
      productName: record.productName,
      specification: record.specification,
      quantity: String(record.quantity),
      recipient: record.recipient,
    });
    setSelectedDate(new Date(record.date));
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingRecord(null);
    setFormData({ division: "SKT", teamCategory: "", projectName: "", productName: "", specification: "", quantity: "", recipient: "" });
    setSelectedDate(undefined);
  };

  const handleSubmit = () => {
    if (!selectedDate || !formData.teamCategory || !formData.productName || !formData.quantity || !formData.recipient) {
      toast({ title: "필수 항목을 입력해주세요", variant: "destructive" });
      return;
    }

    const data = {
      date: format(selectedDate, "yyyy-MM-dd"),
      division: formData.division,
      teamCategory: formData.teamCategory,
      projectName: formData.projectName,
      productName: formData.productName,
      specification: formData.specification,
      quantity: parseInt(formData.quantity),
      recipient: formData.recipient,
    };

    if (editingRecord) {
      updateMutation.mutate({ ...data, id: editingRecord.id });
    } else {
      createMutation.mutate(data);
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">출고 내역</h1>
          <p className="text-muted-foreground">자재 출고 이력을 조회하고 관리합니다</p>
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
          <Button onClick={openAddDialog} data-testid="button-add-outgoing">
            <Plus className="h-4 w-4 mr-2" />
            출고 등록
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="품명, 공사명, 수령인 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-outgoing"
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
              <TableHead className="font-semibold w-[100px]">출고일</TableHead>
              <TableHead className="font-semibold w-[50px]">사업</TableHead>
              <TableHead className="font-semibold w-[80px]">구분</TableHead>
              <TableHead className="font-semibold w-[200px]">공사명</TableHead>
              <TableHead className="font-semibold w-[120px]">품명</TableHead>
              <TableHead className="font-semibold w-[120px]">규격</TableHead>
              <TableHead className="font-semibold text-right w-[70px]">수량</TableHead>
              <TableHead className="font-semibold w-[80px]">수령인</TableHead>
              <TableHead className="font-semibold w-[70px]">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRecords.map((record) => (
              <TableRow key={record.id} data-testid={`row-outgoing-${record.id}`}>
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(record.id)}
                    onCheckedChange={() => toggleSelect(record.id)}
                    data-testid={`checkbox-${record.id}`}
                  />
                </TableCell>
                <TableCell className="whitespace-nowrap">{record.date}</TableCell>
                <TableCell className="whitespace-nowrap">{record.division}</TableCell>
                <TableCell className="whitespace-nowrap">{record.teamCategory}</TableCell>
                <TableCell className="max-w-[200px] truncate">{record.projectName}</TableCell>
                <TableCell className="whitespace-nowrap">{record.productName}</TableCell>
                <TableCell className="max-w-[120px] truncate">{record.specification}</TableCell>
                <TableCell className="text-right font-medium whitespace-nowrap">{record.quantity.toLocaleString()}</TableCell>
                <TableCell className="whitespace-nowrap">{record.recipient}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
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
            <DialogTitle>{editingRecord ? "출고 수정" : "출고 등록"}</DialogTitle>
            <DialogDescription>
              {editingRecord ? "출고 내역을 수정합니다." : "새로운 자재 출고 내역을 등록합니다."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>출고일 *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="justify-start text-left font-normal"
                      data-testid="button-outgoing-date"
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
                <Label>구분 (팀) *</Label>
                <Select
                  value={formData.teamCategory}
                  onValueChange={(value) => setFormData({ ...formData, teamCategory: value })}
                >
                  <SelectTrigger data-testid="select-outgoing-team">
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
            </div>
            <div className="grid gap-2">
              <Label>공사명 *</Label>
              <Input
                value={formData.projectName}
                onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                placeholder="예: 효자동 2가 함체교체"
                data-testid="input-outgoing-project"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>품명 *</Label>
                <Input
                  value={formData.productName}
                  onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                  placeholder="예: 광접속함체 돔형"
                  data-testid="input-outgoing-product"
                />
              </div>
              <div className="grid gap-2">
                <Label>규격 *</Label>
                <Input
                  value={formData.specification}
                  onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                  placeholder="예: 가공 96C"
                  data-testid="input-outgoing-spec"
                />
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
                  data-testid="input-outgoing-quantity"
                />
              </div>
              <div className="grid gap-2">
                <Label>수령인 *</Label>
                <Input
                  value={formData.recipient}
                  onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                  placeholder="예: 홍길동"
                  data-testid="input-outgoing-recipient"
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
              data-testid="button-submit-outgoing"
            >
              {(createMutation.isPending || updateMutation.isPending) ? "처리 중..." : editingRecord ? "수정" : "등록"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteRecord} onOpenChange={(open) => !open && setDeleteRecord(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>출고 내역 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 출고 내역을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
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
              선택한 {selectedIds.size}개의 출고 내역을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
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
