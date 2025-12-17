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

interface MaterialFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: MaterialFormData) => void;
  editingItem?: InventoryItem | null;
}

export interface MaterialFormData {
  category: string;
  productName: string;
  specification: string;
  carriedOver: number;
  incoming: number;
  outgoing: number;
  remaining: number;
  unitPrice: number;
  totalAmount: number;
}

export function MaterialFormDialog({ open, onOpenChange, onSubmit, editingItem }: MaterialFormDialogProps) {
  const [formData, setFormData] = useState<MaterialFormData>({
    category: "",
    productName: "",
    specification: "",
    carriedOver: 0,
    incoming: 0,
    outgoing: 0,
    remaining: 0,
    unitPrice: 0,
    totalAmount: 0,
  });

  useEffect(() => {
    if (editingItem) {
      setFormData({
        category: editingItem.category,
        productName: editingItem.productName,
        specification: editingItem.specification,
        carriedOver: editingItem.carriedOver,
        incoming: editingItem.incoming,
        outgoing: editingItem.outgoing,
        remaining: editingItem.remaining,
        unitPrice: editingItem.unitPrice,
        totalAmount: editingItem.totalAmount,
      });
    } else {
      setFormData({
        category: "",
        productName: "",
        specification: "",
        carriedOver: 0,
        incoming: 0,
        outgoing: 0,
        remaining: 0,
        unitPrice: 0,
        totalAmount: 0,
      });
    }
  }, [editingItem, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const remaining = formData.carriedOver + formData.incoming - formData.outgoing;
    const totalAmount = remaining * formData.unitPrice;
    onSubmit({ ...formData, remaining, totalAmount });
  };

  const remaining = formData.carriedOver + formData.incoming - formData.outgoing;
  const totalAmount = remaining * formData.unitPrice;

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
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="category">구분 *</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="예: SKT"
                  required
                  data-testid="input-category"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="productName">품명 *</Label>
                <Input
                  id="productName"
                  value={formData.productName}
                  onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                  placeholder="예: 광접속함체 직선형"
                  required
                  data-testid="input-product-name"
                />
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="specification">규격 *</Label>
              <Input
                id="specification"
                value={formData.specification}
                onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                placeholder="예: 가공 24C"
                required
                data-testid="input-specification"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="carriedOver">이월재</Label>
                <Input
                  id="carriedOver"
                  type="number"
                  value={formData.carriedOver || ""}
                  onChange={(e) => setFormData({ ...formData, carriedOver: Number(e.target.value) })}
                  placeholder="0"
                  data-testid="input-carried-over"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="incoming">입고량</Label>
                <Input
                  id="incoming"
                  type="number"
                  value={formData.incoming || ""}
                  onChange={(e) => setFormData({ ...formData, incoming: Number(e.target.value) })}
                  placeholder="0"
                  data-testid="input-incoming"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="outgoing">출고량</Label>
                <Input
                  id="outgoing"
                  type="number"
                  value={formData.outgoing || ""}
                  onChange={(e) => setFormData({ ...formData, outgoing: Number(e.target.value) })}
                  placeholder="0"
                  data-testid="input-outgoing"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="unitPrice">단가 (원) *</Label>
                <Input
                  id="unitPrice"
                  type="number"
                  value={formData.unitPrice || ""}
                  onChange={(e) => setFormData({ ...formData, unitPrice: Number(e.target.value) })}
                  placeholder="10000"
                  required
                  data-testid="input-unit-price"
                />
              </div>
              <div className="grid gap-2">
                <Label>잔량 / 금액 (자동계산)</Label>
                <div className="flex items-center h-9 px-3 rounded-md border bg-muted text-sm">
                  {remaining.toLocaleString()} / ₩{totalAmount.toLocaleString()}
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
