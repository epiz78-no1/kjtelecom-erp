import { useState, useCallback } from "react";
import { Upload, Download, AlertCircle } from "lucide-react";
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

interface IncomingBulkUploadDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpload: (items: any[]) => void;
}

interface ParsedIncomingRow {
    date: string;
    division: string;
    supplier: string;
    projectName: string;
    productName: string;
    specification: string;
    quantity: number;
    unitPrice: number;
}

export function IncomingBulkUploadDialog({
    open,
    onOpenChange,
    onUpload,
}: IncomingBulkUploadDialogProps) {
    const { toast } = useToast();
    const [isDragging, setIsDragging] = useState(false);
    const [parsedData, setParsedData] = useState<ParsedIncomingRow[]>([]);
    const [errors, setErrors] = useState<string[]>([]);
    const [fileName, setFileName] = useState<string>("");

    const handleDownloadTemplate = () => {
        const template = `입고일,사업부,구매처,공사명,품명,규격,수량,단가
2024-12-24,SKT,텔레시스,[광텔] 2025년 SKT 운용사업,광접속함체 돔형,가공 96C,10,39398
2024-12-24,SKT,삼성전자,[광텔] 2025년 SKT 운용사업,광점퍼코드,SM 1C SC/APC-SC/APC 3M,50,2806`;

        const blob = new Blob(["\uFEFF" + template], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "incoming_template.csv");
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({ title: "템플릿이 다운로드되었습니다" });
    };

    const validateRow = (row: any, index: number): { valid: boolean; errors: string[] } => {
        const rowErrors: string[] = [];

        // 필수 필드 검증
        if (!row["입고일"]) rowErrors.push(`${index + 2}행: 입고일이 필요합니다`);
        if (!row["사업부"]) rowErrors.push(`${index + 2}행: 사업부가 필요합니다`);
        if (!row["구매처"]) rowErrors.push(`${index + 2}행: 구매처가 필요합니다`);
        if (!row["공사명"]) rowErrors.push(`${index + 2}행: 공사명이 필요합니다`);
        if (!row["품명"]) rowErrors.push(`${index + 2}행: 품명이 필요합니다`);

        // 숫자 필드 검증
        const numericFields = ["수량", "단가"];
        numericFields.forEach((field) => {
            const value = row[field];
            if (value !== undefined && value !== "" && isNaN(Number(value))) {
                rowErrors.push(`${index + 2}행: ${field}는 숫자여야 합니다`);
            }
        });

        // 날짜 형식 검증 (간단한 체크)
        if (row["입고일"] && !/^\d{4}-\d{2}-\d{2}$/.test(row["입고일"])) {
            rowErrors.push(`${index + 2}행: 입고일은 YYYY-MM-DD 형식이어야 합니다`);
        }

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
            complete: (results) => {
                const allErrors: string[] = [];
                const validRows: ParsedIncomingRow[] = [];

                results.data.forEach((row: any, index: number) => {
                    const validation = validateRow(row, index);

                    if (!validation.valid) {
                        allErrors.push(...validation.errors);
                    } else {
                        validRows.push({
                            date: row["입고일"],
                            division: row["사업부"] || "SKT",
                            supplier: row["구매처"],
                            projectName: row["공사명"],
                            productName: row["품명"],
                            specification: row["규격"] || "",
                            quantity: parseInt(row["수량"] || "0"),
                            unitPrice: parseInt(row["단가"] || "0"),
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

        onUpload(parsedData);
        handleClose();
    };

    const handleClose = () => {
        setParsedData([]);
        setErrors([]);
        setFileName("");
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>입고내역 일괄등록</DialogTitle>
                    <DialogDescription>
                        CSV 파일을 업로드하여 여러 입고 내역을 한번에 등록할 수 있습니다
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={handleDownloadTemplate}
                            className="w-full"
                        >
                            <Download className="h-4 w-4 mr-2" />
                            템플릿 다운로드
                        </Button>
                    </div>

                    <div
                        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging
                                ? "border-primary bg-primary/5"
                                : "border-muted-foreground/25"
                            }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-2">
                            CSV 파일을 드래그하거나 클릭하여 선택하세요
                        </p>
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            className="hidden"
                            id="csv-upload-incoming"
                        />
                        <label htmlFor="csv-upload-incoming">
                            <Button variant="secondary" asChild>
                                <span>파일 선택</span>
                            </Button>
                        </label>
                        {fileName && (
                            <p className="text-sm text-muted-foreground mt-2">
                                선택된 파일: {fileName}
                            </p>
                        )}
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
                            <div className="border rounded-md max-h-64 overflow-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[100px]">입고일</TableHead>
                                            <TableHead className="w-[60px]">사업부</TableHead>
                                            <TableHead className="w-[80px]">구매처</TableHead>
                                            <TableHead className="w-[180px]">공사명</TableHead>
                                            <TableHead className="w-[120px]">품명</TableHead>
                                            <TableHead className="w-[120px]">규격</TableHead>
                                            <TableHead className="w-[70px] text-right">수량</TableHead>
                                            <TableHead className="w-[90px] text-right">단가</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {parsedData.slice(0, 10).map((item, index) => (
                                            <TableRow key={index}>
                                                <TableCell>{item.date}</TableCell>
                                                <TableCell>{item.division}</TableCell>
                                                <TableCell className="max-w-[80px] truncate">
                                                    {item.supplier}
                                                </TableCell>
                                                <TableCell className="max-w-[180px] truncate">
                                                    {item.projectName}
                                                </TableCell>
                                                <TableCell className="max-w-[120px] truncate">
                                                    {item.productName}
                                                </TableCell>
                                                <TableCell className="max-w-[120px] truncate">
                                                    {item.specification}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {item.quantity.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {item.unitPrice.toLocaleString()}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {parsedData.length > 10 && (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={8}
                                                    className="text-center text-muted-foreground"
                                                >
                                                    그 외 {parsedData.length - 10}개 항목...
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose}>
                        취소
                    </Button>
                    <Button
                        onClick={handleUpload}
                        disabled={parsedData.length === 0 || errors.length > 0}
                    >
                        업로드 ({parsedData.length}개)
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
