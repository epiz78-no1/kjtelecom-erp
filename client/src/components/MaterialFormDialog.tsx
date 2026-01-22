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
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-white/20 bg-background/80 backdrop-blur-xl shadow-2xl">
        {/* Top Gradient Indicator */}
        <div className="h-1.5 w-full bg-gradient-to-r from-primary via-blue-400 to-indigo-500" />

        <div className="px-6 pt-6 pb-2">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
              {editingItem ? "자재 정보 수정" : "새 자재 등록"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {editingItem ? "선택한 품목의 상세 정보를 최신 상태로 갱신합니다." : "현장에 필요한 새로운 자재 항목을 데이터베이스에 추가합니다."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6">
          <div className="grid gap-5">

            {/* 기본 정보 섹션 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-4 w-1 bg-primary rounded-full" />
                <h4 className="font-bold text-[13px] text-slate-700">기본 정보</h4>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="category" className="text-[12px] font-semibold text-slate-500 ml-1">사업 구분 <span className="text-red-500">*</span></Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                    className="h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white transition-all transition-colors"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="productName" className="text-[12px] font-semibold text-slate-500 ml-1">품명 <span className="text-red-500">*</span></Label>
                  <Input
                    id="productName"
                    value={formData.productName}
                    onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                    required
                    className="h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white transition-all transition-colors"
                  />
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="specification" className="text-[12px] font-semibold text-slate-500 ml-1">규격 및 상세사양 <span className="text-red-500">*</span></Label>
                <Input
                  id="specification"
                  value={formData.specification}
                  onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                  required
                  placeholder="예: 24C, SS형, 6.0mm 등"
                  className="h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white transition-all transition-colors"
                />
              </div>
            </div>

            <div className="h-px bg-border/60" />

            {/* 수량 정보 섹션 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-4 w-1 bg-blue-500 rounded-full" />
                <h4 className="font-bold text-[13px] text-slate-700">수량 및 재고</h4>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="carriedOver" className="text-[11px] font-bold text-blue-600 ml-1">
                    이월재고
                  </Label>
                  <Input
                    id="carriedOver"
                    type="number"
                    value={formData.carriedOver}
                    onChange={(e) => setFormData({ ...formData, carriedOver: e.target.value })}
                    placeholder="0"
                    className="h-9 border-blue-100 bg-blue-50/30 focus:bg-white focus:ring-blue-400 font-bold text-blue-700"
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="incoming" className="text-[11px] font-semibold text-slate-400 text-center">입고 (누계)</Label>
                  <Input
                    id="incoming"
                    value={formData.incoming}
                    readOnly
                    className="h-9 bg-slate-100/50 text-center text-slate-400 border-slate-200/50 cursor-not-allowed"
                    tabIndex={-1}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="outgoing" className="text-[11px] font-semibold text-slate-400 text-center">출고 (누계)</Label>
                  <Input
                    id="outgoing"
                    value={formData.outgoing}
                    readOnly
                    className="h-9 bg-slate-100/50 text-center text-slate-400 border-slate-200/50 cursor-not-allowed"
                    tabIndex={-1}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="usage" className="text-[11px] font-semibold text-slate-400 text-center">사용 (누계)</Label>
                  <Input
                    id="usage"
                    value={formData.usage}
                    readOnly
                    className="h-9 bg-slate-100/50 text-center text-slate-400 border-slate-200/50 cursor-not-allowed"
                    tabIndex={-1}
                  />
                </div>
              </div>

              {/* 재고 현황 미리보기 - Glassmorphism Style */}
              <div className="bg-slate-900/5 backdrop-blur-sm p-3 rounded-xl border border-slate-200/50 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-2 opacity-10">
                  <div className="w-12 h-12 rounded-full border-4 border-slate-900" />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center divide-x divide-slate-200/50 relative z-10">
                  <div className="px-1">
                    <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Office</div>
                    <div className="font-bold text-base text-slate-700 leading-none">{remaining.toLocaleString()}</div>
                  </div>
                  <div className="px-1">
                    <div className="text-[10px] uppercase tracking-wider font-bold text-blue-400 mb-1">Field</div>
                    <div className="font-bold text-base text-blue-600 leading-none">{(Number(formData.outgoing) - Number(formData.usage)).toLocaleString()}</div>
                  </div>
                  <div className="px-1">
                    <div className="text-[10px] uppercase tracking-wider font-bold text-indigo-400 mb-1">Total Sum</div>
                    <div className="font-bold text-base text-indigo-600 leading-none">{(remaining + (Number(formData.outgoing) - Number(formData.usage))).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="h-px bg-border/60" />

            {/* 가격 정보 섹션 */}
            <div className="grid grid-cols-2 gap-6 bg-indigo-50/30 p-4 rounded-xl border border-indigo-100/50">
              <div className="grid gap-1.5">
                <Label htmlFor="unitPrice" className="text-[12px] font-semibold text-indigo-700 ml-1">단가 (Unit Price) <span className="text-red-500">*</span></Label>
                <Input
                  id="unitPrice"
                  type="number"
                  value={formData.unitPrice}
                  onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                  placeholder="0"
                  required
                  className="h-9 font-bold text-right pr-4 bg-white border-indigo-200 focus:ring-indigo-500"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[12px] font-semibold text-indigo-700 ml-1">총 재고 예상 금액</Label>
                <div className="flex items-center justify-end h-9 px-4 rounded-md border border-indigo-200 bg-white shadow-inner text-[15px] font-bold text-indigo-700">
                  <span className="text-[11px] font-medium mr-1.5 text-indigo-400 italic">KRW</span>
                  {((remaining + (Number(formData.outgoing) - Number(formData.usage))) * Number(formData.unitPrice)).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" className="h-10 px-6 text-slate-500 hover:text-slate-700 hover:bg-slate-100/50" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" className="h-10 px-8 bg-gradient-to-r from-primary to-blue-600 hover:opacity-90 transition-all font-bold shadow-md shadow-primary/20" data-testid="button-submit-material">
              {editingItem ? "정보 업데이트" : "새 자재 등록 완료"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
