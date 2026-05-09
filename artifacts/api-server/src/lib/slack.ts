import { logger } from "./logger";

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

export interface SlackMessage {
  businessName: string;
  workerName: string;
  roundNumber: number;
  amount: number;
  dueDate: string;
  managerName: string;
  workerUrl: string;
}

export async function sendSlackMessage(msg: SlackMessage): Promise<boolean> {
  if (!SLACK_WEBHOOK_URL) {
    logger.warn("SLACK_WEBHOOK_URL not set — skipping Slack notification");
    return false;
  }

  const dDayMs = new Date(msg.dueDate).getTime() - Date.now();
  const dDays = Math.ceil(dDayMs / (1000 * 60 * 60 * 24));
  const dDayLabel = dDays === 0 ? "D-Day" : dDays > 0 ? `D-${dDays}` : `D+${Math.abs(dDays)}`;

  const text = [
    `🔔 *청년일자리도약장려금 신청 알림*`,
    ``,
    `• 사업장: ${msg.businessName}`,
    `• 근로자: ${msg.workerName}`,
    `• 회차: ${msg.roundNumber}회차`,
    `• 신청예정금액: ${msg.amount.toLocaleString()}원`,
    `• 신청도래일: ${msg.dueDate} (${dDayLabel})`,
    `• 담당자: ${msg.managerName}`,
    ``,
    `👉 <${msg.workerUrl}|근로자 상세 바로가기>`,
  ].join("\n");

  try {
    const resp = await fetch(SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!resp.ok) {
      logger.error({ status: resp.status }, "Slack webhook failed");
      return false;
    }
    return true;
  } catch (err) {
    logger.error({ err }, "Failed to send Slack message");
    return false;
  }
}
