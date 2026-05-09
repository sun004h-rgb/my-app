import { useState } from "react";
import { useListUsers, getListUsersQueryKey, useCreateUser, useUpdateUser, useDeleteUser, UserRole, UserInputRole } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

const userSchema = z.object({
  username: z.string().min(3, "최소 3자 이상 입력하세요"),
  name: z.string().min(2, "최소 2자 이상 입력하세요"),
  password: z.string().min(4, "최소 4자 이상 입력하세요").optional().or(z.literal("")),
  role: z.enum(["admin", "manager"])
});

function UserForm({ user, onClose }: { user?: any, onClose: () => void }) {
  const { toast } = useToast();
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();

  const form = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: user?.username || "",
      name: user?.name || "",
      password: "",
      role: user?.role || "manager",
    },
  });

  const onSubmit = (values: z.infer<typeof userSchema>) => {
    if (user) {
      updateMutation.mutate({
        id: user.id,
        data: {
          name: values.name,
          role: values.role,
          ...(values.password ? { password: values.password } : {})
        }
      }, {
        onSuccess: () => {
          toast({ title: "사용자 수정 완료" });
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
          onClose();
        }
      });
    } else {
      if (!values.password) {
        form.setError("password", { message: "비밀번호는 필수입니다." });
        return;
      }
      createMutation.mutate({
        data: {
          username: values.username,
          name: values.name,
          password: values.password,
          role: values.role as UserInputRole
        }
      }, {
        onSuccess: () => {
          toast({ title: "사용자 생성 완료" });
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
          onClose();
        }
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="username" render={({ field }) => (
          <FormItem>
            <FormLabel>아이디</FormLabel>
            <FormControl>
              <Input {...field} disabled={!!user} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="password" render={({ field }) => (
          <FormItem>
            <FormLabel>비밀번호 {user && "(변경시에만 입력)"}</FormLabel>
            <FormControl>
              <Input type="password" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem>
            <FormLabel>이름</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="role" render={({ field }) => (
          <FormItem>
            <FormLabel>권한</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="권한 선택" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="manager">담당자 (Manager)</SelectItem>
                <SelectItem value="admin">관리자 (Admin)</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>취소</Button>
          <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>저장</Button>
        </div>
      </form>
    </Form>
  );
}

export default function AdminUsers() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  
  const { data: users, isLoading } = useListUsers({ query: { queryKey: getListUsersQueryKey() } });
  const deleteMutation = useDeleteUser();
  const { toast } = useToast();

  const handleAdd = () => {
    setEditingUser(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("정말 삭제하시겠습니까?")) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "삭제 완료" });
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">사용자 관리</h2>
          <p className="text-muted-foreground">시스템에 접근할 수 있는 관리자/담당자 계정을 관리합니다.</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" /> 계정 생성
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? "계정 수정" : "새 계정 생성"}</DialogTitle>
          </DialogHeader>
          <UserForm user={editingUser} onClose={() => setIsDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      <Card>
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>아이디</TableHead>
                <TableHead>이름</TableHead>
                <TableHead>권한</TableHead>
                <TableHead>생성일시</TableHead>
                <TableHead className="text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-[80px]" /></TableCell>
                  </TableRow>
                ))
              ) : users?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    조회된 사용자가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                users?.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.username}</TableCell>
                    <TableCell>{u.name}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        {u.role === 'admin' ? '관리자' : '담당자'}
                      </span>
                    </TableCell>
                    <TableCell>{new Date(u.createdAt).toLocaleString()}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(u)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(u.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
