import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
    'data-testid'?: string;
}

export function SearchInput({
    value,
    onChange,
    placeholder = "검색...",
    className,
    size = 'md',
    'data-testid': dataTestId
}: SearchInputProps) {
    const sizeClasses = {
        sm: 'h-8 text-sm pl-9 pr-8',
        md: 'h-10 pl-10 pr-8',
        lg: 'h-12 pl-11 pr-9'
    };

    const iconSizes = {
        sm: 'h-3.5 w-3.5',
        md: 'h-4 w-4',
        lg: 'h-5 w-5'
    };

    const iconPositions = {
        sm: 'left-3',
        md: 'left-3',
        lg: 'left-3'
    };

    const clearButtonPositions = {
        sm: 'right-2',
        md: 'right-3',
        lg: 'right-3'
    };

    return (
        <div className="relative">
            <Search
                className={cn(
                    "absolute top-1/2 -translate-y-1/2 text-muted-foreground",
                    iconPositions[size],
                    iconSizes[size]
                )}
            />
            <Input
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={cn(sizeClasses[size], className)}
                data-testid={dataTestId}
            />
            {value && (
                <button
                    onClick={() => onChange("")}
                    className={cn(
                        "absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors",
                        clearButtonPositions[size]
                    )}
                    type="button"
                    aria-label="검색어 지우기"
                >
                    <X className={iconSizes[size]} />
                </button>
            )}
        </div>
    );
}
