import { useState } from "react";
import { useListNotifications, getListNotificationsQueryKey, useMarkNotificationRead, useSendSlackNotification } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, BellRing, Check, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function Notifications() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { toast } = useToast();
  
  const queryParams = {
    unreadOnly: unreadOnly || null,
  };

  const { data: notifications, isLoading } = useListNotifications(queryParams, {
    query: { queryKey: getListNotificationsQueryKey(queryParams) }
  });

  const markReadMutation = useMarkNotificationRead();
  const sendSlackMutation = useSendSlackNotification();

  const handleMarkAsRead = (id: number) => {
    markReadMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey(queryParams) });
      }
    });
  };

  const handleSendSlack = () => {
    sendSlackMutation.mutate(undefined, {
      onSuccess: (res) => {
        toast({
          title: "슬랙 발송 완료",
          description: res.message,
        });
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey(queryParams) });
      },
      onError: () => {
        toast({
          variant: "destructive",
          title: "발송 실패",
          description: "슬랙 알림 발송 중 오류가 발생했습니다.",
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">알림 로그</h2>
          <p className="text-muted-foreground">지원금 임박 및 발송 알림 내역입니다.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox 
              id="unread-only" 
              checked={unreadOnly} 
              onCheckedChange={(c) => setUnreadOnly(c as boolean)} 
            />
            <label htmlFor="unread-only" className="text-sm font-medium leading-none cursor-pointer">
              읽지 않음만 보기
            </label>
          </div>
          <Button onClick={handleSendSlack} disabled={sendSlackMutation.isPending}>
            <MessageSquare className="w-4 h-4 mr-2" /> 슬랙 수동 발송
          </Button>
        </div>
      </div>

      <Card>
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>사업장명</TableHead>
                <TableHead>근로자명</TableHead>
                <TableHead>유형</TableHead>
                <TableHead>메시지</TableHead>
                <TableHead>발송일시</TableHead>
                <TableHead className="text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[250px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-[60px]" /></TableCell>
                  </TableRow>
                ))
              ) : notifications?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    조회된 알림이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                notifications?.map((n) => (
                  <TableRow key={n.id} className={n.isRead ? "opacity-60" : ""}>
                    <TableCell>
                      {n.isRead ? <Bell className="w-4 h-4 text-muted-foreground" /> : <BellRing className="w-4 h-4 text-primary" />}
                    </TableCell>
                    <TableCell className="font-medium">{n.businessName}</TableCell>
                    <TableCell>{n.workerName}</TableCell>
                    <TableCell>{n.type}</TableCell>
                    <TableCell>{n.message}</TableCell>
                    <TableCell>{new Date(n.sentAt).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      {!n.isRead && (
                        <Button variant="ghost" size="sm" onClick={() => handleMarkAsRead(n.id)}>
                          <Check className="w-4 h-4 mr-1" /> 읽음
                        </Button>
                      )}
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
