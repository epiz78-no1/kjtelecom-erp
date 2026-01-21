import { useState, useMemo } from 'react';

export interface PaginationState {
    page: number;
    pageSize: number;
    totalItems: number;
}

export interface UsePaginationResult {
    page: number;
    pageSize: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    goToPage: (page: number) => void;
    nextPage: () => void;
    previousPage: () => void;
    setPageSize: (size: number) => void;
    startIndex: number;
    endIndex: number;
}

/**
 * 클라이언트 사이드 페이지네이션 훅
 */
export function usePagination(
    totalItems: number,
    initialPageSize: number = 50
): UsePaginationResult {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(initialPageSize);

    const totalPages = Math.ceil(totalItems / pageSize);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;
    const startIndex = (page - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);

    const goToPage = (newPage: number) => {
        const validPage = Math.max(1, Math.min(newPage, totalPages));
        setPage(validPage);
    };

    const nextPage = () => {
        if (hasNextPage) setPage(page + 1);
    };

    const previousPage = () => {
        if (hasPreviousPage) setPage(page - 1);
    };

    const handleSetPageSize = (size: number) => {
        setPageSize(size);
        setPage(1); // 페이지 크기 변경 시 첫 페이지로
    };

    return {
        page,
        pageSize,
        totalPages,
        hasNextPage,
        hasPreviousPage,
        goToPage,
        nextPage,
        previousPage,
        setPageSize: handleSetPageSize,
        startIndex,
        endIndex
    };
}

/**
 * 배열 데이터 페이지네이션
 */
export function paginateData<T>(
    data: T[],
    page: number,
    pageSize: number
): T[] {
    const startIndex = (page - 1) * pageSize;
    return data.slice(startIndex, startIndex + pageSize);
}
