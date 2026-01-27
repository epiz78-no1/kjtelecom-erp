import { useState, useCallback, useEffect } from "react";
import { Upload, Download, AlertCircle, Trash2, Loader2 } from "lucide-react";
import Papa from "papaparse";
import {
    Dialog,
    DialogContent,
    DialogDescription,
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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export interface BulkUploadColumn<T> {
    header: string;
    width?: string;
    align?: 'left' | 'center' | 'right';
    render: (item: T) => React.ReactNode;
}

export interface GenericBulkUploadDialogProps<T> {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;

    // 템플릿 다운로드 관련
    templateUrl?: string;
    templateFileName?: string;
    onDownloadTemplate?: () => void; // 커스텀 다운로드 핸들러 (Optical 등 API 없는 경우)

    // 데이터 처리 관련
    validateRow: (row: any, index: number) => { valid: boolean; errors: string[] };
    transformRow: (row: any, index: number) => T; // 파싱된 row를 T 타입으로 변환

    // 테이블 컬럼 정의
    columns: BulkUploadColumn<T>[];

    // 모드 선택 (덮어쓰기/이어쓰기)
    enableModeSelection?: boolean;

    // 업로드 핸들러
    onUpload: (items: T[], mode?: 'overwrite' | 'add') => void;

    // 스타일
    maxWidth?: string; // e.g. "max-w-5xl"

    // 로딩 상태
    isLoading?: boolean;
}

export function GenericBulkUploadDialog<T>({
    open,
    onOpenChange,
    title,
    description,
    templateUrl,
    templateFileName = "template.csv",
    onDownloadTemplate,
    validateRow,
    transformRow,
    columns,
    enableModeSelection = false,
    onUpload,
    maxWidth = "w-fit max-w-[95vw]",
    isLoading = false
}: GenericBulkUploadDialogProps<T>) {
    const { toast } = useToast();
    const [isDragging, setIsDragging] = useState(false);
    const [parsedData, setParsedData] = useState<T[]>([]);
    const [errors, setErrors] = useState<string[]>([]);
    const [fileName, setFileName] = useState<string>("");
    const [mode, setMode] = useState<"overwrite" | "add">("overwrite");

    // Dialog가 닫힐 때 상태 초기화 (부모에 의해 닫히는 경우 포함)
    useEffect(() => {
        if (!open) {
            setParsedData([]);
            setErrors([]);
            setFileName("");
            setMode("overwrite");
        }
    }, [open]);

    const handleDownloadTemplate = async () => {
        if (onDownloadTemplate) {
            onDownloadTemplate();
            return;
        }

        if (!templateUrl) return;

        try {
            const res = await fetch(templateUrl);
            if (!res.ok) throw new Error("Download failed");
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = templateFileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            toast({ title: "템플릿이 다운로드되었습니다" });
        } catch (error) {
            toast({ title: "다운로드 실패", variant: "destructive" });
        }
    };

    const parseCSV = (file: File) => {
        setFileName(file.name);
        setErrors([]);
        setParsedData([]);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            encoding: "UTF-8",
            transformHeader: (h) => h.trim().replace(/^\ufeff/, ''), // Trim whitespace and remove BOM
            complete: (results) => {
                const allErrors: string[] = [];
                const validRows: T[] = [];

                results.data.forEach((row: any, index: number) => {
                    const validation = validateRow(row, index);

                    if (!validation.valid) {
                        allErrors.push(...validation.errors);
                    } else {
                        try {
                            const transformed = transformRow(row, index);
                            validRows.push(transformed);
                        } catch (e: any) {
                            allErrors.push(`${index + 2}행 변환 중 오류: ${e.message}`);
                        }
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

        onUpload(parsedData, enableModeSelection ? mode : undefined);
        // Do not close automatically if loading is handled by parent, otherwise close
        // But since we don't know if parent will pass isLoading=true before this renders...
        // Actually, if we use mutation.mutate, it's async but returns immediately unless we await.
        // We rely on parent to control open state OR parent to not close it.
        // If isLoading is passed, we assume parent handles closing.
        if (!isLoading) {
            // If isLoading is undefined or false, we might closing it prematurely if parent intended to use it.
            // But traditionally, if onUpload is void, we closed here.
            // We will remove handleClose() here and let the parent decide?
            // No, that breaks existing usage.
            // Let's assume if isLoading is provided (boolean), we DON'T close.
            // But isLoading is false initially.
            // So we should check if onUpload returns a promise? No it's void.
            // We will rely on parent closing it.
            // BUT, to keep backward compatibility:
            // If we change parent to pass isLoading, we also change parent to close it.
        }
        // CHANGED: We removed handleClose() call here. Parent MUST close it or we add a flag?
        // Let's keep handleClose() ONLY if isLoading is strictly undefined.
        // But safer is: Parent closes it.
        // Disabling handleClose here.
    };

    const handleClose = () => {
        if (isLoading) return; // Prevent closing while loading
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
            <DialogContent className={`${maxWidth} max-h-[90vh] overflow-y-auto`}>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="flex justify-between items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={handleDownloadTemplate}
                            size="sm"
                            disabled={isLoading}
                        >
                            <Download className="h-4 w-4 mr-2" />
                            템플릿 다운로드
                        </Button>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={handleClose} size="sm" disabled={isLoading}>
                                취소
                            </Button>
                            <Button
                                onClick={handleUpload}
                                disabled={parsedData.length === 0 || errors.length > 0 || isLoading}
                                size="sm"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        처리중...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="h-4 w-4 mr-2" />
                                        일괄 등록 ({parsedData.length}개)
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    <div
                        className={`border-2 border-dashed rounded-lg p-2 text-center transition-colors ${isDragging
                            ? "border-primary bg-primary/5"
                            : "border-muted-foreground/25"
                            }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <div className="flex items-center justify-center gap-4">
                            <Upload className="h-6 w-6 text-muted-foreground" />
                            <div className="text-sm text-muted-foreground">
                                CSV 파일을 드래그하거나 클릭하여 선택하세요
                                {fileName && (
                                    <span className="ml-2 font-medium text-foreground">
                                        (선택됨: {fileName})
                                    </span>
                                )}
                            </div>
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleFileChange}
                                onClick={(e) => (e.currentTarget.value = "")}
                                className="hidden"
                                id={`csv-upload-${title.replace(/\s/g, '-')}`}
                            />
                            <label htmlFor={`csv-upload-${title.replace(/\s/g, '-')}`}>
                                <Button variant="secondary" size="sm" asChild className="h-7 text-xs">
                                    <span>파일 선택</span>
                                </Button>
                            </label>
                        </div>
                    </div>

                    {enableModeSelection && (
                        <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                            <Label className="text-sm font-medium">중복 데이터 처리 방식</Label>
                            <RadioGroup
                                value={mode}
                                onValueChange={(v) => setMode(v as "overwrite" | "add")}
                                className="flex flex-col space-y-1"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="overwrite" id="mode-overwrite" />
                                    <Label htmlFor="mode-overwrite" className="font-normal cursor-pointer">
                                        덮어쓰기 (기본) - 엑셀 파일의 수량으로 변경
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="add" id="mode-add" />
                                    <Label htmlFor="mode-add" className="font-normal cursor-pointer">
                                        이어쓰기 (추가) - 기존 수량에 더하기
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>
                    )}

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

                    <div>
                        {parsedData.length > 0 && (
                            <h3 className="text-sm font-semibold mb-2">
                                미리보기 ({parsedData.length}개 항목)
                            </h3>
                        )}
                        <div className="border rounded-md max-h-[400px] overflow-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        {columns.map((col, idx) => (
                                            <TableHead
                                                key={idx}
                                                className={`whitespace-nowrap ${col.width || ''} ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}
                                            >
                                                {col.header}
                                            </TableHead>
                                        ))}
                                        {parsedData.length > 0 && <TableHead className="whitespace-nowrap w-[50px]"></TableHead>}
                                    </TableRow>
                                </TableHeader>
                                {parsedData.length > 0 && (
                                    <TableBody>
                                        {parsedData.slice(0, 50).map((item, index) => (
                                            <TableRow key={index}>
                                                {columns.map((col, cIdx) => (
                                                    <TableCell
                                                        key={cIdx}
                                                        className={`whitespace-nowrap ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}
                                                    >
                                                        {col.render(item)}
                                                    </TableCell>
                                                ))}
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
                                        {parsedData.length > 50 && (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={columns.length + 1}
                                                    className="text-center text-muted-foreground"
                                                >
                                                    그 외 {parsedData.length - 50}개 항목...
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                )}
                            </Table>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog >
    );
}
