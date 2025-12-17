import { Badge } from "@/components/ui/badge";

type InventoryStatus = "sufficient" | "low" | "critical";

interface InventoryStatusBadgeProps {
  status: InventoryStatus;
  currentStock: number;
  safetyStock: number;
}

const statusConfig: Record<InventoryStatus, { label: string; className: string }> = {
  sufficient: {
    label: "충분",
    className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  low: {
    label: "부족",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  },
  critical: {
    label: "긴급",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
};

export function getInventoryStatus(currentStock: number, safetyStock: number): InventoryStatus {
  const ratio = currentStock / safetyStock;
  if (ratio >= 1.5) return "sufficient";
  if (ratio >= 1) return "low";
  return "critical";
}

export function InventoryStatusBadge({ status, currentStock, safetyStock }: InventoryStatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge variant="outline" className={`${config.className} border-0`}>
      {config.label}
    </Badge>
  );
}
