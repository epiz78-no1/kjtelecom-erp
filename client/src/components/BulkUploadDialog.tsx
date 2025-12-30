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
    usage?: number;
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

    const handleDownloadTemplate = async () => {
        try {
            const res = await fetch("/api/templates/inventory");
            if (!res.ok) throw new Error("Download failed");
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "inventory_template.csv";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            toast({ title: "템플릿이 다운로드되었습니다" });
        } catch (error) {
            toast({ title: "다운로드 실패", variant: "destructive" });
        }
    };

    const validateRow = (row: any, index: number): { valid: boolean; errors: string[] } => {
        const rowErrors: string[] = [];

        // Helper to get value case-insensitively or with fuzzy matching if needed
        const getValue = (key: string) => row[key] || row[key.trim()];

        // 필수 필드 검증
        if (!getValue("구분")) rowErrors.push(`${index + 2}행: 구분이 필요합니다`);
        if (!getValue("품명")) rowErrors.push(`${index + 2}행: 품명이 필요합니다`);
        if (!getValue("규격")) rowErrors.push(`${index + 2}행: 규격이 필요합니다`);

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
            transformHeader: (h) => h.trim(), // Trim whitespace from headers
            complete: (results) => {
                const allErrors: string[] = [];
                const validRows: ParsedRow[] = [];

                results.data.forEach((row: any, index: number) => {
                    const validation = validateRow(row, index);

                    if (!validation.valid) {
                        allErrors.push(...validation.errors);
                    } else {
                        // Safe number parsing - converts decimals to integers
                        const parseNum = (val: any) => {
                            if (!val) return 0;
                            const str = String(val).replace(/,/g, "").trim();
                            const num = Number(str);
                            return isNaN(num) ? 0 : Math.round(num); // 소수점을 정수로 반올림
                        };


                        const outgoing = parseNum(row["현장팀보유재고"]);
                        const remaining = parseNum(row["사무실보유재고"]);
                        const unitPrice = parseNum(row["단가"]);
                        const totalAmount = parseNum(row["금액"]);

                        // 금액이 비어있거나 0이면 자동 계산: 단가 × (현장팀 + 사무실)
                        const calculatedAmount = totalAmount > 0 ? totalAmount : unitPrice * (outgoing + remaining);

                        validRows.push({
                            division: row["구분"] || "SKT",
                            category: row["구분"] || "SKT",
                            productName: row["품명"],
                            specification: row["규격"],
                            carriedOver: 0, // Not typically in template, but if needed: parseNum(row["이월재"])
                            incoming: 0,
                            outgoing: outgoing,
                            remaining: remaining,
                            unitPrice: unitPrice,
                            totalAmount: calculatedAmount,
                            usage: 0 // New field
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

    const handleDeleteRow = (index: number) => {
        setParsedData((prev) => prev.filter((_, i) => i !== index));
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
                                            <TableHead className="w-[80px] text-right">재고현황</TableHead>
                                            <TableHead className="w-[80px] text-right">현장팀</TableHead>
                                            <TableHead className="w-[80px] text-right">사무실</TableHead>
                                            <TableHead className="w-[100px] text-right">단가</TableHead>
                                            <TableHead className="w-[110px] text-right">금액</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {parsedData.map((item, index) => (
                                            <TableRow key={index}>
                                                <TableCell>{item.division}</TableCell>
                                                <TableCell className="max-w-[140px] truncate">
                                                    {item.productName}
                                                </TableCell>
                                                <TableCell className="max-w-[120px] truncate">
                                                    {item.specification}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {(item.remaining + item.outgoing).toLocaleString()}
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
