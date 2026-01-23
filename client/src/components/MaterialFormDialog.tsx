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

  /* 
   * Updated to Design Guide Pro Max Scale 
   * - Emerald Theme for New Entry
   * - Indigo Theme for Edit Entry
   */
  const isEdit = !!editingItem;
  const themeColor = isEdit ? "indigo" : "emerald";
  const GradientLine = isEdit
    ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-500"
    : "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500";
  const TitleGradient = "bg-gradient-to-r from-slate-900 to-slate-600";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[750px] p-0 overflow-hidden border-white/20 bg-background/80 backdrop-blur-xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Top Gradient Indicator */}
        <div className={`h-1.5 w-full ${GradientLine}`} />

        <div className="px-6 pt-6 pb-2">
          <DialogHeader className="mb-4">
            <DialogTitle className={`text-xl font-bold ${TitleGradient} bg-clip-text text-transparent`}>
              {isEdit ? "자재 정보 수정" : "새 자재 등록"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {isEdit
                ? "선택한 품목의 상세 정보를 최신 상태로 갱신합니다."
                : "현장에 필요한 새로운 자재 항목을 데이터베이스에 추가합니다."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 overflow-y-auto custom-scrollbar flex-1">
          <form onSubmit={handleSubmit} className="grid gap-6">

            {/* 기본 정보 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <div className={`h-4 w-1 rounded-full ${isEdit ? "bg-indigo-500" : "bg-emerald-500"}`} />
                <h4 className="font-bold text-[13px] text-slate-700">기본 정보</h4>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="category" className="text-[12px] font-semibold text-slate-500 ml-1">사업 구분 <span className="text-red-500">*</span></Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                    className={`h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white transition-all ${isEdit ? "focus:border-indigo-500/50" : "focus:border-emerald-500/50"}`}
                    placeholder="SKT / SKB / 기타"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="productName" className="text-[12px] font-semibold text-slate-500 ml-1">품명 <span className="text-red-500">*</span></Label>
                  <Input
                    id="productName"
                    value={formData.productName}
                    onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                    required
                    className={`h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white transition-all ${isEdit ? "focus:border-indigo-500/50" : "focus:border-emerald-500/50"}`}
                    placeholder="품명 입력"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="specification" className="text-[12px] font-semibold text-slate-500 ml-1">규격 및 상세사양 <span className="text-red-500">*</span></Label>
                <Input
                  id="specification"
                  value={formData.specification}
                  onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                  required
                  placeholder="예: 24C, SS형, 6.0mm 등"
                  className={`h-9 bg-slate-50/50 border-slate-200/60 focus:bg-white transition-all ${isEdit ? "focus:border-indigo-500/50" : "focus:border-emerald-500/50"}`}
                />
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* 재고 현황 (프로 맥스 스타일) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <div className={`h-4 w-1 rounded-full ${isEdit ? "bg-purple-500" : "bg-teal-500"}`} />
                <h4 className="font-bold text-[13px] text-slate-700">수량 및 재고 현황</h4>
              </div>

              {/* Stock Overview Cards */}
              <div className="grid grid-cols-4 gap-3">
                {/* 1. Carried Over (Editable) */}
                <div className={`p-3 rounded-xl border ${isEdit ? "bg-indigo-50/30 border-indigo-100" : "bg-emerald-50/30 border-emerald-100"}`}>
                  <Label htmlFor="carriedOver" className={`text-[11px] font-bold uppercase tracking-wider mb-1.5 block ${isEdit ? "text-indigo-600" : "text-emerald-600"}`}>
                    이월재고 (기초)
                  </Label>
                  <Input
                    id="carriedOver"
                    type="number"
                    value={formData.carriedOver}
                    onChange={(e) => setFormData({ ...formData, carriedOver: e.target.value })}
                    placeholder="0"
                    className="h-8 bg-white/80 border-0 shadow-sm text-right font-bold text-lg p-0 pr-2 focus-visible:ring-0"
                  />
                </div>

                {/* 2. Transaction Stats (Read Only) */}
                <div className="col-span-3 grid grid-cols-3 gap-2">
                  <div className="bg-slate-50/50 border border-slate-200/60 rounded-xl p-2.5 flex flex-col justify-center items-center">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">입고 (누계)</span>
                    <span className="text-sm font-mono font-medium text-slate-600 mt-0.5">{Number(formData.incoming).toLocaleString()}</span>
                  </div>
                  <div className="bg-slate-50/50 border border-slate-200/60 rounded-xl p-2.5 flex flex-col justify-center items-center">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">출고 (누계)</span>
                    <span className="text-sm font-mono font-medium text-slate-600 mt-0.5">{Number(formData.outgoing).toLocaleString()}</span>
                  </div>
                  <div className="bg-slate-50/50 border border-slate-200/60 rounded-xl p-2.5 flex flex-col justify-center items-center">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">사용 (누계)</span>
                    <span className="text-sm font-mono font-medium text-slate-600 mt-0.5">{Number(formData.usage).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Summary Bar */}
              <div className="mt-2 bg-slate-900/5 backdrop-blur-sm p-4 rounded-xl border border-slate-200/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-5">
                  <div className="w-20 h-20 rounded-full border-8 border-slate-900" />
                </div>

                <div className="grid grid-cols-3 gap-4 relative z-10">
                  <div className="flex flex-col items-center border-r border-slate-300/20">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">Office Stock</span>
                    <span className={`text-xl font-bold ${isEdit ? "text-indigo-600" : "text-emerald-600"}`}>
                      {remaining.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex flex-col items-center border-r border-slate-300/20">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">Field Stock</span>
                    <span className="text-xl font-bold text-slate-700">
                      {(Number(formData.outgoing) - Number(formData.usage)).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">Total Assets</span>
                    <span className="text-xl font-black text-slate-800">
                      {(remaining + (Number(formData.outgoing) - Number(formData.usage))).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 가격 정보 */}
            <div className={`grid grid-cols-2 gap-6 p-4 rounded-xl border ${isEdit ? "bg-indigo-50/30 border-indigo-100" : "bg-emerald-50/30 border-emerald-100"}`}>
              <div className="space-y-1.5">
                <Label htmlFor="unitPrice" className={`text-[12px] font-semibold ml-1 ${isEdit ? "text-indigo-700" : "text-emerald-700"}`}>
                  단가 (Unit Price) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="unitPrice"
                  type="number"
                  value={formData.unitPrice}
                  onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                  placeholder="0"
                  required
                  className={`h-9 font-bold text-right pr-4 bg-white border-transparent shadow-sm focus:ring-2 ${isEdit ? "focus:ring-indigo-500" : "focus:ring-emerald-500"}`}
                />
              </div>
              <div className="space-y-1.5">
                <Label className={`text-[12px] font-semibold ml-1 ${isEdit ? "text-indigo-700" : "text-emerald-700"}`}>총 재고 예상 가치</Label>
                <div className={`flex items-center justify-end h-9 px-4 rounded-md border bg-white shadow-inner text-[15px] font-bold ${isEdit ? "border-indigo-100 text-indigo-700" : "border-emerald-100 text-emerald-700"}`}>
                  <span className={`text-[11px] font-medium mr-1.5 italic ${isEdit ? "text-indigo-400" : "text-emerald-400"}`}>KRW</span>
                  {((remaining + (Number(formData.outgoing) - Number(formData.usage))) * Number(formData.unitPrice)).toLocaleString()}
                </div>
              </div>
            </div>

          </form>
        </div>

        <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="h-9 text-slate-500 hover:text-slate-900">
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            className={`h-9 px-6 text-white shadow-md ${isEdit
              ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-indigo-200"
              : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-200"
              }`}
            data-testid="button-submit-material"
          >
            {isEdit ? "수정 사항 저장" : "새 자재 등록"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
