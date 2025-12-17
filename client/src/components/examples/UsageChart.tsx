import { UsageChart } from "../UsageChart";

// todo: remove mock functionality
const mockData = [
  { month: "7월", usage: 4500 },
  { month: "8월", usage: 5200 },
  { month: "9월", usage: 4800 },
  { month: "10월", usage: 6100 },
  { month: "11월", usage: 5500 },
  { month: "12월", usage: 4200 },
];

export default function UsageChartExample() {
  return (
    <div className="p-4 max-w-2xl">
      <UsageChart title="월별 광케이블 사용량 (m)" data={mockData} />
    </div>
  );
}
