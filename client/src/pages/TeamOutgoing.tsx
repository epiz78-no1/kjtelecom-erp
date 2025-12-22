import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import type { OutgoingRecord, MaterialUsageRecord } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function TeamOutgoing() {
  const [selectedDivision, setSelectedDivision] = useState("all");
  const [selectedRecipient, setSelectedRecipient] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: outgoingRecords = [], isLoading: outgoingLoading } = useQuery<OutgoingRecord[]>({
    queryKey: ["/api/outgoing"],
  });

  const { data: usageRecords = [], isLoading: usageLoading } = useQuery<MaterialUsageRecord[]>({
    queryKey: ["/api/material-usage"],
  });

  const isLoading = outgoingLoading || usageLoading;

  const divisionFiltered = selectedDivision === "all"
    ? outgoingRecords
    : outgoingRecords.filter((record) => record.division === selectedDivision);

  const recipients = Array.from(new Set(divisionFiltered.map((r) => r.recipient))).filter(Boolean);

  const filteredRecords = divisionFiltered.filter((record) => {
    const matchesRecipient = selectedRecipient === "all" || record.recipient === selectedRecipient;
    const matchesSearch = 
      record.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.teamCategory.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.recipient.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRecipient && matchesSearch;
  });

  const recipientStats = recipients.map((recipient) => {
    const outgoingTotal = divisionFiltered
      .filter((r) => r.recipient === recipient)
      .reduce((sum, r) => sum + r.quantity, 0);
    
    const usageTotal = usageRecords
      .filter((r) => r.recipient === recipient && (selectedDivision === "all" || r.division === selectedDivision))
      .reduce((sum, r) => sum + r.quantity, 0);
    
    const remaining = outgoingTotal - usageTotal;
    
    return {
      name: recipient,
      outgoingTotal,
      usageTotal,
      remaining,
      recordCount: divisionFiltered.filter((r) => r.recipient === recipient).length,
    };
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 space-y-4 pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">현장팀별 출고 내역</h1>
            <p className="text-muted-foreground">수령인별 자재 출고/사용 현황을 조회합니다</p>
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
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {recipientStats.map((recipient) => (
            <Card
              key={recipient.name}
              className={`cursor-pointer transition-colors ${selectedRecipient === recipient.name ? "ring-2 ring-primary" : ""}`}
              onClick={() => setSelectedRecipient(recipient.name === selectedRecipient ? "all" : recipient.name)}
              data-testid={`card-recipient-${recipient.name}`}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between gap-2">
                  {recipient.name}
                  <Badge variant="outline" className="text-xs">
                    {recipient.recordCount}건
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">출고:</span>
                    <span className="font-medium">{recipient.outgoingTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">사용:</span>
                    <span className="font-medium">{recipient.usageTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1">
                    <span className="text-muted-foreground">잔여:</span>
                    <span className={`font-bold ${recipient.remaining < 0 ? "text-destructive" : "text-primary"}`}>
                      {recipient.remaining.toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="품명, 프로젝트명, 수령인 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
          <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
            <SelectTrigger className="w-48" data-testid="select-recipient-filter">
              <SelectValue placeholder="수령인 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {recipients.map((recipient) => (
                <SelectItem key={recipient} value={recipient}>
                  {recipient}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 min-h-0 rounded-md border overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow className="h-11">
              <TableHead className="font-semibold w-[100px] text-center align-middle bg-background">날짜</TableHead>
              <TableHead className="font-semibold w-[100px] text-center align-middle bg-background">수령인</TableHead>
              <TableHead className="font-semibold w-[80px] text-center align-middle bg-background">구분</TableHead>
              <TableHead className="font-semibold w-[200px] text-center align-middle bg-background">프로젝트명</TableHead>
              <TableHead className="font-semibold w-[120px] text-center align-middle bg-background">품명</TableHead>
              <TableHead className="font-semibold w-[120px] text-center align-middle bg-background">규격</TableHead>
              <TableHead className="font-semibold w-[70px] text-center align-middle bg-background">수량</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  출고 내역이 없습니다
                </TableCell>
              </TableRow>
            ) : (
              filteredRecords.map((record) => (
                <TableRow key={record.id} className="h-11" data-testid={`row-record-${record.id}`}>
                  <TableCell className="text-center align-middle whitespace-nowrap font-medium">{record.date}</TableCell>
                  <TableCell className="text-center align-middle">
                    <Badge variant="outline">{record.recipient}</Badge>
                  </TableCell>
                  <TableCell className="text-center align-middle whitespace-nowrap">{record.teamCategory}</TableCell>
                  <TableCell className="text-center align-middle max-w-[200px] truncate">{record.projectName}</TableCell>
                  <TableCell className="text-center align-middle whitespace-nowrap">{record.productName}</TableCell>
                  <TableCell className="text-center align-middle max-w-[120px] truncate">{record.specification}</TableCell>
                  <TableCell className="text-center align-middle whitespace-nowrap">{record.quantity.toLocaleString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
