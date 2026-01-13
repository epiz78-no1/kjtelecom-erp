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
                    if (cable.status !== 'returned') return false;
                }
            }

            // 폐기 케이블 숨김 처리
            if (!showWaste && cable.status === 'waste') return false;
            return true;
        });
    }, [cables, minRemaining, maxRemaining, selectedCoreCount, selectedStatus, showWaste]);

    // 활성 필터 목록 가져오기
    const getActiveFilters = (): ActiveFilter[] => {
        const filters: ActiveFilter[] = [];

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

        return filters;
    };

    // 특정 필터 제거
    const removeFilter = (key: string) => {
        if (key === 'core') setSelectedCoreCount('전체');
        else if (key === 'status') setSelectedStatus('전체');
        else if (key === 'range') {
            setMinRemaining('');
            setMaxRemaining('');
        }
    };

    // 모든 필터 초기화
    const resetFilters = () => {
        setSelectedCoreCount('전체');
        setSelectedStatus('전체');
        setMinRemaining('');
        setMaxRemaining('');
        setShowWaste(false);
    };

    return {
        // 상태
        minRemaining,
        setMinRemaining,
        maxRemaining,
        setMaxRemaining,
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
