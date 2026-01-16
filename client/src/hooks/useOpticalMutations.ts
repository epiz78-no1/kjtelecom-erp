import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { OpticalCableFormData } from "@/components/OpticalCableFormDialog";

/**
 * 광케이블 생성 뮤테이션 훅
 */
export function useCreateOpticalCable() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: OpticalCableFormData) => {
            const res = await apiRequest("POST", "/api/optical-cables", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables"] });
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables/logs"] });
            toast({ title: "광케이블이 등록되었습니다" });
        },
        onError: (error: Error) => {
            toast({ title: "등록 실패", description: error.message, variant: "destructive" });
        },
    });
}

/**
 * 광케이블 수정 뮤테이션 훅
 */
export function useUpdateOpticalCable() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: OpticalCableFormData }) => {
            const res = await apiRequest("PATCH", `/api/optical-cables/${id}`, data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables"] });
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables/logs"] });
            toast({ title: "광케이블 정보가 수정되었습니다" });
        },
        onError: (error: Error) => {
            toast({ title: "수정 실패", description: error.message, variant: "destructive" });
        },
    });
}

/**
 * 광케이블 삭제 뮤테이션 훅
 */
export function useDeleteOpticalCable() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            return apiRequest("POST", "/api/optical-cables/bulk-delete", { ids: [id] });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables"] });
            toast({ title: "광케이블이 삭제되었습니다" });
        },
        onError: (error: Error) => {
            toast({ title: "삭제 실패", description: error.message, variant: "destructive" });
        },
    });
}

/**
 * 광케이블 일괄 삭제 뮤테이션 훅
 */
export function useBulkDeleteOpticalCables() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (ids: string[]) => {
            return apiRequest("POST", "/api/optical-cables/bulk-delete", { ids });
        },
        onSuccess: (_, ids) => {
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables"] });
            toast({ title: `${ids.length}개 항목이 삭제되었습니다` });
        },
        onError: () => {
            toast({ title: "삭제 실패", variant: "destructive" });
        },
    });
}

/**
 * 광케이블 일괄 업로드 뮤테이션 훅
 */
export function useBulkUploadOpticalCables() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (items: any[]) => {
            const res = await apiRequest("POST", "/api/optical-cables/bulk", { items });
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables"] });
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables/logs"] });
            toast({ title: `${data.length}개 항목이 일괄 등록되었습니다` });
        },
        onError: (error: Error) => {
            toast({ title: "일괄 등록 실패", description: error.message, variant: "destructive" });
        },
    });
}

/**
 * 광케이블 로그 삭제 뮤테이션 훅
 */
export function useDeleteOpticalLog() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            return apiRequest("DELETE", `/api/optical-cables/logs/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables"] });
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables/logs"] });
            toast({ title: "로그가 삭제되었습니다" });
        },
        onError: () => {
            toast({ title: "삭제 실패", variant: "destructive" });
        },
    });
}

/**
 * 광케이블 로그 일괄 삭제 뮤테이션 훅
 */
export function useBulkDeleteOpticalLogs() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (ids: string[]) => {
            return apiRequest("POST", "/api/optical-cables/logs/bulk-delete", { ids });
        },
        onSuccess: (_, ids) => {
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables"] });
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables/logs"] });
            toast({ title: `${ids.length}개 항목이 삭제되었습니다` });
        },
        onError: () => {
            toast({ title: "삭제 실패", variant: "destructive" });
        },
    });
}

/**
 * 광케이블 로그 수정 뮤테이션 훅
 */
export function useUpdateOpticalLog() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            const res = await apiRequest("PATCH", `/api/optical-cables/logs/${id}`, data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables"] });
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables/logs"] });
            toast({ title: "로그가 수정되었습니다" });
        },
        onError: (error: Error) => {
            toast({ title: "수정 실패", description: error.message, variant: "destructive" });
        },
    });
}

/**
 * 반납 승인/반려 뮤테이션 훅
 */
export function useReturnApproval() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, action }: { id: string; action: 'approve' | 'reject' }) => {
            return apiRequest("POST", `/api/optical-cables/${id}/approve-return`, { action });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables"] });
            toast({ title: "반납 처리가 완료되었습니다" });
        },
        onError: (error: Error) => {
            toast({ title: "처리 실패", description: error.message, variant: "destructive" });
        },
    });
}

/**
 * 광케이블 일괄 출고 뮤테이션 훅
 */
export function useBulkAssignOpticalCables() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (items: any[]) => {
            const res = await apiRequest("POST", "/api/optical-cables/bulk-assign", { items });
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables"] });
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables/logs"] });
            toast({ title: `${data.length}개 항목이 일괄 출고되었습니다` });
        },
        onError: (error: Error) => {
            toast({ title: "일괄 출고 실패", description: error.message, variant: "destructive" });
        },
    });
}

