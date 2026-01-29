import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export interface UseMaterialUsageCRUDOptions {
    /**
     * API 엔드포인트 (예: "/api/material-usage")
     */
    apiEndpoint: string;

    /**
     * 생성 성공 시 추가 콜백
     */
    onCreateSuccess?: () => void;

    /**
     * 수정 성공 시 추가 콜백
     */
    onUpdateSuccess?: () => void;

    /**
     * 삭제 성공 시 추가 콜백
     */
    onDeleteSuccess?: () => void;

    /**
     * 일괄 삭제 성공 시 추가 콜백
     */
    onBulkDeleteSuccess?: (count: number) => void;

    /**
     * 무효화할 추가 쿼리 키 목록
     */
    additionalInvalidateKeys?: string[];
}

/**
 * 자재 관련 CRUD Mutation을 제공하는 Hook
 * 
 * @example
 * ```tsx
 * const { createMutation, updateMutation, deleteMutation, bulkDeleteMutation } = 
 *   useMaterialUsageCRUD({
 *     apiEndpoint: "/api/material-usage",
 *     additionalInvalidateKeys: ["/api/teams", "/api/inventory"]
 *   });
 * ```
 */
export function useMaterialUsageCRUD(options: UseMaterialUsageCRUDOptions) {
    const { toast } = useToast();
    const {
        apiEndpoint,
        onCreateSuccess,
        onUpdateSuccess,
        onDeleteSuccess,
        onBulkDeleteSuccess,
        additionalInvalidateKeys = []
    } = options;

    /**
     * 쿼리 무효화 헬퍼 함수
     */
    const invalidateQueries = () => {
        queryClient.invalidateQueries({ queryKey: [apiEndpoint] });
        additionalInvalidateKeys.forEach(key => {
            queryClient.invalidateQueries({ queryKey: [key] });
        });
    };

    /**
     * 생성 Mutation
     */
    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            return apiRequest("POST", apiEndpoint, data);
        },
        onSuccess: () => {
            invalidateQueries();
            toast({
                title: "등록 완료",
                description: "자재 사용이 등록되었습니다."
            });
            onCreateSuccess?.();
        },
        onError: (error: any) => {
            const errorMessage = error?.message || "등록 실패";
            toast({
                title: "등록 실패",
                description: errorMessage,
                variant: "destructive"
            });
        }
    });

    /**
     * 수정 Mutation
     */
    const updateMutation = useMutation({
        mutationFn: async ({ id, ...data }: any) => {
            return apiRequest("PATCH", `${apiEndpoint}/${id}`, data);
        },
        onSuccess: () => {
            invalidateQueries();
            toast({
                title: "수정 완료",
                description: "자재 사용이 수정되었습니다."
            });
            onUpdateSuccess?.();
        },
        onError: (error: any) => {
            const errorMessage = error?.message || "수정 실패";
            toast({
                title: "수정 실패",
                description: errorMessage,
                variant: "destructive"
            });
        }
    });

    /**
     * 삭제 Mutation
     */
    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            return apiRequest("DELETE", `${apiEndpoint}/${id}`);
        },
        onSuccess: () => {
            invalidateQueries();
            toast({
                title: "삭제 완료",
                description: "자재 사용이 삭제되었습니다."
            });
            onDeleteSuccess?.();
        },
        onError: (error: any) => {
            const errorMessage = error?.message || "삭제 실패";
            toast({
                title: "삭제 실패",
                description: errorMessage,
                variant: "destructive"
            });
        }
    });

    /**
     * 일괄 삭제 Mutation
     */
    const bulkDeleteMutation = useMutation({
        mutationFn: async (ids: number[]) => {
            return apiRequest("POST", `${apiEndpoint}/bulk-delete`, { ids });
        },
        onSuccess: (_data, ids) => {
            invalidateQueries();
            toast({
                title: "삭제 완료",
                description: `${ids.length}건이 삭제되었습니다.`
            });
            onBulkDeleteSuccess?.(ids.length);
        },
        onError: (error: any) => {
            const errorMessage = error?.message || "삭제 실패";
            toast({
                title: "삭제 실패",
                description: errorMessage,
                variant: "destructive"
            });
        }
    });

    return {
        createMutation,
        updateMutation,
        deleteMutation,
        bulkDeleteMutation
    };
}
