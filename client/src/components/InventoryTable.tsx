import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InventoryStatusBadge, getInventoryStatus } from "./InventoryStatusBadge";
import { Pencil, Trash2, Search } from "lucide-react";
import { useState } from "react";

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  safetyStock: number;
  unit: string;
  lastRestockDate: string;
}

interface InventoryTableProps {
  items: InventoryItem[];
  onEdit: (item: InventoryItem) => void;
  onDelete: (item: InventoryItem) => void;
}

export function InventoryTable({ items, onEdit, onDelete }: InventoryTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  
  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="자재명 또는 카테고리 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="input-search-inventory"
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold">자재명</TableHead>
              <TableHead className="font-semibold">카테고리</TableHead>
              <TableHead className="font-semibold text-right">현재 재고</TableHead>
              <TableHead className="font-semibold text-right">안전 재고</TableHead>
              <TableHead className="font-semibold">상태</TableHead>
              <TableHead className="font-semibold">최근 입고일</TableHead>
              <TableHead className="font-semibold text-right">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map((item) => (
              <TableRow key={item.id} data-testid={`row-inventory-${item.id}`}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.category}</TableCell>
                <TableCell className="text-right">{item.currentStock.toLocaleString()} {item.unit}</TableCell>
                <TableCell className="text-right">{item.safetyStock.toLocaleString()} {item.unit}</TableCell>
                <TableCell>
                  <InventoryStatusBadge
                    status={getInventoryStatus(item.currentStock, item.safetyStock)}
                    currentStock={item.currentStock}
                    safetyStock={item.safetyStock}
                  />
                </TableCell>
                <TableCell>{item.lastRestockDate}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onEdit(item)}
                      data-testid={`button-edit-${item.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onDelete(item)}
                      data-testid={`button-delete-${item.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  검색 결과가 없습니다
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
