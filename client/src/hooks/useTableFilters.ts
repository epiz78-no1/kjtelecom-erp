import { useState, useMemo } from "react";

/**
 * 테이블 필터링 옵션
 */
export interface TableFiltersOptions<T> {
    /** 검색할 필드 목록 */
    searchFields?: (keyof T)[];
    /** 사업 구분 필드 */
    divisionField?: keyof T;
    /** 카테고리 필드 */
    categoryField?: keyof T;
}

/**
 * 테이블 필터링 훅
 * 
 * 검색, 사업 필터, 카테고리 필터 기능을 제공합니다.
 * 
 * @template T - 테이블 아이템의 타입
 * @param items - 필터링할 아이템 배열
 * @param options - 필터링 옵션
 * 
 * @example
 * ```tsx
 * const {
 *   searchQuery,
 *   setSearchQuery,
 *   selectedDivision,
 *   setSelectedDivision,
 *   selectedCategory,
 *   setSelectedCategory,
 *   filteredItems,
 *   categories
 * } = useTableFilters(items, {
 *   searchFields: ['productName', 'specification'],
 *   divisionField: 'division',
 *   categoryField: 'category'
 * });
 * ```
 */
export function useTableFilters<T extends Record<string, any>>(
    items: T[],
    options: TableFiltersOptions<T> = {}
) {
    const { searchFields = [], divisionField, categoryField } = options;

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedDivision, setSelectedDivision] = useState<string>("전체");
    const [selectedCategory, setSelectedCategory] = useState<string>("전체");

    // 카테고리 목록 추출
    const categories = useMemo(() => {
        if (!categoryField) return ["전체"];

        const categorySet = new Set(
            items
                .map((item) => item[categoryField])
                .filter((cat) => cat && String(cat).trim() !== "")
        );

        return ["전체", ...Array.from(categorySet)];
    }, [items, categoryField]);

    // 필터링된 아이템
    const filteredItems = useMemo(() => {
        let filtered = items;

        // 사업 필터
        if (divisionField && selectedDivision !== "전체" && selectedDivision !== "all") {
            filtered = filtered.filter((item) => item[divisionField] === selectedDivision);
        }

        // 카테고리 필터
        if (categoryField && selectedCategory !== "전체") {
            filtered = filtered.filter((item) => item[categoryField] === selectedCategory);
        }

        // 검색 필터
        if (searchQuery && searchFields.length > 0) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter((item) =>
                searchFields.some((field) => {
                    const value = item[field];
                    return value && String(value).toLowerCase().includes(query);
                })
            );
        }

        return filtered;
    }, [items, searchQuery, selectedDivision, selectedCategory, searchFields, divisionField, categoryField]);

    return {
        /** 검색 쿼리 */
        searchQuery,
        /** 검색 쿼리 설정 */
        setSearchQuery,
        /** 선택된 사업 */
        selectedDivision,
        /** 사업 선택 */
        setSelectedDivision,
        /** 선택된 카테고리 */
        selectedCategory,
        /** 카테고리 선택 */
        setSelectedCategory,
        /** 필터링된 아이템 */
        filteredItems,
        /** 카테고리 목록 */
        categories,
    };
}
