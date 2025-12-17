import { InventoryStatusBadge } from "../InventoryStatusBadge";

export default function InventoryStatusBadgeExample() {
  return (
    <div className="flex gap-4 p-4">
      <InventoryStatusBadge status="sufficient" currentStock={150} safetyStock={100} />
      <InventoryStatusBadge status="low" currentStock={100} safetyStock={100} />
      <InventoryStatusBadge status="critical" currentStock={50} safetyStock={100} />
    </div>
  );
}
