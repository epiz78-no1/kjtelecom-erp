import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

interface MultiSelectFilterProps {
    title: string;
    options: {
        label: string;
        value: string;
        icon?: React.ComponentType<{ className?: string }>;
    }[];
    selectedValues: string[];
    onChange: (values: string[]) => void;
    className?: string;
}

export function MultiSelectFilter({
    title,
    options,
    selectedValues,
    onChange,
    className,
}: MultiSelectFilterProps) {
    const [open, setOpen] = React.useState(false);

    // Convert selectedValues to Set for faster lookup
    const selectedSet = new Set(selectedValues);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                        "h-7 border-dashed border-slate-300 dark:border-slate-700 hover:bg-slate-50",
                        className
                    )}
                >
                    <span className="text-xs mr-2">{title}</span>
                    {selectedValues.length > 0 ? (
                        <div className="flex space-x-1">
                            {selectedValues.length > 2 ? (
                                <Badge
                                    variant="secondary"
                                    className="rounded-sm px-1 font-normal text-[10px] h-5"
                                >
                                    {selectedValues.length}개 선택됨
                                </Badge>
                            ) : (
                                options
                                    .filter((option) => selectedSet.has(option.value))
                                    .map((option) => (
                                        <Badge
                                            variant="secondary"
                                            key={option.value}
                                            className="rounded-sm px-1 font-normal text-[10px] h-5"
                                        >
                                            {option.label}
                                        </Badge>
                                    ))
                            )}
                        </div>
                    ) : (
                        <span className="text-[10px] text-muted-foreground">전체</span>
                    )}
                    <ChevronsUpDown className="ml-auto h-3 w-3 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[180px] p-0" align="start">
                <Command>
                    <CommandInput placeholder={title} className="h-8 text-xs" />
                    <CommandList>
                        <CommandEmpty className="py-2 text-xs text-center">결과 없음</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => {
                                const isSelected = selectedSet.has(option.value);
                                return (
                                    <CommandItem
                                        key={option.value}
                                        onSelect={() => {
                                            if (isSelected) {
                                                const newValues = selectedValues.filter(
                                                    (val) => val !== option.value
                                                );
                                                onChange(newValues);
                                            } else {
                                                onChange([...selectedValues, option.value]);
                                            }
                                        }}
                                        className="text-xs py-1.5 cursor-pointer"
                                    >
                                        <div
                                            className={cn(
                                                "mr-2 flex h-3.5 w-3.5 items-center justify-center rounded-sm border border-primary",
                                                isSelected
                                                    ? "bg-primary text-primary-foreground"
                                                    : "opacity-50 [&_svg]:invisible"
                                            )}
                                        >
                                            <Check className={cn("h-3 w-3")} />
                                        </div>
                                        {option.icon && (
                                            <div className="mr-2 text-muted-foreground">
                                                <option.icon className="h-3 w-3" />
                                            </div>
                                        )}
                                        <span>{option.label}</span>
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                        {selectedValues.length > 0 && (
                            <>
                                <CommandSeparator />
                                <CommandGroup>
                                    <CommandItem
                                        onSelect={() => onChange([])}
                                        className="justify-center text-center text-xs py-1.5 cursor-pointer"
                                    >
                                        필터 초기화
                                    </CommandItem>
                                </CommandGroup>
                            </>
                        )}
                        <CommandSeparator />
                        <CommandGroup>
                            <CommandItem
                                onSelect={() => {
                                    const allValues = options.map((opt) => opt.value);
                                    if (selectedValues.length === allValues.length) {
                                        onChange([]);
                                    } else {
                                        onChange(allValues);
                                    }
                                }}
                                className="justify-center text-center text-xs py-1.5 cursor-pointer text-blue-600"
                            >
                                {selectedValues.length === options.length ? "전체 해제" : "전체 선택"}
                            </CommandItem>
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
