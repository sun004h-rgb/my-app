import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  username: z.string().min(1, "아이디를 입력해주세요"),
  password: z.string().min(1, "비밀번호를 입력해주세요"),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const { login: setAuthToken } = useAuth();
  const loginMutation = useLogin();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = (values: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(
      { data: values },
      {
        onSuccess: (res) => {
          setAuthToken(res.token);
          toast({ title: "로그인 성공", description: "환영합니다." });
          setLocation("/");
        },
        onError: (err) => {
          toast({
            variant: "destructive",
            title: "로그인 실패",
            description: err?.message || "아이디 또는 비밀번호를 확인해주세요.",
          });
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-[400px]">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-primary p-3 rounded-xl mb-4">
            <Building2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-center">
            청년일자리도약장려금<br/>관리 시스템
          </h1>
        </div>
        <Card className="border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle>로그인</CardTitle>
            <CardDescription>시스템에 접근하기 위해 로그인해주세요.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>아이디</FormLabel>
                      <FormControl>
                        <Input placeholder="admin" {...field} data-testid="input-username" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>비밀번호</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} data-testid="input-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full mt-6" 
                  disabled={loginMutation.isPending}
                  data-testid="button-login"
                >
                  {loginMutation.isPending ? "로그인 중..." : "로그인"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
