import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MaterialFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: MaterialFormData) => void;
}

export interface MaterialFormData {
  category: string;
  name: string;
  specification: string;
  carriedOver: number;
  incoming: number;
  outgoing: number;
  unitPrice: number;
}

const categories = ["광케이블", "접속함", "단자함", "부자재", "공구", "기타"];

export function MaterialFormDialog({ open, onOpenChange, onSubmit }: MaterialFormDialogProps) {
  const [formData, setFormData] = useState<MaterialFormData>({
    category: "",
    name: "",
    specification: "",
    carriedOver: 0,
    incoming: 0,
    outgoing: 0,
    unitPrice: 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({
      category: "",
      name: "",
      specification: "",
      carriedOver: 0,
      incoming: 0,
      outgoing: 0,
      unitPrice: 0,
    });
    onOpenChange(false);
  };

  const remaining = formData.carriedOver + formData.incoming - formData.outgoing;
  const totalAmount = remaining * formData.unitPrice;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>자재 추가</DialogTitle>
          <DialogDescription>
            새로운 자재 품목을 등록합니다. 모든 필수 항목을 입력해주세요.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="category">구분 *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                  required
                >
                  <SelectTrigger data-testid="select-category">
                    <SelectValue placeholder="구분 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">품명 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="예: 광케이블 48심"
                  required
                  data-testid="input-material-name"
                />
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="specification">규격 *</Label>
              <Input
                id="specification"
                value={formData.specification}
                onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                placeholder="예: 48C, 12mm x 100m"
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
              등록
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
