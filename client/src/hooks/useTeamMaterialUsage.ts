import { useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/contexts/AppContext";
import type { MaterialUsageRecord, InventoryItem, OutgoingRecord } from "@shared/schema";

interface UseTeamMaterialUsageProps {
    formData?: {
        teamCategory: string;
        productName?: string;
    };
    onDialogClose?: () => void;
    onDeleteRecordClose?: () => void;
    onBulkDeleteClose?: () => void;
    selectedIdsSize?: number;
}

export function useTeamMaterialUsage(props: UseTeamMaterialUsageProps = {}) {
    const { toast } = useToast();
    const { tenants, currentTenant, teams } = useAppContext();

    // 권한 체크
    const currentTenantData = tenants.find(t => t.id === currentTenant);
    const isFieldTeam = currentTenantData?.permissions &&
        currentTenantData.permissions.usage === 'write' &&
        currentTenantData.permissions.incoming === 'none' &&
        currentTenantData.permissions.outgoing === 'none' &&
        currentTenantData.permissions.inventory === 'none';

    const currentTeamName = isFieldTeam && currentTenantData?.teamId
        ? teams.find(t => t.id === currentTenantData.teamId)?.name
        : null;

    const shouldFetch = !isFieldTeam || (isFieldTeam && !!currentTeamName);

    // 데이터 조회
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

    // 권한 기반 필터링
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

    // 재고 아이템 조회
    const { data: inventoryItems = [] } = useQuery<InventoryItem[]>({
        queryKey: ["/api/inventory"],
    });

    // 출고 기록 조회
    const { data: outgoingRecords = [] } = useQuery<OutgoingRecord[]>({
        queryKey: ["/api/outgoing"],
    });

    // 카테고리 목록
    const categories = useMemo(() => {
        const cats = new Set(
            inventoryItems
                .map(item => item.category)
                .filter(c => c && c.trim() !== '')
        );
        return Array.from(cats).sort();
    }, [inventoryItems]);

    // 품명 목록
    const productNames = useMemo(() => {
        const names = new Set(
            inventoryItems
                .map(item => item.productName)
                .filter(name => name && name.trim() !== '')
        );
        return Array.from(names).sort();
    }, [inventoryItems]);

    // 규격 목록 (선택된 품명 기준)
    const getSpecifications = (productName: string) => {
        if (!productName) return [];
        const specs = inventoryItems
            .filter(item => item.productName === productName)
            .map(item => item.specification)
            .filter(spec => spec && spec.trim() !== '');
        return Array.from(new Set(specs)).sort();
    };

    // 팀 재고 계산
    const getTeamInventory = (teamCategory: string) => {
        if (!teamCategory) return [];

        const teamOutgoing = outgoingRecords.filter(r => r.teamCategory === teamCategory);
        if (teamOutgoing.length === 0) return [];

        const inventoryMap = new Map<string, {
            id: string;
            inventoryItemId?: number;
            productName: string;
            specification: string;
            division: string;
            category: string;
            type: string;
            received: number;
            used: number;
        }>();

        // 받은 수량 합산
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

        // 사용한 수량 합산
        const teamUsage = filteredRecordsByPermission.filter(r => r.teamCategory === teamCategory);
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

        // 잔량이 있는 항목만 반환
        return Array.from(inventoryMap.values())
            .map(item => ({
                ...item,
                remaining: item.received - item.used
            }))
            .filter(item => item.remaining > 0);
    };

    // Mutations
    const createMutation = useMutation({
        mutationFn: async (data: Omit<MaterialUsageRecord, "id" | "tenantId">) => {
            return apiRequest("POST", "/api/material-usage", data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/material-usage"] });
            queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
            toast({ title: "사용 내역이 등록되었습니다" });
            props.onDialogClose?.();
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
            props.onDeleteRecordClose?.();
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
            toast({ title: `${props.selectedIdsSize || 0}건이 삭제되었습니다` });
            props.onBulkDeleteClose?.();
        },
        onError: () => {
            toast({ title: "삭제 실패", variant: "destructive" });
        },
    });

    return {
        // 데이터
        records: filteredRecordsByPermission,
        inventoryItems,
        outgoingRecords,
        isLoading,

        // 파생 데이터
        categories,
        productNames,
        getSpecifications,
        getTeamInventory,

        // Mutations
        createMutation,
        updateMutation,
        deleteMutation,
        bulkDeleteMutation,

        // 권한 정보
        isFieldTeam,
        currentTeamName,
    };
}
