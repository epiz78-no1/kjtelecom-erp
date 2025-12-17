import { PurchaseTable, type PurchaseRecord } from "../PurchaseTable";

// todo: remove mock functionality
const mockRecords: PurchaseRecord[] = [
  { id: "1", materialName: "광케이블 48심", quantity: 2000, unit: "m", unitPrice: 1500, totalPrice: 3000000, supplier: "삼성전자", purchaseDate: "2024-12-10", divisionName: "사업부 1" },
  { id: "2", materialName: "접속함 24심", quantity: 50, unit: "개", unitPrice: 85000, totalPrice: 4250000, supplier: "LG유플러스", purchaseDate: "2024-12-08", divisionName: "사업부 1" },
  { id: "3", materialName: "광케이블 96심", quantity: 1000, unit: "m", unitPrice: 2800, totalPrice: 2800000, supplier: "SK텔레콤", purchaseDate: "2024-12-05", divisionName: "사업부 2" },
  { id: "4", materialName: "단자함 12구", quantity: 30, unit: "개", unitPrice: 45000, totalPrice: 1350000, supplier: "한국통신", purchaseDate: "2024-12-01", divisionName: "사업부 2" },
];

export default function PurchaseTableExample() {
  return (
    <div className="p-4">
      <PurchaseTable records={mockRecords} />
    </div>
  );
}
