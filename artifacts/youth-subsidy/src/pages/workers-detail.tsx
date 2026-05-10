import { useRoute, Link, useLocation } from "wouter";
import {
  useGetWorker, getGetWorkerQueryKey,
  useListRounds, getListRoundsQueryKey,
  useResignWorker, useUpdateRound,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const roundUpdateSchema = z.object({
  status: z.enum(["scheduled", "applied", "completed", "paid", "not_applied", "resigned", "not_applicable"]),
  notes: z.string().optional().or(z.literal("")),
  amount: z.number().optional(),
});

function RoundEditDialog({ round, workerId }: { round: any; workerId: number }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const updateMutation = useUpdateRound();

  const form = useForm<z.infer<typeof roundUpdateSchema>>({
    resolver: zodResolver(roundUpdateSchema),
    defaultValues: {
      status: round.status,
      notes: round.notes || "",
      amount: round.amount,
    },
  });

  const onSubmit = (values: z.infer<typeof roundUpdateSchema>) => {
    updateMutation.mutate(
      { id: round.id, data: { status: values.status, notes: values.notes || undefined, amount: values.amount } },
      {
        onSuccess: () => {
          toast({ title: `${round.roundNumber}회차 상태가 업데이트되었습니다.` });
          queryClient.invalidateQueries({ queryKey: getListRoundsQueryKey({ workerId }) });
          queryClient.invalidateQueries({ queryKey: getGetWorkerQueryKey(workerId) });
          setOpen(false);
        },
        onError: () => toast({ variant: "destructive", title: "업데이트 실패" }),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm"><FileEdit className="w-4 h-4" /></Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{round.roundNumber}회차 상태 수정</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem>
                <FormLabel>상태</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="scheduled">신청예정</SelectItem>
                    <SelectItem value="applied">신청완료</SelectItem>
                    <SelectItem value="completed">처리완료</SelectItem>
                    <SelectItem value="paid">지급완료</SelectItem>
                    <SelectItem value="not_applied">미신청</SelectItem>
                    <SelectItem value="not_applicable">신청불가</SelectItem>
                    <SelectItem value="resigned">퇴사</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="amount" render={({ field }) => (
              <FormItem>
                <FormLabel>지원금액 (원)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={e => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>메모</FormLabel>
                <FormControl><Textarea placeholder="메모를 입력하세요..." rows={3} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>취소</Button>
              <Button type="submit" disabled={updateMutation.isPending}>저장</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function WorkerDetail() {
  const [, params] = useRoute("/workers/:id");
  const [, setLocation] = useLocation();
  const workerId = parseInt(params?.id || "0");
  const { toast } = useToast();
  const [isResignOpen, setIsResignOpen] = useState(false);

  const { data: worker, isLoading: isLoadingWorker } = useGetWorker(workerId, {
    query: { enabled: !!workerId, queryKey: getGetWorkerQueryKey(workerId) },
  });

  const { data: rounds, isLoading: isLoadingRounds } = useListRounds(
    { workerId },
    { query: { enabled: !!workerId, queryKey: getListRoundsQueryKey({ workerId }) } }
  );

  const resignMutation = useResignWorker();

  const resignForm = useForm<z.infer<typeof resignSchema>>({
    resolver: zodResolver(resignSchema),
    defaultValues: {
      resignDate: new Date().toISOString().split("T")[0],
      resignReason: "",
      canApplyAfterResign: false,
    },
  });

  const onResign = (values: z.infer<typeof resignSchema>) => {
    resignMutation.mutate(
      { id: workerId, data: values },
      {
        onSuccess: () => {
          toast({ title: "퇴사 처리 완료" });
          queryClient.invalidateQueries({ queryKey: getGetWorkerQueryKey(workerId) });
          queryClient.invalidateQueries({ queryKey: getListRoundsQueryKey({ workerId }) });
          setIsResignOpen(false);
        },
        onError: () => toast({ variant: "destructive", title: "퇴사 처리 실패" }),
      }
    );
  };

  if (isLoadingWorker) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-[200px]" />
      <Skeleton className="h-64" />
    </div>
  );
  if (!worker) return <div className="p-8 text-center text-muted-foreground">근로자를 찾을 수 없습니다.</div>;

  const totalRounds = rounds?.length ?? 0;
  const paidRounds = rounds?.filter(r => r.status === "paid" || r.status === "completed").length ?? 0;
  const totalExpected = rounds?.reduce((s, r) => s + r.amount, 0) ?? 0;
  const paidAmount = rounds?.filter(r => r.status === "paid" || r.status === "completed").reduce((s, r) => s + r.amount, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setLocation("/workers")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{worker.name}</h2>
            <p className="text-muted-foreground">
              <Link href={`/businesses/${worker.businessId}`} className="hover:underline">
                {worker.businessName}
              </Link>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {worker.status !== "resigned" && (
            <Dialog open={isResignOpen} onOpenChange={setIsResignOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive">
                  <UserMinus className="w-4 h-4 mr-2" /> 퇴사 처리
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>퇴사 처리</DialogTitle></DialogHeader>
                <Form {...resignForm}>
                  <form onSubmit={resignForm.handleSubmit(onResign)} className="space-y-4">
                    <FormField control={resignForm.control} name="resignDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>퇴사일</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={resignForm.control} name="resignReason" render={({ field }) => (
                      <FormItem>
                        <FormLabel>퇴사 사유</FormLabel>
                        <FormControl><Input placeholder="사유 입력..." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={resignForm.control} name="canApplyAfterResign" render={({ field }) => (
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
                      <Button type="submit" variant="destructive" disabled={resignMutation.isPending}>처리 완료</Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalRounds}회차</div>
            <div className="text-sm text-muted-foreground mt-1">총 지원 회차</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{paidRounds}회차</div>
            <div className="text-sm text-muted-foreground mt-1">지급완료</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">₩{totalExpected.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground mt-1">예상 총액</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">₩{paidAmount.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground mt-1">지급 완료액</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>근로자 정보</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div className="grid grid-cols-3 gap-4 border-b pb-2"><dt className="font-medium text-muted-foreground">이름</dt><dd className="col-span-2 font-medium">{worker.name}</dd></div>
            <div className="grid grid-cols-3 gap-4 border-b pb-2"><dt className="font-medium text-muted-foreground">입사일</dt><dd className="col-span-2">{new Date(worker.hireDate).toLocaleDateString()}</dd></div>
            <div className="grid grid-cols-3 gap-4 border-b pb-2"><dt className="font-medium text-muted-foreground">주민등록번호</dt><dd className="col-span-2 font-mono">{worker.residentNumber || "-"}</dd></div>
            <div className="grid grid-cols-3 gap-4 border-b pb-2"><dt className="font-medium text-muted-foreground">중간입사 여부</dt><dd className="col-span-2">{worker.isMidJoiner ? "Y (중간입사)" : "N (일반)"}</dd></div>
            <div className="grid grid-cols-3 gap-4 pb-2 md:border-b md:pb-2"><dt className="font-medium text-muted-foreground">상태</dt><dd className="col-span-2"><StatusBadge status={worker.status} /></dd></div>
            {worker.status === "resigned" && (
              <>
                <div className="grid grid-cols-3 gap-4 border-b pb-2"><dt className="font-medium text-muted-foreground text-destructive">퇴사일</dt><dd className="col-span-2">{worker.resignDate ? new Date(worker.resignDate).toLocaleDateString() : "-"}</dd></div>
                <div className="grid grid-cols-3 gap-4 border-b pb-2"><dt className="font-medium text-muted-foreground text-destructive">퇴사 사유</dt><dd className="col-span-2">{worker.resignReason}</dd></div>
                <div className="grid grid-cols-3 gap-4 pb-2"><dt className="font-medium text-muted-foreground">계속 신청 가능</dt><dd className="col-span-2">{worker.canApplyAfterResign ? "가능" : "불가"}</dd></div>
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
                  <TableHead className="text-right">수정</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingRounds ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-6">로딩중...</TableCell></TableRow>
                ) : rounds?.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">회차 정보가 없습니다.</TableCell></TableRow>
                ) : (
                  rounds?.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-semibold">{r.roundNumber}회차</TableCell>
                      <TableCell>{new Date(r.dueDate).toLocaleDateString()}</TableCell>
                      <TableCell><DDayBadge dueDate={r.dueDate} /></TableCell>
                      <TableCell>₩{r.amount.toLocaleString()}</TableCell>
                      <TableCell><StatusBadge status={r.status} /></TableCell>
                      <TableCell className="text-muted-foreground text-sm truncate max-w-[160px]">{r.notes || "-"}</TableCell>
                      <TableCell className="text-right">
                        <RoundEditDialog round={r} workerId={workerId} />
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
