import { QuickActionButtons } from "../QuickActionButtons";

export default function QuickActionButtonsExample() {
  return (
    <div className="p-4">
      <QuickActionButtons
        onAddMaterial={() => console.log("자재 추가 클릭")}
        onAddPurchase={() => console.log("구매 등록 클릭")}
        onAddUsage={() => console.log("출고 기록 클릭")}
      />
    </div>
  );
}
