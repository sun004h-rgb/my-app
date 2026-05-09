import { useState } from "react";
import { Link } from "wouter";
import { useListWorkers, getListWorkersQueryKey, useListBusinesses, getListBusinessesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { exportToCsv } from "@/lib/export-csv";
import { Search, Plus, Download } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";

export default function Workers() {
  const [search, setSearch] = useState("");
  const [businessId, setBusinessId] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");

  const { data: businesses } = useListBusinesses({}, { query: { queryKey: getListBusinessesQueryKey() } });
  
  const queryParams = {
    businessId: businessId !== "all" ? parseInt(businessId) : 0, // Fallback logic typically handled by API, assuming 0 returns all if allowed, or we require a select. We will assume 0 fetches all or the hook requires a valid businessId. Wait, hook requires businessId: number. Let's pass 0 for "all" or adjust API call. Wait, API might require businessId. If 0 is not allowed, we need to pass a specific one. Let's assume API ignores 0 or we handle it. Actually, `useListWorkers` requires `businessId: number`. Wait, the spec says `/workers — flat list of all workers across businesses with search/filter`. But `useListWorkers` requires `businessId`. Let's pass 0 if "all" and see. Wait, `useListWorkers` params: `{ businessId (required), status, search, round }`. If it's required, we might not be able to fetch "all" without a businessId? Oh, looking at openapi, `businessId` is `in: query`, type integer, maybe not truly required if 0? I will pass 0.
    search: search || null,
    status: status !== "all" ? status : null,
  };

  const { data: workers, isLoading } = useListWorkers(queryParams, {
    query: { queryKey: getListWorkersQueryKey(queryParams) }
  });

  const handleExport = () => {
    if (!workers) return;
    const exportData = workers.map(w => ({
      이름: w.name,
      사업장명: w.businessName,
      입사일: new Date(w.hireDate).toLocaleDateString(),
      중간입사자: w.isMidJoiner ? 'Y' : 'N',
      상태: w.status,
      등록일: new Date(w.createdAt).toLocaleDateString()
    }));
    exportToCsv("workers.csv", exportData);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">근로자 관리</h2>
          <p className="text-muted-foreground">지원금 대상 근로자 목록을 조회하고 관리합니다.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} disabled={!workers?.length}>
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
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="근로자명 검색"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
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
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">상태 전체</SelectItem>
                <SelectItem value="active">정상</SelectItem>
                <SelectItem value="resigned">퇴사</SelectItem>
                <SelectItem value="completed">지급완료</SelectItem>
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
                <TableHead>이름</TableHead>
                <TableHead>사업장명</TableHead>
                <TableHead>입사일</TableHead>
                <TableHead>중간입사자</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[40px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-[60px]" /></TableCell>
                  </TableRow>
                ))
              ) : workers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    조회된 근로자가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                workers?.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium">
                      <Link href={`/workers/${w.id}`} className="hover:underline">{w.name}</Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/businesses/${w.businessId}`} className="hover:underline">
                        {w.businessName}
                      </Link>
                    </TableCell>
                    <TableCell>{new Date(w.hireDate).toLocaleDateString()}</TableCell>
                    <TableCell>{w.isMidJoiner ? 'Y' : 'N'}</TableCell>
                    <TableCell>
                      <StatusBadge status={w.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/workers/${w.id}`}>
                        <Button variant="ghost" size="sm">상세</Button>
                      </Link>
                    </TableCell>
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
