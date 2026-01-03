import { useState, useCallback } from "react";
import { Upload, Download, AlertCircle, Trash2 } from "lucide-react";
import Papa from "papaparse";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface OpticalBulkUploadDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpload: (items: any[]) => void;
}

interface ParsedOpticalRow {
    division: string;
    category: string;
    managementNo: string; // 관리번호 (Required in DB)
    drumNo: string;
    receivedDate: string;
    manufacturer: string; // 제조사
    manufactureYear: string; // 제조연도
    spec: string; // 규격
    coreCount: number; // 코어
    location: string; // 위치
    remark: string; // 비고
    totalLength: string | number; // 케이블용량 (Can be string like 'RS_288C')
    incomingLength: number; // 입고량
    unitPrice: number; // 단가
    totalAmount: number; // 금액
    // These are usually 0 for new inventory
    usedLength: number;
    wasteLength: number;
    remainingLength: number;
}

export function OpticalBulkUploadDialog({
    open,
    onOpenChange,
    onUpload,
}: OpticalBulkUploadDialogProps) {
    const { toast } = useToast();
    const [isDragging, setIsDragging] = useState(false);
    const [parsedData, setParsedData] = useState<ParsedOpticalRow[]>([]);
    const [errors, setErrors] = useState<string[]>([]);
    const [fileName, setFileName] = useState<string>("");

    // TODO: Need to implement a template download for Optical Cables if not exists
    // For now, we can use a dummy function or update the backend to serve one.
    const handleDownloadTemplate = () => {
        // Minimal CSV content for template
        const headers = ["사업", "구분", "입고일자", "제조사", "제조연도", "규격", "코어 수", "제조번호", "보관장소", "케이블용량", "입고량", "사용량", "폐기", "잔량", "단가", "금액", "비고"];
        const csvContent = headers.join(",") + "\n" + "SKT,실외용,2023-01-01,대한광통신,2023,SM 24C,24,DR-12345,자재창고,RS_288C,1000,0,0,1000,1500,1500000,비고내용";
        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "optical_cable_template.csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast({ title: "템플릿이 다운로드되었습니다" });
    };

    const validateRow = (row: any, index: number): { valid: boolean; errors: string[] } => {
        const rowErrors: string[] = [];
        const getValue = (key: string) => row[key] || row[key.trim()];

        // Required fields
        if (!getValue("제조번호")) rowErrors.push(`${index + 2}행: 제조번호가 필요합니다`);
        if (!getValue("규격")) rowErrors.push(`${index + 2}행: 규격이 필요합니다`);
        // Check for length fields
        const hasLength = getValue("케이블용량") || getValue("입고량");
        if (!hasLength) rowErrors.push(`${index + 2}행: 케이블용량 또는 입고량이 필요합니다`);

        return { valid: rowErrors.length === 0, errors: rowErrors };
    };

    const parseCSV = (file: File) => {
        setFileName(file.name);
        setErrors([]);
        setParsedData([]);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            encoding: "UTF-8",
            transformHeader: (h) => h.trim(),
            complete: (results) => {
                const allErrors: string[] = [];
                const validRows: ParsedOpticalRow[] = [];

                results.data.forEach((row: any, index: number) => {
                    const validation = validateRow(row, index);

                    if (!validation.valid) {
                        allErrors.push(...validation.errors);
                    } else {
                        const parseNum = (val: any) => {
                            if (!val) return 0;
                            const str = String(val).replace(/,/g, "").trim();
                            const num = Number(str);
                            return isNaN(num) ? 0 : num;
                        };

                        const spec = row["규격"] || "";
                        const coreCount = parseNum(row["코어 수"] || row["코어"]);

                        // Use raw value for Cable Capacity (TEXT allowed)
                        let totalLength = row["케이블용량"] ? row["케이블용량"].trim() : "";
                        let incomingLength = parseNum(row["입고량"]);

                        // If Cable Capacity is missing, default to "{Spec}_{CoreCount}C"
                        if (!totalLength) {
                            totalLength = `${spec}_${coreCount}C`;
                        }

                        // Legacy "길이" support
                        if (!totalLength && incomingLength === 0 && row["길이"]) {
                            const length = row["길이"].trim();
                            const lengthNum = parseNum(length);
                            if (lengthNum > 0) { // If numeric-ish
                                incomingLength = lengthNum;
                            }
                        }

                        // Ensure incomingLength is set if totalLength is numeric usage
                        if (incomingLength === 0 && !isNaN(Number(totalLength)) && Number(totalLength) > 0) {
                            incomingLength = Number(totalLength);
                        }

                        const usedLength = parseNum(row["사용량"]);
                        const wasteLength = parseNum(row["폐기"]);
                        // Calculate remaining based on INCOMING length
                        const remainingLength = incomingLength - usedLength - wasteLength;

                        const unitPrice = parseNum(row["단가"]);
                        const totalAmount = parseNum(row["금액"]);
                        const calculatedAmount = totalAmount > 0 ? totalAmount : unitPrice * incomingLength;

                        const division = row["사업"] || "SKT";
                        const category = row["구분"] || "";
                        const drumNo = row["제조번호"] || row["품명"] || "";

                        // 관리번호가 없으면 자동 생성 (OPT + 타임스탬프 + 인덱스)
                        const timestamp = new Date().getTime();
                        const managementNo = row["관리번호"] || `OPT${timestamp}${index}`;

                        validRows.push({
                            division: division,
                            category: category,
                            managementNo: managementNo,
                            drumNo: drumNo,
                            receivedDate: row["입고일자"] || row["입고일"] || new Date().toISOString().split('T')[0],
                            manufacturer: row["제조사"] || "",
                            manufactureYear: row["제조연도"] || "",
                            spec: spec,
                            coreCount: coreCount,
                            location: row["보관장소"] || row["위치"] || "자재창고",
                            remark: row["비고"] || "",
                            totalLength: totalLength,
                            incomingLength: incomingLength,
                            unitPrice: unitPrice,
                            totalAmount: calculatedAmount,
                            usedLength: usedLength,
                            wasteLength: wasteLength,
                            remainingLength: remainingLength
                        });
                    }
                });

                if (allErrors.length > 0) {
                    setErrors(allErrors);
                }

                if (validRows.length > 0) {
                    setParsedData(validRows);
                    toast({
                        title: `${validRows.length}개 항목이 파싱되었습니다`,
                        description: allErrors.length > 0 ? `${allErrors.length}개 오류가 발견되었습니다` : undefined,
                    });
                } else if (allErrors.length > 0) {
                    toast({
                        title: "파싱 실패",
                        description: "유효한 데이터가 없습니다",
                        variant: "destructive",
                    });
                }
            },
            error: (error) => {
                toast({
                    title: "파일 읽기 실패",
                    description: error.message,
                    variant: "destructive",
                });
            },
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.name.endsWith(".csv")) {
                toast({
                    title: "잘못된 파일 형식",
                    description: "CSV 파일만 업로드 가능합니다",
                    variant: "destructive",
                });
                return;
            }
            parseCSV(file);
        }
    };

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file) {
            if (!file.name.endsWith(".csv")) {
                toast({
                    title: "잘못된 파일 형식",
                    description: "CSV 파일만 업로드 가능합니다",
                    variant: "destructive",
                });
                return;
            }
            parseCSV(file);
        }
    }, [toast]);

    const handleUpload = () => {
        if (parsedData.length === 0) {
            toast({
                title: "업로드할 데이터가 없습니다",
                variant: "destructive",
            });
            return;
        }

        if (errors.length > 0) {
            toast({
                title: "오류가 있는 데이터는 업로드할 수 없습니다",
                description: "오류를 수정한 후 다시 시도해주세요",
                variant: "destructive",
            });
            return;
        }

        onOpenChange(false); // 창 즉시 닫기
        toast({
            title: "일괄 등록을 시작합니다...",
            description: "잠시만 기다려주세요.",
        });
        onUpload(parsedData);
    };

    const handleClose = () => {
        setParsedData([]);
        setErrors([]);
        setFileName("");
        onOpenChange(false);
    };

    const handleDeleteRow = (index: number) => {
        setParsedData((prev) => prev.filter((_, i) => i !== index));
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>광케이블 일괄등록</DialogTitle>
                    <DialogDescription>
                        CSV 파일을 업로드하여 여러 광케이블 드럼을 한번에 등록할 수 있습니다
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="flex justify-between items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={handleDownloadTemplate}
                            size="sm"
                        >
                            <Download className="h-4 w-4 mr-2" />
                            템플릿 다운로드
                        </Button>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={handleClose} size="sm">
                                취소
                            </Button>
                            <Button
                                onClick={handleUpload}
                                disabled={parsedData.length === 0 || errors.length > 0}
                                size="sm"
                            >
                                <Upload className="h-4 w-4 mr-2" />
                                일괄 등록 ({parsedData.length}개)
                            </Button>
                        </div>
                    </div>

                    <div
                        className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${isDragging
                            ? "border-primary bg-primary/5"
                            : "border-muted-foreground/25"
                            }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <div className="flex flex-col items-center justify-center gap-2">
                            <Upload className="h-8 w-8 text-muted-foreground" />
                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">
                                    CSV 파일을 드래그하거나 클릭하여 선택하세요
                                </p>
                                {fileName && (
                                    <p className="text-sm font-medium text-foreground">
                                        선택된 파일: {fileName}
                                    </p>
                                )}
                            </div>
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleFileChange}
                                className="hidden"
                                id="optical-csv-upload"
                            />
                            <label htmlFor="optical-csv-upload">
                                <Button variant="secondary" size="sm" asChild className="h-8">
                                    <span>파일 선택</span>
                                </Button>
                            </label>
                        </div>
                    </div>

                    {errors.length > 0 && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                <div className="font-semibold mb-1">
                                    {errors.length}개의 오류가 발견되었습니다:
                                </div>
                                <ul className="list-disc list-inside text-sm space-y-1">
                                    {errors.slice(0, 5).map((error, index) => (
                                        <li key={index}>{error}</li>
                                    ))}
                                    {errors.length > 5 && (
                                        <li>그 외 {errors.length - 5}개...</li>
                                    )}
                                </ul>
                            </AlertDescription>
                        </Alert>
                    )}

                    {parsedData.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold mb-2">
                                미리보기 ({parsedData.length}개 항목)
                            </h3>
                            <div className="border rounded-md max-h-[400px] overflow-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="whitespace-nowrap w-[80px]">사업</TableHead>
                                            <TableHead className="whitespace-nowrap w-[80px]">구분</TableHead>
                                            <TableHead className="whitespace-nowrap w-[100px]">입고일자</TableHead>
                                            <TableHead className="whitespace-nowrap w-[100px]">제조사</TableHead>
                                            <TableHead className="whitespace-nowrap w-[80px]">제조연도</TableHead>
                                            <TableHead className="whitespace-nowrap w-[120px]">규격</TableHead>
                                            <TableHead className="whitespace-nowrap w-[80px]">코어 수</TableHead>
                                            <TableHead className="whitespace-nowrap w-[140px]">제조번호</TableHead>
                                            <TableHead className="whitespace-nowrap w-[100px]">보관장소</TableHead>
                                            <TableHead className="whitespace-nowrap w-[80px] text-right">케이블용량</TableHead>
                                            <TableHead className="whitespace-nowrap w-[80px] text-right">입고량</TableHead>
                                            <TableHead className="whitespace-nowrap w-[80px] text-right">사용량</TableHead>
                                            <TableHead className="whitespace-nowrap w-[80px] text-right">폐기</TableHead>
                                            <TableHead className="whitespace-nowrap w-[80px] text-right">잔량</TableHead>
                                            <TableHead className="whitespace-nowrap w-[100px] text-right">단가</TableHead>
                                            <TableHead className="whitespace-nowrap w-[110px] text-right">금액</TableHead>
                                            <TableHead className="whitespace-nowrap w-[100px]">비고</TableHead>
                                            <TableHead className="whitespace-nowrap w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {parsedData.map((item, index) => (
                                            <TableRow key={index}>
                                                <TableCell className="whitespace-nowrap">{item.division}</TableCell>
                                                <TableCell className="whitespace-nowrap">{item.category}</TableCell>
                                                <TableCell className="whitespace-nowrap">{item.receivedDate}</TableCell>
                                                <TableCell className="whitespace-nowrap">{item.manufacturer}</TableCell>
                                                <TableCell className="whitespace-nowrap">{item.manufactureYear}</TableCell>
                                                <TableCell className="whitespace-nowrap">{item.spec}</TableCell>
                                                <TableCell className="whitespace-nowrap">{item.coreCount}</TableCell>
                                                <TableCell className="whitespace-nowrap">{item.drumNo}</TableCell>
                                                <TableCell className="whitespace-nowrap">{item.location}</TableCell>
                                                <TableCell className="whitespace-nowrap text-right">
                                                    {item.totalLength.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap text-right">
                                                    {item.incomingLength.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap text-right">
                                                    {item.usedLength.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap text-right">
                                                    {item.wasteLength.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap text-right font-medium text-blue-600">
                                                    {item.remainingLength.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap text-right">
                                                    {item.unitPrice.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap text-right">
                                                    {item.totalAmount.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap max-w-[100px] truncate">
                                                    {item.remark}
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDeleteRow(index)}
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
