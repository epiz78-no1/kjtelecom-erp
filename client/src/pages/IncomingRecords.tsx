import { useState } from "react";
import { Plus, Calendar, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface IncomingRecord {
  id: string;
  date: string;
  division: string;
  supplier: string;
  projectName: string;
  productName: string;
  specification: string;
  quantity: number;
}

const mockRecords: IncomingRecord[] = [
  { id: "1", date: "2019-01-25", division: "SKT", supplier: "텔레시스", projectName: "[광텔] 2019년 SKT 운용사업 선로공사 예비용", productName: "광접속함체 직선형", specification: "가공 24C", quantity: 20 },
  { id: "2", date: "2019-01-25", division: "SKT", supplier: "텔레시스", projectName: "[광텔] 2019년 SKT 운용사업 선로공사 예비용", productName: "광접속함체 직선형", specification: "가공 48C", quantity: 20 },
  { id: "3", date: "2019-01-25", division: "SKT", supplier: "텔레시스", projectName: "[광텔] 2019년 SKT 운용사업 선로공사 예비용", productName: "광접속함체 직선형", specification: "가공 72C", quantity: 20 },
  { id: "4", date: "2019-01-25", division: "SKB", supplier: "텔레시스", projectName: "[광텔] 2019년 SKB 운용사업 선로공사 예비용", productName: "광접속함체 돔형", specification: "가공 288C", quantity: 1 },
  { id: "5", date: "2019-01-25", division: "SKT", supplier: "텔레시스", projectName: "[광텔] 2019년 SKT 운용사업 선로공사 예비용", productName: "IP주", specification: "150Kg 8M", quantity: 20 },
  { id: "6", date: "2019-01-30", division: "SKB", supplier: "텔레시스", projectName: "[광텔] 2019년 SKB 임실 통화 지중화 공사용", productName: "광접속함체 돔형", specification: "지중 144C", quantity: 8 },
  { id: "7", date: "2019-02-13", division: "SKT", supplier: "텔레시스", projectName: "[광텔] 2019년 SKT 운용사업 선로공사 예비용", productName: "바인드선", specification: "1.0mm x 500m", quantity: 10 },
  { id: "8", date: "2019-02-13", division: "SKT", supplier: "텔레시스", projectName: "[광텔] 2019년 SKT 운용사업 선로공사 예비용", productName: "열수축관", specification: "1NT", quantity: 300 },
  { id: "9", date: "2019-02-14", division: "SKB", supplier: "텔레시스", projectName: "[광텔] 2019년 SKB 운용사업 선로공사 예비용", productName: "근가블럭", specification: "IP주용 70cm", quantity: 10 },
  { id: "10", date: "2019-02-20", division: "SKT", supplier: "텔레시스", projectName: "[광텔] 2019년 SKT 운용사업 선로공사 예비용", productName: "광접속함체 직선형", specification: "가공 24C", quantity: 10 },
];

const suppliers = ["텔레시스", "삼성전자", "LG유플러스", "SK텔레콤", "한국통신", "대한광통신"];

export default function IncomingRecords() {
  const [selectedDivision, setSelectedDivision] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [formData, setFormData] = useState({
    supplier: "",
    projectName: "",
    productName: "",
    specification: "",
    quantity: "",
  });

  const divisionFiltered = selectedDivision === "all"
    ? mockRecords
    : mockRecords.filter((record) => record.division === selectedDivision);

  const filteredRecords = divisionFiltered.filter(
    (record) =>
      record.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.supplier.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalQuantity = filteredRecords.reduce((sum, r) => sum + r.quantity, 0);

  const handleSubmit = () => {
    console.log("입고 등록:", { ...formData, date: selectedDate });
    setDialogOpen(false);
    setFormData({ supplier: "", projectName: "", productName: "", specification: "", quantity: "" });
    setSelectedDate(undefined);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">입고 내역</h1>
          <p className="text-muted-foreground">자재 입고 이력을 조회하고 관리합니다</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1">
            <Button
              variant={selectedDivision === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedDivision("all")}
              data-testid="button-division-all"
            >
              전체
            </Button>
            <Button
              variant={selectedDivision === "SKT" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedDivision("SKT")}
              data-testid="button-division-skt"
            >
              SKT사업부
            </Button>
            <Button
              variant={selectedDivision === "SKB" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedDivision("SKB")}
              data-testid="button-division-skb"
            >
              SKB사업부
            </Button>
          </div>
          <Button onClick={() => setDialogOpen(true)} data-testid="button-add-incoming">
            <Plus className="h-4 w-4 mr-2" />
            입고 등록
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="품명, 공사명, 구매처 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-incoming"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          총 <span className="font-semibold text-foreground">{filteredRecords.length}</span>건 / 
          수량 <span className="font-semibold text-foreground">{totalQuantity.toLocaleString()}</span>
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold min-w-[100px]">입고일</TableHead>
              <TableHead className="font-semibold min-w-[60px]">사업</TableHead>
              <TableHead className="font-semibold min-w-[80px]">구매처</TableHead>
              <TableHead className="font-semibold min-w-[250px]">공사명</TableHead>
              <TableHead className="font-semibold min-w-[120px]">품명</TableHead>
              <TableHead className="font-semibold min-w-[100px]">규격</TableHead>
              <TableHead className="font-semibold text-right min-w-[80px]">수량</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRecords.map((record) => (
              <TableRow key={record.id} data-testid={`row-incoming-${record.id}`}>
                <TableCell>{record.date}</TableCell>
                <TableCell>{record.division}</TableCell>
                <TableCell>{record.supplier}</TableCell>
                <TableCell className="max-w-[300px] truncate">{record.projectName}</TableCell>
                <TableCell>{record.productName}</TableCell>
                <TableCell>{record.specification}</TableCell>
                <TableCell className="text-right font-medium">{record.quantity.toLocaleString()}</TableCell>
              </TableRow>
            ))}
            {filteredRecords.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  검색 결과가 없습니다
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>입고 등록</DialogTitle>
            <DialogDescription>
              새로운 자재 입고 내역을 등록합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>입고일 *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="justify-start text-left font-normal"
                      data-testid="button-incoming-date"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP", { locale: ko }) : "날짜 선택"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <Label>구매처 *</Label>
                <Select
                  value={formData.supplier}
                  onValueChange={(value) => setFormData({ ...formData, supplier: value })}
                >
                  <SelectTrigger data-testid="select-incoming-supplier">
                    <SelectValue placeholder="구매처 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>공사명 *</Label>
              <Input
                value={formData.projectName}
                onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                placeholder="예: [광텔] 2025년 SKT 운용사업 선로공사"
                data-testid="input-incoming-project"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>품명 *</Label>
                <Input
                  value={formData.productName}
                  onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                  placeholder="예: 광접속함체 직선형"
                  data-testid="input-incoming-product"
                />
              </div>
              <div className="grid gap-2">
                <Label>규격 *</Label>
                <Input
                  value={formData.specification}
                  onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                  placeholder="예: 가공 24C"
                  data-testid="input-incoming-spec"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>수량 *</Label>
              <Input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="10"
                data-testid="input-incoming-quantity"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSubmit} data-testid="button-submit-incoming">
              등록
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
