import { useState, useMemo } from "react";
import { Plus, Calendar, Search, Loader2, Pencil, Trash2, Upload, Download, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { OutgoingRecord, InventoryItem } from "@shared/schema";
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
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { OutgoingBulkUploadDialog } from "@/components/OutgoingBulkUploadDialog";
import { useAppContext } from "@/contexts/AppContext";
import { InventoryItemSelector } from "@/components/InventoryItemSelector";

const teamCategories = ["접속팀", "외선팀", "유지보수팀", "설치팀"];

export default function OutgoingRecords() {
  const { toast } = useToast();
  const { user, checkPermission, tenants, currentTenant } = useAppContext();
  const isAdmin = tenants.find(t => t.id === currentTenant)?.role === 'admin' || tenants.find(t => t.id === currentTenant)?.role === 'owner';

  const [searchQuery, setSearchQuery] = useState("");

  // Permissions
  const canWrite = checkPermission("outgoing", "write");
  const isOwnOnly = !canWrite && checkPermission("outgoing", "own_only");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<OutgoingRecord | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<OutgoingRecord | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    division: "SKT",
    category: "",
    teamCategory: "외선팀",
    projectName: "",
    productName: "",
    specification: "",
    quantity: "",
    recipient: user?.name || "",
    type: "general",
    drumNumber: "",
    inventoryItemId: undefined as number | undefined,
  });

  const { data: records = [], isLoading } = useQuery<OutgoingRecord[]>({
    queryKey: ["/api/outgoing"],
  });

  const { data: inventoryItems = [] } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  // Fetch members for recipient selection
  const { data: members = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/members"],
    retry: false, // Don't retry if user doesn't have admin access
  });

  // Fetch teams for recipient selection
  const { data: teams = [] } = useQuery<any[]>({
    queryKey: ["/api/teams"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<OutgoingRecord, "id" | "tenantId">) => {
      return apiRequest("POST", "/api/outgoing", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/outgoing"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({ title: "출고가 등록되었습니다" });
      closeDialog();
    },
    onError: () => {
      toast({ title: "등록 실패", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Omit<OutgoingRecord, "tenantId">) => {
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

  // Filter based on permissions
  const permissionFiltered = isOwnOnly
    ? records.filter(r => r.recipient === user?.name)
    : records;

  const filteredRecords = permissionFiltered.filter(
    (record) =>
      record.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.recipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.teamCategory.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.specification.toLowerCase().includes(searchQuery.toLowerCase())
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
    setFormData({
      date: new Date().toISOString().split("T")[0],
      division: "SKT",
      category: "",
      teamCategory: "외선팀",
      projectName: "",
      productName: "",
      specification: "",
      quantity: "",
      recipient: user?.name || "",
      type: "general",
      drumNumber: "",
      inventoryItemId: undefined
    });
    setSelectedDate(new Date());
    setDialogOpen(true);
  };

  const openEditDialog = (record: OutgoingRecord) => {
    setEditingRecord(record);
    let drumNo = "";
    try {
      const attrs = JSON.parse(record.attributes || "{}");
      drumNo = attrs.drumNumber || "";
    } catch (e) { }

    setFormData({
      date: record.date,
      division: record.division,
      category: record.category || "",
      teamCategory: record.teamCategory,
      projectName: record.projectName,
      productName: record.productName,
      specification: record.specification,
      quantity: record.quantity.toString(),
      recipient: record.recipient,
      type: record.type || "general",
      drumNumber: drumNo,
      inventoryItemId: record.inventoryItemId || undefined
    });
    setSelectedDate(new Date(record.date));
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingRecord(null);
    setFormData({
      date: new Date().toISOString().split("T")[0],
      division: "SKT",
      category: "",
      teamCategory: "외선팀",
      projectName: "",
      productName: "",
      specification: "",
      quantity: "",
      recipient: user?.name || "",
      type: "general",
      drumNumber: "",
      inventoryItemId: undefined
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
      category: formData.category,
      teamCategory: formData.teamCategory,
      projectName: formData.projectName,
      productName: formData.productName,
      specification: formData.specification,
      quantity: parseInt(formData.quantity) || 0,
      recipient: formData.recipient,
      type: formData.type,
      attributes: attributes,
      inventoryItemId: formData.inventoryItemId
    };

    if (editingRecord) {
      updateMutation.mutate({ ...data, id: editingRecord.id } as Omit<OutgoingRecord, "tenantId">);
    } else {
      createMutation.mutate(data as Omit<OutgoingRecord, "id" | "tenantId">);
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

  const handleBulkUpload = async (items: any[]) => {
    try {
      for (const item of items) {
        await createMutation.mutateAsync(item);
      }
      toast({ title: `${items.length}건의 출고내역이 등록되었습니다` });
      setBulkUploadOpen(false);
    } catch (error) {
      toast({ title: "일괄등록 실패", variant: "destructive" });
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch("/api/templates/outgoing");
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "outgoing_template.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast({ title: "템플릿이 다운로드되었습니다" });
    } catch (error) {
      toast({ title: "다운로드 실패", variant: "destructive" });
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
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 space-y-4 pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">출고 내역</h1>
            <p className="text-muted-foreground">자재 출고 이력을 조회하고 관리합니다</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canWrite ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button data-testid="button-add-outgoing-menu">
                    <Plus className="h-4 w-4 mr-2" />
                    출고 등록
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={openAddDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    출고 직접 등록
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
              <TableHead className="font-semibold w-[100px] text-center align-middle bg-background">출고일</TableHead>

              <TableHead className="font-semibold w-[80px] text-center align-middle bg-background">구분</TableHead>
              <TableHead className="font-semibold w-[200px] text-center align-middle bg-background">공사명</TableHead>
              <TableHead className="font-semibold w-[120px] text-center align-middle bg-background">품명</TableHead>
              <TableHead className="font-semibold w-[120px] text-center align-middle bg-background">규격</TableHead>
              <TableHead className="font-semibold w-[70px] text-center align-middle bg-background">수량</TableHead>
              <TableHead className="font-semibold w-[80px] text-center align-middle bg-background">수령인</TableHead>
              <TableHead className="font-semibold w-[70px] text-center align-middle bg-background"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRecords.map((record) => (
              <TableRow key={record.id} className="h-11" data-testid={`row-outgoing-${record.id}`}>
                <TableCell className="text-center align-middle">
                  <Checkbox
                    checked={selectedIds.has(record.id)}
                    onCheckedChange={() => toggleSelect(record.id)}
                    data-testid={`checkbox-${record.id}`}
                  />
                </TableCell>
                <TableCell className="text-center align-middle whitespace-nowrap">{record.date}</TableCell>

                <TableCell className="text-center align-middle whitespace-nowrap">{record.category}</TableCell>
                <TableCell className="text-center align-middle max-w-[200px] truncate">{record.projectName}</TableCell>
                <TableCell className="text-center align-middle whitespace-nowrap">{record.productName}</TableCell>
                <TableCell className="text-center align-middle max-w-[120px] truncate">{record.specification}</TableCell>
                <TableCell className="text-center align-middle font-medium whitespace-nowrap">{record.quantity.toLocaleString()}</TableCell>
                <TableCell className="text-center align-middle whitespace-nowrap">{record.recipient}</TableCell>
                <TableCell className="text-center align-middle">
                  {canWrite && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>출고 관리</DropdownMenuLabel>
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
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>출고일 *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="justify-start text-left font-normal px-3"
                      data-testid="button-outgoing-date"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "yyyy-MM-dd") : "날짜 선택"}
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
                <Label>수령 팀 *</Label>
                <Select
                  value={formData.teamCategory}
                  onValueChange={(value) => {
                    const team = teams.find((t: any) => t.name === value);
                    setFormData({
                      ...formData,
                      teamCategory: value,
                      recipient: "" // Reset recipient using new team
                    });
                  }}
                >
                  <SelectTrigger data-testid="select-outgoing-team">
                    <SelectValue placeholder="팀 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team: any) => (
                      <SelectItem key={team.id} value={team.name}>
                        {team.name}
                      </SelectItem>
                    ))}
                    {teams.length === 0 && (
                      <SelectItem value="설치팀" disabled>팀 데이터 없음</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>수령인 *</Label>
                <Select
                  value={formData.recipient}
                  onValueChange={(value) => setFormData({ ...formData, recipient: value })}
                  disabled={!formData.teamCategory}
                >
                  <SelectTrigger data-testid="select-outgoing-recipient">
                    <SelectValue placeholder={formData.teamCategory ? "수령인 선택" : "팀을 먼저 선택하세요"} />
                  </SelectTrigger>
                  <SelectContent>
                    {members
                      .filter((m: any) => {
                        if (!formData.teamCategory) return false;
                        const selectedTeam = teams.find((t: any) => t.name === formData.teamCategory);
                        return selectedTeam && m.teamId === selectedTeam.id;
                      })
                      .map((member: any) => (
                        <SelectItem key={member.id} value={member.name}>
                          {member.name} ({member.username})
                        </SelectItem>
                      ))}
                    {members.filter((m: any) => {
                      if (!formData.teamCategory) return false;
                      const selectedTeam = teams.find((t: any) => t.name === formData.teamCategory);
                      return selectedTeam && m.teamId === selectedTeam.id;
                    }).length === 0 && (
                        <SelectItem value="none" disabled>팀원 없음</SelectItem>
                      )}
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

            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">품목 선택</Label>
              <div className="col-span-3">
                <InventoryItemSelector
                  value={formData.inventoryItemId}
                  onChange={(id, item) => {
                    setFormData({
                      ...formData,
                      inventoryItemId: id,
                      productName: item.productName,
                      specification: item.specification,
                      division: item.division,
                      category: item.category,
                    });
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">수량 *</Label>
              <div className="col-span-3">
                <Input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="10"
                  data-testid="input-outgoing-quantity"
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

      <OutgoingBulkUploadDialog
        open={bulkUploadOpen}
        onOpenChange={setBulkUploadOpen}
        onUpload={handleBulkUpload}
      />
    </div >
  );
}
