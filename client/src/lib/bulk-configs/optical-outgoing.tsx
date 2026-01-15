import { BulkUploadColumn } from "@/components/GenericBulkUploadDialog";

export interface ParsedOpticalOutgoingRow {
    drumNo: string;
    teamName: string;
    date: string;
    projectCode: string;
    projectName: string;
    recipient: string;
    remark: string;
}

export const downloadOpticalOutgoingTemplate = () => {
    const headers = ["제조번호", "수령팀", "출고일자", "공사번호", "공사명", "수령자", "비고"];
    const sampleRow = "DR-12345,접속팀,2024-01-15,PJ-001,테스트공사,홍길동,비고내용";
    const csvContent = headers.join(",") + "\n" + sampleRow;
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "optical_outgoing_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
};

export const validateOpticalOutgoingRow = (row: any, index: number): { valid: boolean; errors: string[] } => {
    const rowErrors: string[] = [];
    const getValue = (key: string) => row[key] !== undefined ? row[key] : (row[key.trim()] !== undefined ? row[key.trim()] : undefined);

    // Required fields
    if (!getValue("제조번호")) rowErrors.push(`${index + 2}행: 제조번호가 필요합니다`);
    if (!getValue("수령팀")) rowErrors.push(`${index + 2}행: 수령팀이 필요합니다`);
    if (!getValue("출고일자")) rowErrors.push(`${index + 2}행: 출고일자가 필요합니다`);
    if (!getValue("수령자")) rowErrors.push(`${index + 2}행: 수령자가 필요합니다`);

    return { valid: rowErrors.length === 0, errors: rowErrors };
};

export const transformOpticalOutgoingRow = (row: any, index: number): ParsedOpticalOutgoingRow => {
    const getValue = (key: string) => row[key] !== undefined ? row[key] : (row[key.trim()] !== undefined ? row[key.trim()] : undefined);

    // 날짜 형식을 YYYY-MM-DD로 표준화
    const normalizeDateFormat = (dateStr: string): string => {
        if (!dateStr) return new Date().toISOString().split('T')[0];

        // Already in correct format
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

        // Handle YYYY.MM.DD format
        if (/^\d{4}\.\d{2}\.\d{2}$/.test(dateStr)) {
            return dateStr.replace(/\./g, '-');
        }

        // Handle other formats
        const parts = dateStr.split(/[-./]/);
        if (parts.length === 3) {
            const year = parts[0].padStart(4, '0');
            const month = parts[1].padStart(2, '0');
            const day = parts[2].padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        return new Date().toISOString().split('T')[0];
    };

    return {
        drumNo: (getValue("제조번호") || "").trim(),
        teamName: (getValue("수령팀") || "").trim(),
        date: normalizeDateFormat(getValue("출고일자") || ""),
        projectCode: (getValue("공사번호") || "").trim(),
        projectName: (getValue("공사명") || "").trim(),
        recipient: (getValue("수령자") || "").trim(),
        remark: (getValue("비고") || "").trim(),
    };
};

export const opticalOutgoingColumns: BulkUploadColumn<ParsedOpticalOutgoingRow>[] = [
    { header: "제조번호", width: "w-[140px]", render: (item) => item.drumNo },
    { header: "수령팀", width: "w-[100px]", render: (item) => item.teamName },
    { header: "출고일자", width: "w-[100px]", render: (item) => item.date },
    { header: "공사번호", width: "w-[120px]", render: (item) => item.projectCode },
    { header: "공사명", width: "w-[200px]", render: (item) => <div className="truncate max-w-[200px]">{item.projectName}</div> },
    { header: "수령자", width: "w-[100px]", render: (item) => item.recipient },
    { header: "비고", width: "w-[150px]", render: (item) => <div className="truncate max-w-[150px]">{item.remark}</div> },
];
