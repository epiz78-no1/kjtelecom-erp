import { useEffect, useRef, useState, useCallback } from 'react';

export interface UseInfiniteScrollOptions {
    initialPageSize?: number;
    pageSize?: number;
    threshold?: number; // 스크롤 하단에서 얼마나 떨어졌을 때 로드할지 (px)
}

export interface UseInfiniteScrollResult<T> {
    items: T[];
    hasMore: boolean;
    isLoading: boolean;
    loadMore: () => void;
    reset: () => void;
    observerRef: (node: HTMLElement | null) => void;
}

/**
 * 무한 스크롤 훅
 * 
 * @example
 * const { items, hasMore, observerRef } = useInfiniteScroll(allData, {
 *   initialPageSize: 100,
 *   pageSize: 100
 * });
 */
export function useInfiniteScroll<T>(
    allData: T[] | undefined,
    options: UseInfiniteScrollOptions = {}
): UseInfiniteScrollResult<T> {
    const {
        initialPageSize = 100,
        pageSize = 100,
        threshold = 300
    } = options;

    const [displayCount, setDisplayCount] = useState(initialPageSize);
    const [isLoading, setIsLoading] = useState(false);
    const observer = useRef<IntersectionObserver | null>(null);

    const data = allData || [];
    const items = data.slice(0, displayCount);
    const hasMore = displayCount < data.length;

    const loadMore = useCallback(() => {
        if (isLoading || !hasMore) return;

        setIsLoading(true);
        // 실제 로딩 시뮬레이션 (부드러운 UX)
        setTimeout(() => {
            setDisplayCount(prev => Math.min(prev + pageSize, data.length));
            setIsLoading(false);
        }, 300);
    }, [isLoading, hasMore, pageSize, data.length]);

    const reset = useCallback(() => {
        setDisplayCount(initialPageSize);
    }, [initialPageSize]);

    // Intersection Observer를 사용한 자동 로딩
    const observerRef = useCallback((node: HTMLElement | null) => {
        if (isLoading) return;
        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMore) {
                    loadMore();
                }
            },
            {
                rootMargin: `${threshold}px`
            }
        );

        if (node) observer.current.observe(node);
    }, [isLoading, hasMore, loadMore, threshold]);

    // 데이터 변경 시 리셋
    useEffect(() => {
        reset();
    }, [data.length, reset]);

    return {
        items,
        hasMore,
        isLoading,
        loadMore,
        reset,
        observerRef
    };
}
