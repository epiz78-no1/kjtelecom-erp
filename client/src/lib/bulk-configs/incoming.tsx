import { BulkUploadColumn } from "@/components/dialogs/GenericBulkUploadDialog";

export interface ParsedIncomingRow {
    date: string;
    division: string;
    category: string;
    supplier: string;
    projectName: string;
    productName: string;
    specification: string;
    quantity: number;
    unitPrice: number;
    remark?: string;
}

export const validateIncomingRow = (row: any, index: number): { valid: boolean; errors: string[] } => {
    const rowErrors: string[] = [];
    // Helper: 키에 공백이 있을 수 있으므로 trim해서 찾거나 원본 키 사용
    const getValue = (key: string) => row[key] !== undefined ? row[key] : (row[key.trim()] !== undefined ? row[key.trim()] : undefined);

    const dateVal = getValue("입고일");
    const bizVal = getValue("사업");
    const catVal = getValue("구분");
    const supplierVal = getValue("구매처");
    const projectVal = getValue("공사명");
    const productVal = getValue("품명");
    const qtyVal = getValue("수량");

    // 필수 필드 검증
    if (!dateVal?.trim()) rowErrors.push(`${index + 2}행: 입고일이 필요합니다`);
    if (!bizVal?.trim() && !catVal?.trim()) rowErrors.push(`${index + 2}행: 사업(구분)이 필요합니다`);
    if (!supplierVal?.trim()) rowErrors.push(`${index + 2}행: 구매처가 필요합니다`);
    if (!projectVal?.trim()) rowErrors.push(`${index + 2}행: 공사명이 필요합니다`);
    if (!productVal?.trim()) rowErrors.push(`${index + 2}행: 품명이 필요합니다`);

    // 숫자 필드 검증
    if (qtyVal !== undefined && qtyVal !== "" && isNaN(Number(String(qtyVal).replace(/,/g, "")))) {
        rowErrors.push(`${index + 2}행: 수량은 숫자여야 합니다`);
    } else if (qtyVal !== undefined && qtyVal !== "" && Number(String(qtyVal).replace(/,/g, "")) < 0) {
        rowErrors.push(`${index + 2}행: 수량은 0보다 작을 수 없습니다`);
    }

    // 날짜 형식 검증 (YYYY-MM-DD)
    if (dateVal && !/^\d{4}-\d{2}-\d{2}$/.test(dateVal.trim())) {
        rowErrors.push(`${index + 2}행: 입고일은 YYYY-MM-DD 형식이어야 합니다`);
    }

    return { valid: rowErrors.length === 0, errors: rowErrors };
};

export const transformIncomingRow = (row: any, index: number): ParsedIncomingRow => {
    const getValue = (key: string) => row[key] !== undefined ? row[key] : (row[key.trim()] !== undefined ? row[key.trim()] : "");

    return {
        date: getValue("입고일")?.trim(),
        division: "SKT", // Default to SKT
        category: getValue("사업") || getValue("구분"),
        supplier: getValue("구매처"),
        projectName: getValue("공사명"),
        productName: getValue("품명"),
        specification: getValue("규격"),
        quantity: parseInt((getValue("수량") || "0").replace(/,/g, "")) || 0,
        unitPrice: parseInt((getValue("단가") || "0").replace(/,/g, "")) || 0,
        remark: getValue("비고"),
    };
};

export const incomingColumns: BulkUploadColumn<ParsedIncomingRow>[] = [
    { header: "입고일", width: "w-[100px]", render: (item) => item.date },
    { header: "사업", width: "w-[80px]", render: (item) => item.category || item.division },
    { header: "구매처", width: "w-[120px]", render: (item) => <div className="truncate max-w-[120px]">{item.supplier}</div> },
    { header: "공사명", width: "w-[180px]", render: (item) => <div className="truncate max-w-[180px]">{item.projectName}</div> },
    { header: "품명", width: "w-[120px]", render: (item) => <div className="truncate max-w-[120px]">{item.productName}</div> },
    { header: "규격", width: "w-[120px]", render: (item) => <div className="truncate max-w-[120px]">{item.specification}</div> },
    { header: "수량", width: "w-[70px]", align: 'right', render: (item) => item.quantity.toLocaleString() },
    { header: "단가", width: "w-[90px]", align: 'right', render: (item) => item.unitPrice.toLocaleString() },
    { header: "비고", width: "w-[100px]", render: (item) => <div className="truncate max-w-[100px]">{item.remark}</div> },
];
