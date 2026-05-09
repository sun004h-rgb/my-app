import { differenceInDays } from "date-fns";
import { Badge } from "@/components/ui/badge";

export function DDayBadge({ dueDate }: { dueDate: string }) {
  const diff = differenceInDays(new Date(dueDate), new Date());
  
  if (diff < 0) {
    return <Badge variant="destructive" className="whitespace-nowrap font-mono">D+{Math.abs(diff)}</Badge>;
  }
  if (diff <= 7) {
    return <Badge variant="destructive" className="whitespace-nowrap font-mono bg-red-500 text-white hover:bg-red-600">D-{diff}</Badge>;
  }
  return <Badge variant="secondary" className="whitespace-nowrap font-mono">D-{diff}</Badge>;
}
