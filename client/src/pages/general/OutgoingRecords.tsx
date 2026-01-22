import { exportToExcel } from "@/lib/excel";
import * as XLSX from "xlsx";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, Trash2, Pencil, Loader2, Upload, Download, MoreHorizontal, Paperclip, FileText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/SearchInput";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { GenericBulkUploadDialog } from "@/components/GenericBulkUploadDialog";
import { validateOutgoingRow, transformOutgoingRow, outgoingColumns, type ParsedOutgoingRow } from "@/lib/bulk-configs/outgoing";
import { OutgoingDialog } from "@/components/OutgoingDialog";
import { useAppContext } from "@/contexts/AppContext";
import { useColumnResize } from "@/hooks/useColumnResize";


import { useDownload } from "@/hooks/useDownload";
import { useDialogState } from "@/hooks/useDialogState";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { InfiniteScrollLoader } from "@/components/InfiniteScrollLoader";
import { MATERIAL_OUTGOING_COLUMNS } from "@/lib/material-table-columns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function OutgoingRecords() {
  const { toast } = useToast();
  const { checkPermission, tenants, currentTenant } = useAppContext();
  const isTenantOwner = tenants.find(t => t.id === currentTenant)?.role === 'owner';
  const { downloadFile, downloadAttachment } = useDownload();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [deleteRecord, setDeleteRecord] = useState<OutgoingRecord | null>(null);
  const { open: dialogOpen, editingItem: editingRecord, handleOpen: openDialog, handleClose: closeDialog, setOpen: setDialogOpen } = useDialogState<OutgoingRecord>();

  const { widths, startResizing } = useColumnResize(MATERIAL_OUTGOING_COLUMNS);

  const canWrite = checkPermission("outgoing", "write");

  const { data: records = [], isLoading } = useQuery<OutgoingRecord[]>({
    queryKey: ["/api/outgoing"],
    queryFn: async () => {
      const res = await fetch("/api/outgoing");
      if (!res.ok) throw new Error("Failed to fetch records");
      return res.json();
    }
  });

  const { data: inventoryItems = [] } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  const { data: teams = [] } = useQuery<any[]>({
    queryKey: ["/api/teams"],
  });

  const { data: members = [] } = useQuery<any[]>({
    queryKey: ["/api/members/basic"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => apiRequest("PATCH", `/api/outgoing/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/outgoing"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({ title: "출고가 수정되었습니다" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/outgoing/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/outgoing"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({ title: "출고가 삭제되었습니다" });
      setDeleteRecord(null);
    },
    onError: (error: Error) => {
      toast({ title: "출고 삭제 실패", description: error.message, variant: "destructive" });
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => apiRequest("POST", "/api/outgoing/bulk-delete", { ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/outgoing"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({ title: `${selectedIds.size}건이 삭제되었습니다` });
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "일괄 삭제 실패", description: error.message, variant: "destructive" });
    }
  });

  const bulkUploadMutation = useMutation({
    mutationFn: async ({ items, mode }: { items: any[], mode: 'overwrite' | 'add' }) => {
      const response = await apiRequest("POST", "/api/outgoing/bulk", { items, mode });
      return await response.json();
    },
    onSuccess: (data: any[]) => {
      queryClient.invalidateQueries({ queryKey: ["/api/outgoing"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({ title: `${data.length}건의 출고내역이 일괄 등록되었습니다` });
      setBulkUploadOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "일괄등록 실패", description: error.message, variant: "destructive" });
    }
  });

  const filteredRecords = useMemo(() =>
    records.filter(
      (record) =>
        (record.productName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (record.projectName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (record.recipient || "").toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [records, searchQuery]
  );

  const {
    items: displayRecords,
    hasMore,
    isLoading: scrollLoading,
    observerRef
  } = useInfiniteScroll(filteredRecords, {
    initialPageSize: 100,
    pageSize: 100
  });

  const totalQuantity = filteredRecords.reduce((sum, r) => sum + r.quantity, 0);
  const allSelected = displayRecords.length > 0 && displayRecords.every(r => selectedIds.has(r.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayRecords.map(r => r.id)));
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

  const openAddDialog = () => openDialog();
  const openEditDialog = (record: OutgoingRecord) => openDialog(record);

  const handleDialogSubmit = async (data: {
    date: Date;
    division: string;
    projectName: string;
    items: Array<{
      id: string;
      productName: string;
      specification: string;
      quantity: string;
      inventoryItemId?: number;
      remark: string;
    }>;
    teamId?: string;
    recipient: string;
    attachments: { name: string; storageUrl: string; storagePath: string }[];
  }) => {
    const validItems = data.items.filter(item => item.productName && item.quantity);

    if (validItems.length === 0) {
      toast({ title: "품목 누락", description: "최소 하나의 유효한 품목을 입력해주세요.", variant: "destructive" });
      return;
    }

    // 수정 모드
    if (editingRecord) {
      const item = validItems[0];
      const attributesObj: any = {};

      // Handle attachments
      if (data.attachments && data.attachments.length > 0) {
        attributesObj.attachments = data.attachments;
        attributesObj.attachment = data.attachments[0];
      }

      const payload = {
        date: format(data.date, "yyyy-MM-dd"),
        division: data.division,
        projectName: data.projectName,
        productName: item.productName,
        specification: item.specification,
        quantity: parseInt(item.quantity) || 0,
        attributes: JSON.stringify(attributesObj),
        remark: item.remark,
        inventoryItemId: item.inventoryItemId,
        teamId: data.teamId,
        recipient: data.recipient,
      };

      closeDialog();
      toast({ title: "수정중입니다", description: "잠시만 기다려주세요." });

      try {
        await updateMutation.mutateAsync({ ...payload, id: editingRecord.id } as any);
      } catch (error) {
        // Error handled by mutation
      }
      return;
    }

    // 등록 모드 - 다중 저장
    try {
      closeDialog();
      toast({ title: "등록중입니다", description: `${validItems.length}건의 출고 등록을 진행합니다.` });

      let successCount = 0;

      for (let i = 0; i < validItems.length; i++) {
        const item = validItems[i];
        const attributesObj: any = {};

        // Attachment only on first item (or handled per item if logic allowed)
        if (i === 0) {
          if (data.attachments && data.attachments.length > 0) {
            attributesObj.attachments = data.attachments;
            attributesObj.attachment = data.attachments[0];
          }
        }

        const payload = {
          date: format(data.date, "yyyy-MM-dd"),
          division: data.division,
          projectName: data.projectName,
          productName: item.productName,
          specification: item.specification,
          quantity: parseInt(item.quantity) || 0,
          attributes: JSON.stringify(attributesObj),
          remark: item.remark,
          inventoryItemId: item.inventoryItemId,
          teamId: data.teamId,
          recipient: data.recipient
        };

        await apiRequest("POST", "/api/outgoing", payload);
        successCount++;
      }

      queryClient.invalidateQueries({ queryKey: ["/api/outgoing"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({ title: "등록 완료", description: `${successCount}건의 출고 내역이 저장되었습니다.` });

    } catch (error: any) {
      toast({
        title: "등록 실패",
        description: error.message || "오류가 발생했습니다",
        variant: "destructive"
      });
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
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-zinc-950/50 p-2 overflow-hidden">
      {/* Header Section */}
      {/* Ultra Compact Header Section */}
      <div className="flex flex-col gap-2 flex-shrink-0 mb-2 pt-1">
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
              출고 내역
              <span className="flex h-1.5 w-1.5 rounded-full bg-orange-500 shadow-sm shadow-orange-500/50 animate-pulse"></span>
            </h1>
            <div className="h-3 w-px bg-slate-200 dark:bg-slate-800"></div>
            <span className="text-xs font-medium text-slate-500">{filteredRecords.length} Records</span>
          </div>

          <div className="flex items-center gap-1.5">
            {selectedIds.size > 0 && isTenantOwner && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => setBulkDeleteOpen(true)}
                      disabled={bulkDeleteMutation.isPending || !canWrite}
                      className="h-7 w-7 rounded-md shadow-sm"
                    >
                      {bulkDeleteMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">선택 삭제 ({selectedIds.size})</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="검색..."
              className="w-32 focus:w-48 h-7 text-xs rounded-md bg-white border-slate-200 focus:ring-1 focus:ring-primary/20 transition-all font-normal"
            />

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-md text-emerald-600 hover:bg-emerald-50"
                    onClick={() => exportToExcel(filteredRecords, "출고내역")}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Excel 다운로드</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <DropdownMenu>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button disabled={!canWrite} size="icon" className="h-7 w-7 rounded-md bg-primary hover:bg-primary/90 shadow-sm">
                        <Plus className="h-3.5 w-3.5 text-white" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">출고 등록</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DropdownMenuContent align="end" className="w-32 p-1">
                <DropdownMenuItem onSelect={openAddDialog} className="text-xs py-1.5 cursor-pointer rounded-md">
                  <Plus className="h-3 w-3 mr-2 text-primary" />
                  직접 등록
                </DropdownMenuItem>
                {isTenantOwner && (
                  <DropdownMenuItem onSelect={() => setBulkUploadOpen(true)} className="text-xs py-1.5 cursor-pointer rounded-md">
                    <Upload className="h-3 w-3 mr-2 text-blue-600" />
                    일괄 등록
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="flex-1 rounded-3xl border border-slate-200 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-xl shadow-slate-200/50 dark:shadow-black/50 overflow-hidden flex flex-col relative z-0">
        <div className="flex-1 overflow-auto custom-scrollbar relative">
          <Table className="w-full text-sm border-collapse table-fixed">
            <TableHeader className="sticky top-0 bg-slate-50/95 backdrop-blur z-20 shadow-sm">
              <TableRow className="h-10 border-b border-slate-200">
                <TableHead className="w-[40px] text-center p-0">
                  {isTenantOwner && <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} className="translate-y-[2px]" />}
                </TableHead>
                <TableHead className="font-semibold text-slate-600 text-center text-xs" style={{ width: widths.date }}>출고일<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 z-50" onMouseDown={(e) => startResizing("date", e)} /></TableHead>
                <TableHead className="font-semibold text-slate-600 text-center text-xs" style={{ width: widths.division }}>사업<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 z-50" onMouseDown={(e) => startResizing("division", e)} /></TableHead>
                <TableHead className="font-semibold text-slate-600 text-center text-xs" style={{ width: widths.project }}>공사명<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 z-50" onMouseDown={(e) => startResizing("project", e)} /></TableHead>
                <TableHead className="font-semibold text-slate-600 text-center text-xs" style={{ width: widths.product }}>품명<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 z-50" onMouseDown={(e) => startResizing("product", e)} /></TableHead>
                <TableHead className="font-semibold text-slate-600 text-center text-xs" style={{ width: widths.spec }}>규격<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 z-50" onMouseDown={(e) => startResizing("spec", e)} /></TableHead>
                <TableHead className="font-semibold text-orange-600 text-center text-xs" style={{ width: widths.quantity }}>수량<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 z-50" onMouseDown={(e) => startResizing("quantity", e)} /></TableHead>
                <TableHead className="font-semibold text-slate-600 text-center text-xs" style={{ width: widths.team }}>현장팀<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 z-50" onMouseDown={(e) => startResizing("team", e)} /></TableHead>
                <TableHead className="font-semibold text-slate-600 text-center text-xs" style={{ width: widths.recipient }}>수령자<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 z-50" onMouseDown={(e) => startResizing("recipient", e)} /></TableHead>
                <TableHead className="font-semibold text-slate-600 text-center text-xs" style={{ width: widths.remark }}>비고<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 z-50" onMouseDown={(e) => startResizing("remark", e)} /></TableHead>
                <TableHead className="font-semibold text-slate-600 text-center text-xs" style={{ width: widths.author }}>입력자<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 z-50" onMouseDown={(e) => startResizing("author", e)} /></TableHead>
                <TableHead className="font-semibold text-slate-600 text-center text-xs" style={{ width: widths.attachment }}>첨부<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => startResizing("attachment", e)} /></TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayRecords.length === 0 && filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} className="h-64 border-none p-0">
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                      <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                        <Search className="h-6 w-6 text-slate-400" />
                      </div>
                      <p className="font-medium text-slate-900">검색 결과가 없습니다</p>
                      <p className="text-sm text-slate-500 mt-1">새로운 출고 내역을 등록해보세요</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {displayRecords.map((record) => {
                    return (
                      <TableRow key={record.id} className="h-[40px] border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                        <TableCell className="text-center p-0">
                          {isTenantOwner && <Checkbox checked={selectedIds.has(record.id)} onCheckedChange={() => toggleSelect(record.id)} />}
                        </TableCell>
                        <TableCell className="text-center text-xs text-slate-600 p-0 border-r border-slate-100/50">{format(new Date(record.date), "yyyy-MM-dd")}</TableCell>
                        <TableCell className="text-center text-xs text-slate-600 p-0 border-r border-slate-100/50">{record.division}</TableCell>
                        <TableCell className="text-left px-2 text-xs text-slate-700 font-medium border-r border-slate-100/50 truncate max-w-[200px]" title={record.projectName || ""}>{record.projectName}</TableCell>
                        <TableCell className="text-center px-2 text-xs text-slate-700 p-0 border-r border-slate-100/50 truncate max-w-[200px]" title={record.productName}>{record.productName}</TableCell>
                        <TableCell className="text-center text-xs text-slate-600 p-0 border-r border-slate-100/50 truncate max-w-[100px]" title={record.specification || ""}>{record.specification}</TableCell>
                        <TableCell className="text-center px-2 text-xs font-bold text-orange-600 p-0 border-r border-slate-100/50 bg-orange-50/30">{record.quantity.toLocaleString()}</TableCell>
                        <TableCell className="text-center text-xs text-slate-600 p-0 border-r border-slate-100/50">
                          {teams.find(t => t.id === record.teamId)?.name || "-"}
                        </TableCell>
                        <TableCell className="text-center text-xs text-slate-600 p-0 border-r border-slate-100/50 truncate max-w-[100px]" title={record.recipient || ""}>{record.recipient}</TableCell>
                        <TableCell className="text-left px-2 text-xs text-slate-500 p-0 border-r border-slate-100/50 truncate max-w-[150px]" title={record.remark || ""}>{record.remark}</TableCell>
                        <TableCell className="text-center text-xs text-slate-500 p-0 border-r border-slate-100/50 truncate max-w-[80px]">{(record as any).createdByName}</TableCell>
                        <TableCell className="text-center p-0 border-r border-slate-100/50">
                          {(() => {
                            let hasAttachments = false;
                            let attachments: any[] = [];
                            try {
                              const parsed = typeof record.attributes === 'string'
                                ? JSON.parse(record.attributes)
                                : record.attributes || {};

                              if (parsed.attachments && parsed.attachments.length > 0) {
                                attachments = parsed.attachments;
                                hasAttachments = true;
                              } else if (parsed.attachment) {
                                attachments = [parsed.attachment];
                                hasAttachments = true;
                              } else if ((record as any).attachment) { // Legacy fallback
                                attachments = [(record as any).attachment];
                                hasAttachments = true;
                              }
                            } catch (e) {
                              hasAttachments = false;
                            }

                            if (!hasAttachments) return <span className="text-slate-300">-</span>;

                            if (attachments.length === 1) {
                              return (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    downloadAttachment(attachments[0]);
                                  }}
                                  title={attachments[0].name}
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </Button>
                              );
                            }

                            return (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 gap-1 px-1.5 hover:bg-blue-50 hover:text-blue-600"
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
                          })()}
                        </TableCell>
                        <TableCell className="text-center p-0">
                          {canWrite && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-slate-600">
                                  <MoreHorizontal className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-[100px]">
                                <DropdownMenuItem onClick={() => openEditDialog(record)} className="text-xs">
                                  <Pencil className="h-3 w-3 mr-2" />
                                  수정
                                </DropdownMenuItem>
                                {isTenantOwner && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setDeleteRecord(record)} className="text-xs text-red-600 focus:text-red-600">
                                      <Trash2 className="h-3 w-3 mr-2" />
                                      삭제
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </>
              )}
            </TableBody>
          </Table>

          <InfiniteScrollLoader
            observerRef={observerRef}
            isLoading={scrollLoading}
            hasMore={hasMore}
            itemCount={displayRecords.length}
            totalCount={filteredRecords.length}
          />
        </div>
      </div>

      <OutgoingDialog
        open={dialogOpen}
        onClose={closeDialog}
        editingRecord={editingRecord}
        onSubmit={handleDialogSubmit}
        inventoryItems={inventoryItems}
        teams={teams}
        members={members}
      />

      <GenericBulkUploadDialog<ParsedOutgoingRow>
        open={bulkUploadOpen}
        onOpenChange={setBulkUploadOpen}
        title="출고 내역 일괄 등록"
        description="엑셀 파일을 업로드하여 출고 내역을 일괄 등록합니다."
        columns={outgoingColumns}
        onUpload={async (items, mode) => {
          await bulkUploadMutation.mutateAsync({ items, mode: mode || 'overwrite' });
        }}
        transformRow={transformOutgoingRow}
        validateRow={validateOutgoingRow}
        onDownloadTemplate={async () => {
          // simplified local template generation
          const ws = XLSX.utils.json_to_sheet([
            {
              "출고일자": "2024-03-20",
              "사업구분": "SKT",
              "현장팀": "1팀",
              "수령자": "홍길동",
              "공사명": "2024년 정기공사",
              "품명": "광점퍼코드",
              "규격": "SC/APC-SC/APC 3M",
              "수량": "50",
              "비고": "현장출고"
            }
          ]);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "출고내역_업로드양식");
          XLSX.writeFile(wb, "출고내역_업로드양식.xlsx");
        }}
      />

      <AlertDialog open={!!deleteRecord} onOpenChange={() => setDeleteRecord(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>출고 내역 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말 삭제하시겠습니까? 삭제된 데이터는 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => deleteRecord && deleteMutation.mutate(deleteRecord.id)}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>일괄 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              선택한 {selectedIds.size}개의 출고 내역을 영구적으로 삭제하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={confirmBulkDelete}
            >
              일괄 삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div >
  );
}
