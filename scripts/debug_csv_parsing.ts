
import fs from 'fs';
import Papa from 'papaparse';

const filePath = '/Users/epiz78/Downloads/outgoing_template (1).csv';
const fileContent = fs.readFileSync(filePath, 'utf8');

console.log('--- Raw File Content Start ---');
console.log(fileContent.substring(0, 500));
console.log('--- Raw File Content End ---');

const normalizeDate = (dateStr: string) => {
    const match = dateStr.trim().match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/);
    if (match) {
        const y = match[1];
        const m = match[2].padStart(2, '0');
        const d = match[3].padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    return dateStr;
};

Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
    complete: (results) => {
        console.log('--- Parse Complete ---');
        if (results.data.length > 0) {
            const firstRow = results.data[0] as any;
            console.log('First Row Keys:', Object.keys(firstRow));
            console.log('Row["공사명"]:', firstRow["공사명"]);
            console.log('Row["공사명"] value type:', typeof firstRow["공사명"]);
            console.log('Row["공사명"] char codes:', firstRow["공사명"] ? firstRow["공사명"].split('').map((c: string) => c.charCodeAt(0)) : 'N/A');

            // Simulate mapping
            const mapped = {
                date: normalizeDate(firstRow["출고일"]),
                division: "SKT",
                category: firstRow["사업"] || firstRow["구분"],
                teamCategory: firstRow["수령팀"],
                projectName: firstRow["공사명"],
                productName: firstRow["품명"],
                specification: firstRow["규격"] || "",
                quantity: parseInt((firstRow["수량"] || "0").replace(/,/g, "")) || 0,
                recipient: firstRow["수령인"],
            };
            console.log('Mapped Object:', mapped);
        } else {
            console.log('No data found');
        }

        if (results.errors.length > 0) {
            console.log('Errors:', results.errors);
        }
    }
});
