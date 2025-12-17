import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BusinessDivisionSwitcher } from "@/components/BusinessDivisionSwitcher";
import { InventoryTable, type InventoryItem } from "@/components/InventoryTable";
import { MaterialFormDialog } from "@/components/MaterialFormDialog";
import { useAppContext } from "@/contexts/AppContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const mockInventory: InventoryItem[] = [
  { id: "1", category: "광케이블", name: "광케이블 48심", specification: "48C", carriedOver: 93, incoming: 61202, outgoing: 67997, remaining: -6702, unitPrice: 3800, totalAmount: 25496222 },
  { id: "2", category: "광케이블", name: "광케이블 96심", specification: "96C", carriedOver: 50, incoming: 25000, outgoing: 22000, remaining: 3050, unitPrice: 5200, totalAmount: 15860000 },
  { id: "3", category: "접속함", name: "접속함 24심", specification: "24C 클로저", carriedOver: 20, incoming: 100, outgoing: 85, remaining: 35, unitPrice: 85000, totalAmount: 2975000 },
  { id: "4", category: "단자함", name: "단자함 12구", specification: "12P", carriedOver: 15, incoming: 50, outgoing: 45, remaining: 20, unitPrice: 45000, totalAmount: 900000 },
  { id: "5", category: "부자재", name: "광커넥터 SC", specification: "SC/APC", carriedOver: 100, incoming: 500, outgoing: 400, remaining: 200, unitPrice: 1200, totalAmount: 240000 },
  { id: "6", category: "부자재", name: "광커넥터 LC", specification: "LC/UPC", carriedOver: 80, incoming: 350, outgoing: 280, remaining: 150, unitPrice: 1500, totalAmount: 225000 },
  { id: "7", category: "부자재", name: "케이블 행거", specification: "스틸 50mm", carriedOver: 200, incoming: 1200, outgoing: 900, remaining: 500, unitPrice: 800, totalAmount: 400000 },
  { id: "8", category: "공구", name: "광섬유 클리너", specification: "알코올 타입", carriedOver: 10, incoming: 50, outgoing: 35, remaining: 25, unitPrice: 15000, totalAmount: 375000 },
];

const categories = ["전체", "광케이블", "접속함", "단자함", "부자재", "공구"];

export default function Inventory() {
  const { divisions } = useAppContext();
  const [selectedDivision, setSelectedDivision] = useState(divisions[0]?.id || "div1");
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false);

  const filteredInventory = selectedCategory === "전체"
    ? mockInventory
    : mockInventory.filter((item) => item.category === selectedCategory);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">재고 현황</h1>
          <p className="text-muted-foreground">자재별 재고 수량과 상태를 확인합니다</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <BusinessDivisionSwitcher
            divisions={divisions}
            selectedId={selectedDivision}
            onSelect={setSelectedDivision}
          />
          <Button onClick={() => setMaterialDialogOpen(true)} data-testid="button-add-material">
            <Plus className="h-4 w-4 mr-2" />
            자재 추가
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="w-48">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger data-testid="select-category-filter">
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
      </div>

      <InventoryTable
        items={filteredInventory}
        onEdit={(item) => console.log("편집:", item)}
        onDelete={(item) => console.log("삭제:", item)}
      />

      <MaterialFormDialog
        open={materialDialogOpen}
        onOpenChange={setMaterialDialogOpen}
        onSubmit={(data) => console.log("자재 등록:", data)}
      />
    </div>
  );
}
