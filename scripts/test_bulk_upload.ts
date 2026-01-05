import fs from 'fs';
import Papa from 'papaparse';

const filePath = '/Users/epiz78/Downloads/outgoing_template (1).csv';
const fileContent = fs.readFileSync(filePath, 'utf8');

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
    complete: async (results) => {
        const items = results.data.map((row: any) => ({
            date: normalizeDate(row["출고일"]),
            division: "SKT",
            category: row["사업"] || row["구분"],
            teamCategory: row["수령팀"],
            projectName: row["공사명"],
            productName: row["품명"],
            specification: row["규격"] || "",
            quantity: parseInt((row["수량"] || "0").replace(/,/g, "")) || 0,
            recipient: row["수령인"],
        }));

        console.log('Parsed items count:', items.length);
        console.log('First item:', JSON.stringify(items[0], null, 2));

        // Make API call
        try {
            const response = await fetch('http://localhost:5001/api/outgoing/bulk', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': 'connect.sid=s%3AyourSessionIdHere' // We'll need to get this
                },
                body: JSON.stringify({ items })
            });

            const result = await response.json();
            console.log('API Response status:', response.status);
            console.log('API Response:', JSON.stringify(result, null, 2));
        } catch (error: any) {
            console.error('API call failed:', error.message);
        }
    }
});
