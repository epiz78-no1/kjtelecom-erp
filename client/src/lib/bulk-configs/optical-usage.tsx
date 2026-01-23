import { BulkUploadColumn } from "@/components/dialogs/GenericBulkUploadDialog";

export interface ParsedOpticalUsageRow {
    managementNo: string;
    usageDate: string;
    installLength: number;
    wasteLength: number;
    projectCode: string;
    projectNameUsage: string;
    workerName: string;
}

export const downloadOpticalUsageTemplate = () => {
    // BOM 추가하여 한글 깨짐 방지
    const bom = "\uFEFF";
    const headers = ["관리번호", "사용일", "설치(m)", "폐기(m)", "공사번호", "공사명", "사용자"];
    const sampleRow = "OPT123456789,2024-01-15,100,5,PJ-001,테스트공사,홍길동";
    const csvContent = headers.join(",") + "\n" + sampleRow;
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "optical_usage_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
};

export const validateOpticalUsageRow = (
    row: any,
    index: number,
    cables: any[],
    teamId: string
): { valid: boolean; errors: string[] } => {
    const rowErrors: string[] = [];
    const getValue = (key: string) => row[key] !== undefined ? row[key] : (row[key.trim()] !== undefined ? row[key.trim()] : undefined);

    // 필수 필드 검증
    const managementNo = getValue("관리번호");
    const usageDate = getValue("사용일");
    const installLength = getValue("설치(m)");

    if (!managementNo) rowErrors.push(`${index + 2}행: 관리번호가 필요합니다`);
    if (!usageDate) rowErrors.push(`${index + 2}행: 사용일이 필요합니다`);
    if (!installLength && installLength !== 0) rowErrors.push(`${index + 2}행: 설치 길이가 필요합니다`);

    // 숫자 검증
    const install = Number(installLength);
    const waste = Number(getValue("폐기(m)") || 0);

    if (isNaN(install) || install < 0) {
        rowErrors.push(`${index + 2}행: 설치 길이는 0 이상의 숫자여야 합니다`);
    }
    if (isNaN(waste) || waste < 0) {
        rowErrors.push(`${index + 2}행: 폐기 길이는 0 이상의 숫자여야 합니다`);
    }

    const totalUsed = install + waste;
    if (totalUsed <= 0) {
        rowErrors.push(`${index + 2}행 [${managementNo}]: 설치 + 폐기 합계가 0보다 커야 합니다`);
    }

    // 드럼 매핑 검증
    if (cables.length === 0) {
        rowErrors.push(`${index + 2}행: 케이블 데이터를 불러올 수 없습니다. 페이지를 새로고침해주세요.`);
    } else {
        // 관리번호로 찾기
        let cable = null;
        if (managementNo) {
            cable = cables.find(c => c.managementNo === managementNo.trim());
            // 관리번호가 있는데 못 찾으면 에러
            if (!cable) {
                rowErrors.push(`${index + 2}행 [${managementNo}]: 해당 관리번호의 케이블을 찾을 수 없습니다`);
            }
        }

        if (cable) {
            // 케이블 찾았으면 상태 검증
            if (cable.status !== 'assigned') {
                rowErrors.push(`${index + 2}행 [${cable.managementNo}]: 현재 출고(assigned) 상태가 아닙니다 (현재 상태: ${cable.status})`);
            } else if (teamId && cable.currentTeamId !== teamId) {
                rowErrors.push(`${index + 2}행 [${cable.managementNo}]: 다른 팀에 할당되어 있습니다`);
            } else if (totalUsed > cable.remainingLength) {
                rowErrors.push(`${index + 2}행 [${cable.managementNo}]: 사용량(${totalUsed}m)이 잔량(${cable.remainingLength}m)을 초과합니다`);
            }
        }
    }

    return { valid: rowErrors.length === 0, errors: rowErrors };
};

export const transformOpticalUsageRow = (row: any, index: number): ParsedOpticalUsageRow => {
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
        managementNo: (getValue("관리번호") || "").trim(),
        usageDate: normalizeDateFormat(getValue("사용일") || ""),
        installLength: Number(getValue("설치(m)") || 0),
        wasteLength: Number(getValue("폐기(m)") || 0),
        projectCode: (getValue("공사번호") || "").trim(),
        projectNameUsage: (getValue("공사명") || "").trim(),
        workerName: (getValue("사용자") || "").trim(),
    };
};

export const opticalUsageColumns: BulkUploadColumn<ParsedOpticalUsageRow>[] = [
    { header: "관리번호", width: "w-[120px]", render: (item) => item.managementNo },
    { header: "사용일", width: "w-[100px]", render: (item) => item.usageDate },
    { header: "설치(m)", width: "w-[80px]", render: (item) => item.installLength.toLocaleString() },
    { header: "폐기(m)", width: "w-[80px]", render: (item) => item.wasteLength.toLocaleString() },
    { header: "합계(m)", width: "w-[80px]", render: (item) => (item.installLength + item.wasteLength).toLocaleString() },
    { header: "공사번호", width: "w-[120px]", render: (item) => item.projectCode },
    { header: "공사명", width: "w-[180px]", render: (item) => <div className="truncate max-w-[180px]">{item.projectNameUsage}</div> },
    { header: "사용자", width: "w-[100px]", render: (item) => item.workerName },
];
