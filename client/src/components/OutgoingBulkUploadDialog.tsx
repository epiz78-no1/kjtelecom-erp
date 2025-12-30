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

interface OutgoingBulkUploadDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpload: (items: any[]) => void;
}

interface ParsedOutgoingRow {
    date: string;
    division: string;
    category: string;
    teamCategory: string;
    projectName: string;
    productName: string;
    specification: string;
    quantity: number;
    recipient: string;
}

export function OutgoingBulkUploadDialog({
    open,
    onOpenChange,
    onUpload,
}: OutgoingBulkUploadDialogProps) {
    const { toast } = useToast();
    const [isDragging, setIsDragging] = useState(false);
    const [parsedData, setParsedData] = useState<ParsedOutgoingRow[]>([]);
    const [errors, setErrors] = useState<string[]>([]);
    const [fileName, setFileName] = useState<string>("");

    const handleDownloadTemplate = async () => {
        try {
            const res = await fetch("/api/templates/outgoing");
            if (!res.ok) throw new Error("Download failed");
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "outgoing_template.csv";
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

        // 필수 필드 검증
        if (!row["출고일"]) rowErrors.push(`${index + 2}행: 출고일이 필요합니다`);
        if (!row["구분"]) rowErrors.push(`${index + 2}행: 구분이 필요합니다`);
        if (!row["수령팀"]) rowErrors.push(`${index + 2}행: 수령팀이 필요합니다`);
        if (!row["공사명"]) rowErrors.push(`${index + 2}행: 공사명이 필요합니다`);
        if (!row["품명"]) rowErrors.push(`${index + 2}행: 품명이 필요합니다`);
        if (!row["수령인"]) rowErrors.push(`${index + 2}행: 수령인이 필요합니다`);

        // 숫자 필드 검증
        const value = row["수량"];
        if (value !== undefined && value !== "" && isNaN(Number(value))) {
            rowErrors.push(`${index + 2}행: 수량은 숫자여야 합니다`);
        }

        // 날짜 형식 검증
        if (row["출고일"] && !/^\d{4}-\d{2}-\d{2}$/.test(row["출고일"])) {
            rowErrors.push(`${index + 2}행: 출고일은 YYYY-MM-DD 형식이어야 합니다`);
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
                const validRows: ParsedOutgoingRow[] = [];

                results.data.forEach((row: any, index: number) => {
                    const validation = validateRow(row, index);

                    if (!validation.valid) {
                        allErrors.push(...validation.errors);
                    } else {
                        validRows.push({
                            date: row["출고일"],
                            division: "SKT", // Default to SKT
                            category: row["구분"],
                            teamCategory: row["수령팀"],
                            projectName: row["공사명"],
                            productName: row["품명"],
                            specification: row["규격"] || "",
                            quantity: parseInt((row["수량"] || "0").replace(/,/g, "")) || 0,
                            recipient: row["수령인"],
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
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>출고내역 일괄등록</DialogTitle>
                    <DialogDescription>
                        CSV 파일을 업로드하여 여러 출고 내역을 한번에 등록할 수 있습니다
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
                            id="csv-upload-outgoing"
                        />
                        <label htmlFor="csv-upload-outgoing">
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
                                            <TableHead className="w-[100px]">출고일</TableHead>
                                            <TableHead className="w-[60px]">구분</TableHead>
                                            <TableHead className="w-[70px]">수령팀</TableHead>
                                            <TableHead className="w-[180px]">공사명</TableHead>
                                            <TableHead className="w-[120px]">품명</TableHead>
                                            <TableHead className="w-[120px]">규격</TableHead>
                                            <TableHead className="w-[70px] text-right">수량</TableHead>
                                            <TableHead className="w-[80px]">수령인</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {parsedData.slice(0, 10).map((item, index) => (
                                            <TableRow key={index}>
                                                <TableCell>{item.date}</TableCell>
                                                <TableCell>{item.division}</TableCell>
                                                <TableCell className="max-w-[70px] truncate">
                                                    {item.teamCategory}
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
                                                <TableCell className="max-w-[80px] truncate">
                                                    {item.recipient}
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
