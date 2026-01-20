import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IncomingRecord } from "@shared/schema";
import { FileText, Download, Image as ImageIcon } from "lucide-react";
import { generateInspectionExcel } from "@/utils/inspectionExcelGenerator";
import { format } from "date-fns";

interface InspectionPreviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedRecords: IncomingRecord[];
}

export function InspectionPreviewDialog({
    open,
    onOpenChange,
    selectedRecords,
}: InspectionPreviewDialogProps) {

    // Helper to parse attachments
    const getAttachments = (record: IncomingRecord): any[] => {
        try {
            if (!record.attributes) return [];

            const parsed = typeof record.attributes === 'string'
                ? JSON.parse(record.attributes)
                : record.attributes;

            if (Array.isArray(parsed)) return parsed;
            if (parsed.attachments && Array.isArray(parsed.attachments)) return parsed.attachments;
            if (parsed.attachment) return [parsed.attachment]; // Legacy fallback

            return [];
        } catch (e) { return []; }
    };

    const today = new Date();
    const dateStr = `${today.getFullYear()} .   ${today.getMonth() + 1} .   ${today.getDate()} .`;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        신규 자재 입고검사 보고서 미리보기
                    </DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="report" className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex justify-between items-center mb-2 px-1">
                        <TabsList>
                            <TabsTrigger value="report">입고검사 보고서</TabsTrigger>
                            <TabsTrigger value="photos">사진 대장 ({selectedRecords.length})</TabsTrigger>
                        </TabsList>
                        <div className="text-sm text-muted-foreground mr-2">
                            선택 항목: {selectedRecords.length}건
                        </div>
                    </div>

                    <ScrollArea className="flex-1 border rounded-md bg-white p-4">
                        {/* --- Report Tab --- */}
                        <TabsContent value="report" className="mt-0 min-w-[700px]">
                            <div className="border border-black p-8 bg-white text-black text-sm">
                                {/* Header */}
                                <h1 className="text-2xl font-bold mb-6 text-left">■ 신규 자재 입고검사 보고서</h1>

                                <div className="flex justify-between mb-2 text-sm">
                                    <span> 사용처 : SKT, SKB, 기타 (          )</span>
                                    <span className="text-right">※ 인수 자재 사진 별첨</span>
                                </div>

                                {/* Material Table */}
                                <table className="w-full border-collapse border border-black mb-8 text-center text-xs">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="border border-black p-1 w-12" rowSpan={2}>순번</th>
                                            <th className="border border-black p-1 w-48" rowSpan={2} colSpan={2}>품 명</th>
                                            <th className="border border-black p-1 w-40" rowSpan={2}>규 격</th>
                                            <th className="border border-black p-1 w-32" rowSpan={2}>제조사명 / Serial No.</th>
                                            <th className="border border-black p-1 w-16" rowSpan={2}>수 량</th>
                                            <th className="border border-black p-1" colSpan={2}>검 사 방 법</th>
                                        </tr>
                                        <tr>
                                            <th className="border border-black p-1 w-16">전수검사</th>
                                            <th className="border border-black p-1 w-16">Sampling</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Array.from({ length: Math.max(10, selectedRecords.length) }).map((_, idx) => {
                                            const record = selectedRecords[idx];
                                            return (
                                                <tr key={idx} className="h-8">
                                                    <td className="border border-black p-1">{idx + 1}</td>
                                                    <td className="border border-black p-1 text-left px-2" colSpan={2}>
                                                        {record?.productName || ''}
                                                    </td>
                                                    <td className="border border-black p-1 text-left px-2">{record?.specification || ''}</td>
                                                    <td className="border border-black p-1">{record?.supplier || ''}</td>
                                                    <td className="border border-black p-1">{record ? `${record.quantity}개` : ''}</td>
                                                    <td className="border border-black p-1 bg-gray-50"></td>
                                                    <td className="border border-black p-1">{record ? 'O' : ''}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>

                                {/* Checklist Table */}
                                <table className="w-full border-collapse border border-black mb-4 text-center text-xs">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="border border-black p-1 w-12" rowSpan={2}>순번</th>
                                            <th className="border border-black p-1" rowSpan={2} colSpan={2}>점 검 항 목</th>
                                            <th className="border border-black p-1 w-24" colSpan={2}>판 정</th>
                                            <th className="border border-black p-1 w-16" rowSpan={2}>해당<br />없음</th>
                                            <th className="border border-black p-1 w-24" rowSpan={2}>불량시<br />사유</th>
                                            <th className="border border-black p-1 w-20" rowSpan={2}>비 고</th>
                                        </tr>
                                        <tr>
                                            <th className="border border-black p-1">양호</th>
                                            <th className="border border-black p-1">불량</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[
                                            '배송상태 (포장파손, 내용물 변형)',
                                            '지정 Vendor 자재 여부 (AVL 일치)',
                                            '시험성적서 동봉 및 합격품 여부',
                                            '도금상태',
                                            '규격검토 (W,H,D)',
                                            '납기 준수',
                                            '구매 수량 일치여부',
                                            '추가'
                                        ].map((item, idx) => (
                                            <tr key={idx} className="h-10">
                                                <td className="border border-black p-1">{item === '추가' ? '추가' : idx + 1}</td>
                                                <td className="border border-black p-1 text-left px-2" colSpan={2}>{item}</td>
                                                <td className="border border-black p-1">
                                                    {item !== '도금상태' && item !== '시험성적서 동봉\n및 합격품 여부' && item !== '추가' ? 'O' : ''}
                                                </td>
                                                <td className="border border-black p-1"></td>
                                                <td className="border border-black p-1"></td>
                                                <td className="border border-black p-1"></td>
                                                <td className="border border-black p-1"></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {/* Note */}
                                <div className="border border-black border-t-2 min-h-20 p-2 mb-4">
                                    <span className="font-bold">특 이 사 항 :</span>
                                </div>

                                {/* Footer */}
                                <div className="border border-black p-4 text-sm">
                                    <div className="grid grid-cols-2 gap-8 mb-4">
                                        <div className="space-y-2">
                                            <div>소 &nbsp;&nbsp;&nbsp; 속 : 광주텔레콤</div>
                                            <div>검 사 일 : {dateStr}</div>
                                            <div>검사장소 : 자재창고</div>
                                            <div className="flex justify-between">
                                                <span>검 사 자 : 정다솔</span>
                                                <span>(인)</span>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div>소 &nbsp;&nbsp;&nbsp; 속 : SK TNS</div>
                                            <div>확 인 일 : {today.getFullYear()} . &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; . &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; .</div>
                                            <div className="flex justify-between">
                                                <span>확 인 자 :</span>
                                                <span>(인)</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>확 인 자 :</span>
                                                <span>(인)</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-center text-xs mt-4 pt-2 border-t border-black/50">
                                        ※ SK TNS 공구담당에게 수시확인 후 바인더 보관 및 요청시 제출
                                    </div>
                                </div>

                            </div>
                        </TabsContent>

                        {/* --- Photos Tab --- */}
                        <TabsContent value="photos" className="mt-0">
                            <div className="bg-white p-8 min-w-[700px]">
                                <h1 className="text-2xl font-bold mb-6 text-left">■ 신규자재 입고 검사 보고서(별첨)</h1>

                                <div className="flex flex-col gap-8">
                                    {selectedRecords.map((record, idx) => {
                                        const attachments = getAttachments(record);
                                        const imageUrl = attachments.length > 0 ? attachments[0].url : null;

                                        return (
                                            <div key={record.id} className="border border-black break-inside-avoid">
                                                {/* Header */}
                                                <div className="grid grid-cols-[3rem_1fr_1fr_1fr_1fr_4rem] border-b border-black text-center text-xs font-bold bg-gray-100">
                                                    <div className="border-r border-black p-2">순번</div>
                                                    <div className="border-r border-black p-2">입고일</div>
                                                    <div className="border-r border-black p-2">품명</div>
                                                    <div className="border-r border-black p-2">규격</div>
                                                    <div className="border-r border-black p-2">제조사명 / Serial No.</div>
                                                    <div className="p-2">수량</div>
                                                </div>
                                                <div className="grid grid-cols-[3rem_1fr_1fr_1fr_1fr_4rem] border-b border-black text-center text-xs">
                                                    <div className="border-r border-black p-2">{idx + 1}</div>
                                                    <div className="border-r border-black p-2">{format(new Date(record.date), 'yyyy-MM-dd')}</div>
                                                    <div className="border-r border-black p-2">{record.productName}</div>
                                                    <div className="border-r border-black p-2">{record.specification}</div>
                                                    <div className="border-r border-black p-2">{record.supplier}</div>
                                                    <div className="p-2">{record.quantity}개</div>
                                                </div>
                                                {/* Image Area */}
                                                <div className="h-[400px] flex items-center justify-center p-4 bg-slate-50">
                                                    {imageUrl ? (
                                                        <img
                                                            src={imageUrl}
                                                            alt={record.productName}
                                                            className="max-h-full max-w-full object-contain"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).src = '';
                                                                // Could set a placeholder or error state visible
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="flex flex-col items-center text-muted-foreground gap-2">
                                                            <ImageIcon className="h-10 w-10 opacity-20" />
                                                            <span>첨부된 사진이 없습니다</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </TabsContent>
                    </ScrollArea>
                </Tabs>

                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        취소
                    </Button>
                    <Button onClick={() => generateInspectionExcel(selectedRecords)}>
                        <Download className="mr-2 h-4 w-4" />
                        엑셀 다운로드
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
