import { BulkUploadColumn } from "@/components/dialogs/GenericBulkUploadDialog";

export interface ParsedOutgoingRow {
    date: string;
    division: string;
    category: string;
    teamCategory: string; // 수령팀
    projectName: string;
    productName: string;
    specification: string;
    quantity: number;
    recipient: string; // 수령인
    remark?: string;
}

export const validateOutgoingRow = (row: any, index: number): { valid: boolean; errors: string[] } => {
    const rowErrors: string[] = [];
    const getValue = (key: string) => row[key] !== undefined ? row[key] : (row[key.trim()] !== undefined ? row[key.trim()] : undefined);

    const dateVal = getValue("출고일");
    const bizVal = getValue("사업");
    const catVal = getValue("구분");
    const teamVal = getValue("수령팀");
    const projectVal = getValue("공사명");
    const productVal = getValue("품명");
    const recipientVal = getValue("수령인");
    const qtyVal = getValue("수량");

    // 필수 필드 검증
    if (!dateVal?.trim()) rowErrors.push(`${index + 2}행: 출고일이 필요합니다`);
    if (!bizVal?.trim() && !catVal?.trim()) rowErrors.push(`${index + 2}행: 사업(구분)이 필요합니다`);
    if (!teamVal?.trim()) rowErrors.push(`${index + 2}행: 수령팀이 필요합니다`);
    if (!projectVal?.trim()) rowErrors.push(`${index + 2}행: 공사명이 필요합니다`);
    if (!productVal?.trim()) rowErrors.push(`${index + 2}행: 품명이 필요합니다`);
    if (!recipientVal?.trim()) rowErrors.push(`${index + 2}행: 수령인이 필요합니다`);

    // 숫자 필드 검증
    if (qtyVal !== undefined && qtyVal !== "" && isNaN(Number(String(qtyVal).replace(/,/g, "")))) {
        rowErrors.push(`${index + 2}행: 수량은 숫자여야 합니다`);
    } else if (qtyVal !== undefined && qtyVal !== "" && Number(String(qtyVal).replace(/,/g, "")) < 0) {
        rowErrors.push(`${index + 2}행: 수량은 0보다 작을 수 없습니다`);
    }

    // 날짜 형식 검증
    if (dateVal) {
        const dateStr = dateVal.trim();
        // 포맷 매칭: YYYY-MM-DD, YYYY.MM.DD, YYYY/MM/DD (월/일은 한자리수 가능)
        const datePattern = /^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/;
        if (!datePattern.test(dateStr)) {
            rowErrors.push(`${index + 2}행: 출고일 형식이 올바르지 않습니다 (YYYY-MM-DD 또는 YYYY.MM.DD)`);
        } else {
            const match = dateStr.match(datePattern);
            if (match) {
                const year = parseInt(match[1]);
                const month = parseInt(match[2]);
                const day = parseInt(match[3]);
                const dateObj = new Date(year, month - 1, day);
                if (dateObj.getFullYear() !== year || dateObj.getMonth() !== month - 1 || dateObj.getDate() !== day) {
                    rowErrors.push(`${index + 2}행: 유효하지 않은 날짜입니다`);
                }
            }
        }
    }

    return { valid: rowErrors.length === 0, errors: rowErrors };
};

export const transformOutgoingRow = (row: any, index: number): ParsedOutgoingRow => {
    const getValue = (key: string) => row[key] !== undefined ? row[key] : (row[key.trim()] !== undefined ? row[key.trim()] : "");

    // 날짜 정규화 (YYYY-MM-DD)
    const normalizeDate = (dateStr: string) => {
        if (!dateStr) return "";
        const match = dateStr.trim().match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/);
        if (match) {
            const y = match[1];
            const m = match[2].padStart(2, '0');
            const d = match[3].padStart(2, '0');
            return `${y}-${m}-${d}`;
        }
        return dateStr;
    };

    return {
        date: normalizeDate(getValue("출고일")),
        division: "SKT",
        category: getValue("사업") || getValue("구분") || "",
        teamCategory: getValue("수령팀") || "",
        projectName: getValue("공사명") || "",
        productName: getValue("품명") || "",
        specification: getValue("규격") || "",
        quantity: parseInt((getValue("수량") || "0").replace(/,/g, "")) || 0,
        recipient: getValue("수령인") || "",
        remark: getValue("비고") || "",
    };
};

export const outgoingColumns: BulkUploadColumn<ParsedOutgoingRow>[] = [
    { header: "출고일", width: "w-[100px]", render: (item) => item.date },
    { header: "사업", width: "w-[60px]", render: (item) => item.category || item.division },
    { header: "수령팀", width: "w-[70px]", render: (item) => <div className="truncate max-w-[70px]">{item.teamCategory}</div> },
    { header: "공사명", width: "w-[180px]", render: (item) => <div className="truncate max-w-[180px]">{item.projectName}</div> },
    { header: "품명", width: "w-[120px]", render: (item) => <div className="truncate max-w-[120px]">{item.productName}</div> },
    { header: "규격", width: "w-[120px]", render: (item) => <div className="truncate max-w-[120px]">{item.specification}</div> },
    { header: "수량", width: "w-[70px]", align: 'right', render: (item) => item.quantity.toLocaleString() },
    { header: "수령인", width: "w-[80px]", render: (item) => <div className="truncate max-w-[80px]">{item.recipient}</div> },
];
