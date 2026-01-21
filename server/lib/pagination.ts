/**
 * 페이지네이션 유틸리티
 */

export interface PaginationParams {
    page: number;
    pageSize: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface PaginationResult<T> {
    data: T[];
    pagination: {
        page: number;
        pageSize: number;
        totalItems: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
    };
}

/**
 * 배열 데이터에 페이지네이션 적용
 */
export function paginateArray<T>(
    data: T[],
    params: PaginationParams
): PaginationResult<T> {
    const { page = 1, pageSize = 50 } = params;

    const totalItems = data.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    const paginatedData = data.slice(startIndex, endIndex);

    return {
        data: paginatedData,
        pagination: {
            page,
            pageSize,
            totalItems,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1
        }
    };
}

/**
 * 쿼리 파라미터에서 페이지네이션 정보 추출
 */
export function parsePaginationParams(query: any): PaginationParams {
    const page = parseInt(query.page as string) || 1;
    const pageSize = parseInt(query.pageSize as string) || 50;
    const sortBy = query.sortBy as string;
    const sortOrder = (query.sortOrder as 'asc' | 'desc') || 'desc';

    return {
        page: Math.max(1, page),
        pageSize: Math.min(Math.max(1, pageSize), 100), // 최대 100개
        sortBy,
        sortOrder
    };
}

/**
 * 데이터 정렬
 */
export function sortData<T>(
    data: T[],
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'desc'
): T[] {
    if (!sortBy) return data;

    return [...data].sort((a, b) => {
        const aValue = (a as any)[sortBy];
        const bValue = (b as any)[sortBy];

        if (aValue === bValue) return 0;

        const comparison = aValue > bValue ? 1 : -1;
        return sortOrder === 'asc' ? comparison : -comparison;
    });
}
