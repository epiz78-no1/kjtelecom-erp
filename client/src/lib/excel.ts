
import * as XLSX from "xlsx";

/**
 * Ensures we have the utility functions for Excel export.
 * Uses 'xlsx' library (SheetJS).
 */

export const exportToExcel = (data: any[], fileName: string, sheetName: string = "Sheet1") => {
    // 1. Create a new workbook
    const workbook = XLSX.utils.book_new();

    // 2. Convert data to worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);

    // 3. Append worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // 4. Write file
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

export const formatDataForExport = (items: any[], columns: { key: string, label: string, formatter?: (val: any, item?: any) => any }[]) => {
    return items.map(item => {
        const row: any = {};
        columns.forEach(col => {
            let val = item[col.key];
            // Handle nested properties if key contains dots (e.g., 'user.name') - simple version
            if (col.key.includes('.')) {
                const parts = col.key.split('.');
                val = item;
                for (const part of parts) {
                    val = val ? val[part] : '';
                }
            }

            if (col.formatter) {
                row[col.label] = col.formatter(val, item);
            } else {
                row[col.label] = val;
            }
        });
        return row;
    });
};
