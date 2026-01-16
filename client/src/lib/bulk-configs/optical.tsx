import { BulkUploadColumn } from "@/components/GenericBulkUploadDialog";
import { useToast } from "@/hooks/use-toast";

export interface ParsedOpticalRow {
    division: string;
    category: string;
    managementNo: string;
    drumNo: string;
    projectCode: string;
    projectName: string;
    receivedDate: string;
    manufacturer: string;
    manufactureYear: string;
    spec: string;
    coreCount: number;
    location: string;
    remark: string;
    productName: string | number;
    incomingLength: number;
    unitPrice: number;
    totalAmount: number;
    usedLength: number;
    wasteLength: number;
    remainingLength: number;
}

export const downloadOpticalTemplate = () => {
    // Minimal CSV content for template
    const headers = ["사업", "구분", "입고일자", "공사번호", "공사명", "제조사", "제조연도", "규격", "코어 수", "제조번호", "보관장소", "입고량", "단가", "비고"];
    const csvContent = headers.join(",") + "\n" + "SKT,실외용,2023-01-01,PJ-001,테스트공사,대한광통신,2023,SM 24C,24,DR-12345,자재창고,1000,1500,비고내용";
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "optical_incoming_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
};

export const validateOpticalRow = (row: any, index: number): { valid: boolean; errors: string[] } => {
    const rowErrors: string[] = [];
    const getValue = (key: string) => row[key] !== undefined ? row[key] : (row[key.trim()] !== undefined ? row[key.trim()] : undefined);

    // Required fields
    if (!getValue("제조번호")) rowErrors.push(`${index + 2}행: 제조번호가 필요합니다`);
    if (!getValue("규격")) rowErrors.push(`${index + 2}행: 규격이 필요합니다`);

    // Check for length fields
    const hasIncoming = getValue("입고량");
    if (!hasIncoming) rowErrors.push(`${index + 2}행: 입고량이 필요합니다`);

    return { valid: rowErrors.length === 0, errors: rowErrors };
};

export const transformOpticalRow = (row: any, index: number): ParsedOpticalRow => {
    const getValue = (key: string) => row[key] !== undefined ? row[key] : (row[key.trim()] !== undefined ? row[key.trim()] : undefined);

    // 날짜 형식을 YYYY-MM-DD로 표준화
    const normalizeDateFormat = (dateStr: string): string => {
        if (!dateStr) return new Date().toISOString().split('T')[0];
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

        const parts = dateStr.split('-');
        if (parts.length === 3) {
            const year = parts[0].padStart(4, '0');
            const month = parts[1].padStart(2, '0');
            const day = parts[2].padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        return new Date().toISOString().split('T')[0];
    };

    const parseNum = (val: any) => {
        if (!val) return 0;
        const str = String(val).replace(/,/g, "").trim();
        const num = Number(str);
        return isNaN(num) ? 0 : num;
    };

    const spec = getValue("규격") || "";
    const coreCount = parseNum(getValue("코어 수") || getValue("코어"));

    let productName = getValue("품명") ? getValue("품명").trim() : "";
    let incomingLength = parseNum(getValue("입고량"));

    if (!productName) {
        productName = `${spec}_${coreCount}C`;
    }

    // Legacy "길이" support
    if (!productName && incomingLength === 0 && getValue("길이")) {
        const length = getValue("길이").trim();
        const lengthNum = parseNum(length);
        if (lengthNum > 0) incomingLength = lengthNum;
    }

    if (incomingLength === 0 && !isNaN(Number(productName)) && Number(productName) > 0) {
        incomingLength = Number(productName);
    }

    const usedLength = parseNum(getValue("사용량"));
    const wasteLength = parseNum(getValue("폐기"));
    const remainingLength = incomingLength - usedLength - wasteLength;

    const unitPrice = parseNum(getValue("단가"));
    const totalAmount = parseNum(getValue("금액"));
    const calculatedAmount = totalAmount > 0 ? totalAmount : unitPrice * incomingLength;

    const division = getValue("사업") || "SKT";
    const category = getValue("구분") || "";
    const drumNo = getValue("제조번호") || getValue("품명") || "";

    const timestamp = new Date().getTime();
    const managementNo = getValue("관리번호") || `OPT${timestamp}${index}`;

    return {
        division,
        category,
        managementNo,
        projectCode: (getValue("공사번호") || "").trim(),
        projectName: (getValue("공사명") || "").trim(),
        drumNo,
        receivedDate: normalizeDateFormat(getValue("입고일자") || getValue("입고일") || ""),
        manufacturer: getValue("제조사") || "",
        manufactureYear: getValue("제조연도") || "",
        spec,
        coreCount,
        location: getValue("보관장소") || getValue("위치") || "자재창고",
        remark: getValue("비고") || "",
        productName,
        incomingLength,
        unitPrice,
        totalAmount: calculatedAmount,
        usedLength,
        wasteLength,
        remainingLength
    };
};

export const opticalColumns: BulkUploadColumn<ParsedOpticalRow>[] = [
    { header: "사업", width: "w-[80px]", render: (item) => item.division },
    { header: "구분", width: "w-[80px]", render: (item) => item.category },
    { header: "입고일자", width: "w-[100px]", render: (item) => item.receivedDate },
    { header: "공사번호", width: "w-[120px]", render: (item) => item.projectCode },
    { header: "공사명", width: "w-[150px]", render: (item) => <div className="truncate max-w-[150px]">{item.projectName}</div> },
    { header: "제조사", width: "w-[100px]", render: (item) => item.manufacturer },
    { header: "제조연도", width: "w-[80px]", render: (item) => item.manufactureYear },
    { header: "규격", width: "w-[120px]", render: (item) => item.spec },
    { header: "코어 수", width: "w-[80px]", render: (item) => item.coreCount },
    { header: "제조번호", width: "w-[140px]", render: (item) => item.drumNo },
    { header: "보관장소", width: "w-[100px]", render: (item) => item.location },
    { header: "입고량", width: "w-[80px]", align: 'right', render: (item) => item.incomingLength.toLocaleString() },
    { header: "단가", width: "w-[100px]", align: 'right', render: (item) => item.unitPrice.toLocaleString() },
    { header: "비고", width: "w-[100px]", render: (item) => <div className="truncate max-w-[100px]">{item.remark}</div> },
];
