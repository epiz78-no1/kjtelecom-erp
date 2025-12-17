import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useState } from "react";

export interface PurchaseRecord {
  id: string;
  materialName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  supplier: string;
  purchaseDate: string;
  divisionName: string;
}

interface PurchaseTableProps {
  records: PurchaseRecord[];
}

export function PurchaseTable({ records }: PurchaseTableProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRecords = records.filter(
    (record) =>
      record.materialName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.supplier.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="자재명 또는 공급업체 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="input-search-purchase"
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold">구매일자</TableHead>
              <TableHead className="font-semibold">자재명</TableHead>
              <TableHead className="font-semibold text-right">수량</TableHead>
              <TableHead className="font-semibold text-right">단가</TableHead>
              <TableHead className="font-semibold text-right">총액</TableHead>
              <TableHead className="font-semibold">공급업체</TableHead>
              <TableHead className="font-semibold">사업부</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRecords.map((record) => (
              <TableRow key={record.id} data-testid={`row-purchase-${record.id}`}>
                <TableCell>{record.purchaseDate}</TableCell>
                <TableCell className="font-medium">{record.materialName}</TableCell>
                <TableCell className="text-right">
                  {record.quantity.toLocaleString()} {record.unit}
                </TableCell>
                <TableCell className="text-right">₩{record.unitPrice.toLocaleString()}</TableCell>
                <TableCell className="text-right font-medium">₩{record.totalPrice.toLocaleString()}</TableCell>
                <TableCell>{record.supplier}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{record.divisionName}</Badge>
                </TableCell>
              </TableRow>
            ))}
            {filteredRecords.length === 0 && (
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
