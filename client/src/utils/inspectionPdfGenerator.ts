import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { IncomingRecord } from '@shared/schema';

/**
 * 입고검사 보고서를 PDF로 생성
 * @param selectedRecords 선택된 입고 기록들
 * @param reportElement 보고서 HTML 요소
 * @param photosElement 사진 대장 HTML 요소
 */
export const generateInspectionPDF = async (
    selectedRecords: IncomingRecord[],
    reportElement: HTMLElement | null,
    photosElement: HTMLElement | null
) => {
    if (selectedRecords.length === 0) {
        alert("선택된 입고 내역이 없습니다.");
        return;
    }

    if (!reportElement || !photosElement) {
        console.error("PDF 생성을 위한 HTML 요소를 찾을 수 없습니다.");
        alert("PDF 생성을 위한 요소를 찾을 수 없습니다. 미리보기를 먼저 확인해주세요.");
        return;
    }

    try {
        // A4 크기 PDF 생성 (portrait)
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            compress: true // PDF 압축 활성화
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        // 1. 입고검사 보고서 페이지 추가
        const reportCanvas = await html2canvas(reportElement, {
            scale: 1.5, // 해상도를 2에서 1.5로 낮춤 (용량 감소)
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        });

        const reportImgData = reportCanvas.toDataURL('image/jpeg', 0.85); // JPEG 형식, 85% 품질
        let reportImgWidth = pdfWidth;
        let reportImgHeight = (reportCanvas.height * pdfWidth) / reportCanvas.width;

        // A4 높이를 넘으면 스케일 다운
        if (reportImgHeight > pdfHeight) {
            const scale = pdfHeight / reportImgHeight;
            reportImgHeight = pdfHeight;
            reportImgWidth = reportImgWidth * scale;
        }

        // 첫 페이지에 보고서 추가 (중앙 정렬)
        const reportX = (pdfWidth - reportImgWidth) / 2;
        pdf.addImage(reportImgData, 'JPEG', reportX, 0, reportImgWidth, reportImgHeight);

        // 2. 사진 대장을 품목 4개씩 페이지로 분할
        const photoItems = photosElement.querySelectorAll('.border.border-black.break-inside-avoid');
        const itemsPerPage = 4; // 한 페이지당 품목 4개 (사진 8장)

        for (let i = 0; i < photoItems.length; i += itemsPerPage) {
            // 품목 3개씩 묶어서 임시 컨테이너 생성
            const tempContainer = document.createElement('div');
            tempContainer.style.backgroundColor = '#ffffff';
            tempContainer.style.padding = '32px';
            tempContainer.style.minWidth = '700px';

            // 제목 추가
            const title = document.createElement('h1');
            title.textContent = '■ 신규자재 입고 검사 보고서(별첨)';
            title.style.fontSize = '24px';
            title.style.fontWeight = 'bold';
            title.style.marginBottom = '24px';
            title.style.textAlign = 'left';
            tempContainer.appendChild(title);

            // 품목 컨테이너
            const itemsContainer = document.createElement('div');
            itemsContainer.style.display = 'flex';
            itemsContainer.style.flexDirection = 'column';
            itemsContainer.style.gap = '32px';

            // 현재 페이지에 들어갈 품목들 복사
            const endIndex = Math.min(i + itemsPerPage, photoItems.length);
            for (let j = i; j < endIndex; j++) {
                const clonedItem = photoItems[j].cloneNode(true) as HTMLElement;
                itemsContainer.appendChild(clonedItem);
            }

            tempContainer.appendChild(itemsContainer);
            document.body.appendChild(tempContainer);

            // 임시 컨테이너를 캔버스로 변환
            const pageCanvas = await html2canvas(tempContainer, {
                scale: 1.5, // 해상도를 2에서 1.5로 낮춤
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            // 임시 컨테이너 제거
            document.body.removeChild(tempContainer);

            const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.85); // JPEG 형식, 85% 품질
            let pageImgWidth = pdfWidth;
            let pageImgHeight = (pageCanvas.height * pdfWidth) / pageCanvas.width;

            // A4 높이를 넘으면 스케일 다운
            if (pageImgHeight > pdfHeight) {
                const scale = pdfHeight / pageImgHeight;
                pageImgHeight = pdfHeight;
                pageImgWidth = pageImgWidth * scale;
            }

            // 새 페이지 추가 (중앙 정렬)
            pdf.addPage();
            const pageX = (pdfWidth - pageImgWidth) / 2;
            pdf.addImage(pageImgData, 'JPEG', pageX, 0, pageImgWidth, pageImgHeight);
        }

        // PDF 저장
        pdf.save(`입고검사서_${new Date().getTime()}.pdf`);
    } catch (error) {
        console.error("PDF 생성 중 오류 발생:", error);
        alert("PDF 생성에 실패했습니다. 다시 시도해주세요.");
    }
};
