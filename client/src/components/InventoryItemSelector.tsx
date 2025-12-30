import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
import { useQuery } from "@tanstack/react-query";

interface InventoryItem {
    id: number;
    productName: string;
    specification: string;
    division: string;
    category: string;
    remaining: number;
    unitPrice: number;
}

interface InventoryItemSelectorProps {
    value: number | undefined;
    onChange: (value: number, item: InventoryItem) => void;
    disabled?: boolean;
    className?: string;
}

export function InventoryItemSelector({
    value,
    onChange,
    disabled,
    className,
}: InventoryItemSelectorProps) {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const { data: items = [], isLoading } = useQuery<InventoryItem[]>({
        queryKey: ["/api/inventory"],
        staleTime: 1000 * 60 * 5, // 5 minutes cache
    });

    // Filter items based on search term manually if needed, 
    // but Command component handles local filtering well.
    // We just need to make sure we display product + spec + division.

    const selectedItem = items.find((item) => item.id === value);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className={cn("w-full justify-between h-auto py-3", className)}
                >
                    {selectedItem ? (
                        <div className="flex flex-col items-start gap-1 text-left">
                            <span className="font-medium">[{selectedItem.division}] {selectedItem.productName}</span>
                            <span className="text-xs text-muted-foreground">
                                {selectedItem.specification} | 잔고: {selectedItem.remaining}
                            </span>
                        </div>
                    ) : (
                        <span className="text-muted-foreground">재고 품목 선택...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                    <CommandInput placeholder="품목명 또는 규격 검색..." />
                    <CommandList>
                        <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>
                        <CommandGroup heading="재고 목록">
                            {!isLoading && items.map((item) => (
                                <CommandItem
                                    key={item.id}
                                    value={`${item.productName} ${item.specification} ${item.category} ${item.division}`} // Searchable string
                                    onSelect={() => {
                                        onChange(item.id, item);
                                        setOpen(false);
                                    }}
                                    className="cursor-pointer"
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === item.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <div className="flex flex-col">
                                        <span className="font-medium">[{item.division}] {item.productName}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {item.specification} | 잔고: {item.remaining}
                                        </span>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
