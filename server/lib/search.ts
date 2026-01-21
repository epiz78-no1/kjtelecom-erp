/**
 * 서버 사이드 검색 유틸리티
 */

export interface SearchParams {
    query: string;
    fields?: string[]; // 검색할 필드들
    caseSensitive?: boolean;
}

/**
 * 다중 필드 검색
 */
export function searchInFields<T extends Record<string, any>>(
    items: T[],
    searchParams: SearchParams
): T[] {
    const { query, fields, caseSensitive = false } = searchParams;

    if (!query || query.trim() === '') {
        return items;
    }

    const searchTerm = caseSensitive ? query : query.toLowerCase();

    return items.filter(item => {
        // 필드 지정이 없으면 모든 문자열 필드에서 검색
        const fieldsToSearch = fields ||
            Object.keys(item).filter(key => typeof item[key] === 'string');

        return fieldsToSearch.some(field => {
            const value = item[field];
            if (value == null) return false;

            const stringValue = String(value);
            const compareValue = caseSensitive ? stringValue : stringValue.toLowerCase();

            return compareValue.includes(searchTerm);
        });
    });
}

/**
 * 쿼리 파라미터에서 검색어 추출
 */
export function parseSearchQuery(query: any): string {
    return (query.q || query.search || query.query || '').trim();
}
