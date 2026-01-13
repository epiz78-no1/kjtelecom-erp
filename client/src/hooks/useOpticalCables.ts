import { useQuery } from "@tanstack/react-query";
import type { OpticalCable, OpticalCableLog } from "@shared/schema";

/**
 * 광케이블 목록 조회 훅
 */
export function useOpticalCables() {
    return useQuery<OpticalCable[]>({
        queryKey: ["/api/optical-cables"],
    });
}

/**
 * 단일 광케이블 조회 훅
 */
export function useOpticalCable(id: string | null) {
    return useQuery<OpticalCable>({
        queryKey: ["/api/optical-cables", id],
        enabled: !!id,
    });
}

/**
 * 광케이블 로그 목록 조회 훅
 * @param filters - 필터 옵션 (type, teamId)
 */
export function useOpticalLogs(filters?: { type?: string; teamId?: string }) {
    const queryKey = filters
        ? ["/api/optical-cables/logs", filters]
        : ["/api/optical-cables/logs"];

    return useQuery<(OpticalCableLog & { cable: OpticalCable | null })[]>({
        queryKey,
    });
}

/**
 * 특정 광케이블의 이력 조회 훅
 */
export function useOpticalCableHistory(cableId: string | null) {
    return useQuery<OpticalCableLog[]>({
        queryKey: ["/api/optical-cables", cableId, "logs"],
        enabled: !!cableId,
    });
}
