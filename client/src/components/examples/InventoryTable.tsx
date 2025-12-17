import { InventoryTable, type InventoryItem } from "../InventoryTable";

// todo: remove mock functionality
const mockItems: InventoryItem[] = [
  { id: "1", name: "광케이블 48심", category: "광케이블", currentStock: 5000, safetyStock: 3000, unit: "m", lastRestockDate: "2024-12-10" },
  { id: "2", name: "광케이블 96심", category: "광케이블", currentStock: 2500, safetyStock: 2000, unit: "m", lastRestockDate: "2024-12-08" },
  { id: "3", name: "접속함 24심", category: "접속함", currentStock: 80, safetyStock: 100, unit: "개", lastRestockDate: "2024-12-05" },
  { id: "4", name: "단자함 12구", category: "단자함", currentStock: 30, safetyStock: 50, unit: "개", lastRestockDate: "2024-12-01" },
  { id: "5", name: "광커넥터 SC", category: "부자재", currentStock: 500, safetyStock: 300, unit: "개", lastRestockDate: "2024-12-12" },
];

export default function InventoryTableExample() {
  return (
    <div className="p-4">
      <InventoryTable
        items={mockItems}
        onEdit={(item) => console.log("편집:", item.name)}
        onDelete={(item) => console.log("삭제:", item.name)}
      />
    </div>
  );
}
