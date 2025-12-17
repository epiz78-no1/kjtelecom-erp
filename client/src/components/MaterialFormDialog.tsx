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
  name: string;
  category: string;
  safetyStock: number;
  unit: string;
}

const categories = ["광케이블", "접속함", "단자함", "부자재", "공구"];
const units = ["m", "개", "롤", "세트", "박스"];

export function MaterialFormDialog({ open, onOpenChange, onSubmit }: MaterialFormDialogProps) {
  const [formData, setFormData] = useState<MaterialFormData>({
    name: "",
    category: "",
    safetyStock: 0,
    unit: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({ name: "", category: "", safetyStock: 0, unit: "" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>자재 추가</DialogTitle>
          <DialogDescription>
            새로운 자재 품목을 등록합니다. 모든 필드를 입력해주세요.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">자재명 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="예: 광케이블 48심"
                required
                data-testid="input-material-name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">카테고리 *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
                required
              >
                <SelectTrigger data-testid="select-category">
                  <SelectValue placeholder="카테고리 선택" />
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
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="safetyStock">안전 재고 *</Label>
                <Input
                  id="safetyStock"
                  type="number"
                  value={formData.safetyStock || ""}
                  onChange={(e) => setFormData({ ...formData, safetyStock: Number(e.target.value) })}
                  placeholder="100"
                  required
                  data-testid="input-safety-stock"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unit">단위 *</Label>
                <Select
                  value={formData.unit}
                  onValueChange={(value) => setFormData({ ...formData, unit: value })}
                  required
                >
                  <SelectTrigger data-testid="select-unit">
                    <SelectValue placeholder="단위" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
