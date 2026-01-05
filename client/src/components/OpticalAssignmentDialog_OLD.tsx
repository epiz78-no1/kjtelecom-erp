
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Loader2, Check, ChevronsUpDown, CalendarIcon } from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/contexts/AppContext";
import type { OpticalCable, OpticalCableLog } from "@shared/schema";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";

const formSchema = z.object({
    cableId: z.string().min(1, "드럼을 선택해주세요"),
    teamId: z.string().min(1, "팀을 선택해주세요"),
    projectCode: z.string().optional(),
    projectNameUsage: z.string().optional(),
    usageDate: z.string(),
    remark: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
    trigger?: React.ReactNode;
    initialCableId?: string | null;
}

export default function OpticalAssignmentDialog({ trigger, initialCableId }: Props) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { teams } = useAppContext();

    // Fetch Available Cables (In Stock)
    const { data: cables = [], isLoading: isLoadingCables } = useQuery<(OpticalCable & { logs: OpticalCableLog[] })[]>({
        queryKey: ["/api/optical-cables"],
    });

    // If initialCableId is provided, include it even if not "in_stock" (though it should be for assignment)
    // Actually, if we are opening from history, we might want to assign it.
    // But filters logic:
    const availableCables = cables.filter(c => c.status === 'in_stock' && c.remainingLength > 0);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            cableId: initialCableId || "",
            teamId: "",
            projectCode: "",
            projectNameUsage: "",
            usageDate: format(new Date(), "yyyy-MM-dd"),
            remark: "",
        },
    });

    useEffect(() => {
        if (open && initialCableId) {
            form.setValue("cableId", initialCableId);
        }
    }, [open, initialCableId, form]);

    const mutation = useMutation({
        mutationFn: async (values: FormValues) => {
            // Use the generic log endpoint with logType 'assign'
            // This endpoint supports projectCode, projectNameUsage, etc.
            const payload = {
                logType: 'assign',
                teamId: values.teamId,
                projectCode: values.projectCode,
                projectNameUsage: values.projectNameUsage,
                usageDate: values.usageDate,
                attributes: values.remark ? JSON.stringify({ remark: values.remark }) : undefined,
                // Create log endpoint expects payload related to log, cableId is in URL usually or body
                // Checked server routes: POST /api/optical-cables/:id/log takes body
            };

            const res = await apiRequest(
                "POST",
                `/api/optical-cables/${values.cableId}/log`,
                payload
            );
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables"] });
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables/logs"] });
            // Also invalidate specific cable logs
            if (form.getValues().cableId) {
                queryClient.invalidateQueries({ queryKey: [`/api/optical-cables/${form.getValues().cableId}/logs`] });
            }

            toast({ title: "출고 완료", description: "성공적으로 팀에 할당되었습니다." });
            setOpen(false);
            form.reset();
        },
        onError: (error: Error) => {
            toast({
                title: "출고 실패",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    function onSubmit(values: FormValues) {
        if (confirm("선택한 드럼을 해당 팀으로 출고하시겠습니까?")) {
            mutation.mutate(values);
        }
    }

    // Filter field teams (active only)
    const fieldTeams = teams.filter(t => t.isActive);

    const selectedCable = availableCables.find(c => c.id === form.watch("cableId")) || (initialCableId ? cables.find(c => c.id === initialCableId) : null);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || <Button>신규 출고 등록</Button>}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>신규 출고 등록 (팀 할당)</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                        {/* Cable Selection */}
                        <FormField
                            control={form.control}
                            name="cableId"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel className="text-sm font-medium">보유 드럼 선택 ({availableCables.length}개 가용)</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    disabled={!!initialCableId}
                                                    className={cn(
                                                        "w-full justify-between h-10",
                                                        !field.value && "text-muted-foreground",
                                                        "disabled:opacity-80 disabled:cursor-not-allowed"
                                                    )}
                                                >
                                                    {selectedCable
                                                        ? selectedCable.drumNo
                                                        : "드럼번호 선택 (검색 가능)"}
                                                    {!initialCableId && <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        {!initialCableId && (
                                            <PopoverContent className="w-[520px] p-0">
                                                <Command>
                                                    <CommandInput placeholder="드럼번호 검색..." />
                                                    <CommandList>
                                                        <CommandEmpty>가용 드럼이 없습니다.</CommandEmpty>
                                                        <CommandGroup heading="보유 재고">
                                                            {availableCables.map((cable) => (
                                                                <CommandItem
                                                                    value={cable.drumNo}
                                                                    key={cable.id}
                                                                    onSelect={() => {
                                                                        form.setValue("cableId", cable.id);
                                                                    }}
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            "mr-2 h-4 w-4",
                                                                            cable.id === field.value
                                                                                ? "opacity-100"
                                                                                : "opacity-0"
                                                                        )}
                                                                    />
                                                                    {cable.drumNo} | {cable.spec} | {cable.remainingLength}m
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        )}
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Team Selection */}
                        <FormField
                            control={form.control}
                            name="teamId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-sm font-medium">수령 팀</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="h-10">
                                                <SelectValue placeholder="팀 선택" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {fieldTeams.map((team) => (
                                                <SelectItem key={team.id} value={team.id}>
                                                    {team.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Date Selection */}
                        <FormField
                            control={form.control}
                            name="usageDate"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel className="text-sm font-medium">출고 일자</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal h-10",
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

                        <div className="grid grid-cols-2 gap-3">
                            <FormField
                                control={form.control}
                                name="projectCode"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-sm font-medium">공사번호 (선택)</FormLabel>
                                        <FormControl>
                                            <Input {...field} className="h-10" placeholder="공사번호 입력" />
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
                                        <FormLabel className="text-sm font-medium">공사명 (선택)</FormLabel>
                                        <FormControl>
                                            <Input {...field} className="h-10" placeholder="공사명 입력" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="remark"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-sm font-medium">비고 (선택)</FormLabel>
                                    <FormControl>
                                        <Input {...field} className="h-10" placeholder="비고 입력" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="gap-2 sm:gap-0 pt-4">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                취소
                            </Button>
                            <Button type="submit" disabled={mutation.isPending}>
                                {mutation.isPending && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                출고 등록
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
