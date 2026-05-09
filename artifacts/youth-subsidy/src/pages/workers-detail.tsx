import { useRoute, Link, useLocation } from "wouter";
import { useGetWorker, getGetWorkerQueryKey, useListRounds, getListRoundsQueryKey, useResignWorker } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, UserMinus, FileEdit } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { DDayBadge } from "@/components/ui/d-day-badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useState } from "react";

const resignSchema = z.object({
  resignDate: z.string().min(1, "퇴사일을 입력해주세요"),
  resignReason: z.string().min(1, "퇴사 사유를 입력해주세요"),
  canApplyAfterResign: z.boolean().default(false),
});

export default function WorkerDetail() {
  const [, params] = useRoute("/workers/:id");
  const workerId = parseInt(params?.id || "0");
  const { toast } = useToast();
  const [isResignOpen, setIsResignOpen] = useState(false);

  const { data: worker, isLoading: isLoadingWorker } = useGetWorker(workerId, {
    query: { enabled: !!workerId, queryKey: getGetWorkerQueryKey(workerId) }
  });

  const { data: rounds, isLoading: isLoadingRounds } = useListRounds({ workerId }, {
    query: { enabled: !!workerId, queryKey: getListRoundsQueryKey({ workerId }) }
  });

  const resignMutation = useResignWorker();

  const form = useForm<z.infer<typeof resignSchema>>({
    resolver: zodResolver(resignSchema),
    defaultValues: {
      resignDate: new Date().toISOString().split('T')[0],
      resignReason: "",
      canApplyAfterResign: false,
    }
  });

  const onResign = (values: z.infer<typeof resignSchema>) => {
    resignMutation.mutate({ id: workerId, data: values }, {
      onSuccess: () => {
        toast({ title: "퇴사 처리 완료" });
        queryClient.invalidateQueries({ queryKey: getGetWorkerQueryKey(workerId) });
        queryClient.invalidateQueries({ queryKey: getListRoundsQueryKey({ workerId }) });
        setIsResignOpen(false);
      }
    });
  };

  if (isLoadingWorker) return <div className="space-y-4"><Skeleton className="h-8 w-[200px]" /><Skeleton className="h-64" /></div>;
  if (!worker) return <div>근로자를 찾을 수 없습니다.</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link href="/workers">
            <Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{worker.name}</h2>
            <p className="text-muted-foreground">
              <Link href={`/businesses/${worker.businessId}`} className="hover:underline">{worker.businessName}</Link>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {worker.status !== 'resigned' && (
            <Dialog open={isResignOpen} onOpenChange={setIsResignOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive"><UserMinus className="w-4 h-4 mr-2" /> 퇴사 처리</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>퇴사 처리</DialogTitle></DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onResign)} className="space-y-4">
                    <FormField control={form.control} name="resignDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>퇴사일</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="resignReason" render={({ field }) => (
                      <FormItem>
                        <FormLabel>퇴사 사유</FormLabel>
                        <FormControl><Input placeholder="사유 입력..." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="canApplyAfterResign" render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>퇴사 후 지원금 신청 가능 여부</FormLabel>
                          <p className="text-sm text-muted-foreground">체크 시 남은 회차를 신청할 수 있습니다.</p>
                        </div>
                      </FormItem>
                    )} />
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsResignOpen(false)}>취소</Button>
                      <Button type="submit" disabled={resignMutation.isPending}>처리 완료</Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>근로자 정보</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <div className="grid grid-cols-3 gap-4 border-b pb-2"><dt className="font-medium text-muted-foreground">이름</dt><dd className="col-span-2 font-medium">{worker.name}</dd></div>
            <div className="grid grid-cols-3 gap-4 border-b pb-2"><dt className="font-medium text-muted-foreground">입사일</dt><dd className="col-span-2">{new Date(worker.hireDate).toLocaleDateString()}</dd></div>
            <div className="grid grid-cols-3 gap-4 border-b pb-2"><dt className="font-medium text-muted-foreground">상태</dt><dd className="col-span-2"><StatusBadge status={worker.status} /></dd></div>
            <div className="grid grid-cols-3 gap-4 border-b pb-2"><dt className="font-medium text-muted-foreground">중간입사 여부</dt><dd className="col-span-2">{worker.isMidJoiner ? 'Y' : 'N'}</dd></div>
            {worker.status === 'resigned' && (
              <>
                <div className="grid grid-cols-3 gap-4 border-b pb-2 text-destructive"><dt className="font-medium">퇴사일</dt><dd className="col-span-2">{worker.resignDate ? new Date(worker.resignDate).toLocaleDateString() : "-"}</dd></div>
                <div className="grid grid-cols-3 gap-4 border-b pb-2 text-destructive"><dt className="font-medium">퇴사 사유</dt><dd className="col-span-2">{worker.resignReason}</dd></div>
              </>
            )}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>지원금 회차 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>회차</TableHead>
                  <TableHead>신청예정일</TableHead>
                  <TableHead>D-Day</TableHead>
                  <TableHead>지원금액</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>메모</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingRounds ? (
                  <TableRow><TableCell colSpan={7} className="text-center">로딩중...</TableCell></TableRow>
                ) : (
                  rounds?.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.roundNumber}회차</TableCell>
                      <TableCell>{new Date(r.dueDate).toLocaleDateString()}</TableCell>
                      <TableCell><DDayBadge dueDate={r.dueDate} /></TableCell>
                      <TableCell>₩{r.amount.toLocaleString()}</TableCell>
                      <TableCell><StatusBadge status={r.status} /></TableCell>
                      <TableCell className="text-muted-foreground truncate max-w-[150px]">{r.notes || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => alert("수정 모달 오픈 예정")}><FileEdit className="w-4 h-4" /></Button>
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
