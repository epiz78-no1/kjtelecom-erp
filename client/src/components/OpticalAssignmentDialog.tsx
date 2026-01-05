
import { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Loader2, Check, ChevronsUpDown, CalendarIcon, Upload, Trash2 } from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/contexts/AppContext";
import type { OpticalCable, OpticalCableLog } from "@shared/schema";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";

interface Props {
    trigger?: React.ReactNode;
    initialCableId?: string | null;
}

export default function OpticalAssignmentDialog({ trigger, initialCableId }: Props) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { teams } = useAppContext();

    const [formData, setFormData] = useState({
        cableId: initialCableId || "",
        teamId: "",
        recipient: "",
        projectCode: "",
        projectNameUsage: "",
        usageDate: new Date().toISOString().split("T")[0],
        remark: "",
        attachment: null as { name: string; data: string } | null,
    });

    const { data: cables = [] } = useQuery<(OpticalCable & { logs: OpticalCableLog[] })[]>({
        queryKey: ["/api/optical-cables"],
    });

    const { data: members = [] } = useQuery<any[]>({
        queryKey: ["/api/admin/members"],
        retry: false,
    });

    const availableCables = cables.filter(c => c.status === 'in_stock' && c.remainingLength > 0);
    const selectedCable = availableCables.find(c => c.id.toString() === formData.cableId);
    const teamMembers = members.filter((m: any) => m.teamId === formData.teamId);

    useEffect(() => {
        if (open && initialCableId) {
            setFormData(prev => ({ ...prev, cableId: initialCableId }));
        }
    }, [open, initialCableId]);

    const mutation = useMutation({
        mutationFn: async () => {
            return apiRequest(
                "POST",
                `/api/optical-cables/${formData.cableId}/log`,
                {
                    cableId: formData.cableId,
                    logType: "assign",
                    teamId: formData.teamId,
                    usageDate: formData.usageDate,
                    projectCode: formData.projectCode,
                    projectNameUsage: formData.projectNameUsage,
                    workerName: formData.recipient,
                    attributes: JSON.stringify({
                        recipient: formData.recipient,
                        remark: formData.remark || undefined,
                        attachment: formData.attachment || undefined,
                    }),
                }
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables"] });
            queryClient.invalidateQueries({ queryKey: ["/api/optical-cables/logs"] });
            toast({
                title: "출고 등록 완료",
                description: "광케이블이 성공적으로 출고되었습니다.",
            });
            setOpen(false);
            setFormData({
                cableId: "",
                teamId: "",
                recipient: "",
                projectCode: "",
                projectNameUsage: "",
                usageDate: new Date().toISOString().split("T")[0],
                remark: "",
                attachment: null,
            });
        },
        onError: (error: Error) => {
            toast({
                variant: "destructive",
                title: "출고 등록 실패",
                description: error.message || "출고 등록 중 오류가 발생했습니다.",
            });
        },
    });

    const handleSubmit = () => {
        if (!formData.cableId) {
            toast({ title: "제조번호를 선택해주세요", variant: "destructive" });
            return;
        }
        if (!formData.teamId) {
            toast({ title: "수령 팀을 선택해주세요", variant: "destructive" });
            return;
        }
        if (!formData.recipient) {
            toast({ title: "수령자를 선택해주세요", variant: "destructive" });
            return;
        }
        if (!formData.projectCode) {
            toast({ title: "공사번호를 입력해주세요", variant: "destructive" });
            return;
        }
        if (!formData.projectNameUsage) {
            toast({ title: "공사명을 입력해주세요", variant: "destructive" });
            return;
        }
        mutation.mutate();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || <Button>신규 출고 등록</Button>}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>신규 출고 등록 (팀 할당)</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Row 1: 출고일자, 수령팀, 수령자 */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">출고 일자</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal h-10",
                                            !formData.usageDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {formData.usageDate ? (
                                            format(new Date(formData.usageDate), "yyyy-MM-dd")
                                        ) : (
                                            <span>날짜 선택</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={formData.usageDate ? new Date(formData.usageDate) : undefined}
                                        onSelect={(date) => setFormData({ ...formData, usageDate: date ? format(date, "yyyy-MM-dd") : "" })}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium">수령 팀</Label>
                            <Select
                                value={formData.teamId}
                                onValueChange={(value) => setFormData({ ...formData, teamId: value, recipient: "" })}
                            >
                                <SelectTrigger className="h-10">
                                    <SelectValue placeholder="팀 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    {teams.map((team) => (
                                        <SelectItem key={team.id} value={team.id}>
                                            {team.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium">수령자</Label>
                            <Select
                                value={formData.recipient}
                                onValueChange={(value) => setFormData({ ...formData, recipient: value })}
                                disabled={!formData.teamId}
                            >
                                <SelectTrigger className="h-10">
                                    <SelectValue placeholder="수령자 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    {teamMembers.map((member: any) => (
                                        <SelectItem key={member.id} value={member.name}>
                                            {member.name} ({member.username})
                                        </SelectItem>
                                    ))}
                                    {teamMembers.length === 0 && (
                                        <SelectItem value="none" disabled>팀원 없음</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Row 2: 제조번호, 공사번호 */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">제조번호</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        disabled={!!initialCableId}
                                        className={cn(
                                            "w-full justify-between h-10",
                                            !formData.cableId && "text-muted-foreground",
                                            "disabled:opacity-80 disabled:cursor-not-allowed"
                                        )}
                                    >
                                        {selectedCable
                                            ? `${selectedCable.division ? `[${selectedCable.division}] ` : ""}${selectedCable.drumNo}`
                                            : "제조번호 선택"}
                                        {!initialCableId && <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
                                    </Button>
                                </PopoverTrigger>
                                {!initialCableId && (
                                    <PopoverContent className="w-[520px] p-0">
                                        <Command>
                                            <CommandInput placeholder="제조번호 검색..." />
                                            <CommandList>
                                                <CommandEmpty>가용 드럼이 없습니다.</CommandEmpty>
                                                <CommandGroup heading="보유 재고">
                                                    {availableCables.map((cable) => (
                                                        <CommandItem
                                                            value={cable.drumNo}
                                                            key={cable.id}
                                                            onSelect={() => {
                                                                setFormData({ ...formData, cableId: cable.id.toString() });
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    cable.id.toString() === formData.cableId
                                                                        ? "opacity-100"
                                                                        : "opacity-0"
                                                                )}
                                                            />
                                                            {cable.division ? `[${cable.division}] ` : ""}{cable.drumNo} | {cable.spec} | {cable.remainingLength}m
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                )}
                            </Popover>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium">공사번호</Label>
                            <Input
                                value={formData.projectCode}
                                onChange={(e) => setFormData({ ...formData, projectCode: e.target.value })}
                                className="h-10"
                                placeholder="공사번호 입력"
                            />
                        </div>
                    </div>

                    {/* Row 3: 공사명 */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">공사명</Label>
                        <Input
                            value={formData.projectNameUsage}
                            onChange={(e) => setFormData({ ...formData, projectNameUsage: e.target.value })}
                            className="h-10"
                            placeholder="공사명 입력"
                        />
                    </div>

                    {/* Row 4: 비고 */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">비고 (선택)</Label>
                        <Input
                            value={formData.remark}
                            onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                            className="h-10"
                            placeholder="비고 입력"
                        />
                    </div>

                    {/* Row 5: 첨부파일 */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">첨부파일 (선택)</Label>
                        <div className="relative">
                            <input
                                type="file"
                                id="optical-file-upload"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onload = (e) => {
                                            if (e.target?.result && typeof e.target.result === "string") {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    attachment: {
                                                        name: file.name,
                                                        data: e.target?.result as string
                                                    }
                                                }));
                                            }
                                        };
                                        reader.readAsDataURL(file);
                                    }
                                }}
                            />
                            <label
                                htmlFor="optical-file-upload"
                                className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-primary/30 rounded-lg cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                            >
                                <Upload className="h-5 w-5 text-primary" />
                                <span className="text-sm font-medium text-primary">
                                    {formData.attachment ? formData.attachment.name : "파일 선택 또는 드래그"}
                                </span>
                            </label>
                        </div>
                        {formData.attachment && (
                            <div className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                                <span className="text-sm text-muted-foreground truncate">
                                    📎 {formData.attachment.name}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => setFormData({ ...formData, attachment: null })}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0 pt-4">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                        취소
                    </Button>
                    <Button onClick={handleSubmit} disabled={mutation.isPending}>
                        {mutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        출고 등록
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
