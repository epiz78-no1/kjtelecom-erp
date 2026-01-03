import { useState } from "react";
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
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Loader2, Check, ChevronsUpDown } from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/contexts/AppContext";
import type { OpticalCable, OpticalCableLog } from "@shared/schema";

const formSchema = z.object({
    cableId: z.string().min(1, "드럼을 선택해주세요"),
    teamId: z.string().min(1, "팀을 선택해주세요"),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
    trigger?: React.ReactNode;
}

export default function OpticalAssignmentDialog({ trigger }: Props) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { teams } = useAppContext();

    // Fetch Available Cables (In Stock)
    const { data: cables = [], isLoading: isLoadingCables } = useQuery<(OpticalCable & { logs: OpticalCableLog[] })[]>({
        queryKey: ["/api/optical-cables"],
    });

    const availableCables = cables.filter(c => c.status === 'in_stock' && c.remainingLength > 0);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            cableId: "",
            teamId: "",
        },
    });

    const mutation = useMutation({
        mutationFn: async (values: FormValues) => {
            const res = await apiRequest(
                "POST",
                `/api/optical-cables/${values.cableId}/assign`,
                { teamId: values.teamId }
            );
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables"] });
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables/logs"] });
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

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || <Button>신규 출고 등록</Button>}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>신규 출고 등록 (팀 할당)</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                        {/* Cable Selection */}
                        <FormField
                            control={form.control}
                            name="cableId"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>보유 드럼 선택 ({availableCables.length}개 가용)</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    className={cn(
                                                        "w-full justify-between",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    {field.value
                                                        ? availableCables.find(
                                                            (c) => c.id === field.value
                                                        )?.drumNo
                                                        : "드럼번호 선택 (검색 가능)"}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[400px] p-0">
                                            <Command>
                                                <CommandInput placeholder="드럼번호 검색..." />
                                                <CommandList>
                                                    <CommandEmpty>가용 드럼이 없습니다.</CommandEmpty>
                                                    <CommandGroup>
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
                                    <FormLabel>수령 팀</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
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

                        <DialogFooter>
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
