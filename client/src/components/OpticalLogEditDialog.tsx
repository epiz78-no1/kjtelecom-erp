
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Loader2, Upload, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { OpticalCableLog } from "@shared/schema";

const formSchema = z.object({
    projectCode: z.string().optional(),
    projectNameUsage: z.string().optional(),
    usageDate: z.string(),
    remark: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    log: OpticalCableLog | null;
    onSubmit: (id: string, data: any) => Promise<void>;
}

export function OpticalLogEditDialog({ open, onOpenChange, log, onSubmit }: Props) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [attachment, setAttachment] = useState<{ name: string; data: string } | null>(null);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            projectCode: "",
            projectNameUsage: "",
            usageDate: format(new Date(), "yyyy-MM-dd"),
            remark: "",
        },
    });

    useEffect(() => {
        if (log && open) {
            let remark = "";
            try {
                const attrs = JSON.parse(log.attributes || "{}");
                remark = attrs.remark || "";
                if (attrs.attachment) {
                    setAttachment(attrs.attachment);
                } else {
                    setAttachment(null);
                }
            } catch {
                setAttachment(null);
            }

            form.reset({
                projectCode: log.projectCode || "",
                projectNameUsage: log.projectNameUsage || "",
                usageDate: log.usageDate,
                remark,
            });
        }
    }, [log, open]);

    const handleSubmit = async (values: FormValues) => {
        if (!log) return;
        setIsSubmitting(true);
        try {
            // Prepare attributes with remark
            let attributes = {};
            try {
                attributes = JSON.parse(log.attributes || "{}");
            } catch { }

            const payload = {
                ...values,
                attributes: JSON.stringify({ ...attributes, remark: values.remark, attachment }),
            };

            await onSubmit(log.id, payload);
            onOpenChange(false);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>내역 수정</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">

                        <FormField
                            control={form.control}
                            name="usageDate"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>일자</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {field.value ? (
                                                        format(new Date(field.value), "yyyy-MM-dd")
                                                    ) : (
                                                        <span>날짜 선택</span>
                                                    )}
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value ? new Date(field.value) : undefined}
                                                onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="projectCode"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>공사코드</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="projectNameUsage"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>공사명</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="remark"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>비고</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="space-y-2">
                            <FormLabel>첨부파일</FormLabel>
                            <div className="space-y-2">
                                <div className="relative">
                                    <Input
                                        type="file"
                                        className="hidden"
                                        id="edit-file-upload"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onload = (e) => {
                                                    if (e.target?.result && typeof e.target.result === "string") {
                                                        setAttachment({
                                                            name: file.name,
                                                            data: e.target.result
                                                        });
                                                    }
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                    />
                                    <label
                                        htmlFor="edit-file-upload"
                                        className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-primary/30 rounded-lg cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                                    >
                                        <Upload className="h-5 w-5 text-primary" />
                                        <span className="text-sm font-medium text-primary">
                                            {attachment ? attachment.name : "파일 선택 또는 드래그"}
                                        </span>
                                    </label>
                                </div>
                                {attachment && (
                                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                                        <span className="text-sm text-muted-foreground truncate">
                                            📎 {attachment.name}
                                        </span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => setAttachment(null)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                취소
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                수정 저장
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
