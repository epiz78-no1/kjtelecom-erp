import { useState } from "react";
import { Plus, Calendar, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BusinessDivisionSwitcher } from "@/components/BusinessDivisionSwitcher";
import { useAppContext } from "@/contexts/AppContext";
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

interface OutgoingRecord {
  id: string;
  date: string;
  division: string;
  teamCategory: string;
  projectName: string;
  productName: string;
  specification: string;
  quantity: number;
  recipient: string;
}

const mockRecords: OutgoingRecord[] = [
  { id: "1", date: "2025-12-01", division: "SKT", teamCategory: "접속팀", projectName: "효성선70R6R16R1", productName: "광접속함체 돔형", specification: "가공 96C", quantity: 1, recipient: "채성범" },
  { id: "2", date: "2025-12-01", division: "SKT", teamCategory: "접속팀", projectName: "예비용", productName: "광접속함체 돔형", specification: "가공 96C", quantity: 3, recipient: "채성범" },
  { id: "3", date: "2025-12-01", division: "SKT", teamCategory: "접속팀", projectName: "예비용", productName: "광점퍼파코드", specification: "SM, 1C, SC/APC-SC/APC, 3M", quantity: 2, recipient: "채성범" },
  { id: "4", date: "2025-12-01", division: "SKT", teamCategory: "접속팀", projectName: "예비용", productName: "케이블명찰", specification: "재질:PVC W:70 H:50", quantity: 100, recipient: "채성범" },
  { id: "5", date: "2025-12-03", division: "SKT", teamCategory: "접속팀", projectName: "재난유선망정읍(김제요천 비정읍통합국사)", productName: "광점퍼파코드", specification: "SM, 1C, SC/PC-SC/APC, 30M", quantity: 4, recipient: "채성범" },
  { id: "6", date: "2025-12-03", division: "SKT", teamCategory: "접속팀", projectName: "재난유선망남원(곡성교촌", productName: "광점퍼파코드", specification: "SM, 1C, SC/APC-LC/PC, 30M", quantity: 4, recipient: "박정훈" },
  { id: "7", date: "2025-12-03", division: "SKT", teamCategory: "접속팀", projectName: "예비용", productName: "광접속함체 돔형", specification: "가공 96C", quantity: 1, recipient: "박정훈" },
  { id: "8", date: "2025-12-04", division: "SKT", teamCategory: "접속팀", projectName: "예비용", productName: "광점퍼파코드", specification: "SM, 1C, SC/APC-SC/APC, 30M", quantity: 4, recipient: "채성범" },
  { id: "9", date: "2025-12-08", division: "SKT", teamCategory: "외선팀", projectName: "예비용", productName: "낙뢰방지캡", specification: "표준형", quantity: 3, recipient: "김병현" },
  { id: "10", date: "2025-12-08", division: "SKT", teamCategory: "외선팀", projectName: "예비용", productName: "지선보호커버", specification: "상/하 1조", quantity: 3, recipient: "김병현" },
  { id: "11", date: "2025-12-06", division: "SKB", teamCategory: "접속팀", projectName: "예비용", productName: "광접속함체 돔형", specification: "지중 144C", quantity: 1, recipient: "정시정" },
  { id: "12", date: "2025-12-07", division: "SKT", teamCategory: "접속팀", projectName: "효자동 2가 함체교체", productName: "광접속함체 직선형", specification: "가공 24", quantity: 2, recipient: "채성범" },
];

const teamCategories = ["접속팀", "외선팀", "유지보수팀", "설치팀"];

export default function OutgoingRecords() {
  const { divisions, teams } = useAppContext();
  const [selectedDivision, setSelectedDivision] = useState(divisions[0]?.id || "div1");
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [formData, setFormData] = useState({
    teamCategory: "",
    projectName: "",
    productName: "",
    specification: "",
    quantity: "",
    recipient: "",
  });

  const filteredRecords = mockRecords.filter(
    (record) =>
      record.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.recipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.teamCategory.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalQuantity = filteredRecords.reduce((sum, r) => sum + r.quantity, 0);

  const handleSubmit = () => {
    console.log("출고 등록:", { ...formData, date: selectedDate });
    setDialogOpen(false);
    setFormData({ teamCategory: "", projectName: "", productName: "", specification: "", quantity: "", recipient: "" });
    setSelectedDate(undefined);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">출고 내역</h1>
          <p className="text-muted-foreground">자재 출고 이력을 조회하고 관리합니다</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <BusinessDivisionSwitcher
            divisions={divisions}
            selectedId={selectedDivision}
            onSelect={setSelectedDivision}
          />
          <Button onClick={() => setDialogOpen(true)} data-testid="button-add-outgoing">
            <Plus className="h-4 w-4 mr-2" />
            출고 등록
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="품명, 공사명, 수령인 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-outgoing"
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
              <TableHead className="font-semibold min-w-[100px]">출고일</TableHead>
              <TableHead className="font-semibold min-w-[60px]">사업</TableHead>
              <TableHead className="font-semibold min-w-[80px]">구분</TableHead>
              <TableHead className="font-semibold min-w-[200px]">공사명</TableHead>
              <TableHead className="font-semibold min-w-[120px]">품명</TableHead>
              <TableHead className="font-semibold min-w-[150px]">규격</TableHead>
              <TableHead className="font-semibold text-right min-w-[60px]">수량</TableHead>
              <TableHead className="font-semibold min-w-[80px]">수령인</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRecords.map((record) => (
              <TableRow key={record.id} data-testid={`row-outgoing-${record.id}`}>
                <TableCell>{record.date}</TableCell>
                <TableCell>{record.division}</TableCell>
                <TableCell>{record.teamCategory}</TableCell>
                <TableCell className="max-w-[250px] truncate">{record.projectName}</TableCell>
                <TableCell>{record.productName}</TableCell>
                <TableCell className="max-w-[180px] truncate">{record.specification}</TableCell>
                <TableCell className="text-right font-medium">{record.quantity.toLocaleString()}</TableCell>
                <TableCell>{record.recipient}</TableCell>
              </TableRow>
            ))}
            {filteredRecords.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
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
            <DialogTitle>출고 등록</DialogTitle>
            <DialogDescription>
              새로운 자재 출고 내역을 등록합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>출고일 *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="justify-start text-left font-normal"
                      data-testid="button-outgoing-date"
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
                <Label>구분 (팀) *</Label>
                <Select
                  value={formData.teamCategory}
                  onValueChange={(value) => setFormData({ ...formData, teamCategory: value })}
                >
                  <SelectTrigger data-testid="select-outgoing-team">
                    <SelectValue placeholder="구분 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamCategories.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
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
                placeholder="예: 효자동 2가 함체교체"
                data-testid="input-outgoing-project"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>품명 *</Label>
                <Input
                  value={formData.productName}
                  onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                  placeholder="예: 광접속함체 돔형"
                  data-testid="input-outgoing-product"
                />
              </div>
              <div className="grid gap-2">
                <Label>규격 *</Label>
                <Input
                  value={formData.specification}
                  onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                  placeholder="예: 가공 96C"
                  data-testid="input-outgoing-spec"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>수량 *</Label>
                <Input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="10"
                  data-testid="input-outgoing-quantity"
                />
              </div>
              <div className="grid gap-2">
                <Label>수령인 *</Label>
                <Input
                  value={formData.recipient}
                  onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                  placeholder="예: 홍길동"
                  data-testid="input-outgoing-recipient"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSubmit} data-testid="button-submit-outgoing">
              등록
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
