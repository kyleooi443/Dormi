import { personalShare } from "./format";
import { SHARED_TYPES, type Bill } from "./types";

export interface ShareContext {
  /** Active renter count (equal-split fallback and rent). */
  renterCount: number;
  /** The signed-in renter's stay days in the period. */
  myStayDays: number;
  /** All active renters' stay days in the period (admins excluded). */
  totalStayDays: number;
}

/**
 * What the signed-in renter owes for a bill under the house rules:
 * - electricity / wifi / water → prorated by stay days once anyone has
 *   recorded dates; falls back to an equal split until then
 * - rent → always an equal split among active renters
 */
export function shareFor(bill: Bill, ctx: ShareContext): number {
  if (SHARED_TYPES.includes(bill.type) && ctx.totalStayDays > 0) {
    return (Number(bill.amount) * ctx.myStayDays) / ctx.totalStayDays;
  }
  return personalShare(bill.amount, ctx.renterCount);
}

/** Short human explanation of how a share was computed — shown for trust. */
export function shareBasis(bill: Bill, ctx: ShareContext): string {
  if (SHARED_TYPES.includes(bill.type)) {
    if (ctx.totalStayDays > 0) return `${ctx.myStayDays} of ${ctx.totalStayDays} household stay-days`;
    return "split equally — no stay days recorded yet";
  }
  return `split equally among ${ctx.renterCount} renter${ctx.renterCount === 1 ? "" : "s"}`;
}
