import { formatDate, formatMoney } from "./format";
import { SHARED_TYPES, type BillingPeriod, type Bill, type Payment, type Profile } from "./types";

export interface ReportLine {
  bill: Bill;
  renter: Profile;
  /** What the renter owes for this bill under the house rules. */
  expected: number;
  /** Their non-rejected payment on this bill, if any. */
  payment: Payment | null;
}

/**
 * Cross every active renter with every bill in the period, computing each
 * expected share with the same rules the app uses (day-stay proration for
 * utilities, equal split otherwise and for rent).
 */
export function buildReportLines(
  bills: Bill[],
  renters: Profile[],
  payments: Payment[],
  stayDayCounts: Map<string, number>,
  totalStayDays: number,
  renterCount: number
): ReportLine[] {
  const lines: ReportLine[] = [];
  for (const bill of bills) {
    for (const renter of renters) {
      const payment = payments.find((item) => item.bill_id === bill.id && item.renter_id === renter.id && item.status !== "rejected") ?? null;
      const expected =
        SHARED_TYPES.includes(bill.type) && totalStayDays > 0
          ? (Number(bill.amount) * (stayDayCounts.get(renter.id) ?? 0)) / totalStayDays
          : Number(bill.amount) / Math.max(renterCount, 1);
      lines.push({ bill, renter, expected, payment });
    }
  }
  return lines;
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function reportToCsv(period: BillingPeriod, lines: ReportLine[]): string {
  const header = "period,bill_type,bill_title,bill_amount,due_on,renter,expected_share,amount_paid,paid_on,status";
  const rows = lines.map(({ bill, renter, expected, payment }) =>
    [
      period.label,
      bill.type,
      csvEscape(bill.title),
      Number(bill.amount).toFixed(2),
      bill.due_on,
      csvEscape(renter.full_name),
      expected.toFixed(2),
      payment ? Number(payment.amount).toFixed(2) : "0.00",
      payment?.paid_on ?? "",
      payment ? payment.status : "unpaid",
    ].join(",")
  );
  return [header, ...rows].join("\n");
}

/** Chat-friendly summary an admin can paste straight into the group chat. */
export function reportToText(period: BillingPeriod, bills: Bill[], lines: ReportLine[]): string {
  const totalBills = bills.reduce((sum, bill) => sum + Number(bill.amount), 0);
  const collected = lines.reduce((sum, line) => sum + (line.payment ? Number(line.payment.amount) : 0), 0);
  const percent = totalBills > 0 ? Math.round((collected / totalBills) * 100) : 0;

  const out: string[] = [
    `UDH-304 · ${period.label} report`,
    `Bills total: ${formatMoney(totalBills)} · Collected: ${formatMoney(collected)} (${percent}%)`,
    "",
  ];

  for (const bill of bills) {
    out.push(`${bill.title} (${bill.type}) — ${formatMoney(bill.amount)}, due ${formatDate(bill.due_on)}`);
    for (const line of lines.filter((item) => item.bill.id === bill.id)) {
      if (line.payment) {
        const mark = line.payment.status === "approved" ? "✓" : "…";
        out.push(`  ${mark} ${line.renter.full_name}: ${line.payment.status} ${formatMoney(line.payment.amount)}`);
      } else {
        out.push(`  ✗ ${line.renter.full_name}: unpaid · owes ${formatMoney(line.expected)}`);
      }
    }
    out.push("");
  }

  return out.join("\n").trim();
}
