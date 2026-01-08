import { useState } from "react";

/**
 * 다이얼로그 상태 관리 훅
 * 
 * 다이얼로그 열기/닫기 및 편집 중인 아이템 상태를 관리합니다.
 * 
 * @template T - 편집할 아이템의 타입
 * 
 * @example
 * ```tsx
 * const { open, editingItem, handleOpen, handleClose } = useDialogState<InventoryItem>();
 * 
 * // 새 아이템 추가
 * <Button onClick={() => handleOpen()}>추가</Button>
 * 
 * // 기존 아이템 수정
 * <Button onClick={() => handleOpen(item)}>수정</Button>
 * 
 * // 다이얼로그
 * <Dialog open={open} onOpenChange={handleClose}>
 *   {editingItem ? '수정' : '추가'}
 * </Dialog>
 * ```
 */
export function useDialogState<T = any>() {
    const [open, setOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<T | null>(null);

    /**
     * 다이얼로그 열기
     * @param item - 편집할 아이템 (없으면 새로 추가 모드)
     */
    const handleOpen = (item?: T) => {
        setEditingItem(item || null);
        setOpen(true);
    };

    /**
     * 다이얼로그 닫기 및 상태 초기화
     */
    const handleClose = () => {
        setOpen(false);
        setEditingItem(null);
    };

    return {
        /** 다이얼로그 열림 상태 */
        open,
        /** 편집 중인 아이템 (없으면 null) */
        editingItem,
        /** 다이얼로그 열기 함수 */
        handleOpen,
        /** 다이얼로그 닫기 함수 */
        handleClose,
        /** 다이얼로그 열림 상태 직접 설정 (특수한 경우에만 사용) */
        setOpen,
        /** 편집 중인 아이템 직접 설정 (특수한 경우에만 사용) */
        setEditingItem,
    };
}
