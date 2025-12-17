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

// todo: remove mock functionality
const mockInventory: InventoryItem[] = [
  { id: "1", name: "광케이블 48심", category: "광케이블", currentStock: 5000, safetyStock: 3000, unit: "m", lastRestockDate: "2024-12-10" },
  { id: "2", name: "광케이블 96심", category: "광케이블", currentStock: 2500, safetyStock: 2000, unit: "m", lastRestockDate: "2024-12-08" },
  { id: "3", name: "접속함 24심", category: "접속함", currentStock: 80, safetyStock: 100, unit: "개", lastRestockDate: "2024-12-05" },
  { id: "4", name: "단자함 12구", category: "단자함", currentStock: 30, safetyStock: 50, unit: "개", lastRestockDate: "2024-12-01" },
  { id: "5", name: "광커넥터 SC", category: "부자재", currentStock: 500, safetyStock: 300, unit: "개", lastRestockDate: "2024-12-12" },
  { id: "6", name: "광커넥터 LC", category: "부자재", currentStock: 350, safetyStock: 200, unit: "개", lastRestockDate: "2024-12-11" },
  { id: "7", name: "케이블 행거", category: "부자재", currentStock: 1200, safetyStock: 500, unit: "개", lastRestockDate: "2024-12-09" },
  { id: "8", name: "광섬유 클리너", category: "공구", currentStock: 45, safetyStock: 30, unit: "개", lastRestockDate: "2024-12-07" },
];

const categories = ["전체", "광케이블", "접속함", "단자함", "부자재", "공구"];

export default function Inventory() {
  const { divisions } = useAppContext();
  const [selectedDivision, setSelectedDivision] = useState("div1");
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
