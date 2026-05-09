import { useRoute, Link } from "wouter";
import { useGetBusiness, getGetBusinessQueryKey, useListWorkers, getListWorkersQueryKey, useDeleteBusiness } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Pencil, Trash2, ArrowLeft, Plus } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function BusinessDetail() {
  const [, params] = useRoute("/businesses/:id");
  const businessId = parseInt(params?.id || "0");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: business, isLoading: isLoadingBiz } = useGetBusiness(businessId, {
    query: { enabled: !!businessId, queryKey: getGetBusinessQueryKey(businessId) }
  });

  const { data: workers, isLoading: isLoadingWorkers } = useListWorkers({ businessId }, {
    query: { enabled: !!businessId, queryKey: getListWorkersQueryKey({ businessId }) }
  });

  const deleteMutation = useDeleteBusiness();

  const handleDelete = () => {
    if (confirm("정말 이 사업장을 삭제하시겠습니까? 연관된 모든 데이터가 삭제될 수 있습니다.")) {
      deleteMutation.mutate({ id: businessId }, {
        onSuccess: () => {
          toast({ title: "삭제 완료" });
          setLocation("/businesses");
        }
      });
    }
  };

  if (isLoadingBiz) return <div className="space-y-4"><Skeleton className="h-8 w-[200px]" /><Skeleton className="h-64" /></div>;
  if (!business) return <div>사업장을 찾을 수 없습니다.</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link href="/businesses">
            <Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{business.name}</h2>
            <p className="text-muted-foreground">사업자번호: {business.businessNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/businesses/${business.id}/edit`}>
            <Button variant="outline"><Pencil className="w-4 h-4 mr-2" /> 수정</Button>
          </Link>
          <Button variant="destructive" onClick={handleDelete}><Trash2 className="w-4 h-4 mr-2" /> 삭제</Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>기본 정보</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-y-4 text-sm">
              <div className="grid grid-cols-3 gap-4 border-b pb-2"><dt className="font-medium text-muted-foreground">사업장명</dt><dd className="col-span-2 font-medium">{business.name}</dd></div>
              <div className="grid grid-cols-3 gap-4 border-b pb-2"><dt className="font-medium text-muted-foreground">사업자등록번호</dt><dd className="col-span-2">{business.businessNumber}</dd></div>
              <div className="grid grid-cols-3 gap-4 border-b pb-2"><dt className="font-medium text-muted-foreground">대표자명</dt><dd className="col-span-2">{business.representativeName}</dd></div>
              <div className="grid grid-cols-3 gap-4 border-b pb-2"><dt className="font-medium text-muted-foreground">설립일</dt><dd className="col-span-2">{business.foundedDate || "-"}</dd></div>
              <div className="grid grid-cols-3 gap-4 border-b pb-2"><dt className="font-medium text-muted-foreground">담당자</dt><dd className="col-span-2">{business.managerName}</dd></div>
              <div className="grid grid-cols-3 gap-4 pb-2"><dt className="font-medium text-muted-foreground">상태</dt><dd className="col-span-2"><StatusBadge status={business.status} /></dd></div>
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>부가 정보</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-y-4 text-sm">
              <div className="grid grid-cols-3 gap-4 border-b pb-2"><dt className="font-medium text-muted-foreground">운영기관</dt><dd className="col-span-2">{business.operatingAgency || "-"}</dd></div>
              <div className="grid grid-cols-3 gap-4 border-b pb-2"><dt className="font-medium text-muted-foreground">운영기관 연락처</dt><dd className="col-span-2">{business.operatingAgencyPhone || "-"}</dd></div>
              <div className="grid grid-cols-3 gap-4 border-b pb-2"><dt className="font-medium text-muted-foreground">은행명</dt><dd className="col-span-2">{business.bankName || "-"}</dd></div>
              <div className="grid grid-cols-3 gap-4 border-b pb-2"><dt className="font-medium text-muted-foreground">계좌번호</dt><dd className="col-span-2">{business.accountNumber || "-"}</dd></div>
              <div className="grid grid-cols-3 gap-4 pb-2"><dt className="font-medium text-muted-foreground">인증서 비밀번호</dt><dd className="col-span-2">{business.certPassword ? "등록됨" : "-"}</dd></div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>소속 근로자 목록</CardTitle>
          <Button variant="outline" size="sm" onClick={() => alert("근로자 등록 모달 오픈 예정")}><Plus className="w-4 h-4 mr-2" /> 근로자 추가</Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>입사일</TableHead>
                  <TableHead>중간입사자</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingWorkers ? (
                  <TableRow><TableCell colSpan={5} className="text-center">로딩중...</TableCell></TableRow>
                ) : workers?.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">등록된 근로자가 없습니다.</TableCell></TableRow>
                ) : (
                  workers?.map(w => (
                    <TableRow key={w.id}>
                      <TableCell className="font-medium"><Link href={`/workers/${w.id}`} className="hover:underline">{w.name}</Link></TableCell>
                      <TableCell>{new Date(w.hireDate).toLocaleDateString()}</TableCell>
                      <TableCell>{w.isMidJoiner ? "Y" : "N"}</TableCell>
                      <TableCell><StatusBadge status={w.status} /></TableCell>
                      <TableCell className="text-right">
                        <Link href={`/workers/${w.id}`}><Button variant="ghost" size="sm">상세</Button></Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
// Import missing hook
import { useLocation } from "wouter";