import { useState, useEffect } from "react";
import { useGetNotificationSettings, useUpdateNotificationSettings, getGetNotificationSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Bell, Save, Info, AlertTriangle } from "lucide-react";

export default function SettingsNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === "admin";

  const { data: settings, isLoading } = useGetNotificationSettings({
    query: { queryKey: getGetNotificationSettingsQueryKey() },
  });

  const updateMutation = useUpdateNotificationSettings({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetNotificationSettingsQueryKey() });
        toast({ title: "설정 저장 완료", description: "알림 설정이 업데이트되었습니다." });
      },
      onError: () => {
        toast({ title: "저장 실패", description: "설정 저장 중 오류가 발생했습니다.", variant: "destructive" });
      },
    },
  });

  const [slackEnabled, setSlackEnabled] = useState(true);
  const [advanceDays, setAdvanceDays] = useState(7);
  const [overdueIntervalDays, setOverdueIntervalDays] = useState(3);
  const [round3UrgentThresholdDays, setRound3UrgentThresholdDays] = useState(30);
  const [round3DeadlineDays, setRound3DeadlineDays] = useState(60);

  useEffect(() => {
    if (settings) {
      setSlackEnabled(settings.slackEnabled);
      setAdvanceDays(settings.advanceDays);
      setOverdueIntervalDays(settings.overdueIntervalDays);
      setRound3UrgentThresholdDays(settings.round3UrgentThresholdDays);
      setRound3DeadlineDays(settings.round3DeadlineDays);
    }
  }, [settings]);

  const handleSave = () => {
    updateMutation.mutate({
      data: {
        slackEnabled,
        advanceDays,
        overdueIntervalDays,
        round3UrgentThresholdDays,
        round3DeadlineDays,
      },
    });
  };

  const handleReset = () => {
    if (settings) {
      setSlackEnabled(settings.slackEnabled);
      setAdvanceDays(settings.advanceDays);
      setOverdueIntervalDays(settings.overdueIntervalDays);
      setRound3UrgentThresholdDays(settings.round3UrgentThresholdDays);
      setRound3DeadlineDays(settings.round3DeadlineDays);
    }
  };

  const isDirty = settings && (
    slackEnabled !== settings.slackEnabled ||
    advanceDays !== settings.advanceDays ||
    overdueIntervalDays !== settings.overdueIntervalDays ||
    round3UrgentThresholdDays !== settings.round3UrgentThresholdDays ||
    round3DeadlineDays !== settings.round3DeadlineDays
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        설정을 불러오는 중...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">알림 설정</h2>
          <p className="text-muted-foreground">슬랙 자동 알림 발송 기준을 설정합니다.</p>
        </div>
        {settings && (
          <p className="text-xs text-muted-foreground">
            마지막 수정: {new Date(settings.updatedAt).toLocaleString("ko-KR")}
          </p>
        )}
      </div>

      {!isAdmin && (
        <div className="flex items-center gap-2 rounded-md border border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800 px-4 py-3 text-sm text-yellow-800 dark:text-yellow-200">
          <Info className="w-4 h-4 shrink-0" />
          <span>현재 설정을 조회만 가능합니다. 수정은 관리자 권한이 필요합니다.</span>
        </div>
      )}

      {/* 슬랙 활성화 */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">슬랙 알림 활성화</CardTitle>
          </div>
          <CardDescription>전체 슬랙 자동 알림 발송을 켜거나 끕니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="slack-enabled" className="text-sm font-medium">
                슬랙 알림
              </Label>
              <p className="text-xs text-muted-foreground">
                꺼두면 cron 스케줄러가 알림을 발송하지 않습니다.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={slackEnabled ? "default" : "secondary"}>
                {slackEnabled ? "활성화" : "비활성화"}
              </Badge>
              <Switch
                id="slack-enabled"
                checked={slackEnabled}
                onCheckedChange={isAdmin ? setSlackEnabled : undefined}
                disabled={!isAdmin}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 기본 알림 주기 */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">기본 알림 주기</CardTitle>
          <CardDescription>1·2·3회차 공통으로 적용되는 알림 시점을 설정합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">사전 알림 일수</Label>
              <Badge variant="outline">D-{advanceDays}일 전</Badge>
            </div>
            <Slider
              min={1}
              max={30}
              step={1}
              value={[advanceDays]}
              onValueChange={isAdmin ? ([v]) => setAdvanceDays(v) : undefined}
              disabled={!isAdmin}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              신청 도래일 {advanceDays}일 전에 슬랙 알림을 발송합니다. (현재: D-{advanceDays})
            </p>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">도래일 경과 후 알림 간격</Label>
              <Badge variant="outline">{overdueIntervalDays}일 간격</Badge>
            </div>
            <Slider
              min={1}
              max={14}
              step={1}
              value={[overdueIntervalDays]}
              onValueChange={isAdmin ? ([v]) => setOverdueIntervalDays(v) : undefined}
              disabled={!isAdmin}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              도래일이 지났지만 미신청 상태인 경우 {overdueIntervalDays}일마다 반복 알림을 발송합니다.
              (D+{overdueIntervalDays}, D+{overdueIntervalDays * 2}, D+{overdueIntervalDays * 3}...)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 3회차 긴급 알림 */}
      <Card className="border-orange-200 dark:border-orange-800">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <CardTitle className="text-base">3회차 긴급 알림 설정</CardTitle>
          </div>
          <CardDescription>
            3회차는 도래일 2개월 이내 신청이 필수입니다. 기한 임박 시 알림 주기를 강화합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">매일 알림 시작 기준</Label>
              <Badge variant="outline" className="border-orange-300 text-orange-700 dark:text-orange-300">
                D+{round3UrgentThresholdDays} 초과 시 매일
              </Badge>
            </div>
            <Slider
              min={7}
              max={60}
              step={1}
              value={[round3UrgentThresholdDays]}
              onValueChange={isAdmin ? ([v]) => setRound3UrgentThresholdDays(v) : undefined}
              disabled={!isAdmin}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              3회차 도래일이 {round3UrgentThresholdDays}일 이상 경과하면 매일 긴급 알림을 발송합니다.
            </p>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">신청 불가 기준 일수</Label>
              <Badge variant="outline" className="border-red-300 text-red-700 dark:text-red-300">
                D+{round3DeadlineDays} 신청불가
              </Badge>
            </div>
            <Slider
              min={30}
              max={120}
              step={1}
              value={[round3DeadlineDays]}
              onValueChange={isAdmin ? ([v]) => setRound3DeadlineDays(v) : undefined}
              disabled={!isAdmin}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              표시 목적 전용입니다. 도래일 {round3DeadlineDays}일({Math.round(round3DeadlineDays / 30)}개월) 경과 시 신청 불가로 표시됩니다.
            </p>
          </div>

          {/* 타임라인 요약 */}
          <div className="rounded-md bg-muted/50 px-4 py-3 text-sm space-y-1">
            <p className="font-medium text-xs text-muted-foreground mb-2">3회차 알림 타임라인 (현재 설정 기준)</p>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <span className="text-muted-foreground">D-{advanceDays}</span>
              <span>사전 알림</span>
              <span className="text-muted-foreground">D-Day</span>
              <span>당일 알림</span>
              <span className="text-muted-foreground">D+{overdueIntervalDays}~D+{round3UrgentThresholdDays}</span>
              <span>{overdueIntervalDays}일 간격 알림</span>
              <span className="text-orange-600 dark:text-orange-400 font-medium">D+{round3UrgentThresholdDays + 1}~D+{round3DeadlineDays}</span>
              <span className="text-orange-600 dark:text-orange-400 font-medium">매일 긴급 알림</span>
              <span className="text-red-600 dark:text-red-400 font-medium">D+{round3DeadlineDays} 이후</span>
              <span className="text-red-600 dark:text-red-400 font-medium">신청 불가</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 저장 버튼 (admin only) */}
      {isAdmin && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleReset} disabled={!isDirty || updateMutation.isPending}>
            초기화
          </Button>
          <Button onClick={handleSave} disabled={!isDirty || updateMutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            {updateMutation.isPending ? "저장 중..." : "설정 저장"}
          </Button>
        </div>
      )}
    </div>
  );
}
