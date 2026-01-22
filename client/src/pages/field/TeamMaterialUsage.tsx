import { useState, useMemo, useEffect, useRef } from "react";
import { Loader2, Trash2, Plus, Calendar, Pencil, MoreHorizontal, Download, Upload, Paperclip, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { exportToExcel } from "@/lib/excel";
import { useToast } from "@/hooks/use-toast";
import { compressImage, formatFileSize } from "@/lib/imageCompression";

import { SearchInput } from "@/components/ui/SearchInput";
import { useTableFilters } from "@/hooks/useTableFilters";
import { type MaterialUsageRecord, type InventoryItem, type OutgoingRecord } from "@shared/schema";
import { useFileUpload } from "@/hooks/useFileUpload";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useColumnResize } from "@/hooks/useColumnResize";
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
import { TeamInventorySelector } from "@/components/TeamInventorySelector";
import { MATERIAL_LOG_COLUMNS } from "@/lib/material-table-columns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { useAppContext } from "@/contexts/AppContext";

import { useDownload } from "@/hooks/useDownload";

export default function TeamMaterialUsage() {
  const { toast } = useToast();
  const { user, tenants, currentTenant, checkPermission, divisions, teams } = useAppContext();
  const isTenantOwner = tenants.find(t => t.id === currentTenant)?.role === 'owner';
  const { downloadFile, downloadAttachment } = useDownload();

  const {
    attachments,
    setAttachments,
    handleFileChange,
    removeAttachment,
    clearAttachments
  } = useFileUpload();

  const { widths, startResizing } = useColumnResize(MATERIAL_LOG_COLUMNS);

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
    items: [{
      id: Date.now().toString(),
      division: "",
      category: "",
      productName: "",
      specification: "",
      quantity: "",
      inventoryItemId: undefined as number | undefined,
      remark: ""
    }] as Array<{
      id: string;
      division: string;
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

  // Derived state for team/division filters
  const currentTeamName = isFieldTeam && currentTenantData?.teamId
    ? teams.find(t => t.id === currentTenantData.teamId)?.name
    : null;

  const shouldFetch = !isFieldTeam || (isFieldTeam && !!currentTeamName);

  const { data: records = [], isLoading } = useQuery<MaterialUsageRecord[]>({
    queryKey: isFieldTeam && currentTeamName
      ? ["/api/material-usage", { teamCategory: currentTeamName }]
      : ["/api/material-usage"],
    enabled: shouldFetch,
    queryFn: async () => {
      const url = isFieldTeam && currentTeamName
        ? `/api/material-usage?teamCategory=${encodeURIComponent(currentTeamName)}`
        : "/api/material-usage";
      const res = await apiRequest("GET", url);
      return res.json();
    }
  });

  // [NEW] Permission-based filtering
  const filteredRecordsByPermission = useMemo(() => {
    if (!isFieldTeam) return records;

    if (currentTenantData?.teamId) {
      const myTeamId = String(currentTenantData.teamId);
      const myTeamName = teams.find(t => String(t.id) === myTeamId)?.name;

      return records.filter(r => {
        if (r.teamId && String(r.teamId) === myTeamId) return true;
        if (myTeamName && r.teamCategory === myTeamName) return true;
        return false;
      });
    }

    return records;
  }, [records, isFieldTeam, currentTenantData, teams]);

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

  const teamInventory = useMemo(() => {
    if (!formData.teamCategory) return [];

    const teamOutgoing = outgoingRecords.filter(r => r.teamCategory === formData.teamCategory);

    if (teamOutgoing.length === 0) return [];

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

    const teamUsage = filteredRecordsByPermission.filter(r => r.teamCategory === formData.teamCategory);

    teamUsage.forEach(r => {
      let foundKey = "";
      if (r.inventoryItemId) {
        foundKey = `ID:${r.inventoryItemId}`;
      } else {
        foundKey = `${r.productName}|${r.specification}`;
      }

      const entry = inventoryMap.get(foundKey);
      if (entry) {
        entry.used += r.quantity;
      }
    });

    return Array.from(inventoryMap.values())
      .map(item => ({
        ...item,
        remaining: item.received - item.used
      }))
      .filter(item => item.remaining > 0);
  }, [formData.teamCategory, outgoingRecords, filteredRecordsByPermission]);

  const createMutation = useMutation({
    mutationFn: async (data: Omit<MaterialUsageRecord, "id" | "tenantId">) => {
      return apiRequest("POST", "/api/material-usage", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/material-usage"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({ title: "사용 내역이 등록되었습니다" });
      setDialogOpen(false);
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "수정 실패";
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

  const {
    searchQuery,
    setSearchQuery,
    selectedDivision,
    setSelectedDivision,
    selectedCategory,
    setSelectedCategory,
    filteredItems: filteredRecords
  } = useTableFilters(filteredRecordsByPermission, {
    searchFields: ["productName", "projectName", "recipient", "teamCategory", "specification"],
    divisionField: "division",
    categoryField: "teamCategory",
  });

  const handleExportExcel = () => {
    const dataToExport = filteredRecords.map(record => ({
      "사용일": record.date,
      "사업": record.division,
      "팀": record.teamCategory,
      "공사명": record.projectName,
      "품명": record.productName,
      "규격": record.specification,
      "수량": record.quantity,
      "사용자": record.recipient
    }));

    exportToExcel(dataToExport, "팀자재사용내역");
  };

  const totalQuantity = filteredRecords.reduce((sum, r) => sum + r.quantity, 0);
  const totalRecords = filteredRecords.length;

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

    let defaultDivision = "SKT";
    let defaultTeam = "";
    let defaultRecipient = "";

    if (user && tenants) {
      const tenantInfo = tenants.find(t => t.id === currentTenant);
      if (tenantInfo) {
        if (tenantInfo.divisionId) {
          const divName = divisions.find(d => d.id === tenantInfo.divisionId)?.name;
          if (divName) defaultDivision = divName;
        }
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
      items: [{
        id: Date.now().toString(),
        division: "",
        category: "",
        productName: "",
        specification: "",
        quantity: "",
        inventoryItemId: undefined,
        remark: ""
      }]
    });
    clearAttachments();
    setSelectedDate(new Date());
    setDialogOpen(true);
  };

  const openEditDialog = async (record: MaterialUsageRecord) => {
    setEditingRecord(record);
    const teamName = (record.teamCategory || "").trim();
    const foundTeam = teams.find(t => t.id === record.teamId || t.name === teamName);

    const initialFormData = {
      division: record.division,
      category: record.category || "",
      teamCategory: foundTeam ? foundTeam.name : teamName,
      teamId: foundTeam ? foundTeam.id : (record.teamId || undefined),
      projectName: record.projectName,
      productName: record.productName,
      specification: record.specification,
      quantity: record.quantity.toString(),
      recipient: record.recipient,
      type: "general",
      drumNumber: "",
      inventoryItemId: record.inventoryItemId || undefined,
      remark: record.remark || "",
      items: [{
        id: Date.now().toString(),
        division: record.division,
        category: record.category || "",
        productName: record.productName,
        specification: record.specification,
        quantity: record.quantity.toString(),
        inventoryItemId: record.inventoryItemId || undefined,
        remark: record.remark || ""
      }]
    };

    setFormData(initialFormData);
    setDialogOpen(true);
    setAttachments([]);

    try {
      const fullRecord = await queryClient.fetchQuery<MaterialUsageRecord>({
        queryKey: [`/api/material-usage/${record.id}`],
        staleTime: 0
      });

      if (fullRecord && fullRecord.attributes) {
        const attrs = JSON.parse(fullRecord.attributes);
        if (attrs.attachments && Array.isArray(attrs.attachments)) {
          const formattedAttachments = attrs.attachments.map((att: any) => ({
            name: att.name,
            data: "",
            storageUrl: att.storageUrl || "",
            storagePath: att.storagePath || ""
          }));
          setAttachments(formattedAttachments);
        } else if (attrs.attachment) {
          const formattedAttachment = {
            name: attrs.attachment.name,
            data: "",
            storageUrl: attrs.attachment.storageUrl || "",
            storagePath: attrs.attachment.storagePath || ""
          };
          setAttachments([formattedAttachment]);
        }
      }
    } catch (e) {
      console.error("Failed to fetch full record details", e);
    }
    setSelectedDate(new Date(record.date));
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

      items: [{
        id: Date.now().toString(),
        division: "",
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

    const validItems = formData.items.filter(item => item.inventoryItemId && item.quantity);

    if (validItems.length === 0) {
      toast({ title: "품목 누락", description: "최소 하나의 유효한 품목(자재 및 수량)을 입력해주세요.", variant: "destructive" });
      return;
    }

    const divisions = new Set(validItems.map(item => item.division));
    if (divisions.size > 1) {
      toast({
        title: "등록 불가",
        description: "한 번의 등록에 SKT와 SKB 자재를 혼합할 수 없습니다. 공사별로 구분하여 등록해주세요.",
        variant: "destructive"
      });
      return;
    }

    if (editingRecord) {
      const item = validItems[0];
      const attributesObj: any = {};

      if (attachments && attachments.length > 0) {
        attributesObj.attachments = attachments;
        attributesObj.attachment = attachments[0];
      }

      const data = {
        date: format(selectedDate, "yyyy-MM-dd"),
        division: item.division || "SKT",
        category: (item.category || "").trim(),
        teamCategory: formData.teamCategory.trim(),
        teamId: formData.teamId,
        projectName: (formData.projectName || "").trim(),
        productName: item.productName.trim(),
        specification: (item.specification || "").trim(),
        quantity: parseInt(item.quantity) || 0,
        recipient: formData.recipient.trim(),
        type: "general",
        attributes: JSON.stringify(attributesObj),
        remark: (item.remark || "").trim(),
        inventoryItemId: item.inventoryItemId
      };

      closeDialog();
      toast({ title: "수정중입니다", description: "잠시만 기다려주세요." });
      try {
        await updateMutation.mutateAsync({ ...data, id: editingRecord.id } as Omit<MaterialUsageRecord, "tenantId">);
      } catch (e) {
      }
      return;
    }

    try {
      closeDialog();
      toast({ title: "등록중입니다", description: `${validItems.length}건의 자재 사용 등록을 진행합니다.` });

      let successCount = 0;

      for (let i = 0; i < validItems.length; i++) {
        const item = validItems[i];
        const attributesObj: any = {};
        if (i === 0 && attachments && attachments.length > 0) {
          attributesObj.attachments = attachments;
          attributesObj.attachment = attachments[0];
        }

        const data = {
          date: format(selectedDate, "yyyy-MM-dd"),
          division: item.division || "SKT",
          category: (item.category || "").trim(),
          teamCategory: formData.teamCategory.trim(),
          teamId: formData.teamId,
          projectName: (formData.projectName || "").trim(),
          productName: item.productName.trim(),
          specification: (item.specification || "").trim(),
          quantity: parseInt(item.quantity) || 0,
          recipient: formData.recipient.trim(),
          type: "general",
          attributes: JSON.stringify(attributesObj),
          remark: (item.remark || "").trim(),
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

  const isTeamResolving = !!currentTenantData?.teamId && !teams.find(t => t.id === currentTenantData.teamId);
  const showLoading = isLoading || isTeamResolving;

  if (showLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-zinc-950/50 p-2 overflow-hidden">
      {/* (PC) Ultra Compact Header Section */}
      <div className="hidden md:flex flex-col h-full">
        <div className="flex flex-col gap-2 flex-shrink-0 mb-2 pt-1">
          <div className="flex items-center justify-between gap-2 px-1">
            {/* Left: Title + Count */}
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
                팀 자재 사용 내역
                <span className="flex h-1.5 w-1.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50 animate-pulse"></span>
              </h1>
              <div className="h-3 w-px bg-slate-200 dark:bg-slate-800"></div>
              <span className="text-xs font-medium text-slate-500">
                {totalRecords}건 / 수량 {totalQuantity.toLocaleString()}
              </span>
            </div>

            {/* Right: Search + Actions */}
            <div className="flex items-center gap-1.5">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="품명, 공사명, 사용자..."
                className="w-40 focus:w-56 h-7 text-xs rounded-md bg-white border-slate-200 focus:ring-1 focus:ring-primary/20 transition-all font-normal"
                data-testid="input-search"
              />

              {selectedIds.size > 0 && isTenantOwner && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-7 border-destructive/20 text-xs px-2 gap-1.5"
                  onClick={() => setBulkDeleteOpen(true)}
                  data-testid="button-bulk-delete"
                >
                  <Trash2 className="h-3 w-3" />
                  선택 삭제 ({selectedIds.size})
                </Button>
              )}

              <TooltipProvider>
                {canManage && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 border-slate-200 text-slate-600 hover:bg-slate-50 text-xs px-2 gap-1.5"
                        onClick={handleExportExcel}
                      >
                        <Download className="h-3 w-3" />
                        Excel
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">Excel 다운로드</TooltipContent>
                  </Tooltip>
                )}

                {canRegister && (
                  <Button
                    size="sm"
                    className="h-7 text-xs px-2 gap-1.5 bg-primary/90 hover:bg-primary shadow-sm"
                    onClick={openAddDialog}
                  >
                    <Plus className="h-3 w-3" />
                    사용량 등록
                  </Button>
                )}
              </TooltipProvider>

              {/* Team Select */}
              {!isFieldTeam && (
                <div className="w-[140px]">
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="h-7 text-xs rounded-md bg-white border-slate-200" data-testid="select-category">
                      <SelectValue placeholder="팀 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="전체" className="text-xs">전체 팀</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat} className="text-xs">
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Table Area */}
        <div className="flex-1 rounded-3xl border border-slate-200 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-xl shadow-slate-200/50 dark:shadow-black/50 overflow-hidden flex flex-col relative z-0">
          <div className="flex-1 overflow-auto custom-scrollbar relative">
            <table className="w-full text-sm border-collapse table-fixed">
              <TableHeader className="sticky top-0 bg-slate-50/95 backdrop-blur z-20 shadow-sm">
                <TableRow className="h-10 border-b border-slate-200">
                  <TableHead className="text-center align-middle bg-slate-50/50" style={{ width: widths.checkbox }}>
                    {isTenantOwner ? (
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={toggleSelectAll}
                        data-testid="checkbox-select-all"
                      />
                    ) : null}
                  </TableHead>
                  <TableHead className="font-semibold text-slate-600 text-center relative select-none" style={{ width: widths.date }}>
                    사용일
                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("date", e)} />
                  </TableHead>
                  <TableHead className="font-semibold text-slate-600 text-center relative select-none" style={{ width: widths.division }}>
                    사업
                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("division", e)} />
                  </TableHead>
                  <TableHead className="font-semibold text-slate-600 text-center relative select-none" style={{ width: widths.teamCategory }}>
                    사용팀
                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("teamCategory", e)} />
                  </TableHead>
                  <TableHead className="font-semibold text-slate-600 text-center relative select-none" style={{ width: widths.projectName }}>
                    공사명
                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("projectName", e)} />
                  </TableHead>
                  <TableHead className="font-semibold text-slate-600 text-center relative select-none" style={{ width: widths.productName }}>
                    품명
                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("productName", e)} />
                  </TableHead>
                  <TableHead className="font-semibold text-slate-600 text-center relative select-none" style={{ width: widths.specification }}>
                    규격
                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("specification", e)} />
                  </TableHead>
                  <TableHead className="font-semibold text-slate-600 text-center relative select-none" style={{ width: widths.quantity }}>
                    수량
                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("quantity", e)} />
                  </TableHead>
                  <TableHead className="font-semibold text-slate-600 text-center relative select-none" style={{ width: widths.recipient }}>
                    사용자
                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("recipient", e)} />
                  </TableHead>
                  <TableHead className="font-semibold text-slate-600 text-center relative select-none" style={{ width: widths.remark }}>
                    비고
                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("remark", e)} />
                  </TableHead>
                  <TableHead className="font-semibold text-slate-600 text-center relative select-none" style={{ width: widths.createdBy }}>
                    입력자
                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("createdBy", e)} />
                  </TableHead>
                  <TableHead className="font-semibold text-slate-600 text-center relative select-none" style={{ width: widths.attachment }}>
                    첨부
                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 z-50" onMouseDown={(e) => startResizing("attachment", e)} />
                  </TableHead>
                  <TableHead className="font-semibold text-slate-600 text-center" style={{ width: widths.actions }}></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id} data-testid={`row-usage-${record.id}`} className="group h-10 border-b border-slate-100 dark:border-zinc-800 transition-colors hover:bg-slate-50/80 text-xs">
                    <TableCell className="text-center px-1">
                      {isTenantOwner ? (
                        <Checkbox
                          checked={selectedIds.has(record.id)}
                          onCheckedChange={() => toggleSelect(record.id)}
                          data-testid={`checkbox-${record.id}`}
                        />
                      ) : null}
                    </TableCell>
                    <TableCell className="text-center px-1 text-[11px] text-slate-500 font-mono">{record.date}</TableCell>
                    <TableCell className="text-center px-1 text-slate-600">{record.division}</TableCell>
                    <TableCell className="text-center px-1 font-medium text-slate-700">
                      {record.teamCategory || teams.find(t => t.id === record.teamId)?.name || ''}
                    </TableCell>
                    <TableCell className="text-left px-2 text-slate-800 font-medium truncate" title={record.projectName || ""}>{record.projectName}</TableCell>
                    <TableCell className="text-center px-2 font-medium text-slate-800 truncate" title={record.productName}>{record.productName}</TableCell>
                    <TableCell className="text-center px-1 text-slate-500 truncate" title={record.specification}>{record.specification}</TableCell>
                    <TableCell className="text-center px-2 font-bold font-mono text-primary">{record.quantity.toLocaleString()}</TableCell>
                    <TableCell className="text-center px-1 text-slate-600">{record.recipient || ''}</TableCell>
                    <TableCell className="text-left px-2 text-slate-400 italic truncate" title={record.remark || ""}>{record.remark || ""}</TableCell>
                    <TableCell className="text-center px-1 text-slate-400">{(record as any).createdByName || "-"}</TableCell>
                    <TableCell className="text-center px-1">
                      {(() => {
                        try {
                          if (!record.attributes) return null;
                          let attrs: any = {};
                          if (typeof record.attributes === 'string') {
                            attrs = JSON.parse(record.attributes);
                          } else if (typeof record.attributes === 'object') {
                            attrs = record.attributes;
                          }
                          const attachments = attrs.attachments || (attrs.attachment ? [attrs.attachment] : []);
                          if (attachments.length === 0) return null;

                          if (attachments.length === 1) {
                            return (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 hover:bg-slate-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadAttachment(attachments[0]);
                                }}
                                title={attachments[0].name}
                              >
                                <Download className="h-3 w-3 text-slate-500" />
                              </Button>
                            );
                          }

                          return (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 hover:bg-slate-100 gap-0.5"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Paperclip className="h-3 w-3 text-slate-500" />
                                  <span className="text-[9px] font-medium text-slate-600">{attachments.length}</span>
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-2" align="end">
                                <div className="flex flex-col gap-1">
                                  {attachments.map((file: any, idx: number) => (
                                    <Button
                                      key={idx}
                                      variant="ghost"
                                      size="sm"
                                      className="justify-start h-8 text-xs max-w-[200px]"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        downloadAttachment(file);
                                      }}
                                      title={file.name}
                                    >
                                      <Download className="h-3 w-3 mr-2 shrink-0" />
                                      <span className="truncate">{file.name}</span>
                                    </Button>
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>
                          );
                        } catch (e) { }
                        return null;
                      })()}
                    </TableCell>
                    <TableCell className="text-center px-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-6 w-6 p-0 hover:bg-slate-100">
                            <span className="sr-only">메뉴</span>
                            <MoreHorizontal className="h-3 w-3 text-slate-400" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(record)} className="text-xs">
                            <Pencil className="mr-2 h-3 w-3" /> 수정
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive text-xs"
                            onClick={() => setDeleteRecord(record)}
                          >
                            <Trash2 className="mr-2 h-3 w-3" /> 삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredRecords.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={13} className="h-64 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FileText className="h-8 w-8 text-slate-300" />
                        <p>등록된 사용 내역이 없습니다</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </table>
          </div>
        </div>
      </div>

      {/* Mobile View: Card List + FloatingButton */}
      <div className="md:hidden h-full flex flex-col overflow-hidden">
        {/* Mobile Header with Add Button */}
        <div className="flex-shrink-0 p-4 border-b bg-background">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold">사용 등록 내역</h2>
              <p className="text-xs text-muted-foreground">
                {totalRecords}건 / 수량 {totalQuantity.toLocaleString()}
              </p>
            </div>
            <Button
              size="sm"
              className="h-9"
              onClick={openAddDialog}
              data-testid="button-mobile-add"
            >
              <Plus className="h-4 w-4 mr-1" />
              등록
            </Button>
          </div>

          {/* Mobile Search */}
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="품명, 공사명 검색..."
            size="sm"
          />
        </div>

        {/* Mobile Card List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <p className="text-sm">등록된 사용 내역이 없습니다</p>
            </div>
          ) : (
            filteredRecords.map((record) => (
              <div
                key={record.id}
                className="bg-card border rounded-lg p-3 shadow-sm"
              >
                {/* Header: Date + Actions */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">{record.date}</span>
                      <span className="text-xs px-1.5 py-0.5 bg-secondary rounded">{record.division}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {record.teamCategory || teams.find(t => t.id === record.teamId)?.name || ''}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(record)}>
                        <Pencil className="mr-2 h-4 w-4" /> 수정
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteRecord(record)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> 삭제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Material Info */}
                <div className="space-y-1 mb-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium">{record.productName}</span>
                    <span className="text-xs text-muted-foreground">{record.specification}</span>
                  </div>
                  {record.projectName && (
                    <div className="text-xs text-muted-foreground truncate">
                      공사: {record.projectName}
                    </div>
                  )}
                </div>

                {/* Footer: Quantity + Recipient */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{record.recipient || '-'}</span>
                    {(() => {
                      try {
                        if (!record.attributes) return null;
                        let attrs: any = {};
                        if (typeof record.attributes === 'string') {
                          attrs = JSON.parse(record.attributes);
                        } else if (typeof record.attributes === 'object') {
                          attrs = record.attributes;
                        }
                        const attachments = attrs.attachments || (attrs.attachment ? [attrs.attachment] : []);

                        if (attachments.length === 0) return null;

                        if (attachments.length === 1) {
                          return (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 px-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadAttachment(attachments[0]);
                              }}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          );
                        }

                        return (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 gap-1 px-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Paperclip className="h-3 w-3" />
                                <span className="text-[10px] font-medium">{attachments.length}</span>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-2" align="end">
                              <div className="flex flex-col gap-1">
                                {attachments.map((file: any, idx: number) => (
                                  <Button
                                    key={idx}
                                    variant="ghost"
                                    size="sm"
                                    className="justify-start h-8 text-xs max-w-[200px]"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      downloadAttachment(file);
                                    }}
                                    title={file.name}
                                  >
                                    <Download className="h-3 w-3 mr-2 shrink-0" />
                                    <span className="truncate">{file.name}</span>
                                  </Button>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                        );
                      } catch (e) { }
                      return null;
                    })()}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs text-muted-foreground">수량:</span>
                    <span className="text-base font-bold text-primary">
                      {Number(record.quantity).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
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
                    <TeamInventorySelector
                      items={teamInventory.filter(inv => {
                        // 1. 이미 선택된 아이템 제외
                        const isAlreadySelected = formData.items.some((existingItem, i) =>
                          i !== index && existingItem.inventoryItemId === inv.inventoryItemId
                        );
                        if (isAlreadySelected) return false;

                        // 2. 다른 사업(SKT/SKB) 자재 제외 (첫 번째 선택이 있는 경우)
                        const firstDivision = formData.items.find(i => i.division)?.division;
                        if (firstDivision && inv.division !== firstDivision) return false;

                        return true;
                      })}
                      disabled={!formData.teamCategory}
                      value={teamInventory.find(inv =>
                        (item.inventoryItemId && inv.inventoryItemId === item.inventoryItemId) ||
                        (!item.inventoryItemId && inv.productName === item.productName && inv.specification === item.specification)
                      )?.id || ""}
                      onChange={(id, selectedInventory) => {
                        const newItems = [...formData.items];
                        newItems[index] = {
                          ...newItems[index],
                          division: selectedInventory.division,
                          category: selectedInventory.category,
                          productName: selectedInventory.productName,
                          specification: selectedInventory.specification,
                          inventoryItemId: selectedInventory.inventoryItemId,
                        };

                        if (index === formData.items.length - 1) {
                          newItems.push({
                            id: Date.now().toString(),
                            division: "",
                            category: "",
                            productName: "",
                            specification: "",
                            quantity: "",
                            inventoryItemId: undefined,
                            remark: ""
                          });
                        }

                        setFormData({ ...formData, items: newItems });
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="text-xs text-muted-foreground">수량 *</Label>
                      <Input
                        type="number"
                        value={item.quantity || ''}
                        onChange={(e) => {
                          const newItems = [...formData.items];
                          // Parse to number for validation but store as string if that matches the type
                          const val = Math.max(0, parseInt(e.target.value) || 0);
                          newItems[index].quantity = val.toString();
                          setFormData({ ...formData, items: newItems });
                        }}
                        min="0"
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
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 첨부파일 */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">첨부파일</Label>
              <div className="col-span-3">
                <div className="relative">
                  <Input
                    id="usage-file-upload"
                    type="file"
                    accept="image/*,application/pdf,.xlsx,.xls"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  {attachments.length < 4 && (
                    <label
                      htmlFor="usage-file-upload"
                      className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-primary/30 rounded-lg cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                    >
                      <Upload className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium text-primary">
                        파일 선택 ({attachments.length}/4) - 이미지, PDF, 엑셀
                      </span>
                    </label>
                  )}
                </div>

                <div className="space-y-2 mt-2">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                      <span className="text-sm text-muted-foreground truncate flex-1">
                        📎 {file.name}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => removeAttachment(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
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
              {(createMutation.isPending || updateMutation.isPending) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  처리 중...
                </>
              ) : (editingRecord ? "수정" : "등록")}
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
            <AlertDialogCancel disabled={bulkDeleteMutation.isPending}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                if (bulkDeleteMutation.isPending) {
                  e.preventDefault();
                  return;
                }
                e.preventDefault(); // Prevent auto-close
                confirmBulkDelete();
              }}
              disabled={bulkDeleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  삭제 중...
                </>
              ) : (
                "삭제"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
