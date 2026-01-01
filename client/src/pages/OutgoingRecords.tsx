import { Plus, Calendar, Search, Loader2, Pencil, Trash2, Upload, Download, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { exportToExcel } from "@/lib/excel";
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
import { useColumnResize } from "@/hooks/useColumnResize";

const teamCategories = ["접속팀", "외선팀", "유지보수팀", "설치팀"];

export default function OutgoingRecords() {
  const { toast } = useToast();
  const { user, checkPermission, tenants, currentTenant } = useAppContext();
  const isAdmin = tenants.find(t => t.id === currentTenant)?.role === 'admin' || tenants.find(t => t.id === currentTenant)?.role === 'owner';
  const isTenantOwner = tenants.find(t => t.id === currentTenant)?.role === 'owner';

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

  const { widths, startResizing } = useColumnResize({
    checkbox: 40,
    date: 100,
    division: 80,
    category: 80,
    teamCategory: 100,
    projectName: 200,
    productName: 120,
    specification: 120,
    itemCategory: 100,
    itemDivision: 80,
    quantity: 80,
    recipient: 100,
    remark: 150,
    attachment: 60,
    attributes: 150,
    actions: 60,
  });
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    division: "SKT",
    category: "",
    teamCategory: "외선팀",
    teamId: undefined as string | undefined,
    projectName: "",
    productName: "",
    specification: "",
    quantity: "",
    recipient: user?.name || "",
    inventoryItemId: undefined as number | undefined,
    remark: "",
    attachment: null as { name: string; data: string } | null,
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
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({ title: "출고가 등록되었습니다" });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "등록 실패";
      toast({
        title: "등록 실패",
        description: errorMessage,
        variant: "destructive"
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Omit<OutgoingRecord, "tenantId">) => {
      return apiRequest("PATCH", `/api/outgoing/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/outgoing"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({ title: "출고가 수정되었습니다" });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "수정 실패";
      toast({
        title: "수정 실패",
        description: errorMessage,
        variant: "destructive"
      });
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
      teamId: undefined,
      projectName: "",
      productName: "",
      specification: "",
      quantity: "",
      recipient: user?.name || "",
      inventoryItemId: undefined,
      remark: "",
      attachment: null
    });
    setSelectedDate(new Date());
    setDialogOpen(true);
  };

  const openEditDialog = (record: OutgoingRecord) => {
    setEditingRecord(record);

    let attachment = null;
    try {
      const attrs = record.attributes ? JSON.parse(record.attributes) : {};
      if (attrs.attachment) {
        attachment = attrs.attachment;
      }
    } catch (e) {
      console.error("Failed to parse attributes for attachment:", e);
    }

    setFormData({
      date: record.date,
      division: record.division,
      category: record.category || "",
      teamCategory: record.teamCategory,
      teamId: record.teamId || undefined,
      projectName: record.projectName,
      productName: record.productName,
      specification: record.specification,
      quantity: record.quantity.toString(),
      recipient: record.recipient,
      inventoryItemId: record.inventoryItemId || undefined,
      remark: record.remark || "",
      attachment: attachment
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
      teamId: undefined,
      projectName: "",
      productName: "",
      specification: "",
      quantity: "",
      recipient: user?.name || "",
      inventoryItemId: undefined,
      remark: "",
      attachment: null
    });
    setSelectedDate(new Date());
  };

  const handleSubmit = async () => {
    if (!selectedDate || !formData.teamCategory || !formData.productName || !formData.quantity || !formData.recipient) {
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
      teamCategory: formData.teamCategory,
      teamId: formData.teamId,
      projectName: formData.projectName,
      productName: formData.productName,
      specification: formData.specification,
      quantity: parseInt(formData.quantity) || 0,
      recipient: formData.recipient,
      type: "general",
      attributes: attributes,
      remark: formData.remark,
      inventoryItemId: formData.inventoryItemId
    };

    closeDialog();
    toast({ title: "등록중입니다", description: "잠시만 기다려주세요." });

    try {
      if (editingRecord) {
        await updateMutation.mutateAsync({ ...data, id: editingRecord.id } as Omit<OutgoingRecord, "tenantId">);
      } else {
        await createMutation.mutateAsync(data as Omit<OutgoingRecord, "id" | "tenantId">);
      }
    } catch (error) {
      // Error handled elsewhere
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



  const handleExportExcel = () => {
    const dataToExport = filteredRecords.map(record => ({
      "출고일": record.date,
      "구분": record.category,
      "공사명": record.projectName,
      "품명": record.productName,
      "규격": record.specification,
      "수량": record.quantity,
      "수령인": record.recipient
    }));

    exportToExcel(dataToExport, "출고내역");
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
                    <Button data-testid="button-add-outgoing-menu">
                      <Plus className="h-4 w-4 mr-2" />
                      출고 등록
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
                placeholder="품명, 공사명, 수령인 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-outgoing"
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
                  출고일
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                    onMouseDown={(e) => startResizing("date", e)}
                  />
                </TableHead>

                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.category }}>
                  구분
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                    onMouseDown={(e) => startResizing("category", e)}
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
                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.recipient }}>
                  수령인
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                    onMouseDown={(e) => startResizing("recipient", e)}
                  />
                </TableHead>
                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.remark }}>
                  비고
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                    onMouseDown={(e) => startResizing("remark", e)}
                  />
                </TableHead>
                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.attachment }}>
                  첨부
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                    onMouseDown={(e) => startResizing("attachment", e)}
                  />
                </TableHead>
                <TableHead className="font-semibold text-center align-middle bg-background" style={{ width: widths.actions }}></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((record) => (
                <TableRow key={record.id} className="h-8 [&_td]:py-1" data-testid={`row-outgoing-${record.id}`}>
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

                  <TableCell className="text-center align-middle whitespace-nowrap">{record.category}</TableCell>
                  <TableCell className="text-center align-middle max-w-[200px] truncate">{record.projectName}</TableCell>
                  <TableCell className="text-center align-middle whitespace-nowrap">{record.productName}</TableCell>
                  <TableCell className="text-center align-middle max-w-[120px] truncate">{record.specification}</TableCell>
                  <TableCell className="text-center align-middle font-medium whitespace-nowrap">{record.quantity.toLocaleString()}</TableCell>
                  <TableCell className="text-center align-middle whitespace-nowrap">{record.recipient}</TableCell>
                  <TableCell className="text-center align-middle max-w-[150px] truncate" title={record.remark || ""}>{record.remark}</TableCell>
                  <TableCell className="text-center align-middle">
                    {(() => {
                      try {
                        const attrs = record.attributes ? JSON.parse(record.attributes) : {};
                        if (attrs.attachment) {
                          return (
                            <a
                              href={attrs.attachment.data}
                              download={attrs.attachment.name}
                              className="inline-flex items-center justify-center text-primary hover:text-primary/80"
                              title={attrs.attachment.name}
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          );
                        }
                      } catch (e) {
                        return null;
                      }
                      return null;
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
          </table>
        </div>
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
                      teamId: team?.id,
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
                  placeholder="수량 입력"
                  data-testid="input-outgoing-quantity"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">비고</Label>
              <div className="col-span-3">
                <Input
                  value={formData.remark}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                  placeholder="참고 사항 입력"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">첨부파일</Label>
              <div className="col-span-3 space-y-2">
                <div className="relative">
                  <input
                    type="file"
                    id="outgoing-file-upload"
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
                    htmlFor="outgoing-file-upload"
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
