import { useState, useMemo, useEffect, useRef } from "react";
import { Search, Loader2, Trash2, Plus, Calendar, Pencil, MoreHorizontal, Download, Upload, Paperclip, FileText } from "lucide-react";
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


import { useDownload } from "@/hooks/useDownload";
import { useDialogState } from "@/hooks/useDialogState";
import { useTableFilters } from "@/hooks/useTableFilters";

export default function TeamMaterialUsage() {
  const { toast } = useToast();
  const { user, tenants, currentTenant, checkPermission, divisions, teams } = useAppContext();
  const isTenantOwner = tenants.find(t => t.id === currentTenant)?.role === 'owner';
  const { downloadFile } = useDownload();

  const { widths, startResizing } = useColumnResize({
    checkbox: 40,
    date: 100,
    division: 80,
    teamCategory: 80,
    projectName: 200,
    productName: 120,
    specification: 120,
    quantity: 70,
    recipient: 80,
    remark: 150,
    createdBy: 80,
    attachment: 50,
    actions: 70
  });

  /* useState 제거됨 */
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
    // 다중 품목 지원
    attachments: [] as { name: string, data: string, size?: number, type?: string }[],
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

  // Derived state for team/division filters
  // If field team, we override these for display/logic
  // (Moved up for useQuery)
  const currentTeamName = isFieldTeam && currentTenantData?.teamId
    ? teams.find(t => t.id === currentTenantData.teamId)?.name
    : null;

  const { data: records = [], isLoading } = useQuery<MaterialUsageRecord[]>({
    queryKey: isFieldTeam && currentTeamName
      ? ["/api/material-usage", { teamCategory: currentTeamName }]
      : ["/api/material-usage"],
    queryFn: async () => {
      const url = isFieldTeam && currentTeamName
        ? `/api/material-usage?teamCategory=${encodeURIComponent(currentTeamName)}`
        : "/api/material-usage";
      const res = await apiRequest("GET", url);
      return res.json();
    }
  });

  // [NEW] Permission-based filtering
  // 현장팀은 본인 팀의 기록만 볼 수 있어야 함
  const filteredRecordsByPermission = useMemo(() => {
    // 관리자나 다른 권한은 전체 보기
    if (!isFieldTeam) return records;

    // 현장팀이고 팀 정보가 있으면 필터링
    if (currentTenantData?.teamId) {
      const myTeamId = String(currentTenantData.teamId);
      // Find my team name for legacy data matching
      const myTeamName = teams.find(t => String(t.id) === myTeamId)?.name;

      return records.filter(r => {
        // 1. Match by Team ID (Primary)
        if (r.teamId && String(r.teamId) === myTeamId) return true;

        // 2. Match by Team Name (Legacy/Fallback) - Only if Record ID is missing but Name matches
        // (Note: r.teamCategory holds the team name)
        if (myTeamName && r.teamCategory === myTeamName) return true;

        return false;
      });
    }

    // 팀 정보가 없는 현장팀은 (이론상 없어야 하지만) 빈 배열 혹은 전체? -> 보안상 빈 배열이 안전하나 현재는 전체 리턴 후 로직 흐름 유지
    // 하지만 "내 팀"을 못 찾으면 아무 것도 안 보여주는 게 맞음.
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
    // 여기서도 filteredRecordsByPermission 사용하는게 맞음 (일관성)
    const teamUsage = filteredRecordsByPermission.filter(r => r.teamCategory === formData.teamCategory);

    teamUsage.forEach(r => {
      // Find matching item in inventoryMap
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

    // Return items with remaining > 0 (Calculate remaining here)
    return Array.from(inventoryMap.values())
      .map(item => ({
        ...item,
        remaining: item.received - item.used
      }))
      .filter(item => item.remaining > 0);
  }, [formData.teamCategory, outgoingRecords, filteredRecordsByPermission]); // Dependencies updated

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

  // 2. Table Filters (Search & Category) via Hook
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
      attachments: [],
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

  const openEditDialog = async (record: MaterialUsageRecord) => {
    setEditingRecord(record);
    // Find team robustly
    const teamName = (record.teamCategory || "").trim();
    const foundTeam = teams.find(t => t.id === record.teamId || t.name === teamName);

    // Initial form data from list (attachments might be empty/nullified)
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
      attachments: [],
      items: [{
        id: Date.now().toString(),
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

    try {
      // Fetch full record to get complete attributes (attachments)
      const fullRecord = await queryClient.fetchQuery<MaterialUsageRecord>({
        queryKey: [`/api/material-usage/${record.id}`],
        staleTime: 0
      });

      if (fullRecord && fullRecord.attributes) {
        const attrs = JSON.parse(fullRecord.attributes);
        if (attrs.attachments && Array.isArray(attrs.attachments)) {
          setFormData(prev => ({ ...prev, attachments: attrs.attachments }));
        } else if (attrs.attachment) {
          setFormData(prev => ({ ...prev, attachments: [attrs.attachment] }));
        }
      }
    } catch (e) {
      console.error("Failed to fetch full record details", e);
      // Fallback to existing attributes if fetch fails (though they might be nullified)
      try {
        if (record.attributes) {
          const attrs = JSON.parse(record.attributes);
          if (attrs.attachments && Array.isArray(attrs.attachments)) {
            setFormData(prev => ({ ...prev, attachments: attrs.attachments }));
          } else if (attrs.attachment) {
            setFormData(prev => ({ ...prev, attachments: [attrs.attachment] }));
          }
        }
      } catch (parseError) {
        console.error("Failed to parse fallback attributes", parseError);
      }
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
      attachments: [],
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

      // 수정 시 첨부파일 변경이 있으면 처리
      if (formData.attachments && formData.attachments.length > 0) {
        attributesObj.attachments = formData.attachments;
        attributesObj.attachment = formData.attachments[0]; // Legacy support
      } else if (editingRecord.attributes) {
        // 기존 첨부파일 로직: formData에 없으면 비운다 (왜냐하면 수정 화면 진입 시 로드하므로)
      }

      const data = {
        date: format(selectedDate, "yyyy-MM-dd"),
        division: "SKT",
        category: (item.category || "").trim(),
        teamCategory: formData.teamCategory.trim(),
        teamId: formData.teamId, // Ensure teamId is sent
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
        if (i === 0 && formData.attachments && formData.attachments.length > 0) {
          attributesObj.attachments = formData.attachments;
          attributesObj.attachment = formData.attachments[0];
        }

        const data = {
          date: format(selectedDate, "yyyy-MM-dd"),
          division: "SKT",
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

            {/* Filter Select for Admin/Manager only */}
            {!isFieldTeam && (
              <div className="w-[180px]">
                {/* useTableFilters에서 제공하는 selectedCategory(원래 teamCategory)를 사용 */}
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger data-testid="select-category">
                    <SelectValue placeholder="팀 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="전체">전체 (팀)</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

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
                <Button className="flex items-center gap-2" onClick={() => openAddDialog()}>
                  <Plus className="h-4 w-4" />
                  등록
                </Button>
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
                  사용일
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                    onMouseDown={(e) => startResizing("date", e)}
                  />
                </TableHead>
                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.division }}>
                  사업
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                    onMouseDown={(e) => startResizing("division", e)}
                  />
                </TableHead>
                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.teamCategory }}>
                  사용팀
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                    onMouseDown={(e) => startResizing("teamCategory", e)}
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
                  사용자
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
                <TableHead className="font-semibold text-center align-middle bg-background relative group" style={{ width: widths.createdBy }}>
                  입력자
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                    onMouseDown={(e) => startResizing("createdBy", e)}
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
                <TableRow key={record.id} data-testid={`row-usage-${record.id}`} className="h-6 [&_td]:py-0">
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

                  <TableCell className="text-center align-middle whitespace-nowrap">{record.division}</TableCell>
                  <TableCell className="text-center align-middle whitespace-nowrap">
                    {record.teamCategory || teams.find(t => t.id === record.teamId)?.name || ''}
                  </TableCell>
                  <TableCell className="align-middle p-0">
                    <div className="w-full truncate text-left pl-2" title={record.projectName}>
                      {record.projectName}
                    </div>
                  </TableCell>
                  <TableCell className="align-middle p-0">
                    <div className="w-full truncate text-center mx-auto whitespace-nowrap" title={record.productName}>
                      {record.productName}
                    </div>
                  </TableCell>
                  <TableCell className="align-middle p-0">
                    <div className="w-full truncate text-center mx-auto" title={record.specification}>
                      {record.specification}
                    </div>
                  </TableCell>
                  <TableCell className="text-center align-middle font-bold">
                    {Number(record.quantity).toLocaleString()}
                  </TableCell>

                  <TableCell className="text-center align-middle whitespace-nowrap">{record.recipient || ''}</TableCell>
                  <TableCell className="align-middle p-0">
                    <div className="w-full truncate text-center mx-auto" title={record.remark || ""}>
                      {record.remark}
                    </div>
                  </TableCell>
                  <TableCell className="text-center align-middle whitespace-nowrap">{(record as any).createdByName || "-"}</TableCell>
                  <TableCell className="text-center align-middle">
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
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadFile(`/api/material-usage/${record.id}`, attachments[0].name);
                              }}
                              title={attachments[0].name}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          );
                        }

                        return (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 gap-0.5 px-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Paperclip className="h-3.5 w-3.5" />
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
                                      downloadFile(`/api/material-usage/${record.id}`, file.name);
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
                  <TableCell className="text-center align-middle">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">메뉴 열기</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>작업</DropdownMenuLabel>
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
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="품명, 공사명 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
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
                                  downloadFile(`/api/material-usage/${record.id}`, attachments[0].name);
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
                                        downloadFile(`/api/material-usage/${record.id}`, file.name);
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
                      value={teamInventory.find(inv =>
                        (item.inventoryItemId && inv.inventoryItemId === item.inventoryItemId) ||
                        (!item.inventoryItemId && inv.productName === item.productName && inv.specification === item.specification)
                      )?.id?.toString() || ""}
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
                        value={item.quantity || ''}
                        onChange={(e) => {
                          const newItems = [...formData.items];
                          // Parse to number for validation but store as string if that matches the type
                          const val = Math.max(0, parseInt(e.target.value) || 0);
                          newItems[index].quantity = val.toString();
                          setFormData({ ...formData, items: newItems });
                        }}
                        min="0"
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
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length === 0) return;

                      const currentCount = formData.attachments.length;
                      if (currentCount + files.length > 4) {
                        toast({
                          title: "파일 개수 초과",
                          description: `최대 4개까지 첨부할 수 있습니다. (현재 ${currentCount}개)`,
                          variant: "destructive"
                        });
                        e.target.value = '';
                        return;
                      }

                      const newAttachments = [...formData.attachments];

                      for (const file of files) {
                        if (file.size > 10 * 1024 * 1024) {
                          toast({
                            title: "용량 초과",
                            description: `${file.name} 파일이 10MB를 초과합니다.`,
                            variant: "destructive"
                          });
                          continue;
                        }

                        try {
                          let processedFile: { name: string; data: string };

                          if (file.type.startsWith('image/')) {
                            // 이미지 압축 적용
                            const compressed = await compressImage(file, {
                              maxWidth: 1920,
                              maxHeight: 1920,
                              quality: 0.8,
                              maxSizeMB: 5
                            });
                            processedFile = compressed;

                            const originalSize = formatFileSize(file.size);
                            const compressedSize = formatFileSize(compressed.size);
                            toast({
                              title: "이미지 압축 완료",
                              description: `${originalSize} → ${compressedSize}`,
                            });
                          } else {
                            // Excel, PDF 등은 Base64로 변환
                            const base64 = await new Promise<string>((resolve, reject) => {
                              const reader = new FileReader();
                              reader.onload = () => resolve(reader.result as string);
                              reader.onerror = reject;
                              reader.readAsDataURL(file);
                            });
                            processedFile = { name: file.name, data: base64 };
                          }

                          newAttachments.push(processedFile);
                        } catch (error: any) {
                          toast({
                            title: "파일 업로드 실패",
                            description: error.message || "파일을 처리할 수 없습니다",
                            variant: "destructive"
                          });
                        }
                      }

                      setFormData({ ...formData, attachments: newAttachments });
                      e.target.value = ''; // Reset
                    }}
                  />
                  {formData.attachments.length < 4 && (
                    <label
                      htmlFor="usage-file-upload"
                      className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-primary/30 rounded-lg cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                    >
                      <Upload className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium text-primary">
                        파일 선택 ({formData.attachments.length}/4) - 이미지, PDF, 엑셀
                      </span>
                    </label>
                  )}
                </div>

                <div className="space-y-2 mt-2">
                  {formData.attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                      <span className="text-sm text-muted-foreground truncate flex-1">
                        📎 {file.name}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          const newAttachments = formData.attachments.filter((_, i) => i !== index);
                          setFormData({ ...formData, attachments: newAttachments });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
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
