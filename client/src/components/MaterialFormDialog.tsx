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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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

  const [drumNumber, setDrumNumber] = useState("");
  const [cableLength, setCableLength] = useState("");

  useEffect(() => {
    if (editingItem) {
      let attrs: any = {};
      try {
        attrs = JSON.parse(editingItem.attributes || "{}");
      } catch (e) {
        attrs = {};
      }

      setFormData({
        type: editingItem.type || "general",
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
        attributes: editingItem.attributes || "{}",
      });

      setDrumNumber(attrs.drumNumber || "");
      setCableLength(attrs.cableLength || "");
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
      setDrumNumber("");
      setCableLength("");
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

    // Attributes construction
    let attributesObj: any = {};
    if (formData.type === "cable") {
      attributesObj.drumNumber = drumNumber;
    }
    const attributes = JSON.stringify(attributesObj);

    onSubmit({
      ...formData,
      attributes,
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
          <div className="grid gap-4 py-4">

            <div className="flex flex-col gap-3 mb-2">
              <Label>자재 유형</Label>
              <RadioGroup
                defaultValue="general"
                value={formData.type}
                onValueChange={(val) => setFormData({ ...formData, type: val })}
                className="flex flex-row gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="general" id="r1" />
                  <Label htmlFor="r1">일반 자재</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cable" id="r2" />
                  <Label htmlFor="r2">케이블 (Drum/M)</Label>
                </div>
              </RadioGroup>
            </div>

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
                placeholder={formData.type === 'cable' ? "예: 가공 96C" : "예: 가공 24C"}
                required
                data-testid="input-specification"
              />
            </div>

            {formData.type === "cable" && (
              <div className="grid grid-cols-2 gap-4 bg-muted/30 p-2 rounded-md">
                <div className="grid gap-2">
                  <Label htmlFor="drumNumber" className="text-blue-600">드럼 번호 (Drum No.)</Label>
                  <Input
                    id="drumNumber"
                    value={drumNumber}
                    onChange={(e) => setDrumNumber(e.target.value)}
                    placeholder="D-12345"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-4 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="carriedOver">{formData.type === 'cable' ? "이월(M)" : "이월재"}</Label>
                <Input
                  id="carriedOver"
                  type="number"
                  value={formData.carriedOver}
                  onChange={(e) => setFormData({ ...formData, carriedOver: e.target.value })}
                  placeholder="0"
                  data-testid="input-carried-over"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="incoming" className="text-muted-foreground">{formData.type === 'cable' ? "입고(M)" : "입고량"} (Read-Only)</Label>
                <Input
                  id="incoming"
                  type="number"
                  value={formData.incoming}
                  readOnly
                  className="bg-muted"
                  placeholder="0"
                  data-testid="input-incoming"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="outgoing" className="text-muted-foreground">{formData.type === 'cable' ? "출고(M)" : "출고량"} (To Team)</Label>
                <Input
                  id="outgoing"
                  type="number"
                  value={formData.outgoing}
                  readOnly
                  className="bg-muted"
                  placeholder="0"
                  data-testid="input-outgoing"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="usage" className="text-muted-foreground">사용량 (Used)</Label>
                <Input
                  id="usage"
                  type="number"
                  value={formData.usage}
                  readOnly
                  className="bg-muted"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-3 bg-slate-50 p-4 rounded-lg border">
              <h4 className="font-semibold text-sm text-slate-700">재고 현황 미리보기</h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">사무실 보유재고</div>
                  <div className="font-bold text-lg">{remaining.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">현장팀 보유재고</div>
                  <div className="font-bold text-lg text-blue-600">{(Number(formData.outgoing) - Number(formData.usage)).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">총 재고 (합계)</div>
                  <div className="font-bold text-lg text-slate-900">{(remaining + (Number(formData.outgoing) - Number(formData.usage))).toLocaleString()}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="unitPrice">단가 (원) *</Label>
                <Input
                  id="unitPrice"
                  type="number"
                  value={formData.unitPrice}
                  onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                  placeholder="10000"
                  required
                  data-testid="input-unit-price"
                />
              </div>
              <div className="grid gap-2">
                <Label>총 금액 (Total Amt)</Label>
                <div className="flex items-center h-9 px-3 rounded-md border bg-muted text-sm">
                  ₩{((remaining + (Number(formData.outgoing) - Number(formData.usage))) * Number(formData.unitPrice)).toLocaleString()}
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
