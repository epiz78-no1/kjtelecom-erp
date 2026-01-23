import { BulkUploadColumn } from "@/components/dialogs/GenericBulkUploadDialog";

export interface ParsedOpticalOutgoingRow {
    managementNo: string; // 관리번호 (필수)
    teamName: string; // 수령팀
    date: string; // 출고일자
    recipient: string; // 수령자
    projectCode?: string; // 공사번호
    projectName?: string; // 공사명
    remark?: string; // 비고
}

export const downloadOpticalOutgoingTemplate = () => {
    // BOM 추가하여 한글 깨짐 방지
    const bom = "\uFEFF";
    const header = "관리번호,수령팀,출고일자,수령자,공사번호,공사명,비고\n";
    const sample = "M12345,설치1팀,2024-03-20,홍길동,P240320-001,OO지구 광케이블 신설,비고내용\n";

    const blob = new Blob([bom + header + sample], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "optical_outgoing_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
};

export const validateOpticalOutgoingRow = (row: any, index: number, cables: any[] = []): { valid: boolean; errors: string[] } => {
    const rowErrors: string[] = [];
    const getValue = (key: string) => row[key] !== undefined ? row[key] : (row[key.trim()] !== undefined ? row[key.trim()] : undefined);

    // Required fields
    const managementNo = getValue("관리번호");

    // 관리번호 필수
    if (!managementNo) {
        rowErrors.push(`${index + 2}행: 관리번호가 필요합니다`);
    }

    if (!getValue("수령팀")) rowErrors.push(`${index + 2}행: 수령팀이 필요합니다`);

    // 출고일자 헤더 호환성 (YYYY-MM-DD 표기 포함)
    const dateValue = getValue("출고일자") || getValue("출고일자(YYYY-MM-DD)");
    if (!dateValue) rowErrors.push(`${index + 2}행: 출고일자가 필요합니다`);

    if (!getValue("수령자")) rowErrors.push(`${index + 2}행: 수령자가 필요합니다`);

    // 케이블 데이터 검증 (데이터가 있을 경우)
    if (cables && cables.length > 0) {
        let cable = null;

        // 관리번호로 찾기
        if (managementNo) {
            cable = cables.find(c => c.managementNo === managementNo.trim());
            if (!cable) {
                rowErrors.push(`${index + 2}행 [${managementNo}]: 해당 관리번호의 케이블을 찾을 수 없습니다`);
            }
        }

        if (cable) {
            // 출고 가능 상태(in_stock) 체크
            if (cable.status !== 'in_stock') {
                rowErrors.push(`${index + 2}행 [${cable.managementNo}]: 출고 가능한 상태(in_stock)가 아닙니다 (현재 상태: ${cable.status})`);
            }
        }
    }

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

    const dateValue = getValue("출고일자") || getValue("출고일자(YYYY-MM-DD)") || "";

    return {
        managementNo: (getValue("관리번호") || "").trim(),
        teamName: (getValue("수령팀") || "").trim(),
        date: normalizeDateFormat(dateValue),
        projectCode: (getValue("공사번호") || "").trim(),
        projectName: (getValue("공사명") || "").trim(),
        recipient: (getValue("수령자") || "").trim(),
        remark: (getValue("비고") || "").trim()
    };
};

export const opticalOutgoingColumns: BulkUploadColumn<ParsedOpticalOutgoingRow>[] = [
    { header: "관리번호", width: "w-[120px]", render: (item) => item.managementNo },
    { header: "수령팀", width: "w-[100px]", render: (item) => item.teamName },
    { header: "출고일자", width: "w-[100px]", render: (item) => item.date },
    { header: "공사번호", width: "w-[120px]", render: (item) => item.projectCode },
    { header: "공사명", width: "w-[200px]", render: (item) => <div className="truncate max-w-[200px]">{item.projectName}</div> },
    { header: "수령자", width: "w-[100px]", render: (item) => item.recipient },
    { header: "비고", width: "w-[150px]", render: (item) => <div className="truncate max-w-[150px]">{item.remark}</div> },
];
