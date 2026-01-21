import { useState, useMemo } from 'react';
import type { OpticalCable } from '@shared/schema';

interface ActiveFilter {
    key: string;
    label: string;
}

export function useOpticalFilters(cables: OpticalCable[]) {
    // 범위 필터
    const [minRemaining, setMinRemaining] = useState<string>('');
    const [maxRemaining, setMaxRemaining] = useState<string>('');

    // 카테고리 필터
    const [selectedDivision, setSelectedDivision] = useState<string>('전체');
    const [selectedCategory, setSelectedCategory] = useState<string>('전체');
    const [selectedCoreCount, setSelectedCoreCount] = useState<string>('전체');
    const [selectedStatus, setSelectedStatus] = useState<string>('전체');

    // UI 상태
    const [filterOpen, setFilterOpen] = useState(false);
    const [showWaste, setShowWaste] = useState(false);

    // 필터 적용
    const filteredCables = useMemo(() => {
        return cables.filter(cable => {
            // 잔량 범위 필터
            if (minRemaining && cable.remainingLength < Number(minRemaining)) return false;
            if (maxRemaining && cable.remainingLength > Number(maxRemaining)) return false;

            // 사업 필터
            if (selectedDivision !== '전체' && cable.division !== selectedDivision) return false;

            // 구분 필터
            if (selectedCategory !== '전체' && cable.category !== selectedCategory) return false;

            // 코어 수 필터
            if (selectedCoreCount !== '전체' && cable.coreCount !== Number(selectedCoreCount)) return false;

            // 상태 필터
            if (selectedStatus !== '전체') {
                if (selectedStatus === '창고') {
                    // 창고 보관: in_stock이면서 예약 아님
                    if (cable.status !== 'in_stock' || cable.reservationStatus === 'reserved') return false;
                } else if (selectedStatus === '예약') {
                    // 예약 중: in_stock이면서 예약됨
                    if (cable.status !== 'in_stock' || cable.reservationStatus !== 'reserved') return false;
                } else if (selectedStatus === '불출') {
                    if (cable.status !== 'assigned') return false;
                } else if (selectedStatus === '반납') {
                    // 반납 신청 (대기): returnRequestStatus가 'pending'인 항목
                    if (cable.returnRequestStatus !== 'pending') return false;
                } else if (selectedStatus === '폐기') {
                    if (cable.status !== 'waste') return false;
                }
            }

            // 폐기 케이블 숨김 처리
            // 단, 상태 필터가 '폐기'인 경우는 무조건 표시
            if (selectedStatus !== '폐기' && !showWaste && cable.status === 'waste') return false;
            return true;
        });
    }, [cables, minRemaining, maxRemaining, selectedDivision, selectedCategory, selectedCoreCount, selectedStatus, showWaste]);

    // 활성 필터 목록 가져오기
    const getActiveFilters = (): ActiveFilter[] => {
        const filters: ActiveFilter[] = [];

        if (selectedDivision !== '전체') filters.push({ key: 'division', label: `사업: ${selectedDivision}` });
        if (selectedCategory !== '전체') filters.push({ key: 'category', label: `구분: ${selectedCategory}` });
        if (selectedCoreCount !== '전체') {
            filters.push({ key: 'core', label: `${selectedCoreCount}c` });
        }
        if (selectedStatus !== '전체') {
            filters.push({ key: 'status', label: selectedStatus });
        }
        if (minRemaining || maxRemaining) {
            filters.push({
                key: 'range',
                label: `${minRemaining || 0}~${maxRemaining || '∞'}m`
            });
        }
        if (showWaste) {
            filters.push({ key: 'showWaste', label: '폐기 포함' });
        }

        return filters;
    };

    // 특정 필터 제거
    const removeFilter = (key: string) => {
        if (key === 'division') setSelectedDivision('전체');
        if (key === 'category') setSelectedCategory('전체');
        if (key === 'core') setSelectedCoreCount('전체');
        else if (key === 'status') setSelectedStatus('전체');
        else if (key === 'range') {
            setMinRemaining('');
            setMaxRemaining('');
        }
    };

    // 모든 필터 초기화
    const resetFilters = () => {
        setSelectedDivision('전체');
        setSelectedCategory('전체');
        setSelectedCoreCount('전체');
        setSelectedStatus('전체');
        setMinRemaining('');
        setMaxRemaining('');
        setShowWaste(false);
    };

    return {
        // 상태
        // 상태
        minRemaining,
        setMinRemaining,
        maxRemaining,
        setMaxRemaining,
        selectedDivision,
        setSelectedDivision,
        selectedCategory,
        setSelectedCategory,
        selectedCoreCount,
        setSelectedCoreCount,
        selectedStatus,
        setSelectedStatus,
        filterOpen,
        setFilterOpen,
        showWaste,
        setShowWaste,

        // 결과
        filteredCables,

        // 함수
        getActiveFilters,
        removeFilter,
        resetFilters
    };
}
