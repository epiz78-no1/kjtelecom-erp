import { BulkUploadColumn } from "@/components/GenericBulkUploadDialog";

export interface ParsedInventoryRow {
    division: string;
    category: string;
    productName: string;
    specification: string;
    totalStock: number; // 재고현황 (총 재고)
    remaining: number; // 사무실보유재고 -> remaining
    outgoing: number;  // 현장팀보유재고 -> outgoing
    usage: number;     // 사용량 (항상 0)
    unitPrice: number;
    totalAmount: number;
}

export const validateInventoryRow = (row: any, index: number): { valid: boolean; errors: string[] } => {
    const rowErrors: string[] = [];
    const getValue = (key: string) => row[key] !== undefined ? row[key] : (row[key.trim()] !== undefined ? row[key.trim()] : undefined);

    const bizVal = getValue("사업");
    const catVal = getValue("구분");
    const productVal = getValue("품명");
    const specVal = getValue("규격");

    if (!bizVal?.trim() && !catVal?.trim()) rowErrors.push(`${index + 2}행: 사업(구분)이 필요합니다`);
    if (!productVal?.trim()) rowErrors.push(`${index + 2}행: 품명이 필요합니다`);
    if (!specVal?.trim()) rowErrors.push(`${index + 2}행: 규격이 필요합니다`);

    return { valid: rowErrors.length === 0, errors: rowErrors };
};

export const transformInventoryRow = (row: any, index: number): ParsedInventoryRow => {
    const getValue = (key: string) => row[key] !== undefined ? row[key] : (row[key.trim()] !== undefined ? row[key.trim()] : "");
    const parseNum = (val: any) => {
        if (!val) return 0;
        const str = String(val).replace(/,/g, "").trim();
        return parseInt(str) || 0;
    };

    // CSV header mapping from template
    // headers: 사업, 품명, 규격, 재고현황, 현장팀보유재고, 사무실보유재고, 단가, 금액
    // remaining -> 사무실보유재고, outgoing -> 현장팀보유재고

    const totalStock = parseNum(getValue("재고현황"));
    const officeStock = parseNum(getValue("사무실보유재고") || getValue("사무실재고") || getValue("재고"));
    const teamStock = parseNum(getValue("현장팀보유재고") || getValue("현장재고"));
    const unitPrice = parseNum(getValue("단가"));

    // 금액은 자동 계산: (사무실재고 + 현장팀재고) × 단가
    const calculatedAmount = (officeStock + teamStock) * unitPrice;

    return {
        division: getValue("사업") || getValue("구분") || getValue("카테고리") || "SKT",
        category: getValue("사업") || getValue("구분") || getValue("카테고리") || "",
        productName: getValue("품명"),
        specification: getValue("규격"),
        totalStock: totalStock,
        remaining: officeStock,
        outgoing: teamStock,
        usage: 0,
        unitPrice: unitPrice,
        totalAmount: calculatedAmount, // CSV 값 무시하고 자동 계산
    };
};

export const inventoryColumns: BulkUploadColumn<ParsedInventoryRow>[] = [
    { header: "사업", width: "w-[80px]", render: (item) => item.category },
    { header: "품명", width: "w-[150px]", render: (item) => <div className="truncate max-w-[150px]">{item.productName}</div> },
    { header: "규격", width: "w-[150px]", render: (item) => <div className="truncate max-w-[150px]">{item.specification}</div> },
    { header: "재고현황", width: "w-[100px]", align: 'right', render: (item) => item.totalStock.toLocaleString() },
    { header: "사무실보유재고", width: "w-[120px]", align: 'right', render: (item) => item.remaining.toLocaleString() },
    { header: "현장팀보유재고", width: "w-[120px]", align: 'right', render: (item) => item.outgoing.toLocaleString() },
    { header: "단가", width: "w-[100px]", align: 'right', render: (item) => item.unitPrice.toLocaleString() },
    { header: "금액", width: "w-[120px]", align: 'right', render: (item) => item.totalAmount.toLocaleString() },
];
