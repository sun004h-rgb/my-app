import { 
  useGetDashboardSummary, 
  useGetManagerStats, 
  useGetUpcomingRounds,
  getGetDashboardSummaryQueryKey,
  getGetManagerStatsQueryKey,
  getGetUpcomingRoundsQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users, Briefcase, CalendarClock, AlertCircle, Banknote } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { ROUND_STATUS_COLORS, ROUND_STATUS_LABELS, StatusBadge } from "@/components/ui/status-badge";
import { DDayBadge } from "@/components/ui/d-day-badge";
import { Link } from "wouter";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a8a29e', '#ef4444'];

function StatCard({ title, value, icon: Icon, description }: any) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey() } });
  const { data: managerStats, isLoading: isLoadingManagers } = useGetManagerStats({ query: { queryKey: getGetManagerStatsQueryKey() } });
  const { data: upcomingRounds, isLoading: isLoadingUpcoming } = useGetUpcomingRounds({ query: { queryKey: getGetUpcomingRoundsQueryKey() } });

  if (isLoadingSummary || isLoadingManagers || isLoadingUpcoming) {
    return <div className="space-y-4">
      <Skeleton className="h-8 w-[200px]" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-[300px]" />
        <Skeleton className="h-[300px]" />
      </div>
    </div>;
  }

  const pieData = summary?.roundsByStatus.map(s => ({
    name: ROUND_STATUS_LABELS[s.status] || s.status,
    value: s.count
  })) || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">대시보드</h2>
        <p className="text-muted-foreground">현황을 한눈에 파악하세요.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="총 사업장" 
          value={summary?.totalBusinesses || 0} 
          icon={Building2} 
        />
        <StatCard 
          title="총 근로자" 
          value={summary?.totalWorkers || 0} 
          icon={Users} 
        />
        <StatCard 
          title="진행중 회차" 
          value={summary?.pendingRounds || 0} 
          icon={Briefcase} 
          description="현재 관리중인 지원금 회차"
        />
        <StatCard 
          title="기한 초과" 
          value={summary?.overdueRounds || 0} 
          icon={AlertCircle} 
          description="신청 기한이 지난 건"
        />
        <StatCard 
          title="이번주 예정" 
          value={summary?.upcomingThisWeek || 0} 
          icon={CalendarClock} 
        />
        <StatCard 
          title="이달 지급 완료" 
          value={summary?.completedThisMonth || 0} 
          icon={Briefcase} 
        />
        <StatCard 
          title="이달 수수료 (예상)" 
          value={`₩${(summary?.feeThisMonth || 0).toLocaleString()}`} 
          icon={Banknote} 
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>연도별 사업장 현황</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary?.businessesByYear || []}>
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.1)' }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>상태별 회차 현황</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>임박한 신청 건 (D-7 이내)</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingRounds?.length ? (
              <div className="space-y-4">
                {upcomingRounds.slice(0, 5).map((round) => (
                  <div key={round.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div>
                      <div className="font-medium text-sm">
                        <Link href={`/businesses/${round.businessId}`} className="hover:underline">{round.businessName}</Link>
                      </div>
                      <div className="text-xs text-muted-foreground">{round.workerName} • {round.roundNumber}회차</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={round.status} />
                      <DDayBadge dueDate={round.dueDate} />
                    </div>
                  </div>
                ))}
                {upcomingRounds.length > 5 && (
                  <div className="pt-2 text-center">
                    <Link href="/rounds" className="text-sm text-primary hover:underline">모두 보기</Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">임박한 신청 건이 없습니다.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>담당자별 실적</CardTitle>
          </CardHeader>
          <CardContent>
            {managerStats?.length ? (
              <div className="space-y-4">
                {managerStats.map((stat) => (
                  <div key={stat.managerId} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                    <div className="font-medium text-sm">{stat.managerName}</div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>사업장 {stat.businessCount}</span>
                      <span>대기 {stat.pendingRounds}</span>
                      <span className="text-green-600 dark:text-green-400">완료 {stat.completedRounds}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">담당자 통계가 없습니다.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}