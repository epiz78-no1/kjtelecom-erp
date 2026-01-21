import { Loader2 } from "lucide-react";

interface InfiniteScrollLoaderProps {
    hasMore: boolean;
    isLoading: boolean;
    observerRef: (node: HTMLElement | null) => void;
    itemCount: number;
    totalCount: number;
}

export function InfiniteScrollLoader({
    hasMore,
    isLoading,
    observerRef,
    itemCount,
    totalCount
}: InfiniteScrollLoaderProps) {
    if (!hasMore && itemCount > 0) {
        return (
            <div className="py-8 text-center text-sm text-muted-foreground">
                전체 {totalCount.toLocaleString()}개 항목을 모두 표시했습니다
            </div>
        );
    }

    return (
        <div
            ref={observerRef}
            className="flex items-center justify-center py-8"
        >
            {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>로딩 중...</span>
                </div>
            ) : hasMore ? (
                <div className="text-sm text-muted-foreground">
                    {itemCount.toLocaleString()} / {totalCount.toLocaleString()}개 표시 중
                </div>
            ) : null}
        </div>
    );
}
