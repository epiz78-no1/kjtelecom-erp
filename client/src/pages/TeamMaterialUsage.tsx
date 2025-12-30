import { useState, useMemo, useEffect } from "react";
import { Search, Loader2, Trash2, Plus, Calendar, Pencil, MoreHorizontal, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { exportToExcel } from "@/lib/excel";
import { useToast } from "@/hooks/use-toast";
import type { MaterialUsageRecord, InventoryItem, OutgoingRecord } from "@shared/schema";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InventoryItemSelector } from "@/components/InventoryItemSelector";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useAppContext } from "@/contexts/AppContext";

const teamCategories = ["접속팀", "외선팀", "유지보수팀", "설치팀"];

export default function TeamMaterialUsage() {
  const { toast } = useToast();
  const { user, tenants, currentTenant, checkPermission, divisions, teams } = useAppContext();

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Permissions
  const canWrite = checkPermission("usage", "write");
  // const canRegister = canWrite || checkPermission("usage", "own_only");
  const canRegister = true; // Everyone can register usage
  const isOwnOnly = !canWrite; // If not admin/write, then own only mode logic applies for suggestions

  // Filter outgoing records for suggestion: Admin sees all, OwnOnly sees received by me
  const { data: outgoingRecords = [] } = useQuery<OutgoingRecord[]>({
    queryKey: ["/api/outgoing"],
  });


  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaterialUsageRecord | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<MaterialUsageRecord | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [formData, setFormData] = useState({
    division: "SKT",
    category: "",
    teamCategory: "",
    projectName: "",
    productName: "",
    specification: "",
    quantity: "",
    recipient: "",
    type: "general",
    drumNumber: "",
    inventoryItemId: undefined as number | undefined
  });

  const { data: members = [], refetch: refetchMembers } = useQuery<any[]>({
    queryKey: ["/api/members/basic"],
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (dialogOpen) {
      refetchMembers();
    }
  }, [dialogOpen, refetchMembers]);

  const { data: records = [], isLoading } = useQuery<MaterialUsageRecord[]>({
    queryKey: ["/api/material-usage"],
  });

  const { data: inventoryItems = [] } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(
      inventoryItems
        .map(item => item.category)
        .filter(c => c && c.trim() !== '')
    );
    return Array.from(cats).sort();
  }, [inventoryItems]);

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

  const teamInventory = useMemo(() => {
    if (!formData.teamCategory) return [];

    // RESOLVE CATEGORY: Map the selected "Team Name" (from Input) to "Team Category" (for Stock Check)
    let targetCategory = formData.teamCategory;
    const selectedTeam = teams.find(t => t.name === formData.teamCategory);
    if (selectedTeam) {
      targetCategory = selectedTeam.teamCategory;
    }

    // Filter Outgoing (sent to Category)
    const teamOutgoing = outgoingRecords.filter(r => r.teamCategory === targetCategory);
    if (teamOutgoing.length === 0) return [];

    // Group by Item Key (InventoryID or Name+Spec)
    const inventoryMap = new Map<string, {
      id: string; // Key
      inventoryItemId?: number;
      productName: string;
      specification: string;
      division: string;
      category: string;
      type: string;
      received: number;
      used: number;
    }>();

    // Sum Received
    teamOutgoing.forEach(r => {
      const key = r.inventoryItemId ? `ID:${r.inventoryItemId}` : `${r.productName}|${r.specification}`;
      if (!inventoryMap.has(key)) {
        inventoryMap.set(key, {
          id: key,
          inventoryItemId: r.inventoryItemId || undefined,
          productName: r.productName,
          specification: r.specification,
          division: r.division,
          category: r.category,
          type: r.type || "general",
          received: 0,
          used: 0
        });
      }
      inventoryMap.get(key)!.received += r.quantity;
    });

    // Sum Used (from local records) -- AGGREGATE by Category
    // We must count usage from ALL teams that belong to `targetCategory`.
    const teamUsage = records.filter(r => {
      // 1. Direct match (record has "Category" stored)
      if (r.teamCategory === targetCategory) return true;

      // 2. Name match (record has "Team Name" stored, but that team belongs to targetCategory)
      const rTeam = teams.find(t => t.name === r.teamCategory);
      return rTeam && rTeam.teamCategory === targetCategory;
    });

    teamUsage.forEach(r => {
      // Find matching item in inventoryMap
      // Priority 1: Match by ID
      // Priority 2: Match by Name + Spec
      for (const item of Array.from(inventoryMap.values())) {
        const matchById = r.inventoryItemId && item.inventoryItemId && r.inventoryItemId === item.inventoryItemId;
        const matchByName = r.productName === item.productName && (r.specification || "") === (item.specification || "");

        if (matchById || matchByName) {
          item.used += r.quantity;
          break; // Assume one usage record affects one inventory item type
        }
      }
    });

    // Return items with remaining > 0
    return Array.from(inventoryMap.values())
      .map(item => ({ ...item, remaining: item.received - item.used }))
      .filter(item => item.remaining > 0);
  }, [outgoingRecords, records, formData.teamCategory, teams]);

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

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch("/templates/material_usage_template.xlsx");
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "자재사용내역_템플릿.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast({ title: "템플릿이 다운로드되었습니다" });
    } catch (error) {
      toast({ title: "다운로드 실패", variant: "destructive" });
    }
  };

  const handleExportExcel = () => {
    const dataToExport = filteredRecords.map(record => ({
      "사용일": record.date,
      "구분": record.category,
      "팀": record.teamCategory,
      "공사명": record.projectName,
      "품명": record.productName,
      "규격": record.specification,
      "수량": record.quantity,
      "사용자": record.recipient
    }));

    exportToExcel(dataToExport, "팀자재사용내역");
  };

  const categoryFiltered = selectedCategory === "all"
    ? records
    : records.filter((record) => record.category === selectedCategory);

  // Filter based on permissions
  const permissionFiltered = isOwnOnly
    ? categoryFiltered.filter(r => r.recipient === user?.name)
    : categoryFiltered;

  const filteredRecords = permissionFiltered.filter(
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

    // Auto-fill for members
    let defaultDivision = "SKT";
    let defaultTeam = "";
    let defaultRecipient = "";

    // Auto-fill logic for all users
    if (user && tenants) {
      const tenantInfo = tenants.find(t => t.id === currentTenant);
      if (tenantInfo) {
        // Find division name by ID
        if (tenantInfo.divisionId) {
          const divName = divisions.find(d => d.id === tenantInfo.divisionId)?.name;
          if (divName) defaultDivision = divName;
        }
        // Find team category by team ID
        if (tenantInfo.teamId) {
          const team = teams.find(t => t.id === tenantInfo.teamId);
          if (team) {
            defaultTeam = team.name;
            defaultRecipient = user.name || "";
          }
        }
      }
    }

    setFormData({
      division: defaultDivision,
      category: "",
      teamCategory: defaultTeam,
      projectName: "",
      productName: "",
      specification: "",
      quantity: "",
      recipient: defaultRecipient,
      type: "general",
      drumNumber: "",
      inventoryItemId: undefined
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
      division: "SKT",
      category: "",
      teamCategory: "접속팀",
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

    // Auto-detect division from inventory if not explicitly set (preserves previous logic, adds safety)
    // Find matching inventory item to ensure we use the correct division
    const matchingItem = inventoryItems.find(
      i => i.productName === formData.productName &&
        (i.specification || "") === (formData.specification || "")
    );

    const correctDivision = matchingItem ? matchingItem.division : formData.division;

    const data = {
      date: format(selectedDate, "yyyy-MM-dd"),
      division: correctDivision,
      category: formData.category,
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
              자재 사용내역
            </h1>
            <p className="text-muted-foreground">현장팀 자재 사용 이력을 조회합니다</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">

            <div className="w-[180px]">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger data-testid="select-category">
                  <SelectValue placeholder="구분 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {canWrite && (
              <>
                <Button variant="outline" onClick={handleDownloadTemplate} data-testid="button-download-template">
                  <Download className="h-4 w-4 mr-2" />
                  템플릿 다운로드
                </Button>
                <Button
                  variant="outline"
                  className="border-green-600 text-green-600 hover:bg-green-50"
                  onClick={handleExportExcel}
                >
                  <Download className="h-4 w-4 mr-2" />
                  엑셀 다운로드
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      등록
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={openAddDialog} data-testid="button-add-usage">
                      <Pencil className="mr-2 h-4 w-4" />
                      수동 등록
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { /* open bulk upload dialog */ }}>
                      <Upload className="mr-2 h-4 w-4" />
                      일괄 등록 (Excel)
                    </DropdownMenuItem>
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
                placeholder="품명, 공사명, 규격, 수령인 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            {selectedIds.size > 0 && canWrite && (
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

      <div className="flex-1 rounded-md border overflow-hidden">
        <div className="h-full overflow-auto relative">
          <table className="w-full caption-bottom text-sm">
            <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
              <TableRow className="h-9">
                <TableHead className="w-[40px] text-center align-middle bg-background">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleSelectAll}
                    data-testid="checkbox-select-all"
                  />
                </TableHead>
                <TableHead className="font-semibold w-[100px] text-center align-middle bg-background">사용일</TableHead>
                <TableHead className="font-semibold w-[80px] text-center align-middle bg-background">구분</TableHead>
                <TableHead className="font-semibold w-[80px] text-center align-middle bg-background">팀</TableHead>
                <TableHead className="font-semibold w-[200px] text-center align-middle bg-background">공사명</TableHead>
                <TableHead className="font-semibold w-[120px] text-center align-middle bg-background">품명</TableHead>
                <TableHead className="font-semibold w-[120px] text-center align-middle bg-background">규격</TableHead>
                <TableHead className="font-semibold w-[70px] text-center align-middle bg-background">수량</TableHead>
                <TableHead className="font-semibold w-[80px] text-center align-middle bg-background">사용자</TableHead>
                <TableHead className="font-semibold w-[70px] text-center align-middle bg-background"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((record) => (
                <TableRow key={record.id} className="h-9" data-testid={`row-usage-${record.id}`}>
                  <TableCell className="text-center align-middle">
                    <Checkbox
                      checked={selectedIds.has(record.id)}
                      onCheckedChange={() => toggleSelect(record.id)}
                      data-testid={`checkbox-${record.id}`}
                    />
                  </TableCell>
                  <TableCell className="text-center align-middle whitespace-nowrap">{record.date}</TableCell>

                  <TableCell className="text-center align-middle whitespace-nowrap">{record.category}</TableCell>
                  <TableCell className="text-center align-middle whitespace-nowrap">{record.teamCategory}</TableCell>
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
                          <DropdownMenuLabel>사용 관리</DropdownMenuLabel>
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
                    사용 내역이 없습니다
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
            <DialogTitle>{editingRecord ? "사용 내역 수정" : "사용 내역 등록"}</DialogTitle>
            <DialogDescription>
              {editingRecord ? "자재 사용 내역을 수정합니다." : "새로운 자재 사용 내역을 등록합니다."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>사용일 *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="justify-start text-left font-normal px-3"
                      data-testid="button-usage-date"
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
                <Label>사용팀 *</Label>
                <Select
                  value={formData.teamCategory}
                  onValueChange={(value) => {
                    setFormData({ ...formData, teamCategory: value, recipient: "" }); // Reset recipient on team change
                  }}
                  disabled={!canWrite} // Enabled only if user has 'write' permission
                >
                  <SelectTrigger data-testid="select-usage-team">
                    <SelectValue placeholder="팀 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.name}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>사용자 *</Label>
                <Select
                  value={formData.recipient}
                  onValueChange={(value) => setFormData({ ...formData, recipient: value })}
                  disabled={!formData.teamCategory || !canWrite} // Enabled only if team is selected AND user has 'write' permission
                >
                  <SelectTrigger data-testid="select-usage-recipient">
                    <SelectValue placeholder={formData.teamCategory ? "사용자 선택" : "팀 선택 필요"} />
                  </SelectTrigger>
                  <SelectContent>
                    {members
                      .filter((m: any) => {
                        if (!formData.teamCategory) return false;
                        const selectedTeam = teams.find(t => t.name === formData.teamCategory);
                        return selectedTeam && m.teamId === selectedTeam.id;
                      })
                      .map((member: any) => (
                        <SelectItem key={member.id} value={member.name}>
                          {member.name} ({member.username})
                        </SelectItem>
                      ))}
                    {members.filter((m: any) => {
                      const t = teams.find(tm => tm.name === formData.teamCategory);
                      return t && m.teamId === t.id;
                    }).length === 0 && (
                        <SelectItem value="none" disabled>팀원 없음</SelectItem>
                      )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2 border p-3 rounded-md bg-muted/20">
              <Label>보유 자재 선택</Label>
              <Select
                disabled={!formData.teamCategory}
                onValueChange={(key) => {
                  const item = teamInventory.find(i => i.id === key);
                  if (item) {
                    setFormData({
                      ...formData,
                      division: item.division,
                      category: item.category,
                      productName: item.productName,
                      specification: item.specification,
                      type: item.type,
                      inventoryItemId: item.inventoryItemId,
                      quantity: ""
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={formData.teamCategory ? "보유 자재 선택..." : "팀을 먼저 선택하세요"} />
                </SelectTrigger>
                <SelectContent>
                  {teamInventory.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.productName} ({item.specification}) - 잔여: {item.remaining.toLocaleString()}
                    </SelectItem>
                  ))}
                  {teamInventory.length === 0 && (
                    <SelectItem value="none" disabled>보유 자재 없음</SelectItem>
                  )}
                </SelectContent>
              </Select>
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



            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">수량 *</Label>
              <div className="col-span-3">
                <Input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="10"
                  data-testid="input-usage-quantity"
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
