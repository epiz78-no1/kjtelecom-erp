import { Button } from "@/components/ui/button";
import { Plus, Package, ShoppingCart, Truck } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface QuickActionButtonsProps {
  onAddMaterial: () => void;
  onAddPurchase: () => void;
  onAddUsage: () => void;
}

export function QuickActionButtons({ onAddMaterial, onAddPurchase, onAddUsage }: QuickActionButtonsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button data-testid="button-quick-actions">
          <Plus className="h-4 w-4 mr-2" />
          빠른 등록
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onAddMaterial} data-testid="menu-add-material">
          <Package className="h-4 w-4 mr-2" />
          자재 추가
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onAddPurchase} data-testid="menu-add-purchase">
          <ShoppingCart className="h-4 w-4 mr-2" />
          구매 등록
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onAddUsage} data-testid="menu-add-usage">
          <Truck className="h-4 w-4 mr-2" />
          출고 기록
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
