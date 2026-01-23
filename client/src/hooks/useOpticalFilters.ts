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

    // 카테고리 필터 (다중 선택 지원)
    const [selectedDivision, setSelectedDivision] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string[]>([]);
    const [selectedCoreCount, setSelectedCoreCount] = useState<string[]>([]);
    const [selectedStatus, setSelectedStatus] = useState<string[]>([]);

    // UI 상태
    const [filterOpen, setFilterOpen] = useState(false);
    const [showWaste, setShowWaste] = useState(false);

    // 필터 적용
    const filteredCables = useMemo(() => {
        return cables.filter(cable => {
            // 잔량 범위 필터
            if (minRemaining && cable.remainingLength < Number(minRemaining)) return false;
            if (maxRemaining && cable.remainingLength > Number(maxRemaining)) return false;

            // 사업 필터 - 선택된 필터가 있을 때만 적용
            if (selectedDivision.length > 0) {
                const cableDivision = cable.division || "SKT"; // null, undefined, 빈 문자열 모두 SKT로 처리
                if (!selectedDivision.includes(cableDivision)) return false;
            }

            // 구분 필터
            if (selectedCategory.length > 0 && !selectedCategory.includes(cable.category)) return false;

            // 코어 수 필터
            if (selectedCoreCount.length > 0 && !selectedCoreCount.includes(String(cable.coreCount))) return false;

            // 상태 필터
            if (selectedStatus.length > 0) {
                let statusMatch = false;
                for (const status of selectedStatus) {
                    if (status === '창고') {
                        // 창고 보관: in_stock이면서 예약 아님
                        if (cable.status === 'in_stock' && cable.reservationStatus !== 'reserved') statusMatch = true;
                    } else if (status === '예약') {
                        // 예약 중: in_stock이면서 예약됨
                        if (cable.status === 'in_stock' && cable.reservationStatus === 'reserved') statusMatch = true;
                    } else if (status === '불출') {
                        if (cable.status === 'assigned') statusMatch = true;
                    } else if (status === '반납') {
                        // 반납 신청 (대기): returnRequestStatus가 'pending'인 항목
                        if (cable.returnRequestStatus === 'pending') statusMatch = true;
                    } else if (status === '폐기') {
                        if (cable.status === 'waste') statusMatch = true;
                    }
                }
                if (!statusMatch) return false;
            }

            // 폐기 케이블 숨김 처리
            // 단, 상태 필터에 '폐기'가 포함된 경우는 무조건 표시
            const isWasteSelected = selectedStatus.includes('폐기');
            if (!isWasteSelected && !showWaste && cable.status === 'waste') return false;
            return true;
        });
    }, [cables, minRemaining, maxRemaining, selectedDivision, selectedCategory, selectedCoreCount, selectedStatus, showWaste]);

    // 활성 필터 목록 가져오기
    const getActiveFilters = (): ActiveFilter[] => {
        const filters: ActiveFilter[] = [];

        if (selectedDivision.length > 0) filters.push({ key: 'division', label: `사업: ${selectedDivision.length}개` });
        if (selectedCategory.length > 0) filters.push({ key: 'category', label: `구분: ${selectedCategory.length}개` });
        if (selectedCoreCount.length > 0) {
            filters.push({ key: 'core', label: `${selectedCoreCount.length}개 코어` });
        }
        if (selectedStatus.length > 0) {
            filters.push({ key: 'status', label: `상태: ${selectedStatus.length}개` });
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
        if (key === 'division') setSelectedDivision([]);
        if (key === 'category') setSelectedCategory([]);
        if (key === 'core') setSelectedCoreCount([]);
        else if (key === 'status') setSelectedStatus([]);
        else if (key === 'range') {
            setMinRemaining('');
            setMaxRemaining('');
        }
    };

    // 모든 필터 초기화
    const resetFilters = () => {
        setSelectedDivision([]);
        setSelectedCategory([]);
        setSelectedCoreCount([]);
        setSelectedStatus([]);
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
