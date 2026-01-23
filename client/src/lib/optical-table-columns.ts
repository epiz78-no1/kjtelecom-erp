import type { OpticalCable, OpticalCableLog } from "@shared/schema";

// 광케이블 메인 테이블 컬럼 정의
export const OPTICAL_CABLE_COLUMNS = {
    checkbox: 40,
    division: 60,           // 사업 (SKT/SKB)
    category: 50,           // 구분
    receivedDate: 95,       // 입고일자
    manufacturer: 90,       // 제조사
    manufactureYear: 70,    // 제조연도
    spec: 50,               // 규격
    coreCount: 50,          // 코어
    drumNo: 70,             // 제조번호
    location: 70,           // 위치
    productName: 90,        // 품명
    incomingLength: 75,     // 입고량
    usedLength: 75,         // 사용량
    wasteLength: 65,        // 폐기량
    remainingLength: 75,    // 잔량
    remark: 80,             // 비고
    unitPrice: 85,          // 단가
    totalAmount: 100,       // 금액
    actions: 50             // 작업
} as const;

// 광케이블 로그 테이블 컬럼 정의 (입고/출고 내역)
export const OPTICAL_LOG_COLUMNS = {
    checkbox: 40,
    division: 60,
    category: 50,
    receivedDate: 95,
    projectCode: 120,       // 공사번호
    projectName: 250,       // 공사명
    manufacturer: 90,
    manufactureYear: 70,
    spec: 50,
    coreCount: 50,
    drumNo: 70,
    location: 70,
    totalLength: 90,        // 품명 (입고량 표시용)
    incomingLength: 90,     // 입고량
    remark: 80,
    createdBy: 80,          // 입력자
    attachment: 60,         // 첨부
    actions: 50
} as const;

// 광케이블 출고 로그 테이블 컬럼 정의
export const OPTICAL_OUTGOING_COLUMNS = {
    checkbox: 40,
    division: 60,
    category: 50,
    date: 95,               // 출고일자 (usageDate -> date to match component)
    projectCode: 120,
    projectName: 250,
    manufacturer: 90,
    manufactureYear: 70,
    spec: 50,
    coreCount: 50,
    drumNo: 70,
    location: 70,
    amount: 90,             // 출고량
    recipient: 80,          // 수령자
    remark: 80,
    createdBy: 80,
    attachment: 60,
    actions: 50
} as const;

// 컬럼 헤더 레이블 매핑
export const COLUMN_LABELS: Record<string, string> = {
    division: '사업',
    category: '구분',
    receivedDate: '입고일자',
    projectCode: '공사번호',
    projectName: '공사명',
    manufacturer: '제조사',
    manufactureYear: '제조연도',
    spec: '규격',
    coreCount: '코어',
    drumNo: '제조번호',
    location: '위치',
    productName: '품명',
    totalLength: '품명',
    incomingLength: '입고량',
    usedLength: '사용량',
    wasteLength: '폐기',
    remainingLength: '잔량',
    unitPrice: '단가',
    totalAmount: '금액',
    remark: '비고',
    createdBy: '입력자',
    attachment: '첨부',
    usageDate: '사용일',
    installLength: '설치량',
    totalUsed: '총 사용량',
    beforeRemaining: '사용 전 잔량',
    afterRemaining: '사용 후 잔량',
    workerName: '사용자',
} as const;
