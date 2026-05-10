import { useRoute, Link, useLocation } from "wouter";
import { useGetBusiness, getGetBusinessQueryKey, useUpdateBusiness, useListUsers, getListUsersQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useRef } from "react";

const businessSchema = z.object({
  name: z.string().min(1, "필수 항목입니다."),
  representativeName: z.string().min(1, "필수 항목입니다."),
  businessNumber: z.string().min(1, "필수 항목입니다."),
  foundedDate: z.string().optional().or(z.literal("")),
  representativeResidentNumber: z.string().optional().or(z.literal("")),
  representativePhone: z.string().optional().or(z.literal("")),
  certPassword: z.string().optional().or(z.literal("")),
  managerId: z.number({ required_error: "담당자를 선택해주세요." }),
  managerName: z.string().optional().or(z.literal("")),
  operatingAgency: z.string().optional().or(z.literal("")),
  operatingAgencyPhone: z.string().optional().or(z.literal("")),
  applicationYear: z.number(),
  bankName: z.string().optional().or(z.literal("")),
  accountNumber: z.string().optional().or(z.literal("")),
  status: z.string(),
});

export default function BusinessEdit() {
  const [, params] = useRoute("/businesses/:id/edit");
  const businessId = parseInt(params?.id || "0");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: users } = useListUsers({ query: { queryKey: getListUsersQueryKey() } });
  const { data: business, isLoading } = useGetBusiness(businessId, {
    query: { enabled: !!businessId, queryKey: getGetBusinessQueryKey(businessId) }
  });
  const updateMutation = useUpdateBusiness();

  const form = useForm<z.infer<typeof businessSchema>>({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      name: "",
      representativeName: "",
      businessNumber: "",
      applicationYear: new Date().getFullYear(),
      status: "active",
      managerId: undefined as any,
    },
  });

  const initialized = useRef(false);

  useEffect(() => {
    if (business && !initialized.current) {
      form.reset({
        name: business.name,
        representativeName: business.representativeName,
        businessNumber: business.businessNumber,
        foundedDate: business.foundedDate || "",
        representativeResidentNumber: business.representativeResidentNumber || "",
        representativePhone: business.representativePhone || "",
        certPassword: business.certPassword || "",
        managerId: business.managerId,
        managerName: business.managerName,
        operatingAgency: business.operatingAgency || "",
        operatingAgencyPhone: business.operatingAgencyPhone || "",
        applicationYear: business.applicationYear,
        bankName: business.bankName || "",
        accountNumber: business.accountNumber || "",
        status: business.status,
      });
      initialized.current = true;
    }
  }, [business, form]);

  const onSubmit = (values: z.infer<typeof businessSchema>) => {
    const manager = users?.find(u => u.id === values.managerId);
    if (!manager) return;
    values.managerName = manager.name;

    updateMutation.mutate({ id: businessId, data: values }, {
      onSuccess: () => {
        toast({ title: "사업장 수정 완료" });
        setLocation(`/businesses/${businessId}`);
      },
      onError: () => {
        toast({ variant: "destructive", title: "수정 실패" });
      }
    });
  };

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-[200px]" /><Skeleton className="h-64" /></div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">사업장 수정</h2>
        <p className="text-muted-foreground">{business?.name}의 정보를 수정합니다.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>정보 수정</CardTitle>
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                  <FormField control={form.control} name="foundedDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>설립일</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="representativePhone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>대표자 연락처</FormLabel>
                    <FormControl><Input placeholder="010-0000-0000" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="representativeResidentNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel>대표자 주민등록번호</FormLabel>
                    <FormControl><Input placeholder="000000-0000000" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="certPassword" render={({ field }) => (
                  <FormItem>
                    <FormLabel>인증서 비밀번호</FormLabel>
                    <FormControl><Input type="password" placeholder="인증서 비밀번호" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="applicationYear" render={({ field }) => (
                  <FormItem>
                    <FormLabel>지원연도 *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={2020}
                        max={2030}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="operatingAgency" render={({ field }) => (
                  <FormItem>
                    <FormLabel>운영기관명</FormLabel>
                    <FormControl><Input placeholder="한국고용복지플러스센터" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="operatingAgencyPhone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>운영기관 연락처</FormLabel>
                    <FormControl><Input placeholder="02-0000-0000" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="bankName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>은행명</FormLabel>
                    <FormControl><Input placeholder="국민은행" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="accountNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel>계좌번호</FormLabel>
                    <FormControl><Input placeholder="123456-78-901234" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              
              <div className="flex justify-end gap-4 border-t pt-4">
                <Button variant="outline" type="button" onClick={() => setLocation(`/businesses/${businessId}`)}>취소</Button>
                <Button type="submit" disabled={updateMutation.isPending}>저장</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
