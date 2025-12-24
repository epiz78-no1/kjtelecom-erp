import { useState, useCallback } from "react";
import { Upload, Download, X, AlertCircle } from "lucide-react";
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

interface BulkUploadDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpload: (items: any[]) => void;
}

interface ParsedRow {
    division: string;
    category: string;
    productName: string;
    specification: string;
    carriedOver: number;
    incoming: number;
    outgoing: number;
    remaining: number;
    unitPrice: number;
    totalAmount: number;
}

export function BulkUploadDialog({
    open,
    onOpenChange,
    onUpload,
}: BulkUploadDialogProps) {
    const { toast } = useToast();
    const [isDragging, setIsDragging] = useState(false);
    const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
    const [errors, setErrors] = useState<string[]>([]);
    const [fileName, setFileName] = useState<string>("");

    const handleDownloadTemplate = () => {
        const template = `구분,품명,규격,이월재고,입고량,출고량,잔량,단가,금액
SKT,광접속함체 무여장중간분기형,24C,7,102,100,9,147882,1330938
SKT,광접속함체 직선형,가공 24C,18,1289,1302,5,40150,200750`;

        const blob = new Blob(["\uFEFF" + template], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "inventory_template.csv");
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({ title: "템플릿이 다운로드되었습니다" });
    };

    const validateRow = (row: any, index: number): { valid: boolean; errors: string[] } => {
        const rowErrors: string[] = [];

        // 필수 필드 검증
        if (!row["구분"]) rowErrors.push(`${index + 2}행: 구분이 필요합니다`);
        if (!row["품명"]) rowErrors.push(`${index + 2}행: 품명이 필요합니다`);
        if (!row["규격"]) rowErrors.push(`${index + 2}행: 규격이 필요합니다`);

        // 숫자 필드 검증
        const numericFields = ["이월재고", "입고량", "출고량", "잔량", "단가", "금액"];
        numericFields.forEach((field) => {
            const value = row[field];
            if (value !== undefined && value !== "" && isNaN(Number(value))) {
                rowErrors.push(`${index + 2}행: ${field}는 숫자여야 합니다`);
            }
        });

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
                const validRows: ParsedRow[] = [];

                results.data.forEach((row: any, index: number) => {
                    const validation = validateRow(row, index);

                    if (!validation.valid) {
                        allErrors.push(...validation.errors);
                    } else {
                        validRows.push({
                            division: row["구분"] || "SKT",
                            category: row["구분"] || "SKT",
                            productName: row["품명"],
                            specification: row["규격"],
                            carriedOver: parseInt(row["이월재고"] || "0"),
                            incoming: parseInt(row["입고량"] || "0"),
                            outgoing: parseInt(row["출고량"] || "0"),
                            remaining: parseInt(row["잔량"] || "0"),
                            unitPrice: parseInt(row["단가"] || "0"),
                            totalAmount: parseInt(row["금액"] || "0"),
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
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>재고 일괄등록</DialogTitle>
                    <DialogDescription>
                        CSV 파일을 업로드하여 여러 재고 항목을 한번에 등록할 수 있습니다
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
                            id="csv-upload"
                        />
                        <label htmlFor="csv-upload">
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
                                            <TableHead className="w-[80px]">구분</TableHead>
                                            <TableHead className="w-[140px]">품명</TableHead>
                                            <TableHead className="w-[120px]">규격</TableHead>
                                            <TableHead className="w-[80px] text-right">이월재고</TableHead>
                                            <TableHead className="w-[80px] text-right">입고량</TableHead>
                                            <TableHead className="w-[80px] text-right">출고량</TableHead>
                                            <TableHead className="w-[80px] text-right">잔량</TableHead>
                                            <TableHead className="w-[100px] text-right">단가</TableHead>
                                            <TableHead className="w-[110px] text-right">금액</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {parsedData.slice(0, 10).map((item, index) => (
                                            <TableRow key={index}>
                                                <TableCell>{item.division}</TableCell>
                                                <TableCell className="max-w-[140px] truncate">
                                                    {item.productName}
                                                </TableCell>
                                                <TableCell className="max-w-[120px] truncate">
                                                    {item.specification}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {item.carriedOver.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {item.incoming.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {item.outgoing.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {item.remaining.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {item.unitPrice.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {item.totalAmount.toLocaleString()}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {parsedData.length > 10 && (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={9}
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
