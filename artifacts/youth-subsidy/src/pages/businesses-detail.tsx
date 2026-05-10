import { useRoute, Link, useLocation } from "wouter";
import {
  useGetBusiness, getGetBusinessQueryKey,
  useListWorkers, getListWorkersQueryKey,
  useDeleteBusiness, useCreateWorker,
  useListRounds, getListRoundsQueryKey,
  getListBusinessesQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Pencil, Trash2, ArrowLeft, Plus } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { DDayBadge } from "@/components/ui/d-day-badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";

const workerSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요"),
  hireDate: z.string().min(1, "입사일을 입력해주세요"),
  residentNumber: z.string().optional().or(z.literal("")),
  isMidJoiner: z.boolean().default(false),
});

function AddWorkerDialog({ businessId, onSuccess }: { businessId: number; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const createMutation = useCreateWorker();

  const form = useForm<z.infer<typeof workerSchema>>({
    resolver: zodResolver(workerSchema),
    defaultValues: {
      name: "",
      hireDate: new Date().toISOString().split("T")[0],
      residentNumber: "",
      isMidJoiner: false,
    },
  });

  const onSubmit = (values: z.infer<typeof workerSchema>) => {
    createMutation.mutate(
      {
        data: {
          businessId,
          name: values.name,
          hireDate: values.hireDate,
          residentNumber: values.residentNumber || undefined,
          isMidJoiner: values.isMidJoiner,
          status: "active",
        },
      },
      {
        onSuccess: () => {
          toast({ title: "근로자 등록 완료", description: "1~3회차가 자동으로 생성되었습니다." });
          form.reset();
          setOpen(false);
          onSuccess();
        },
        onError: () => toast({ variant: "destructive", title: "등록 실패" }),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2" /> 근로자 추가
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>근로자 등록</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>이름 *</FormLabel>
                <FormControl><Input placeholder="홍길동" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="hireDate" render={({ field }) => (
              <FormItem>
                <FormLabel>입사일 *</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="residentNumber" render={({ field }) => (
              <FormItem>
                <FormLabel>주민등록번호</FormLabel>
                <FormControl><Input placeholder="000000-0000000" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="isMidJoiner" render={({ field }) => (
              <FormItem className="flex items-center gap-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>중간입사자 여부</FormLabel>
                  <p className="text-xs text-muted-foreground">
                    체크 시 신청도래일이 +7/10/13개월로 계산됩니다.
                  </p>
                </div>
              </FormItem>
            )} />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>취소</Button>
              <Button type="submit" disabled={createMutation.isPending}>등록</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function BusinessDetail() {
  const [, params] = useRoute("/businesses/:id");
  const businessId = parseInt(params?.id || "0");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: business, isLoading: isLoadingBiz } = useGetBusiness(businessId, {
    query: { enabled: !!businessId, queryKey: getGetBusinessQueryKey(businessId) },
  });

  const { data: workers, isLoading: isLoadingWorkers } = useListWorkers(
    { businessId },
    { query: { enabled: !!businessId, queryKey: getListWorkersQueryKey({ businessId }) } }
  );

  const { data: rounds } = useListRounds(
    { businessId },
    { query: { enabled: !!businessId, queryKey: getListRoundsQueryKey({ businessId }) } }
  );

  const deleteMutation = useDeleteBusiness();

  const handleDelete = () => {
    if (confirm("정말 이 사업장을 삭제하시겠습니까? 연관된 근로자 및 회차 데이터도 모두 삭제됩니다.")) {
      deleteMutation.mutate(
        { id: businessId },
        {
          onSuccess: () => {
            toast({ title: "삭제 완료" });
            queryClient.invalidateQueries({ queryKey: getListBusinessesQueryKey() });
            setLocation("/businesses");
          },
          onError: () => toast({ variant: "destructive", title: "삭제 실패" }),
        }
      );
    }
  };

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: getListWorkersQueryKey({ businessId }) });
    queryClient.invalidateQueries({ queryKey: getListRoundsQueryKey({ businessId }) });
  };

  if (isLoadingBiz) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-[200px]" />
      <div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      <Skeleton className="h-64" />
    </div>
  );
  if (!business) return <div className="p-8 text-center text-muted-foreground">사업장을 찾을 수 없습니다.</div>;

  const totalAmount = rounds?.reduce((s, r) => s + r.amount, 0) ?? 0;
  const paidAmount = rounds?.filter(r => r.status === "paid" || r.status === "completed").reduce((s, r) => s + r.amount, 0) ?? 0;
  const pendingCount = rounds?.filter(r => r.status === "scheduled").length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link href="/businesses">
            <Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{business.name}</h2>
            <p className="text-muted-foreground">사업자번호: {business.businessNumber} · {business.applicationYear}년도 지원</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/businesses/${business.id}/edit`}>
            <Button variant="outline"><Pencil className="w-4 h-4 mr-2" /> 수정</Button>
          </Link>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
            <Trash2 className="w-4 h-4 mr-2" /> 삭제
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{workers?.length ?? 0}명</div>
            <div className="text-sm text-muted-foreground mt-1">소속 근로자</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{rounds?.length ?? 0}건</div>
            <div className="text-sm text-muted-foreground mt-1">총 회차</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{pendingCount}건</div>
            <div className="text-sm text-muted-foreground mt-1">신청예정</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">₩{paidAmount.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground mt-1">지급완료 / ₩{totalAmount.toLocaleString()} 합계</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>기본 정보</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-y-3 text-sm">
              <div className="grid grid-cols-3 gap-4 border-b pb-2"><dt className="font-medium text-muted-foreground">사업장명</dt><dd className="col-span-2 font-medium">{business.name}</dd></div>
              <div className="grid grid-cols-3 gap-4 border-b pb-2"><dt className="font-medium text-muted-foreground">사업자번호</dt><dd className="col-span-2">{business.businessNumber}</dd></div>
              <div className="grid grid-cols-3 gap-4 border-b pb-2"><dt className="font-medium text-muted-foreground">대표자명</dt><dd className="col-span-2">{business.representativeName}</dd></div>
              <div className="grid grid-cols-3 gap-4 border-b pb-2"><dt className="font-medium text-muted-foreground">대표자 연락처</dt><dd className="col-span-2">{business.representativePhone || "-"}</dd></div>
              <div className="grid grid-cols-3 gap-4 border-b pb-2"><dt className="font-medium text-muted-foreground">설립일</dt><dd className="col-span-2">{business.foundedDate || "-"}</dd></div>
              <div className="grid grid-cols-3 gap-4 border-b pb-2"><dt className="font-medium text-muted-foreground">지원연도</dt><dd className="col-span-2">{business.applicationYear}년</dd></div>
              <div className="grid grid-cols-3 gap-4 border-b pb-2"><dt className="font-medium text-muted-foreground">담당자</dt><dd className="col-span-2">{business.managerName}</dd></div>
              <div className="grid grid-cols-3 gap-4 pb-2"><dt className="font-medium text-muted-foreground">상태</dt><dd className="col-span-2"><StatusBadge status={business.status} /></dd></div>
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>부가 정보</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-y-3 text-sm">
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
          <AddWorkerDialog businessId={businessId} onSuccess={refreshAll} />
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
                  <TableRow><TableCell colSpan={5} className="text-center py-6">로딩중...</TableCell></TableRow>
                ) : workers?.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">등록된 근로자가 없습니다.</TableCell></TableRow>
                ) : (
                  workers?.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-medium">
                        <Link href={`/workers/${w.id}`} className="hover:underline">{w.name}</Link>
                      </TableCell>
                      <TableCell>{new Date(w.hireDate).toLocaleDateString()}</TableCell>
                      <TableCell>{w.isMidJoiner ? "Y" : "N"}</TableCell>
                      <TableCell><StatusBadge status={w.status} /></TableCell>
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
        </CardContent>
      </Card>

      {rounds && rounds.length > 0 && (
        <Card>
          <CardHeader><CardTitle>지원금 회차 현황</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>근로자</TableHead>
                    <TableHead>회차</TableHead>
                    <TableHead>신청예정일</TableHead>
                    <TableHead>D-Day</TableHead>
                    <TableHead>금액</TableHead>
                    <TableHead>상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rounds.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Link href={`/workers/${r.workerId}`} className="hover:underline font-medium">{r.workerName}</Link>
                      </TableCell>
                      <TableCell>{r.roundNumber}회차</TableCell>
                      <TableCell>{new Date(r.dueDate).toLocaleDateString()}</TableCell>
                      <TableCell><DDayBadge dueDate={r.dueDate} /></TableCell>
                      <TableCell>₩{r.amount.toLocaleString()}</TableCell>
                      <TableCell><StatusBadge status={r.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
