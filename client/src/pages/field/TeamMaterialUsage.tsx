import { useState, useMemo, useEffect, useRef } from "react";
import { Search, Loader2, Trash2, Plus, Calendar, Pencil, MoreHorizontal, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { exportToExcel } from "@/lib/excel";
import { useToast } from "@/hooks/use-toast";
import { compressImage, formatFileSize } from "@/lib/imageCompression";

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
  const isTenantOwner = tenants.find(t => t.id === currentTenant)?.role === 'owner';

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());



  // Permissions
  const canWrite = checkPermission("usage", "write");

  // 현장팀 권한 체크: usage만 write이고 나머지가 모두 none인 경우
  const currentTenantData = tenants.find(t => t.id === currentTenant);
  const isFieldTeam = currentTenantData?.permissions &&
    currentTenantData.permissions.usage === 'write' &&
    currentTenantData.permissions.incoming === 'none' &&
    currentTenantData.permissions.outgoing === 'none' &&
    currentTenantData.permissions.inventory === 'none';

  // 엑셀 다운로드 및 전체 관리 권한 (현장팀 제외)
  const canManage = canWrite && !isFieldTeam;

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
    teamId: undefined as string | undefined,
    projectName: "",
    productName: "",
    specification: "",
    quantity: "",
    recipient: "",
    type: "general",
    drumNumber: "",
    inventoryItemId: undefined as number | undefined,
    remark: "",
    attachment: null as { name: string, data: string, size?: number, type?: string } | null,
    // 다중 품목 지원
    items: [{
      id: Date.now().toString(),
      category: "",
      productName: "",
      specification: "",
      quantity: "",
      inventoryItemId: undefined as number | undefined,
      remark: ""
    }] as Array<{
      id: string;
      category: string;
      productName: string;
      specification: string;
      quantity: string;
      inventoryItemId?: number;
      remark: string;
    }>
  });

  const lastItemRef = useRef<HTMLDivElement>(null);

  // Auto scroll when items added
  useEffect(() => {
    if (formData.items && formData.items.length > 1) {
      setTimeout(() => {
        lastItemRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 100);
    }
  }, [formData.items?.length]);

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

    // Filter Outgoing (sent to this specific Team)
    const teamOutgoing = outgoingRecords.filter(r => r.teamCategory === formData.teamCategory);

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

    // Sum Used (from local records) -- Filter usage by THIS Team
    const teamUsage = records.filter(r => r.teamCategory === formData.teamCategory);

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
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({ title: "사용 내역이 등록되었습니다" });
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
    mutationFn: async ({ id, ...data }: Omit<MaterialUsageRecord, "tenantId">) => {
      return apiRequest("PATCH", `/api/material-usage/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/material-usage"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({ title: "사용 내역이 수정되었습니다" });
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



  const handleExportExcel = () => {
    const dataToExport = filteredRecords.map(record => ({
      "사용일": record.date,
      "사업": record.category,
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
      teamId: undefined,
      projectName: "",
      productName: "",
      specification: "",
      quantity: "",
      recipient: defaultRecipient,
      type: "general",
      drumNumber: "",
      inventoryItemId: undefined,
      remark: "",
      attachment: null,
      items: [{
        id: Date.now().toString(),
        category: "",
        productName: "",
        specification: "",
        quantity: "",
        inventoryItemId: undefined,
        remark: ""
      }]
    });
    setSelectedDate(new Date());
    setDialogOpen(true);
  };

  const openEditDialog = (record: MaterialUsageRecord) => {
    setEditingRecord(record);
    // let drumNo = "";
    // try {
    //   const attrs = JSON.parse(record.attributes || "{}");
    //   drumNo = attrs.drumNumber || "";
    // } catch (e) { }

    setFormData({
      division: record.division,
      category: record.category || "",
      teamCategory: record.teamCategory,
      teamId: record.teamId || undefined,
      projectName: record.projectName,
      productName: record.productName,
      specification: record.specification,
      quantity: record.quantity.toString(),
      recipient: record.recipient,
      type: "general",
      drumNumber: "",
      inventoryItemId: record.inventoryItemId || undefined,
      remark: record.remark || "",
      attachment: null,
      items: [{
        id: Date.now().toString(),
        category: record.category || "",
        productName: record.productName,
        specification: record.specification,
        quantity: record.quantity.toString(),
        inventoryItemId: record.inventoryItemId || undefined,
        remark: record.remark || ""
      }]
    });

    try {
      if (record.attributes) {
        const attrs = JSON.parse(record.attributes);
        if (attrs.attachment) {
          setFormData(prev => ({ ...prev, attachment: attrs.attachment }));
        }
      }
    } catch (e) {
      console.error("Failed to parse attributes needed for attachment", e);
    }
    setSelectedDate(new Date(record.date));
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingRecord(null);
    setFormData({
      division: "SKT",
      category: "",
      teamCategory: "",
      teamId: undefined,
      projectName: "",
      productName: "",
      specification: "",
      quantity: "",
      recipient: "",
      type: "general",
      drumNumber: "",
      inventoryItemId: undefined,
      remark: "",
      attachment: null,
      items: [{
        id: Date.now().toString(),
        category: "",
        productName: "",
        specification: "",
        quantity: "",
        inventoryItemId: undefined,
        remark: ""
      }]
    });
    setSelectedDate(new Date());
  };

  const handleSubmit = async () => {
    if (!selectedDate || !formData.teamCategory || !formData.recipient) {
      toast({ title: "필수 항목 누락", description: "날짜, 팀, 사용자는 필수입니다.", variant: "destructive" });
      return;
    }

    // 유효한 아이템 필터링 (자재가 선택되고 수량이 있는 것)
    const validItems = formData.items.filter(item => item.inventoryItemId && item.quantity);

    if (validItems.length === 0) {
      toast({ title: "품목 누락", description: "최소 하나의 유효한 품목(자재 및 수량)을 입력해주세요.", variant: "destructive" });
      return;
    }

    // 수정 모드: 기존 항목 수정 (items[0] 사용)
    if (editingRecord) {
      const item = validItems[0];
      const attributesObj: any = {};

      // 수정 시 첨부파일 변경이 있으면 처리 (formData.attachment가 null이면 기존 유지? 로직 확인 필요하지만 일단 기존대로)
      if (formData.attachment) {
        attributesObj.attachment = formData.attachment;
      } else if (editingRecord.attributes) {
        // 기존 첨부파일 유지하려면 로직이 복잡해질 수 있음. 
        // 기존 로직: setFormData 시 attachment를 null로 초기화하고, 속성 파싱해서 넣었음.
        // 여기선 formData.attachment가 있으면 덮어쓰고, 없으면 안 보냄 (또는 null).
        // 기존 처리를 따름.
      }

      const data = {
        date: format(selectedDate, "yyyy-MM-dd"),
        division: "SKT",
        category: item.category,
        teamCategory: formData.teamCategory,
        projectName: formData.projectName,
        productName: item.productName,
        specification: item.specification,
        quantity: parseInt(item.quantity) || 0,
        recipient: formData.recipient,
        type: "general",
        attributes: JSON.stringify(attributesObj),
        remark: item.remark,
        inventoryItemId: item.inventoryItemId
      };

      closeDialog();
      toast({ title: "수정중입니다", description: "잠시만 기다려주세요." });
      try {
        await updateMutation.mutateAsync({ ...data, id: editingRecord.id } as Omit<MaterialUsageRecord, "tenantId">);
      } catch (e) {
        // Error handled in onError
      }
      return;
    }

    // 등록 모드: 다중 저장 (직접 API 호출)
    try {
      closeDialog();
      toast({ title: "등록중입니다", description: `${validItems.length}건의 자재 사용 등록을 진행합니다.` });

      let successCount = 0;

      for (let i = 0; i < validItems.length; i++) {
        const item = validItems[i];
        const attributesObj: any = {};
        // 첫 번째 아이템에만 첨부파일 포함
        if (i === 0 && formData.attachment) {
          attributesObj.attachment = formData.attachment;
        }

        const data = {
          date: format(selectedDate, "yyyy-MM-dd"),
          division: "SKT",
          category: item.category,
          teamCategory: formData.teamCategory,
          teamId: formData.teamId,
          projectName: formData.projectName,
          productName: item.productName,
          specification: item.specification,
          quantity: parseInt(item.quantity) || 0,
          recipient: formData.recipient,
          type: "general",
          attributes: JSON.stringify(attributesObj),
          remark: item.remark,
          inventoryItemId: item.inventoryItemId
        };

        await apiRequest("POST", "/api/material-usage", data);
        successCount++;
      }

      queryClient.invalidateQueries({ queryKey: ["/api/material-usage"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({ title: "등록 완료", description: `${successCount}건의 사용 내역이 저장되었습니다.` });

    } catch (error: any) {
      toast({
        title: "등록 실패",
        description: error.message || "오류가 발생했습니다",
        variant: "destructive"
      });
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
      <div className="hidden md:block flex-shrink-0 space-y-4 pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">
              자재 사용등록내역
            </h1>
            <p className="text-muted-foreground">현장팀 자재 사용 이력을 조회합니다</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">

            <div className="w-[180px]">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger data-testid="select-category">
                  <SelectValue placeholder="사업 선택" />
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
            {canManage && (
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
                    <Button className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      등록
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openAddDialog()}>
                      <Pencil className="mr-2 h-4 w-4" />
                      직접 등록
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => { /* open bulk upload dialog */ }}>
                      <Upload className="mr-2 h-4 w-4" />
                      일괄 등록 (Excel)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
            {canRegister && !canManage && (
              <Button className="flex items-center gap-2" onClick={openAddDialog} data-testid="button-add-usage">
                <Plus className="h-4 w-4" />
                등록
              </Button>
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
            <span className="font-semibold text-foreground">{totalRecords}</span>건 /
            수량 <span className="font-semibold text-foreground">{totalQuantity.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 rounded-md border bg-background overflow-hidden relative">
        {/* PC View: Table */}
        <div className="hidden md:block h-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
              <TableRow className="h-8">
                <TableHead className="w-[40px] text-center align-middle bg-background">
                  {isTenantOwner ? (
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleSelectAll}
                      data-testid="checkbox-select-all"
                    />
                  ) : null}
                </TableHead>
                <TableHead className="font-semibold w-[100px] text-center align-middle bg-background !py-1 !h-8">사용일</TableHead>
                <TableHead className="font-semibold w-[80px] text-center align-middle bg-background !py-1 !h-8">사업</TableHead>
                <TableHead className="font-semibold w-[80px] text-center align-middle bg-background !py-1 !h-8">팀</TableHead>
                <TableHead className="font-semibold w-[200px] text-center align-middle bg-background !py-1 !h-8">공사명</TableHead>
                <TableHead className="font-semibold w-[120px] text-center align-middle bg-background !py-1 !h-8">품명</TableHead>
                <TableHead className="font-semibold w-[120px] text-center align-middle bg-background !py-1 !h-8">규격</TableHead>
                <TableHead className="font-semibold w-[70px] text-center align-middle bg-background !py-1 !h-8">수량</TableHead>

                <TableHead className="font-semibold w-[80px] text-center align-middle bg-background !py-1 !h-8">사용자</TableHead>
                <TableHead className="font-semibold w-[80px] text-center align-middle bg-background !py-1 !h-8">입력자</TableHead>
                <TableHead className="font-semibold w-[150px] text-center align-middle bg-background !py-1 !h-8">비고</TableHead>
                <TableHead className="font-semibold w-[50px] text-center align-middle bg-background !py-1 !h-8">첨부</TableHead>
                <TableHead className="font-semibold w-[70px] text-center align-middle bg-background !py-1 !h-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((record) => (
                <TableRow key={record.id} className="h-6 [&_td]:py-0" data-testid={`row-usage-${record.id}`}>
                  <TableCell className="text-center align-middle !py-1">
                    {isTenantOwner ? (
                      <Checkbox
                        checked={selectedIds.has(record.id)}
                        onCheckedChange={() => toggleSelect(record.id)}
                        data-testid={`checkbox-${record.id}`}
                      />
                    ) : null}
                  </TableCell>
                  <TableCell className="text-center align-middle whitespace-nowrap !py-1">{record.date}</TableCell>

                  <TableCell className="text-center align-middle whitespace-nowrap !py-1">{record.category}</TableCell>
                  <TableCell className="text-center align-middle whitespace-nowrap !py-1">{record.teamCategory}</TableCell>
                  <TableCell className="text-center align-middle max-w-[200px] truncate !py-1">{record.projectName}</TableCell>
                  <TableCell className="text-center align-middle whitespace-nowrap !py-1">{record.productName}</TableCell>
                  <TableCell className="text-center align-middle max-w-[120px] truncate !py-1">{record.specification}</TableCell>
                  <TableCell className="text-center align-middle font-medium whitespace-nowrap !py-1">{record.quantity.toLocaleString()}</TableCell>
                  <TableCell className="text-center align-middle whitespace-nowrap !py-1">{record.recipient}</TableCell>
                  <TableCell className="text-center align-middle whitespace-nowrap !py-1">{(record as any).createdByName || "-"}</TableCell>
                  <TableCell className="text-center align-middle whitespace-nowrap truncate max-w-[150px] py-1" title={record.remark || ""}>{record.remark}</TableCell>
                  <TableCell className="text-center align-middle !py-1">
                    {(() => {
                      try {
                        if (!record.attributes) return null;
                        const attrs = JSON.parse(record.attributes);
                        if (attrs.attachment) {
                          return (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => {
                                const link = document.createElement("a");
                                link.href = attrs.attachment.data;
                                link.download = attrs.attachment.name;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }}
                            >
                              <Download className="h-4 w-4 text-blue-500" />
                            </Button>
                          );
                        }
                      } catch (e) { }
                      return null;
                    })()}
                  </TableCell>
                  <TableCell className="text-center align-middle !py-1">
                    <div className="flex justify-center items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => openEditDialog(record)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-destructive"
                        onClick={() => {
                          setDeleteRecord(record);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredRecords.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                    등록된 사용 내역이 없습니다
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </table>
        </div>

        {/* Mobile View: Simple Register Button Only */}
        <div className="md:hidden h-full flex flex-col items-center justify-center bg-muted/10 p-4 space-y-6">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">자재 사용 등록</h3>
            <p className="text-muted-foreground text-sm">
              아래 버튼을 눌러 자재 사용 내역을 등록하세요.
            </p>
          </div>
          <Button
            size="lg"
            className="w-full max-w-xs h-14 text-lg shadow-lg animate-in fade-in zoom-in duration-300"
            onClick={openAddDialog}
          >
            <Plus className="mr-2 h-6 w-6" />
            사용 등록하기
          </Button>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRecord ? "사용 내역 수정" : "사용 내역 등록"}</DialogTitle>
            <DialogDescription>
              {editingRecord ? "자재 사용 내역을 수정합니다." : "새로운 자재 사용 내역을 등록합니다."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

              <div className={`grid gap-2 ${formData.teamCategory ? 'hidden md:grid' : ''}`}>
                <Label>사용팀 *</Label>
                <Select
                  value={formData.teamCategory}
                  onValueChange={(value) => {
                    const team = teams.find((t: any) => t.name === value);
                    setFormData({ ...formData, teamCategory: value, teamId: team?.id, recipient: "" }); // Reset recipient on team change
                  }}
                  disabled={!canManage} // 현장팀은 자신의 팀만 사용 가능
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
                  disabled={!formData.teamCategory || !canManage} // 현장팀은 자신만 선택 가능
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

            <div className="grid gap-2">
              <Label>공사명</Label>
              <Input
                value={formData.projectName}
                onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                placeholder="예: 효자동 2가 함체교체"
                data-testid="input-usage-project"
              />
            </div>

            <div className="space-y-4">
              <Label>사용 자재 목록</Label>
              {formData.items.map((item, index) => (
                <div
                  key={item.id}
                  ref={index === formData.items.length - 1 ? lastItemRef : null}
                  className="grid gap-3 border p-3 rounded-md bg-muted/20 relative"
                >
                  {formData.items.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-2 h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        const newItems = formData.items.filter((_, i) => i !== index);
                        setFormData({ ...formData, items: newItems });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}

                  <div className="grid gap-2">
                    <Label className="text-xs text-muted-foreground">보유 자재 선택 ({index + 1})</Label>
                    <Select
                      disabled={!formData.teamCategory}
                      value={item.inventoryItemId ? teamInventory.find(inv => inv.inventoryItemId === item.inventoryItemId)?.id?.toString() : ""}
                      onValueChange={(key) => {
                        const selectedInventory = teamInventory.find(i => i.id.toString() === key);
                        if (selectedInventory) {
                          const newItems = [...formData.items];
                          newItems[index] = {
                            ...newItems[index],
                            category: selectedInventory.category,
                            productName: selectedInventory.productName,
                            specification: selectedInventory.specification,
                            inventoryItemId: selectedInventory.inventoryItemId,
                          };

                          if (index === formData.items.length - 1) {
                            newItems.push({
                              id: Date.now().toString(),
                              category: "",
                              productName: "",
                              specification: "",
                              quantity: "",
                              inventoryItemId: undefined,
                              remark: ""
                            });
                          }

                          setFormData({ ...formData, items: newItems });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={formData.teamCategory ? "자재를 선택하세요" : "팀을 먼저 선택하세요"} />
                      </SelectTrigger>
                      <SelectContent>
                        {teamInventory
                          .filter(inv => !formData.items.some((existingItem, i) => i !== index && existingItem.inventoryItemId === inv.inventoryItemId))
                          .map((inv) => (
                            <SelectItem key={inv.id} value={inv.id.toString()}>
                              {inv.productName} ({inv.specification}) - 잔여: {inv.remaining.toLocaleString()}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="text-xs text-muted-foreground">수량 *</Label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => {
                          const newItems = [...formData.items];
                          newItems[index].quantity = e.target.value;
                          setFormData({ ...formData, items: newItems });
                        }}
                        placeholder="수량"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs text-muted-foreground">비고</Label>
                      <Input
                        value={item.remark}
                        onChange={(e) => {
                          const newItems = [...formData.items];
                          newItems[index].remark = e.target.value;
                          setFormData({ ...formData, items: newItems });
                        }}
                        placeholder="비고"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">첨부파일</Label>
              <div className="col-span-3">
                <div className="relative">
                  <Input
                    id="usage-file-upload"
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          // 이미지 압축 적용
                          const compressed = await compressImage(file, {
                            maxWidth: 1920,
                            maxHeight: 1920,
                            quality: 0.8,
                            maxSizeMB: 5
                          });

                          setFormData({
                            ...formData,
                            attachment: compressed
                          });

                          // 압축 결과 알림
                          if (file.type.startsWith('image/')) {
                            const originalSize = formatFileSize(file.size);
                            const compressedSize = formatFileSize(compressed.size);
                            toast({
                              title: "이미지 압축 완료",
                              description: `${originalSize} → ${compressedSize}`,
                            });
                          }
                        } catch (error: any) {
                          toast({
                            title: "파일 업로드 실패",
                            description: error.message || "파일을 처리할 수 없습니다",
                            variant: "destructive"
                          });
                          // 입력 초기화
                          e.target.value = '';
                        }
                      }
                    }}
                  />
                  <label
                    htmlFor="usage-file-upload"
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-primary/30 rounded-lg cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                  >
                    <Upload className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium text-primary">
                      {formData.attachment ? formData.attachment.name : (
                        <>
                          <span className="md:hidden">📷 사진 촬영 또는 앨범 선택</span>
                          <span className="hidden md:inline">파일 선택 또는 드래그</span>
                        </>
                      )}
                    </span>
                  </label>
                </div>
                {formData.attachment && (
                  <div className="flex items-center justify-between p-2 bg-muted/50 rounded-md mt-2">
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
          </div >
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
        </DialogContent >
      </Dialog >

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
