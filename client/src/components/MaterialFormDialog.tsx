import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { InventoryItem } from "@shared/schema";

export interface MaterialFormData {
  type: string;
  category: string;
  productName: string;
  specification: string;
  carriedOver: number | string;
  incoming: number | string;
  outgoing: number | string;
  usage: number | string;
  remaining: number | string;
  unitPrice: number | string;
  totalAmount: number | string;
  attributes: string; // JSON string
}

export interface MaterialSubmitData {
  type: string;
  category: string;
  productName: string;
  specification: string;
  carriedOver: number;
  incoming: number;
  outgoing: number;
  usage: number;
  remaining: number;
  unitPrice: number;
  totalAmount: number;
  attributes: string;
}

interface MaterialFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: MaterialSubmitData) => void;
  editingItem?: InventoryItem | null;
}

export function MaterialFormDialog({ open, onOpenChange, onSubmit, editingItem }: MaterialFormDialogProps) {
  const [formData, setFormData] = useState<MaterialFormData>({
    type: "general",
    category: "",
    productName: "",
    specification: "",
    carriedOver: 0,
    incoming: 0,
    outgoing: 0,
    usage: 0,
    remaining: 0,
    unitPrice: 0,
    totalAmount: 0,
    attributes: "{}",
  });

  useEffect(() => {
    if (editingItem) {
      setFormData({
        type: "general",
        category: editingItem.category,
        productName: editingItem.productName,
        specification: editingItem.specification,
        carriedOver: editingItem.carriedOver,
        incoming: editingItem.incoming,
        outgoing: editingItem.outgoing,
        usage: editingItem.usage || 0,
        remaining: editingItem.remaining,
        unitPrice: editingItem.unitPrice,
        totalAmount: editingItem.totalAmount,
        attributes: "{}",
      });
    } else {
      setFormData({
        type: "general",
        category: "",
        productName: "",
        specification: "",
        carriedOver: 0,
        incoming: 0,
        outgoing: 0,
        usage: 0,
        remaining: 0,
        unitPrice: 0,
        totalAmount: 0,
        attributes: "{}",
      });
    }
  }, [editingItem, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const carriedOver = Number(formData.carriedOver);
    const incoming = Number(formData.incoming);
    const outgoing = Number(formData.outgoing);
    const usage = Number(formData.usage);
    const unitPrice = Number(formData.unitPrice);

    const remaining = carriedOver + incoming - outgoing;
    // Total Amount = Total Stock * Unit Price
    // Total Stock = Office (remaining) + Team (outgoing - usage)
    const totalStock = remaining + (outgoing - usage);
    const totalAmount = totalStock * unitPrice;

    onSubmit({
      ...formData,
      attributes: "{}",
      carriedOver,
      incoming,
      outgoing,
      usage,
      unitPrice,
      remaining,
      totalAmount
    });
  };

  const remaining = Number(formData.carriedOver) + Number(formData.incoming) - Number(formData.outgoing);
  const totalAmount = remaining * Number(formData.unitPrice);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{editingItem ? "자재 수정" : "자재 추가"}</DialogTitle>
          <DialogDescription>
            {editingItem ? "자재 품목을 수정합니다." : "새로운 자재 품목을 등록합니다."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">

            {/* 기본 정보 섹션 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm text-foreground/70">기본 정보</h4>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="category">구분 <span className="text-red-500">*</span></Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="예: SKT"
                    required
                    className="h-9"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="productName">품명 <span className="text-red-500">*</span></Label>
                  <Input
                    id="productName"
                    value={formData.productName}
                    onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                    placeholder="예: 광접속함체"
                    required
                    className="h-9"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="specification">규격 <span className="text-red-500">*</span></Label>
                <Input
                  id="specification"
                  value={formData.specification}
                  onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                  placeholder="예: 가공 24C"
                  required
                  className="h-9"
                />
              </div>
            </div>

            <div className="h-px bg-border/60" />

            {/* 수량 정보 섹션 */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm text-foreground/70">수량 및 재고</h4>

              <div className="grid grid-cols-4 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="carriedOver" className="font-medium text-blue-600">
                    이월재고
                  </Label>
                  <Input
                    id="carriedOver"
                    type="number"
                    value={formData.carriedOver}
                    onChange={(e) => setFormData({ ...formData, carriedOver: e.target.value })}
                    placeholder="0"
                    className="h-9 border-blue-200 focus-visible:ring-blue-500 font-medium"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="incoming" className="font-medium text-muted-foreground text-center">입고</Label>
                  <Input
                    id="incoming"
                    value={formData.incoming}
                    readOnly
                    className="h-9 bg-gray-50 text-center text-gray-500 border-gray-200"
                    tabIndex={-1}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="outgoing" className="font-medium text-muted-foreground text-center">출고</Label>
                  <Input
                    id="outgoing"
                    value={formData.outgoing}
                    readOnly
                    className="h-9 bg-gray-50 text-center text-gray-500 border-gray-200"
                    tabIndex={-1}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="usage" className="font-medium text-muted-foreground text-center">사용</Label>
                  <Input
                    id="usage"
                    value={formData.usage}
                    readOnly
                    className="h-9 bg-gray-50 text-center text-gray-500 border-gray-200"
                    tabIndex={-1}
                  />
                </div>
              </div>

              {/* 재고 현황 미리보기 */}
              <div className="bg-slate-50 p-4 rounded-lg border shadow-sm">
                <div className="grid grid-cols-3 gap-4 text-center divide-x divide-slate-200">
                  <div>
                    <div className="text-xs font-medium text-slate-500 mb-1">사무실 재고</div>
                    <div className="font-bold text-lg text-slate-700">{remaining.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-500 mb-1">현장팀 재고</div>
                    <div className="font-bold text-lg text-blue-600">{(Number(formData.outgoing) - Number(formData.usage)).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-500 mb-1">총 재고 합계</div>
                    <div className="font-bold text-lg text-slate-900">{(remaining + (Number(formData.outgoing) - Number(formData.usage))).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="h-px bg-border/60" />

            {/* 가격 정보 섹션 */}
            <div className="grid grid-cols-2 gap-6">
              <div className="grid gap-2">
                <Label htmlFor="unitPrice">단가 <span className="text-xs font-normal text-muted-foreground">(원)</span> <span className="text-red-500">*</span></Label>
                <Input
                  id="unitPrice"
                  type="number"
                  value={formData.unitPrice}
                  onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                  placeholder="0"
                  required
                  className="h-9 font-medium text-right pr-4"
                />
              </div>
              <div className="grid gap-2">
                <Label>총 예상 금액</Label>
                <div className="flex items-center justify-end h-9 px-3 rounded-md border bg-slate-50 text-sm font-semibold text-slate-900">
                  ₩ {((remaining + (Number(formData.outgoing) - Number(formData.usage))) * Number(formData.unitPrice)).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" data-testid="button-submit-material">
              {editingItem ? "수정" : "등록"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
