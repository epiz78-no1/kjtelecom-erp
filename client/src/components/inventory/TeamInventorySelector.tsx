import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
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

interface TeamInventoryItem {
    id: string; // Unique Key
    productName: string;
    specification: string;
    division: string;
    category: string;
    remaining: number;
    inventoryItemId?: number;
}

interface TeamInventorySelectorProps {
    value: string; // Selected Item ID (string key)
    onChange: (value: string, item: TeamInventoryItem) => void;
    items: TeamInventoryItem[];
    disabled?: boolean;
    className?: string;
    placeholder?: string;
}

export function TeamInventorySelector({
    value,
    onChange,
    items,
    disabled,
    className,
    placeholder = "보유 자재 선택..."
}: TeamInventorySelectorProps) {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Filter items based on search term
    // Command component handles filtering automatically if we provide searchable text as value,
    // but we can also pre-filter or let Command handle it.
    // For consistency with InventoryItemSelector, let's rely on Command's fuzzy search
    // by passing a comprehensive string as the `value` prop of CommandItem.

    const selectedItem = items.find((item) => item.id.toString() === value);

    return (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className={cn("w-full justify-between h-auto py-3", className)}
                >
                    {selectedItem ? (
                        <div className="flex flex-col items-start gap-1 text-left w-full overflow-hidden">
                            <span className="font-medium truncate w-full">[{selectedItem.division}] {selectedItem.productName}</span>
                            <span className="text-xs text-muted-foreground truncate w-full">
                                {selectedItem.specification} | 잔여: {selectedItem.remaining}
                            </span>
                        </div>
                    ) : (
                        <span className="text-muted-foreground">{placeholder}</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[400px] p-0"
                align="start"
                side="bottom"
                sideOffset={4}
                avoidCollisions={false}
                collisionPadding={0}
            >
                <Command shouldFilter={true}>
                    <CommandInput placeholder="품명 또는 규격 검색..." />
                    <CommandList style={{ maxHeight: '250px', overflowY: 'auto' }}>
                        <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>
                        <CommandGroup heading="보유 자재 목록">
                            {items.map((item) => (
                                <CommandItem
                                    key={item.id}
                                    value={`${item.productName} ${item.specification} ${item.category} ${item.division}`}
                                    onSelect={() => {
                                        onChange(item.id.toString(), item);
                                        setOpen(false);
                                    }}
                                    className="cursor-pointer"
                                    keywords={[item.productName, item.specification, item.category]}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === item.id.toString() ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <div className="flex flex-col overflow-hidden">
                                        <span className="font-medium truncate">[{item.division}] {item.productName}</span>
                                        <span className="text-xs text-muted-foreground truncate">
                                            {item.specification} | 잔여: {item.remaining}
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
