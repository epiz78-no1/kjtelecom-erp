import { Button } from "@/components/ui/button";
import { Plus, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface QuickActionButtonsProps {
  onAddIncoming: () => void;
  onAddOutgoing: () => void;
}

export function QuickActionButtons({ onAddIncoming, onAddOutgoing }: QuickActionButtonsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button data-testid="button-quick-actions">
          <Plus className="h-4 w-4 mr-2" />
          빠른 등록
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onAddIncoming} data-testid="menu-add-incoming">
          <ArrowDownToLine className="h-4 w-4 mr-2" />
          입고 등록
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onAddOutgoing} data-testid="menu-add-outgoing">
          <ArrowUpFromLine className="h-4 w-4 mr-2" />
          출고 등록
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
