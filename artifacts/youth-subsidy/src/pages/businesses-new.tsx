import { useLocation } from "wouter";
import { useCreateBusiness, useListUsers, getListUsersQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

const businessSchema = z.object({
  name: z.string().min(1, "필수 항목입니다."),
  representativeName: z.string().min(1, "필수 항목입니다."),
  businessNumber: z.string().min(1, "필수 항목입니다."),
  foundedDate: z.string().optional().or(z.literal("")),
  representativeResidentNumber: z.string().optional().or(z.literal("")),
  representativePhone: z.string().optional().or(z.literal("")),
  certPassword: z.string().optional().or(z.literal("")),
  managerId: z.number({ required_error: "담당자를 선택해주세요." }),
  managerName: z.string().optional().or(z.literal("")), // will be set before submit
  operatingAgency: z.string().optional().or(z.literal("")),
  operatingAgencyPhone: z.string().optional().or(z.literal("")),
  applicationYear: z.number(),
  bankName: z.string().optional().or(z.literal("")),
  accountNumber: z.string().optional().or(z.literal("")),
  status: z.string().default("active"),
});

export default function BusinessNew() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: users } = useListUsers({ query: { queryKey: getListUsersQueryKey() } });
  const createMutation = useCreateBusiness();

  const currentYear = new Date().getFullYear();

  const form = useForm<z.infer<typeof businessSchema>>({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      name: "",
      representativeName: "",
      businessNumber: "",
      applicationYear: currentYear,
      status: "active",
      managerId: undefined,
      managerName: "",
      foundedDate: "",
      representativeResidentNumber: "",
      representativePhone: "",
      certPassword: "",
      operatingAgency: "",
      operatingAgencyPhone: "",
      bankName: "",
      accountNumber: ""
    } as any,
  });

  const onSubmit = (values: z.infer<typeof businessSchema>) => {
    const manager = users?.find(u => u.id === values.managerId);
    if (!manager) return;
    
    const submitData = { ...values, managerName: manager.name };

    createMutation.mutate({ data: submitData }, {
      onSuccess: (res) => {
        toast({ title: "사업장 등록 완료" });
        setLocation(`/businesses/${res.id}`);
      },
      onError: () => {
        toast({ variant: "destructive", title: "등록 실패" });
      }
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">신규 사업장 등록</h2>
        <p className="text-muted-foreground">새로운 지원 사업장을 등록합니다.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>기본 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>사업장명 *</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="businessNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel>사업자등록번호 *</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="representativeName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>대표자명 *</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="foundedDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>설립일</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="applicationYear" render={({ field }) => (
                  <FormItem>
                    <FormLabel>신청년도 *</FormLabel>
                    <FormControl><Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="managerId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>담당자 *</FormLabel>
                    <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value?.toString()}>
                      <FormControl><SelectTrigger><SelectValue placeholder="담당자 선택" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {users?.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>상태 *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="상태 선택" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="active">정상</SelectItem>
                        <SelectItem value="closed">폐업</SelectItem>
                        <SelectItem value="suspended">휴업</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="representativePhone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>대표자 연락처</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="certPassword" render={({ field }) => (
                  <FormItem>
                    <FormLabel>인증서 비밀번호</FormLabel>
                    <FormControl><Input type="password" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              
              <div className="flex justify-end gap-4 border-t pt-4">
                <Button variant="outline" type="button" onClick={() => setLocation("/businesses")}>취소</Button>
                <Button type="submit" disabled={createMutation.isPending}>등록 완료</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
