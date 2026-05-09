import { Badge } from "@/components/ui/badge";

export const ROUND_STATUS_LABELS: Record<string, string> = {
  scheduled: "신청예정",
  applied: "신청완료",
  paid: "지급완료",
  not_applied: "미신청",
  resigned: "퇴사",
  not_applicable: "신청불가",
};

export const ROUND_STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 hover:bg-blue-200",
  applied: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 hover:bg-yellow-200",
  paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 hover:bg-green-200",
  not_applied: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 hover:bg-orange-200",
  resigned: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 hover:bg-gray-200",
  not_applicable: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 hover:bg-red-200",
};

export function StatusBadge({ status }: { status: string }) {
  const label = ROUND_STATUS_LABELS[status] || status;
  const colorClass = ROUND_STATUS_COLORS[status] || "bg-gray-100 text-gray-800";
  
  return (
    <Badge className={`${colorClass} border-transparent whitespace-nowrap`} variant="outline">
      {label}
    </Badge>
  );
}
