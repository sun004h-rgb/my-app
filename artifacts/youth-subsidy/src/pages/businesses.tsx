import { useState } from "react";
import { Link } from "wouter";
import { useListBusinesses, getListBusinessesQueryKey, useListUsers, getListUsersQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { exportToCsv } from "@/lib/export-csv";
import { Search, Plus, Download } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";

export default function Businesses() {
  const [search, setSearch] = useState("");
  const [year, setYear] = useState<string>("all");
  const [managerId, setManagerId] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");

  const { data: users } = useListUsers({ query: { queryKey: getListUsersQueryKey() } });
  
  const queryParams = {
    search: search || null,
    year: year !== "all" ? parseInt(year) : null,
    managerId: managerId !== "all" ? parseInt(managerId) : null,
    status: status !== "all" ? status : null,
  };

  const { data: businesses, isLoading } = useListBusinesses(queryParams, {
    query: { queryKey: getListBusinessesQueryKey(queryParams) }
  });

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 1 + i);

  const handleExport = () => {
    if (!businesses) return;
    const exportData = businesses.map(b => ({
      사업장명: b.name,
      대표자명: b.representativeName,
      사업자번호: b.businessNumber,
      사업신청년도: b.applicationYear,
      담당자명: b.managerName,
      근로자수: b.workerCount,
      상태: b.status,
      등록일: new Date(b.createdAt).toLocaleDateString()
    }));
    exportToCsv("businesses.csv", exportData);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">사업장 관리</h2>
          <p className="text-muted-foreground">참여 사업장 목록을 조회하고 관리합니다.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} disabled={!businesses?.length}>
            <Download className="w-4 h-4 mr-2" /> 엑셀 다운로드
          </Button>
          <Link href="/businesses/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" /> 신규 사업장
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>검색 필터</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="사업장명, 사업자번호 검색"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger>
                <SelectValue placeholder="신청년도" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 연도</SelectItem>
                {years.map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}년</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={managerId} onValueChange={setManagerId}>
              <SelectTrigger>
                <SelectValue placeholder="담당자" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">담당자 전체</SelectItem>
                {users?.map(u => (
                  <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
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
                <SelectItem value="closed">폐업</SelectItem>
                <SelectItem value="suspended">휴업</SelectItem>
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
                <TableHead>대표자명</TableHead>
                <TableHead>사업자번호</TableHead>
                <TableHead>신청년도</TableHead>
                <TableHead>담당자</TableHead>
                <TableHead>근로자수</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[40px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-[60px]" /></TableCell>
                  </TableRow>
                ))
              ) : businesses?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    조회된 사업장이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                businesses?.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">
                      <Link href={`/businesses/${b.id}`} className="hover:underline">{b.name}</Link>
                    </TableCell>
                    <TableCell>{b.representativeName}</TableCell>
                    <TableCell>{b.businessNumber}</TableCell>
                    <TableCell>{b.applicationYear}</TableCell>
                    <TableCell>{b.managerName}</TableCell>
                    <TableCell>{b.workerCount || 0}명</TableCell>
                    <TableCell>
                      <StatusBadge status={b.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/businesses/${b.id}`}>
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
