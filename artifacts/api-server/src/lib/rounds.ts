export const ROUND_AMOUNTS = {
  1: 360000,
  2: 180000,
  3: 180000,
} as const;

export function calculateDueDate(hireDate: string, roundNumber: 1 | 2 | 3, isMidJoiner: boolean): string {
  const date = new Date(hireDate);
  const monthsOffset = isMidJoiner
    ? { 1: 7, 2: 10, 3: 13 }[roundNumber]
    : { 1: 6, 2: 9, 3: 12 }[roundNumber];

  date.setMonth(date.getMonth() + monthsOffset);
  return date.toISOString().split("T")[0];
}
