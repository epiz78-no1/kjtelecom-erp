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
import { Pencil, Trash2, Search } from "lucide-react";
import { useState } from "react";

export interface InventoryItem {
  id: string;
  category: string;
  name: string;
  specification: string;
  carriedOver: number;
  incoming: number;
  outgoing: number;
  remaining: number;
  unitPrice: number;
  totalAmount: number;
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
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.specification.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatNumber = (num: number) => num.toLocaleString();
  const formatCurrency = (num: number) => `₩${num.toLocaleString()}`;

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="품명, 구분, 규격 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="input-search-inventory"
        />
      </div>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold min-w-[80px]">구분</TableHead>
              <TableHead className="font-semibold min-w-[120px]">품명</TableHead>
              <TableHead className="font-semibold min-w-[100px]">규격</TableHead>
              <TableHead className="font-semibold text-right min-w-[80px]">이월재</TableHead>
              <TableHead className="font-semibold text-right min-w-[80px]">입고량</TableHead>
              <TableHead className="font-semibold text-right min-w-[80px]">출고량</TableHead>
              <TableHead className="font-semibold text-right min-w-[80px]">잔량</TableHead>
              <TableHead className="font-semibold text-right min-w-[100px]">단가</TableHead>
              <TableHead className="font-semibold text-right min-w-[120px]">금액</TableHead>
              <TableHead className="font-semibold text-right min-w-[80px]">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map((item) => (
              <TableRow key={item.id} data-testid={`row-inventory-${item.id}`}>
                <TableCell>{item.category}</TableCell>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.specification}</TableCell>
                <TableCell className="text-right">{formatNumber(item.carriedOver)}</TableCell>
                <TableCell className="text-right">{formatNumber(item.incoming)}</TableCell>
                <TableCell className="text-right">{formatNumber(item.outgoing)}</TableCell>
                <TableCell className="text-right font-medium">{formatNumber(item.remaining)}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(item.totalAmount)}</TableCell>
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
                <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
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
