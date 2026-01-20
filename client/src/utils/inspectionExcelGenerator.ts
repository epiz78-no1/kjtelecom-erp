import { saveAs } from 'file-saver';
import ExcelJS from 'exceljs';
import { IncomingRecord } from '@shared/schema';

// Helper to fetch image as buffer
const fetchImage = async (url: string): Promise<ArrayBuffer> => {
    try {
        const response = await fetch(url, { credentials: 'include' });
        const blob = await response.blob();
        return await blob.arrayBuffer();
    } catch (e) {
        console.error("Image fetch failed", e);
        throw e;
    }
};

// Helper to get attachments from attributes
const getAttachments = (record: IncomingRecord): any[] => {
    try {
        if (record.attributes) {
            const parsed = JSON.parse(record.attributes);
            return Array.isArray(parsed) ? parsed : (parsed.attachments || []);
        }
    } catch (e) {
        // ignore
    }
    return [];
};

export const generateInspectionExcel = async (selectedRecords: IncomingRecord[]) => {
    if (selectedRecords.length === 0) {
        alert("선택된 입고 내역이 없습니다.");
        return;
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'KJ Telecom ERP';
    workbook.created = new Date();

    // ==========================================
    // Sheet 1: 입고 검사 보고서
    // ==========================================
    const sheet1 = workbook.addWorksheet('입고검사 보고서', {
        pageSetup: {
            paperSize: 9, // A4
            orientation: 'portrait',
            margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
            fitToPage: true, // Fit to page
            fitToWidth: 1,
            fitToHeight: 1
        }
    });

    // Default Style
    // Adjust widths based on A4 portrait (~80-90 characters width roughly, or specific pixel widths)
    // Total approximate width units ~80-100? 
    // Let's try to match the ratio from the image.
    // Cols: A(Seq), B(Name), C(Name merge), D(Spec), E(Maker), F(Qty), G(Check), H(Check)
    sheet1.columns = [
        { width: 6 },  // A (순번)
        { width: 12 }, // B (품명 1)
        { width: 12 }, // C (품명 2 - merged with B)
        { width: 25 }, // D (규격)
        { width: 20 }, // E (제조사)
        { width: 10 }, // F (수량)
        { width: 10 }, // G (검사방법-전수)
        { width: 10 }, // H (검사방법-샘플)
    ];

    // --- Title ---
    sheet1.mergeCells('A1:H1');
    const titleCell = sheet1.getCell('A1');
    titleCell.value = '■ 신규 자재 입고검사 보고서';
    titleCell.font = { name: '맑은 고딕', size: 20, bold: true };
    titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
    sheet1.getRow(1).height = 40;

    // --- Sub Header ---
    sheet1.mergeCells('A2:D2');
    sheet1.getCell('A2').value = ' 사용처 : SKT, SKB, 기타 (          )';
    sheet1.getCell('A2').font = { name: '맑은 고딕', size: 11 };

    sheet1.mergeCells('E2:H2');
    sheet1.getCell('E2').value = '※ 인수 자재 사진 별첨';
    sheet1.getCell('E2').font = { name: '맑은 고딕', size: 11 };
    sheet1.getCell('E2').alignment = { horizontal: 'right' };

    // --- Table 1 Header ---
    // Borders
    const thinBorder = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } } as const;
    const centerAlign = { vertical: 'middle', horizontal: 'center' } as const;
    const headerFont = { name: '맑은 고딕', size: 10, bold: true };
    const grayFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } } as const;

    // Row 3 (Header Top)
    sheet1.getCell('A3').value = '순번';
    sheet1.mergeCells('A3:A4');

    sheet1.getCell('B3').value = '품  명';
    sheet1.mergeCells('B3:C4');

    sheet1.getCell('D3').value = '규  격';
    sheet1.mergeCells('D3:D4');

    sheet1.getCell('E3').value = '제조사명 / Serial No.';
    sheet1.mergeCells('E3:E4');

    sheet1.getCell('F3').value = '수 량';
    sheet1.mergeCells('F3:F4');

    sheet1.getCell('G3').value = '검 사 방 법';
    sheet1.mergeCells('G3:H3');

    // Row 4 (Header Bottom)
    sheet1.getCell('G4').value = '전수검사';
    sheet1.getCell('H4').value = 'Sampling';

    // Apply styles to headers
    ['A3', 'B3', 'D3', 'E3', 'F3', 'G3', 'G4', 'H4'].forEach(key => {
        const cell = sheet1.getCell(key);
        cell.border = thinBorder;
        cell.alignment = centerAlign;
        cell.font = headerFont;
        if (key !== 'G4' && key !== 'H4') cell.fill = grayFill;
    });
    sheet1.getCell('G4').fill = grayFill;
    sheet1.getCell('H4').fill = grayFill;

    // --- Table 1 Content (Items) ---
    // Fixed 10 rows for items as per template look
    let currentRow = 5;
    for (let i = 0; i < 10; i++) {
        sheet1.getRow(currentRow + i).height = 25;
        // Merge B and C for product name in each row
        sheet1.mergeCells(currentRow + i, 2, currentRow + i, 3);

        for (let col = 1; col <= 8; col++) {
            // Note: col 3 is merged into 2, but we still apply style to cover border
            const cell = sheet1.getCell(currentRow + i, col);
            cell.border = thinBorder;
            cell.alignment = centerAlign;
            cell.font = { name: '맑은 고딕', size: 10 };
        }
    }

    // Fill data into the rows
    selectedRecords.forEach((record, index) => {
        if (index < 10) {
            const r = currentRow + index;
            sheet1.getCell(r, 1).value = index + 1;
            sheet1.getCell(r, 2).value = record.productName;
            sheet1.getCell(r, 4).value = record.specification;
            sheet1.getCell(r, 5).value = record.supplier; // Using supplier as manufacturer
            sheet1.getCell(r, 6).value = `${record.quantity}개`; // Default unit '개'
            // Default check 'Sampling' as 'O'
            sheet1.getCell(r, 8).value = 'O';
        }
    });

    currentRow += 10; // Move past the 10 item rows
    currentRow += 1; // Empty space row (optional, image has gap?) -> No, image shows tables are separated by gap.

    // Gap row height
    sheet1.getRow(currentRow).height = 10;
    currentRow++;

    // --- Checklist Table ---
    const checklistStartRow = currentRow;

    // Header Row 1
    sheet1.getCell(`A${checklistStartRow}`).value = '순번';
    sheet1.mergeCells(`A${checklistStartRow}:A${checklistStartRow + 1}`);

    sheet1.getCell(`B${checklistStartRow}`).value = '점 검 항 목';
    sheet1.mergeCells(`B${checklistStartRow}:C${checklistStartRow + 1}`);

    sheet1.getCell(`D${checklistStartRow}`).value = '판  정';
    sheet1.mergeCells(`D${checklistStartRow}:E${checklistStartRow}`);

    sheet1.getCell(`F${checklistStartRow}`).value = '해당\n없음';
    sheet1.mergeCells(`F${checklistStartRow}:F${checklistStartRow + 1}`);
    sheet1.getCell(`F${checklistStartRow}`).alignment = { wrapText: true, ...centerAlign };

    sheet1.getCell(`G${checklistStartRow}`).value = '불량시\n사유';
    sheet1.mergeCells(`G${checklistStartRow}:G${checklistStartRow + 1}`);
    sheet1.getCell(`G${checklistStartRow}`).alignment = { wrapText: true, ...centerAlign };

    sheet1.getCell(`H${checklistStartRow}`).value = '비  고';
    sheet1.mergeCells(`H${checklistStartRow}:H${checklistStartRow + 1}`);

    // Header Row 2 (Sub-headers)
    sheet1.getCell(`D${checklistStartRow + 1}`).value = '양호';
    sheet1.getCell(`E${checklistStartRow + 1}`).value = '불량';

    // Style Checklist Header
    const checklistHeaders = [
        `A${checklistStartRow}`, `B${checklistStartRow}`, `D${checklistStartRow}`,
        `F${checklistStartRow}`, `G${checklistStartRow}`, `H${checklistStartRow}`,
        `D${checklistStartRow + 1}`, `E${checklistStartRow + 1}`
    ];
    checklistHeaders.forEach(key => {
        const cell = sheet1.getCell(key);
        cell.border = thinBorder;
        cell.alignment = centerAlign;
        cell.font = headerFont;
        cell.fill = grayFill;
    });

    const checklistItems = [
        '배송상태\n(포장파손, 내용물 변형)',
        '지정 Vendor 자재 여부\n(AVL 일치)',
        '시험성적서 동봉\n및 합격품 여부',
        '도금상태',
        '규격검토 (W,H,D)',
        '납기 준수',
        '구매 수량 일치여부',
        '추가'
    ];

    let checkRowIndex = checklistStartRow + 2;
    checklistItems.forEach((item, idx) => {
        const r = checkRowIndex + idx;
        sheet1.getRow(r).height = 30; // Taller rows for multi-line text

        // Col 1: Seq
        const seqCell = sheet1.getCell(r, 1);
        seqCell.value = item === '추가' ? '추가' : idx + 1;
        seqCell.border = thinBorder;
        seqCell.alignment = centerAlign;

        // Col 2-3: Item Name (Merge)
        sheet1.mergeCells(r, 2, r, 3);
        const itemCell = sheet1.getCell(r, 2);
        itemCell.value = item;
        itemCell.border = thinBorder;
        itemCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 };
        itemCell.font = { name: '맑은 고딕', size: 9 };

        // Col 4-8: Empty check boxes
        for (let col = 4; col <= 8; col++) {
            const cell = sheet1.getCell(r, col);
            cell.border = thinBorder;
            cell.alignment = centerAlign;

            // Auto-check 'Good' for specific items based on image logic
            if (col === 4 && item !== '도금상태' && item !== '시험성적서 동봉\n및 합격품 여부' && item !== '추가') {
                cell.value = 'O';
            }
        }
    });

    checkRowIndex += checklistItems.length; // 8 rows

    // --- Footer Area ---
    // Thick border separation
    const thickBorderTop = { top: { style: 'medium' }, left: { style: 'thin' }, right: { style: 'thin' }, bottom: { style: 'thin' } } as const;

    // "특이사항"
    sheet1.mergeCells(`A${checkRowIndex}:H${checkRowIndex + 2}`);
    const noteRow = sheet1.getCell(`A${checkRowIndex}`);
    noteRow.value = '특 이 사 항 :';
    noteRow.alignment = { vertical: 'top', horizontal: 'left', indent: 1 };
    noteRow.border = thickBorderTop; // Top border thicker
    noteRow.font = { name: '맑은 고딕', size: 10, bold: true };
    // Set heights
    sheet1.getRow(checkRowIndex).height = 20; // Top line
    sheet1.getRow(checkRowIndex + 1).height = 20;
    sheet1.getRow(checkRowIndex + 2).height = 20;

    const footerStart = checkRowIndex + 3;

    // --- Signature Area ---
    // A single large box containing text manually placed by spaces or separate cells?
    // Using separate cells is cleaner. 
    // We have A-H cols.
    // Row 1: 소속 A:D, 소속 E:H
    // Row 2: 검사일 A:D, 확인일 E:H
    // Row 3: 검사장소 A:D, 검토자 E:H
    // Row 4: 검사자 A:D, 승인자 E:H

    sheet1.getRow(footerStart).height = 25;
    sheet1.getRow(footerStart + 1).height = 25;
    sheet1.getRow(footerStart + 2).height = 25;
    sheet1.getRow(footerStart + 3).height = 25;

    // Helper for footer border (Left/Right thin, no top/bottom inside block)
    const leftBorder = { left: { style: 'thin' } } as const;
    const rightBorder = { right: { style: 'thin' } } as const;
    // const sideBorders = { left: { style: 'thin' }, right: { style: 'thin' } } as const; // This was not used, removed.

    // We can merge A-H for each row and use spaces, OR split A-D, E-H
    // Let's use A-D (Left) and E-H (Right) split.

    const today = new Date();
    const dateStr = `${today.getFullYear()} .   ${today.getMonth() + 1} .   ${today.getDate()} .`;

    // Row 1: 소속
    sheet1.mergeCells(`A${footerStart}:D${footerStart}`);
    sheet1.getCell(`A${footerStart}`).value = ' 소    속 : 광주텔레콤';
    sheet1.getCell(`A${footerStart}`).border = leftBorder;

    sheet1.mergeCells(`E${footerStart}:H${footerStart}`);
    sheet1.getCell(`E${footerStart}`).value = ' 소    속 : SK TNS';
    sheet1.getCell(`E${footerStart}`).border = rightBorder;

    // Row 2: 날짜
    sheet1.mergeCells(`A${footerStart + 1}:D${footerStart + 1}`);
    sheet1.getCell(`A${footerStart + 1}`).value = ` 검 사 일 : ${dateStr}`;
    sheet1.getCell(`A${footerStart + 1}`).border = leftBorder;

    sheet1.mergeCells(`E${footerStart + 1}:H${footerStart + 1}`);
    sheet1.getCell(`E${footerStart + 1}`).value = ` 확 인 일 : ${today.getFullYear()} .       .       .`;
    sheet1.getCell(`E${footerStart + 1}`).border = rightBorder;

    // Row 3: 장소 / 확인자
    sheet1.mergeCells(`A${footerStart + 2}:D${footerStart + 2}`);
    sheet1.getCell(`A${footerStart + 2}`).value = ' 검사장소 : 자재창고';
    sheet1.getCell(`A${footerStart + 2}`).border = leftBorder;

    sheet1.mergeCells(`E${footerStart + 2}:H${footerStart + 2}`);
    // "확 인 자 :           (인)" - use rich text or padding
    sheet1.getCell(`E${footerStart + 2}`).value = ' 확 인 자 :                               (인)';
    sheet1.getCell(`E${footerStart + 2}`).border = rightBorder;

    // Row 4: 검사자 / ?
    sheet1.mergeCells(`A${footerStart + 3}:D${footerStart + 3}`);
    sheet1.getCell(`A${footerStart + 3}`).value = ' 검 사 자 : 정다솔                         (인)';
    sheet1.getCell(`A${footerStart + 3}`).border = leftBorder;

    sheet1.mergeCells(`E${footerStart + 3}:H${footerStart + 3}`);
    sheet1.getCell(`E${footerStart + 3}`).value = ' 확 인 자 :                               (인)';
    sheet1.getCell(`E${footerStart + 3}`).border = rightBorder;

    // Bottom Note Row
    const lastRow = footerStart + 4;
    sheet1.getRow(lastRow).height = 30;
    sheet1.mergeCells(`A${lastRow}:H${lastRow}`);
    const lastCell = sheet1.getCell(`A${lastRow}`);
    lastCell.value = '※ SK TNS 공구담당에게 수시확인 후 바인더 보관 및 요청시 제출';
    lastCell.alignment = centerAlign;
    lastCell.font = { name: '맑은 고딕', size: 9 };
    // Bottom border is thick to close the box
    lastCell.border = { left: { style: 'thin' }, right: { style: 'thin' }, bottom: { style: 'medium' } };

    // Apply Vertical Align to all footer cells
    for (let r = footerStart; r < footerStart + 4; r++) {
        sheet1.getCell(`A${r}`).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        sheet1.getCell(`E${r}`).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    }

    // ==========================================
    // Sheet 2: 사진 대장
    // ==========================================
    const sheet2 = workbook.addWorksheet('입고검사 보고서(별첨)', {
        pageSetup: {
            paperSize: 9,
            orientation: 'portrait',
            margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 }
        }
    });

    // Columns: A(Seq), B(Date), C(Name), D(Spec), E(Maker), F(Qty)
    sheet2.columns = [
        { width: 6 },  // A
        { width: 12 }, // B
        { width: 15 }, // C
        { width: 25 }, // D
        { width: 20 }, // E
        { width: 10 }, // F
    ];

    // Title
    sheet2.mergeCells('A1:F1');
    const s2Title = sheet2.getCell('A1');
    s2Title.value = '■ 신규자재 입고 검사 보고서(별첨)';
    s2Title.font = { name: '맑은 고딕', size: 16, bold: true };
    s2Title.alignment = { vertical: 'middle', horizontal: 'left' };
    sheet2.getRow(1).height = 30;

    let s2Row = 2;

    for (let i = 0; i < selectedRecords.length; i++) {
        const record = selectedRecords[i];

        // --- Header Row ---
        const headers = ['순번', '입고일', '품명', '규격', '제조사명 / Serial No.', '수량'];
        headers.forEach((h, idx) => {
            const cell = sheet2.getCell(s2Row, idx + 1);
            cell.value = h;
            cell.border = thinBorder;
            cell.alignment = centerAlign;
            cell.fill = grayFill;
            cell.font = { name: '맑은 고딕', size: 10, bold: true };
        });

        // --- Data Row ---
        const dataRow = s2Row + 1;
        const recordDate = new Date(record.date);
        const dateStr = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}-${String(recordDate.getDate()).padStart(2, '0')}`;

        const values = [
            i + 1,
            dateStr,
            record.productName,
            record.specification,
            record.supplier,
            `${record.quantity}개`
        ];

        values.forEach((v, idx) => {
            const cell = sheet2.getCell(dataRow, idx + 1);
            cell.value = v;
            cell.border = thinBorder;
            cell.alignment = centerAlign;
            cell.font = { name: '맑은 고딕', size: 10 };
        });

        // --- Image Area ---
        const imgStartR = s2Row + 2;
        const imgEndR = imgStartR + 15; // 15 rows for image height
        sheet2.mergeCells(`A${imgStartR}:F${imgEndR}`);
        const imgCell = sheet2.getCell(`A${imgStartR}`);
        // imgCell.border = thinBorder; // Border around image area
        // Outer border for merged cell
        // ExcelJS requires referencing the top-left cell for style, but border on merged cells can be tricky.
        // It's often safer to apply border to the top-left cell.
        // Let's rely on manual border application if needed, or simple box.

        const attachments = getAttachments(record);
        let imageUrl: string | null = null;
        if (attachments.length > 0) {
            imageUrl = attachments[0].url;
        }

        if (imageUrl) {
            try {
                const imgBuffer = await fetchImage(imageUrl);
                const imageId = workbook.addImage({
                    buffer: imgBuffer,
                    extension: 'png',
                });
                // Add image with margins inside the cell
                sheet2.addImage(imageId, {
                    tl: { col: 0.1, row: imgStartR - 1 + 0.1 } as any,
                    br: { col: 5.9, row: imgEndR - 0.1 } as any,
                    editAs: 'oneCell'
                });
            } catch (err) {
                console.error("Image loading failed:", err);
                imgCell.value = "이미지 로드 실패";
                imgCell.alignment = centerAlign;
            }
        } else {
            imgCell.value = "첨부 사진 없음";
            imgCell.alignment = centerAlign;
        }

        s2Row = imgEndR + 2; // Move to next block with 1 empty row gap
    }

    // Save
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `입고검사서_${new Date().getTime()}.xlsx`);
};
