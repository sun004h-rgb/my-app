import { useState } from "react";
import { Link } from "wouter";
import { useListRounds, getListRoundsQueryKey, useListBusinesses, getListBusinessesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { exportToCsv } from "@/lib/export-csv";
import { Download } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { DDayBadge } from "@/components/ui/d-day-badge";

export default function Rounds() {
  const [businessId, setBusinessId] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [roundNumber, setRoundNumber] = useState<string>("all");

  const { data: businesses } = useListBusinesses({}, { query: { queryKey: getListBusinessesQueryKey() } });
  
  const queryParams = {
    businessId: businessId !== "all" ? parseInt(businessId) : null,
    status: status !== "all" ? status : null,
    roundNumber: roundNumber !== "all" ? parseInt(roundNumber) : null,
  };

  const { data: rounds, isLoading } = useListRounds(queryParams, {
    query: { queryKey: getListRoundsQueryKey(queryParams) }
  });

  const handleExport = () => {
    if (!rounds) return;
    const exportData = rounds.map(r => ({
      사업장명: r.businessName,
      근로자명: r.workerName,
      회차: `${r.roundNumber}회차`,
      신청예정일: new Date(r.dueDate).toLocaleDateString(),
      금액: r.amount,
      상태: r.status,
      담당자명: r.managerName
    }));
    exportToCsv("rounds.csv", exportData);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">지원금 회차 관리</h2>
          <p className="text-muted-foreground">근로자별 지원금 신청 및 지급 현황을 관리합니다.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} disabled={!rounds?.length}>
            <Download className="w-4 h-4 mr-2" /> 엑셀 다운로드
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>검색 필터</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Select value={businessId} onValueChange={setBusinessId}>
              <SelectTrigger>
                <SelectValue placeholder="사업장" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">사업장 전체</SelectItem>
                {businesses?.map(b => (
                  <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={roundNumber} onValueChange={setRoundNumber}>
              <SelectTrigger>
                <SelectValue placeholder="회차" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">회차 전체</SelectItem>
                <SelectItem value="1">1회차</SelectItem>
                <SelectItem value="2">2회차</SelectItem>
                <SelectItem value="3">3회차</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">상태 전체</SelectItem>
                <SelectItem value="scheduled">신청예정</SelectItem>
                <SelectItem value="applied">신청완료</SelectItem>
                <SelectItem value="paid">지급완료</SelectItem>
                <SelectItem value="not_applied">미신청</SelectItem>
                <SelectItem value="resigned">퇴사</SelectItem>
                <SelectItem value="not_applicable">신청불가</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>사업장명</TableHead>
                <TableHead>근로자명</TableHead>
                <TableHead>회차</TableHead>
                <TableHead>신청예정일</TableHead>
                <TableHead>D-Day</TableHead>
                <TableHead>금액</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>담당자명</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                  </TableRow>
                ))
              ) : rounds?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    조회된 회차가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                rounds?.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      <Link href={`/businesses/${r.businessId}`} className="hover:underline">{r.businessName}</Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/workers/${r.workerId}`} className="hover:underline">{r.workerName}</Link>
                    </TableCell>
                    <TableCell>{r.roundNumber}회차</TableCell>
                    <TableCell>{new Date(r.dueDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <DDayBadge dueDate={r.dueDate} />
                    </TableCell>
                    <TableCell>₩{r.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell>{r.managerName}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
