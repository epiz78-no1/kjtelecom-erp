/**
 * 일반자재 관리 모듈용 표준 컬럼 너비 정의
 */

// 일반자재 재고 현황 (Inventory)
export const INVENTORY_COLUMNS = {
    checkbox: 40,
    category: 70,           // 구분
    productName: 250,       // 품명 (Left align)
    specification: 300,     // 규격
    totalStock: 100,        // 총재고 (Right align)
    teamStock: 90,          // 현장재고 (Right align)
    officeStock: 90,        // 사무실재고 (Right align)
    unitPrice: 100,         // 단가 (Right align)
    amount: 110,            // 금액 (Right align)
    actions: 50             // 작업
} as const;

// 일반자재 입고 내역 (IncomingRecords)
export const MATERIAL_LOG_COLUMNS = {
    checkbox: 40,
    date: 95,               // 입고일자
    category: 70,           // 구분
    supplier: 120,          // 매입처
    productName: 200,       // 품명 (Left align)
    specification: 200,     // 규격
    quantity: 90,           // 수량 (Right align)
    unitPrice: 100,         // 단가 (Right align)
    amount: 110,            // 금액 (Right align)
    remark: 150,            // 비고
    createdBy: 80,          // 입력자
    actions: 50             // 작업
} as const;

// 일반자재 출고 내역 (OutgoingRecords)
export const MATERIAL_OUTGOING_COLUMNS = {
    checkbox: 40,
    date: 95,               // 출고일자
    projectName: 250,       // 공사명 (Left align)
    productName: 200,       // 품명 (Left align)
    specification: 200,     // 규격
    quantity: 90,           // 수량 (Right align)
    recipient: 100,         // 수령인
    remark: 150,            // 비고
    createdBy: 80,          // 입력자
    actions: 50             // 작업
} as const;

// 현장팀 보유 현황 (TeamOutgoing)
export const TEAM_INVENTORY_COLUMNS = {
    division: 80,
    teamName: 90,
    category: 70,
    productName: 300,       // 품명 (Left align)
    specification: 400,     // 규격
    quantity: 100,          // 보유량 (Right align)
    actions: 50
} as const;
