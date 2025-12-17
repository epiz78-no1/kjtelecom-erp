import { useState } from "react";
import { Plus, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BusinessDivisionSwitcher } from "@/components/BusinessDivisionSwitcher";
import { PurchaseTable, type PurchaseRecord } from "@/components/PurchaseTable";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

// todo: remove mock functionality
const mockDivisions = [
  { id: "div1", name: "사업부 1" },
  { id: "div2", name: "사업부 2" },
];

// todo: remove mock functionality
const mockRecords: PurchaseRecord[] = [
  { id: "1", materialName: "광케이블 48심", quantity: 2000, unit: "m", unitPrice: 1500, totalPrice: 3000000, supplier: "삼성전자", purchaseDate: "2024-12-10", divisionName: "사업부 1" },
  { id: "2", materialName: "접속함 24심", quantity: 50, unit: "개", unitPrice: 85000, totalPrice: 4250000, supplier: "LG유플러스", purchaseDate: "2024-12-08", divisionName: "사업부 1" },
  { id: "3", materialName: "광케이블 96심", quantity: 1000, unit: "m", unitPrice: 2800, totalPrice: 2800000, supplier: "SK텔레콤", purchaseDate: "2024-12-05", divisionName: "사업부 2" },
  { id: "4", materialName: "단자함 12구", quantity: 30, unit: "개", unitPrice: 45000, totalPrice: 1350000, supplier: "한국통신", purchaseDate: "2024-12-01", divisionName: "사업부 2" },
  { id: "5", materialName: "광커넥터 SC", quantity: 200, unit: "개", unitPrice: 1200, totalPrice: 240000, supplier: "대한광통신", purchaseDate: "2024-11-28", divisionName: "사업부 1" },
  { id: "6", materialName: "케이블 행거", quantity: 500, unit: "개", unitPrice: 800, totalPrice: 400000, supplier: "코리아텔레콤", purchaseDate: "2024-11-25", divisionName: "사업부 2" },
];

// todo: remove mock functionality
const mockMaterials = ["광케이블 48심", "광케이블 96심", "접속함 24심", "단자함 12구", "광커넥터 SC", "케이블 행거"];
const mockSuppliers = ["삼성전자", "LG유플러스", "SK텔레콤", "한국통신", "대한광통신", "코리아텔레콤"];

export default function Purchases() {
  const [selectedDivision, setSelectedDivision] = useState("div1");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [purchaseDate, setPurchaseDate] = useState<Date>();
  const [formData, setFormData] = useState({
    material: "",
    quantity: "",
    unitPrice: "",
    supplier: "",
  });

  const filteredRecords = mockRecords.filter(
    (record) => record.divisionName === mockDivisions.find((d) => d.id === selectedDivision)?.name
  );

  const handleSubmit = () => {
    console.log("구매 등록:", { ...formData, date: purchaseDate });
    setDialogOpen(false);
    setFormData({ material: "", quantity: "", unitPrice: "", supplier: "" });
    setPurchaseDate(undefined);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">구매 내역</h1>
          <p className="text-muted-foreground">자재 구매 이력을 조회하고 관리합니다</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <BusinessDivisionSwitcher
            divisions={mockDivisions}
            selectedId={selectedDivision}
            onSelect={setSelectedDivision}
          />
          <Button onClick={() => setDialogOpen(true)} data-testid="button-add-purchase">
            <Plus className="h-4 w-4 mr-2" />
            구매 등록
          </Button>
        </div>
      </div>

      <PurchaseTable records={filteredRecords} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>구매 등록</DialogTitle>
            <DialogDescription>
              새로운 자재 구매 내역을 등록합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>자재 *</Label>
              <Select
                value={formData.material}
                onValueChange={(value) => setFormData({ ...formData, material: value })}
              >
                <SelectTrigger data-testid="select-purchase-material">
                  <SelectValue placeholder="자재 선택" />
                </SelectTrigger>
                <SelectContent>
                  {mockMaterials.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>수량 *</Label>
                <Input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="100"
                  data-testid="input-purchase-quantity"
                />
              </div>
              <div className="grid gap-2">
                <Label>단가 (원) *</Label>
                <Input
                  type="number"
                  value={formData.unitPrice}
                  onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                  placeholder="10000"
                  data-testid="input-purchase-price"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>공급업체 *</Label>
              <Select
                value={formData.supplier}
                onValueChange={(value) => setFormData({ ...formData, supplier: value })}
              >
                <SelectTrigger data-testid="select-purchase-supplier">
                  <SelectValue placeholder="공급업체 선택" />
                </SelectTrigger>
                <SelectContent>
                  {mockSuppliers.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>구매일자 *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="justify-start text-left font-normal"
                    data-testid="button-purchase-date"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {purchaseDate ? format(purchaseDate, "PPP", { locale: ko }) : "날짜 선택"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={purchaseDate}
                    onSelect={setPurchaseDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSubmit} data-testid="button-submit-purchase">
              등록
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
